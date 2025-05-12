import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Injectable, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { GameService } from './game.service';
import {
  GameResult,
  GameState,
  GameStatus,
  MessageEvent,
  Player,
} from './models/game.model';

interface ConnectedClient {
  userId?: string;
  username?: string;
  gameId?: string;
}

interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger: Logger = new Logger('GameGateway');
  private readonly connectedClients = new Map<string, ConnectedClient>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly gameService: GameService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Game WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client attempting to connect: ${client.id}`);
    try {
      const token =
        client.handshake.auth.token ??
        client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }
      const user = await this.usersService.findOneByUsername(payload.username);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      this.connectedClients.set(client.id, {
        userId: user.id.toString(),
        username: user.username,
      });
      client.emit('connection_established', {
        message: 'Successfully connected and authenticated',
        clientId: client.id,
        user: {
          id: user.id,
          username: user.username,
          wins: user.wins,
          losses: user.losses,
        },
      });
      this.logger.log(
        `Client authenticated and connected: ${client.id} (User: ${user.username})`,
      );
      this.logger.log(`Total clients connected: ${this.connectedClients.size}`);
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.logger.log(`Client disconnected: ${clientId}`);
    const clientData = this.connectedClients.get(clientId);
    this.connectedClients.delete(clientId);
    if (clientData?.gameId && clientData.userId) {
      const gameId = clientData.gameId;
      const userId = clientData.userId;
      this.logger.log(
        `Client ${clientId} (User: ${userId}) was in game: ${gameId}`,
      );
      try {
        const finalGameState = await this.gameService.handlePlayerDisconnect(
          gameId,
          userId,
        );
        client.leave(gameId);
        if (
          finalGameState &&
          finalGameState.status === GameStatus.COMPLETED &&
          finalGameState.endReason === 'forfeit_disconnection'
        ) {
          this.logger.log(
            `Game ${gameId} completed via forfeit_disconnection. Notifying opponent.`,
          );
          this.server.to(gameId).emit('game_over', {
            gameState: finalGameState,
            result: finalGameState.result,
            winningLine: finalGameState.winningLine,
            message: `${clientData.username ?? 'Opponent'} disconnected. You win by forfeit!`,
          });
        } else if (finalGameState) {
          this.server.to(gameId).emit('opponent_disconnected', {
            message: `Opponent (${clientData.username ?? 'Unknown'}) disconnected.`,
            userId: userId,
          });
          this.logger.log(
            `Notified opponent in game ${gameId} about disconnection of ${userId} (game not forfeited).`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error during handleDisconnect processing for game ${gameId}: ${error.message}`,
        );
      }
    }
    this.logger.log(`Total clients connected: ${this.connectedClients.size}`);
  }

  @SubscribeMessage('leave_game')
  async handleLeaveGame(@ConnectedSocket() client: Socket): Promise<void> {
    const clientId = client.id;
    const clientData = this.connectedClients.get(clientId);
    if (!clientData?.userId || !clientData?.gameId) {
      this.logger.warn(
        `Client ${clientId} sent leave_game but was not associated with a user/game.`,
      );
      client.emit('error', {
        message: 'Cannot leave game: Not authenticated or not in a game.',
      });
      return;
    }
    const { userId, gameId, username } = clientData;
    this.logger.log(
      `User ${userId} (${username}) is intentionally leaving game ${gameId}`,
    );
    try {
      const finalGameState = await this.gameService.handlePlayerLeave(
        gameId,
        userId,
      );
      client.leave(gameId);
      clientData.gameId = undefined;
      this.connectedClients.set(clientId, clientData);
      if (
        finalGameState &&
        finalGameState.status === GameStatus.COMPLETED &&
        finalGameState.endReason === 'forfeit_leave'
      ) {
        this.logger.log(
          `Game ${gameId} completed via forfeit_leave. Notifying opponent.`,
        );
        this.server.to(gameId).emit('game_over', {
          gameState: finalGameState,
          result: finalGameState.result,
          winningLine: finalGameState.winningLine,
          message: `${username} left the game. You win by forfeit!`,
        });
      } else {
        this.logger.log(
          `User ${userId} left game ${gameId} (was not in progress or already over). No opponent notification needed.`,
        );
      }
      client.emit('left_game_ack', {
        gameId: gameId,
        message: 'Successfully left the game.',
      });
    } catch (error) {
      this.logger.error(
        `Error processing leave_game for user ${userId} in game ${gameId}: ${error.message}`,
      );
      client.emit('error', {
        message: 'Failed to leave game: ' + error.message,
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('start_game')
  handleStartGame(client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.userId || !clientData?.username) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }
    try {
      const { gameId, gameCode } = this.gameService.createGame();
      const player: Player = {
        userId: clientData.userId,
        username: clientData.username,
        isConnected: true,
      };
      const gameState = this.gameService.addPlayerToGame(gameId, player);
      clientData.gameId = gameId;
      this.connectedClients.set(client.id, clientData);
      client.join(gameId);
      client.emit('game_started', {
        gameId,
        gameCode,
        gameState,
        message: 'Game created successfully. Waiting for an opponent.',
      });
      this.logger.log(
        `New game started by ${clientData.username}. Game ID: ${gameId}, Code: ${gameCode}`,
      );
    } catch (error) {
      this.logger.error(`Error starting game: ${error.message}`);
      client.emit('error', { message: 'Failed to start game' });
    }
  }

  @SubscribeMessage('join_game')
  handleJoinGame(client: Socket, payload: { gameCode: string }) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.userId || !clientData.username) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }
    if (!payload.gameCode) {
      client.emit('error', { message: 'Game code is required' });
      return;
    }
    try {
      // Find game by code first to get gameId
      const foundGame = this.gameService.findGameByCode(payload.gameCode);
      const gameId = foundGame.id;

      const player: Player = {
        userId: clientData.userId,
        username: clientData.username,
        isConnected: true,
      };

      const updatedGameState = this.gameService.addPlayerToGame(gameId, player);

      // Associate gameId with the client's connection data
      clientData.gameId = gameId;
      this.connectedClients.set(client.id, clientData);
      client.join(gameId);

      // Emit game_joined TO THE JOINING CLIENT, include chat history
      client.emit('game_joined', {
        gameId,
        gameState: updatedGameState,
        chatMessages: updatedGameState.chatMessages,
        message: 'Successfully joined the game',
      });

      // Emit opponent_joined to the OTHER player(s) in the room
      client.to(gameId).emit('opponent_joined', {
        gameState: updatedGameState, // Send updated state to opponent too
        message: `${clientData.username} has joined the game`,
      });

      // If the game is now starting, emit game_started to EVERYONE in the room
      if (updatedGameState.status === GameStatus.IN_PROGRESS) {
        this.server.to(gameId).emit('game_started', {
          gameId: gameId,
          gameCode: payload.gameCode,
          gameState: updatedGameState,
          message: 'Game is starting now!',
        });
      }

      this.logger.log(
        `${clientData.username} joined game ${gameId} with code ${payload.gameCode}`,
      );
    } catch (error) {
      this.logger.error(`Error joining game: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join game: ' + error.message,
      });
    }
  }

  @SubscribeMessage('make_move')
  async handleMakeMove(client: Socket, payload: { row: number; col: number }) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.userId || !clientData?.gameId) {
      client.emit('error', {
        message: 'Authentication required or not in a game',
      });
      return;
    }
    if (payload.row === undefined || payload.col === undefined) {
      client.emit('error', { message: 'Row and column are required' });
      return;
    }
    try {
      const gameState = this.gameService.makeMove(
        clientData.gameId,
        clientData.userId,
        payload.row,
        payload.col,
      );
      this.server.to(clientData.gameId).emit('game_update', {
        gameState,
        lastMove: {
          userId: clientData.userId,
          username: clientData.username,
          row: payload.row,
          col: payload.col,
        },
      });
      if (gameState.status === GameStatus.COMPLETED) {
        this.server.to(clientData.gameId).emit('game_over', {
          gameState,
          result: gameState.result,
          winningLine: gameState.winningLine,
        });
        await this.updatePlayerStatistics(gameState);
        this.logger.log(
          `Game ${clientData.gameId} completed. Result: ${gameState.result}`,
        );
      }
      this.logger.log(
        `Move made in game ${clientData.gameId} by ${clientData.username} at position [${payload.row},${payload.col}]`,
      );
    } catch (error) {
      this.logger.error(`Error making move: ${error.message}`);
      client.emit('error', {
        message: 'Failed to make move: ' + error.message,
      });
    }
  }

  private async updatePlayerStatistics(gameState: GameState): Promise<void> {
    try {
      const playerX = gameState.players.X;
      const playerO = gameState.players.O;
      if (!playerX || !playerO) {
        this.logger.warn(
          'Cannot update statistics: One or both players missing',
        );
        return;
      }
      switch (gameState.result) {
        case GameResult.X_WON:
          await this.usersService.incrementWins(playerX.userId);
          await this.usersService.incrementLosses(playerO.userId);
          this.logger.log(
            `Statistics updated: ${playerX.username} (win), ${playerO.username} (loss)`,
          );
          break;
        case GameResult.O_WON:
          await this.usersService.incrementWins(playerO.userId);
          await this.usersService.incrementLosses(playerX.userId);
          this.logger.log(
            `Statistics updated: ${playerO.username} (win), ${playerX.username} (loss)`,
          );
          break;
        case GameResult.DRAW:
          this.logger.log('Game ended in a draw. No statistics updated.');
          break;
        default:
          this.logger.warn(`Unhandled game result: ${gameState.result}`);
      }
    } catch (error) {
      this.logger.error(`Error updating player statistics: ${error.message}`);
    }
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    client: Socket,
    payload: { message: string; userId: string },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.gameId || !clientData.username) {
      client.emit('error', {
        message: 'Authentication required or not in a game',
      });
      return;
    }
    if (!payload.message || payload.message.trim() === '') {
      client.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    const messageData: MessageEvent = {
      userId: clientData.userId ?? 'undefined-userId',
      username: clientData.username,
      message: payload.message.trim(),
      timestamp: new Date().toISOString(),
    };

    // 1. Save the message
    try {
      this.gameService.addChatMessage(clientData.gameId, messageData);
    } catch (error) {
      this.logger.error(
        `Failed to save chat message for game ${clientData.gameId}: ${error.message}`,
      );
      client.emit('error', { message: 'Failed to save message server-side.' });
      return;
    }

    // 2. Broadcast the message to others in the room
    client.broadcast.to(clientData.gameId).emit('new_message', messageData);

    this.logger.log(
      `Chat message sent in game ${clientData.gameId} by ${clientData.username} and broadcasted`,
    );
  }
}
