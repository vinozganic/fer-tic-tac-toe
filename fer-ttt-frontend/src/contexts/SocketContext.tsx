import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import {
    GameState,
    GameStartedEvent,
    GameJoinedEvent,
    OpponentJoinedEvent,
    GameUpdateEvent,
    GameOverEvent,
    OpponentDisconnectedEvent,
    MessageEvent,
    Position,
} from "../types/gameTypes";

export interface ErrorEvent {
    message: string;
}

interface CurrentGame {
    gameId: string | null;
    gameCode: string | null;
    gameState: GameState | null;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    error: string | null;
    connecting: boolean;
    currentGame: CurrentGame;
    lastMove: {
        userId: string | null;
        username: string | null;
        position: Position | null;
    } | null;
    gameOver: boolean;
    winningLine: Position[] | null;
    initialMessages: MessageEvent[] | null;
    startGame: () => Promise<void>;
    joinGame: (gameCode: string) => Promise<void>;
    makeMove: (row: number, col: number) => Promise<void>;
    sendMessage: (message: string) => Promise<void>;
    clearGameState: () => void;
    leaveGame: () => Promise<void>;
    clearInitialMessages: () => void;
}

const defaultContextValue: SocketContextType = {
    socket: null,
    isConnected: false,
    error: null,
    connecting: false,
    currentGame: {
        gameId: null,
        gameCode: null,
        gameState: null,
    } as CurrentGame,
    lastMove: null,
    gameOver: false,
    winningLine: null,
    initialMessages: null,
    startGame: async () => {},
    joinGame: async () => {},
    makeMove: async () => {},
    sendMessage: async () => {},
    clearGameState: () => {},
    leaveGame: async () => {},
    clearInitialMessages: () => {},
};

