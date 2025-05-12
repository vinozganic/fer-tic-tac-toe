// Game model definitions for Tic-Tac-Toe

export enum PlayerSymbol {
  X = 'X',
  O = 'O',
}

export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum GameResult {
  NONE = 'none',
  X_WON = 'x_won',
  O_WON = 'o_won',
  DRAW = 'draw',
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

export interface MessageEvent {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
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
  chatMessages: MessageEvent[];
  createdAt: Date;
  lastMoveAt: Date | null;
  endReason?: string;
}

export function createEmptyGameState(
  gameId: string,
  gameCode: string,
): GameState {
  return {
    id: gameId,
    code: gameCode,
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ],
    players: {
      X: null,
      O: null,
    },
    status: GameStatus.WAITING,
    currentTurn: null,
    result: GameResult.NONE,
    winningLine: null,
    moves: [],
    chatMessages: [],
    createdAt: new Date(),
    lastMoveAt: null,
  };
}

export function checkWinCondition(board: (PlayerSymbol | null)[][]): {
  hasWon: boolean;
  winningLine: WinningLine | null;
} {
  const winPatterns = [
    [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ],
    [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ],
    [
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
    [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ],
    [
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
    ],
    [
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 2, col: 2 },
    ],
    [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ],
    [
      { row: 0, col: 2 },
      { row: 1, col: 1 },
      { row: 2, col: 0 },
    ],
  ];
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    const symbolA = board[a.row][a.col];
    const symbolB = board[b.row][b.col];
    const symbolC = board[c.row][c.col];
    if (symbolA && symbolA === symbolB && symbolA === symbolC) {
      return {
        hasWon: true,
        winningLine: {
          positions: pattern,
          symbol: symbolA,
        },
      };
    }
  }
  return { hasWon: false, winningLine: null };
}

export function isBoardFull(board: (PlayerSymbol | null)[][]): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === null) {
        return false;
      }
    }
  }
  return true;
}
