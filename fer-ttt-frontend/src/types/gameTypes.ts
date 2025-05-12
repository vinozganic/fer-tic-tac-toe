// Game related type definitions

export enum PlayerSymbol {
    X = "X",
    O = "O",
}

export enum GameStatus {
    WAITING = "waiting",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
}

export enum GameResult {
    NONE = "none",
    X_WON = "x_won",
    O_WON = "o_won",
    DRAW = "draw",
}

export interface Player {
    userId: string;
    username: string;
    symbol?: PlayerSymbol;
    isConnected: boolean;
}

export interface Position {
    row: number;
    col: number;
}

export interface GameMove {
    playerId: string;
    symbol: PlayerSymbol;
    position: Position;
    timestamp: Date;
}

export interface WinningLine {
    positions: Position[];
    symbol: PlayerSymbol;
}

export interface GameState {
    id: string;
    code: string;
    board: (PlayerSymbol | null)[][];
    players: {
        X: Player | null;
        O: Player | null;
    };
    status: GameStatus;
    currentTurn: PlayerSymbol | null;
    result: GameResult;
    winningLine: WinningLine | null;
    moves: GameMove[];
    createdAt: Date;
    lastMoveAt: Date | null;
    endReason?: string;
}

export interface GameStartedEvent {
    gameId: string;
    gameCode: string;
    gameState: GameState;
    message: string;
}

export interface GameJoinedEvent {
    gameId: string;
    gameState: GameState;
    chatMessages?: MessageEvent[];
    message: string;
}

export interface OpponentJoinedEvent {
    gameState: GameState;
    message: string;
}

export interface GameUpdateEvent {
    gameState: GameState;
    lastMove: {
        userId: string;
        username: string;
        row: number;
        col: number;
    };
}

export interface GameOverEvent {
    gameState: GameState;
    result: GameResult;
    winningLine: WinningLine | null;
}

export interface OpponentDisconnectedEvent {
    message: string;
    userId: string;
}

export interface MessageEvent {
    userId: string;
    username: string;
    message: string;
    timestamp: string;
}