const SocketContext = createContext<SocketContextType>(defaultContextValue);

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const CONNECTION_TIMEOUT = 10000;
const ACTION_TIMEOUT = 5000;

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentGame, setCurrentGame] = useState({
        gameId: null,
        gameCode: null,
        gameState: null,
    } as CurrentGame);
    const [lastMove, setLastMove] = useState<{
        userId: string | null;
        username: string | null;
        position: Position | null;
    } | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [winningLine, setWinningLine] = useState<Position[] | null>(null);
    const [initialMessages, setInitialMessages] = useState<MessageEvent[] | null>(null);

    const { user, token, isAuthenticated, refreshUserData } = useAuth();

    const setupSocketConnection = useCallback(() => {
        if (!isAuthenticated || !token) {
            console.log("Not authenticated or no token available yet, skipping socket connection");
            return null;
        }
        console.log("Setting up socket connection with token:", token ? "Token exists" : "No token");
        setConnecting(true);
        setError(null);
        try {
            const newSocket = io(API_URL, {
                auth: { token },
                transports: ["websocket"],
                timeout: CONNECTION_TIMEOUT,
            });
            return newSocket;
        } catch (err) {
            console.error("Error creating socket:", err);
            setConnecting(false);
            setError("Failed to create socket connection");
            return null;
        }
    }, [isAuthenticated, token]);

    const initializeSocket = useCallback(() => {
        if (socket) {
            socket.disconnect();
        }
        setCurrentGame({
            gameId: null,
            gameCode: null,
            gameState: null,
        } as CurrentGame);
        setLastMove(null);
        setGameOver(false);
        setWinningLine(null);

        const newSocket = setupSocketConnection();
        if (!newSocket) return;

        setInitialMessages(null);

        setSocket(newSocket);
        newSocket.on("connect", () => {
            console.log("Socket connected");
            setIsConnected(true);
            setConnecting(false);
            setError(null);
        });
        newSocket.on("connection_established", data => {
            console.log("Connection established", data);
        });
        newSocket.on("connect_error", err => {
            console.error("Connection error:", err);
            setIsConnected(false);
            setConnecting(false);
            setError(`Connection error: ${err.message}`);
        });
        newSocket.on("error", (err: ErrorEvent) => {
            console.error("Socket error:", err);
            setError(err.message);
        });
        newSocket.on("disconnect", reason => {
            console.log("Socket disconnected:", reason);
            setIsConnected(false);
            if (reason !== "io client disconnect") {
                setError(`Disconnected from server: ${reason}`);
            }
        });
        newSocket.on("game_started", (data: GameStartedEvent) => {
            console.log("Game started:", data);
            setCurrentGame({
                gameId: data.gameId,
                gameCode: data.gameCode,
                gameState: data.gameState,
            } as CurrentGame);
            setLastMove(null);
            setGameOver(false);
            setWinningLine(null);
        });
        newSocket.on("game_joined", (data: GameJoinedEvent) => {
            console.log("Game joined:", data);
            setCurrentGame(
                prev =>
                    ({
                        ...prev,
                        gameId: data.gameId,
                        gameState: data.gameState,
                    } as CurrentGame)
            );
            if (data.chatMessages) {
                setInitialMessages(data.chatMessages);
            }
            setLastMove(null);
            setGameOver(false);
            setWinningLine(null);
        });
        newSocket.on("opponent_joined", (data: OpponentJoinedEvent) => {
            console.log("Opponent joined:", data);
            setCurrentGame(
                prev =>
                    ({
                        ...prev,
                        gameState: data.gameState,
                    } as CurrentGame)
            );
        });
        newSocket.on("game_update", (data: GameUpdateEvent) => {
            console.log("Game update:", data);
            setCurrentGame(
                prev =>
                    ({
                        ...prev,
                        gameState: data.gameState,
                    } as CurrentGame)
            );
            if (data.lastMove) {
                setLastMove({
                    userId: data.lastMove.userId,
                    username: data.lastMove.username,
                    position: {
                        row: data.lastMove.row,
                        col: data.lastMove.col,
                    },
                });
            }
        });
        newSocket.on("game_over", (data: GameOverEvent) => {
            console.log("Game over:", data);
            setCurrentGame(
                prev =>
                    ({
                        ...prev,
                        gameState: data.gameState,
                    } as CurrentGame)
            );
            setGameOver(true);
            if (data.winningLine) {
                setWinningLine(data.winningLine.positions);
            }
        });
        newSocket.on("opponent_disconnected", (data: OpponentDisconnectedEvent) => {
            console.log("Opponent disconnected:", data);
            setCurrentGame(prev => {
                if (!prev.gameState) {
                    return prev;
                }
                const newGameState = structuredClone(prev.gameState) as any;
                let changed = false;
                if (newGameState.players.X && newGameState.players.X.userId === data.userId) {
                    newGameState.players.X.isConnected = false;
                    changed = true;
                } else if (newGameState.players.O && newGameState.players.O.userId === data.userId) {
                    newGameState.players.O.isConnected = false;
                    changed = true;
                }
                if (changed) {
                    return {
                        ...prev,
                        gameState: newGameState,
                    };
                } else {
                    return prev;
                }
            });
        });

        if (import.meta.env.DEV) {
            (window as any)._socket = newSocket;
        }
        return () => {
            console.log("Cleaning up socket connection");
            newSocket.disconnect();
            setSocket(null);
            setIsConnected(false);
            setConnecting(false);
            clearGameState();
            setInitialMessages(null);
        };
    }, [isAuthenticated, token, setupSocketConnection, refreshUserData]);

    useEffect(() => {
        const cleanup = initializeSocket();
        return () => {
            if (cleanup) cleanup();
        };
    }, [initializeSocket]);

    const startGame = async (): Promise<void> => {
        if (!socket || !isConnected) {
            throw new Error("Cannot start game: Socket not connected");
        }
        setError(null);
        return new Promise((resolve, reject) => {
            const onGameStarted = (_data: GameStartedEvent) => {
                socket.off("game_started", onGameStarted);
                socket.off("error", onError);
                resolve();
            };
            const onError = (err: ErrorEvent) => {
                socket.off("game_started", onGameStarted);
                socket.off("error", onError);
                reject(new Error(err.message));
            };
            socket.on("game_started", onGameStarted);
            socket.on("error", onError);
            socket.emit("start_game");
            setTimeout(() => {
                socket.off("game_started", onGameStarted);
                socket.off("error", onError);
                reject(new Error("Start game request timed out"));
            }, ACTION_TIMEOUT);
        });
    };

    const joinGame = async (gameCode: string): Promise<void> => {
        if (!socket || !isConnected) {
            throw new Error("Cannot join game: Socket not connected");
        }
        setError(null);
        return new Promise((resolve, reject) => {
            const onGameJoined = (_data: GameJoinedEvent) => {
                socket.off("game_joined", onGameJoined);
                socket.off("error", onError);
                resolve();
            };
            const onError = (err: ErrorEvent) => {
                socket.off("game_joined", onGameJoined);
                socket.off("error", onError);
                reject(new Error(err.message));
            };
            socket.on("game_joined", onGameJoined);
            socket.on("error", onError);
            socket.emit("join_game", { gameCode });
            setTimeout(() => {
                socket.off("game_joined", onGameJoined);
                socket.off("error", onError);
                reject(new Error("Join game request timed out"));
            }, ACTION_TIMEOUT);
        });
    };

    const makeMove = async (row: number, col: number): Promise<void> => {
        if (!socket || !isConnected || !currentGame) {
            throw new Error("Cannot make move: Socket not connected or no active game");
        }
        setError(null);
        return new Promise((resolve, reject) => {
            const onGameUpdate = (data: GameUpdateEvent) => {
                if (data.lastMove && data.lastMove.row === row && data.lastMove.col === col) {
                    socket.off("game_update", onGameUpdate);
                    socket.off("game_over", onGameOver);
                    socket.off("error", onError);
                    resolve();
                }
            };
            const onGameOver = (_data: GameOverEvent) => {
                socket.off("game_update", onGameUpdate);
                socket.off("game_over", onGameOver);
                socket.off("error", onError);
                resolve();
            };
            const onError = (err: ErrorEvent) => {
                socket.off("game_update", onGameUpdate);
                socket.off("game_over", onGameOver);
                socket.off("error", onError);
                reject(new Error(err.message));
            };
            socket.on("game_update", onGameUpdate);
            socket.on("game_over", onGameOver);
            socket.on("error", onError);
            socket.emit("make_move", { row, col });
            setTimeout(() => {
                socket.off("game_update", onGameUpdate);
                socket.off("game_over", onGameOver);
                socket.off("error", onError);
                reject(new Error("Make move request timed out"));
            }, ACTION_TIMEOUT);
        });
    };

    const sendMessage = async (message: string): Promise<void> => {
        if (!socket || !isConnected || !currentGame.gameId) {
            throw new Error("Cannot send message: Socket not connected or no active game");
        }
        setError(null);
        socket.emit("send_message", { message, userId: user?.id });
        return Promise.resolve();
    };

    const clearInitialMessages = useCallback(() => {
        setInitialMessages(null);
    }, []);

    const leaveGame = async (): Promise<void> => {
        if (!socket || !isConnected || !currentGame.gameId) {
            console.warn("Cannot leave game: Socket not connected or no active game.");
            return Promise.resolve();
        }
        setError(null);
        console.log(`Emitting leave_game for game ${currentGame.gameId}`);
        return new Promise((resolve, reject) => {
            const onAck = (ackData: any) => {
                console.log("Received left_game_ack:", ackData);
                socket.off("left_game_ack", onAck);
                socket.off("error", onError);
                resolve();
            };
            const onError = (err: ErrorEvent) => {
                socket.off("left_game_ack", onAck);
                socket.off("error", onError);
                console.error("Error during leave_game:", err.message);
                reject(new Error(err.message));
            };
            socket.on("left_game_ack", onAck);
            socket.on("error", onError);
            socket.emit("leave_game");
            setTimeout(() => {
                socket.off("left_game_ack", onAck);
                socket.off("error", onError);
                console.warn("leave_game acknowledgement timed out.");
                resolve();
            }, ACTION_TIMEOUT);
        });
    };

    const clearGameState = () => {
        setCurrentGame({
            gameId: null,
            gameCode: null,
            gameState: null,
        } as CurrentGame);
        setLastMove(null);
        setGameOver(false);
        setWinningLine(null);
    };

    const contextValue = React.useMemo<SocketContextType>(() => ({
        socket,
        isConnected,
        error,
        connecting,
        currentGame,
        lastMove,
        gameOver,
        winningLine,
        initialMessages,
        startGame,
        joinGame,
        makeMove,
        sendMessage,
        leaveGame,
        clearGameState,
        clearInitialMessages,
    }), [
        socket,
        isConnected,
        error,
        connecting,
        currentGame,
        lastMove,
        gameOver,
        winningLine,
        initialMessages,
        startGame,
        joinGame,
        makeMove,
        sendMessage,
        leaveGame,
        clearGameState,
        clearInitialMessages,
    ]);

    return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
