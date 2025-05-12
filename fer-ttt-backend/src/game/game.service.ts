import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  createEmptyGameState,
  Player,
  PlayerSymbol,
  GameStatus,
  GameResult,
  GameMove,
  checkWinCondition,
  isBoardFull,
  MessageEvent,
} from './models/game.model';
import { UsersService } from '../users/users.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly games = new Map<string, GameState>();
  private readonly gamesByCode = new Map<string, string>();

  constructor(private readonly usersService: UsersService) {}

  private generateGameCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters.charAt(randomIndex);
    }
    if (this.gamesByCode.has(code)) {
      return this.generateGameCode();
    }
    return code;
  }

  createGame(): { gameId: string; gameCode: string } {
    const gameId = uuidv4();
    const gameCode = this.generateGameCode();
    const gameState = createEmptyGameState(gameId, gameCode);
    this.games.set(gameId, gameState);
    this.gamesByCode.set(gameCode, gameId);
    this.logger.log(`New game created - ID: ${gameId}, Code: ${gameCode}`);
    return { gameId, gameCode };
  }

  findGameById(gameId: string): GameState {
    const game = this.games.get(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }
    return game;
  }

  findGameByCode(gameCode: string): GameState {
    const gameId = this.gamesByCode.get(gameCode);
    if (!gameId) {
      throw new NotFoundException(`Game with code ${gameCode} not found`);
    }
    return this.findGameById(gameId);
  }

  addPlayerToGame(gameId: string, player: Player): GameState {
    const game = this.findGameById(gameId);
    if (game.players.X && game.players.O) {
      throw new BadRequestException('Game is already full');
    }
    if (
      (game.players.X && game.players.X.userId === player.userId) ||
      (game.players.O && game.players.O.userId === player.userId)
    ) {
      if (game.players.X && game.players.X.userId === player.userId) {
        game.players.X.isConnected = true;
      } else if (game.players.O) {
        game.players.O.isConnected = true;
      }
      this.games.set(gameId, game);
      return game;
    }
    if (!game.players.X) {
      player.symbol = PlayerSymbol.X;
      game.players.X = player;
    } else if (!game.players.O) {
      player.symbol = PlayerSymbol.O;
      game.players.O = player;
      game.status = GameStatus.IN_PROGRESS;
      game.currentTurn = PlayerSymbol.X;
    }
    this.games.set(gameId, game);
    this.logger.log(
      `Player ${player.username} added to game ${gameId} as ${player.symbol}`,
    );
    return game;
  }

  makeMove(
    gameId: string,
    userId: string,
    row: number,
    col: number,
  ): GameState {
    const game = this.findGameById(gameId);
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress');
    }
    let player: Player;
    if (game.players.X && game.players.X.userId === userId) {
      player = game.players.X;
    } else if (game.players.O && game.players.O.userId === userId) {
      player = game.players.O;
    } else {
      throw new BadRequestException('Player is not in this game');
    }
    if (game.currentTurn !== player.symbol) {
      throw new BadRequestException('Not your turn');
    }
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      throw new BadRequestException('Invalid position');
    }
    if (game.board[row][col] !== null) {
      throw new BadRequestException('Position already taken');
    }
    game.board[row][col] = player.symbol;
    const move: GameMove = {
      playerId: player.userId,
      symbol: player.symbol,
      position: { row, col },
      timestamp: new Date(),
    };
    game.moves.push(move);
    game.lastMoveAt = move.timestamp;
    const { hasWon, winningLine } = checkWinCondition(game.board);
    if (hasWon) {
      game.status = GameStatus.COMPLETED;
      game.result =
        player.symbol === PlayerSymbol.X ? GameResult.X_WON : GameResult.O_WON;
      game.winningLine = winningLine;
      game.currentTurn = null;
    } else if (isBoardFull(game.board)) {
      game.status = GameStatus.COMPLETED;
      game.result = GameResult.DRAW;
      game.currentTurn = null;
    } else {
      game.currentTurn =
        player.symbol === PlayerSymbol.X ? PlayerSymbol.O : PlayerSymbol.X;
    }
    this.games.set(gameId, game);
    this.logger.log(
      `Move made in game ${gameId} by ${player.username} at position [${row},${col}]`,
    );
    return game;
  }

  private async finalizeGameAsForfeit(
    game: GameState,
    leavingPlayerId: string,
    reason: 'forfeit_disconnection' | 'forfeit_leave',
  ): Promise<GameState> {
    if (game.status !== GameStatus.IN_PROGRESS) {
      return game;
    }
    const leavingPlayerSymbol =
      game.players.X?.userId === leavingPlayerId
        ? PlayerSymbol.X
        : game.players.O?.userId === leavingPlayerId
          ? PlayerSymbol.O
          : null;
    if (!leavingPlayerSymbol) {
      this.logger.warn(
        `Cannot process forfeit for game ${game.id}: Leaving player ${leavingPlayerId} not found.`,
      );
      return game;
    }
    const opponentSymbol =
      leavingPlayerSymbol === PlayerSymbol.X ? PlayerSymbol.O : PlayerSymbol.X;
    const opponentPlayer = game.players[opponentSymbol];
    game.status = GameStatus.COMPLETED;
    game.result =
      opponentSymbol === PlayerSymbol.X ? GameResult.X_WON : GameResult.O_WON;
    game.currentTurn = null;
    game.endReason = reason;
    game.lastMoveAt = new Date();
    this.logger.log(
      `Game ${game.id} completed due to ${reason} by player ${leavingPlayerId} (${game.players[leavingPlayerSymbol]?.username}). Winner: ${opponentPlayer?.username}`,
    );
    try {
      if (opponentPlayer) {
        await this.usersService.incrementWins(opponentPlayer.userId);
        this.logger.log(`Win recorded for player ${opponentPlayer.username}`);
      }
      await this.usersService.incrementLosses(leavingPlayerId);
      this.logger.log(
        `Loss recorded for player ${game.players[leavingPlayerSymbol]?.username}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating player statistics for forfeit: ${error.message}`,
      );
    }
    this.games.set(game.id, game);
    return game;
  }

  async handlePlayerDisconnect(
    gameId: string,
    userId: string,
  ): Promise<GameState | null> {
    const game = this.games.get(gameId);
    if (!game) return null;
    let disconnectedPlayer: Player | null = null;
    if (game.players.X?.userId === userId) {
      disconnectedPlayer = game.players.X;
      game.players.X.isConnected = false;
    } else if (game.players.O?.userId === userId) {
      disconnectedPlayer = game.players.O;
      game.players.O.isConnected = false;
    } else {
      return game;
    }
    this.logger.log(
      `Player ${disconnectedPlayer.username} disconnected from game ${gameId}`,
    );
    if (game.status === GameStatus.COMPLETED) {
      this.games.set(gameId, game);
      return game;
    }
    if (game.status === GameStatus.IN_PROGRESS) {
      this.logger.log(
        `Game ${gameId} was in progress. Finalizing as forfeit due to disconnect by ${disconnectedPlayer.username}.`,
      );
      const finalState = await this.finalizeGameAsForfeit(
        game,
        userId,
        'forfeit_disconnection',
      );
      this.games.set(gameId, finalState);
      return finalState;
    } else {
      this.games.set(gameId, game);
      return game;
    }
  }

  async handlePlayerLeave(
    gameId: string,
    userId: string,
  ): Promise<GameState | null> {
    const game = this.games.get(gameId);
    if (!game) {
      this.logger.warn(
        `Attempted to leave game ${gameId} which does not exist.`,
      );
      return null;
    }
    const isPlayerInGame =
      game.players.X?.userId === userId || game.players.O?.userId === userId;
    if (!isPlayerInGame) {
      this.logger.warn(
        `Player ${userId} attempted to leave game ${gameId} but was not part of it.`,
      );
      return game;
    }
    if (game.status === GameStatus.IN_PROGRESS) {
      this.logger.log(
        `Player ${userId} intentionally leaving game ${gameId}. Processing forfeit.`,
      );
      return await this.finalizeGameAsForfeit(game, userId, 'forfeit_leave');
    } else {
      this.logger.log(
        `Player ${userId} leaving game ${gameId} which is in state ${game.status}. No forfeit needed.`,
      );
      if (
        game.status === GameStatus.WAITING &&
        game.players.X?.userId === userId
      ) {
        game.players.X.isConnected = false;
      }
      this.games.set(gameId, game);
      return game;
    }
  }

  addChatMessage(gameId: string, message: MessageEvent): void {
    const game = this.findGameById(gameId);

    game.chatMessages.push(message);
    this.games.set(gameId, game); // Update the game state in the map
    this.logger.log(`Chat message added to game ${gameId}`);
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  removeGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }
    this.games.delete(gameId);
    this.gamesByCode.delete(game.code);
    this.logger.log(`Game ${gameId} removed`);
    return true;
  }
}
