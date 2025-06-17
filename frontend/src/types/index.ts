// Core type definitions for the board game application

export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
}

export interface GamePlayer {
  userId: string;
  username: string;
  color?: string;
  joinedAt: string;
}

export interface Game {
  id: string;
  name: string;
  gameType: 'chess' | 'checkers' | 'hearts' | 'solitaire';
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  players?: GamePlayer[];
  maxPlayers?: number;
  currentPlayerId?: string;
  moveCount?: number;
  boardState?: any;
  moves?: GameMove[];
}

export interface GameMove {
  id: string;
  gameId: string;
  playerId: string;
  player: GamePlayer;
  move: any;
  moveNumber: number;
  timestamp: string;
}

export interface GameType {
  type: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string, email: string) => Promise<void>;
  loading: boolean;
}

export interface SocketContextType {
  socket: any;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => () => void;
  onAny: (event: string, callback: (data: any) => void) => () => void;
  joinGameRoom: (gameId: string) => void;
  leaveGameRoom: (gameId: string) => void;
}

export interface GamePlugin {
  parseMove: (moveText: string) => any;
  formatMove: (moveData: any) => string;
  validateMove: (moveText: string) => { valid: boolean; error?: string };
  getMoveInputPlaceholder: () => string;
  getMoveInputHelp: () => string;
  getDisplayName: () => string;
  getDescription: () => string;
  getUIConfig?: () => UIConfig;
  getMoveCommands?: () => MoveCommand[];
}

export interface UIConfig {
  showSwitchUserButton?: boolean;
  showTestMoveButton?: boolean;
  showMoveHistory?: boolean;
  showMoveHelp?: boolean;
  singlePlayer?: boolean;
  useInteractiveLayout?: boolean;
}

export interface MoveCommand {
  category: string;
  commands: Array<{
    shorthand: string;
    full?: string;
    description: string;
  }>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface GameListParams extends PaginationParams {
  status?: Game['status'];
  gameType?: Game['gameType'];
}

// Socket event types
export interface SocketEvents {
  'game-started': { gameId: string; currentPlayerId: string };
  'move-made': {
    gameId: string;
    playerId: string;
    move: any;
    currentPlayerId: string;
    moveCount: number;
    newBoardState: any;
    isGameComplete: boolean;
    winner?: string;
  };
  'game-update': { gameId: string; game: Game };
  'player-joined': { gameId: string; player: GamePlayer };
  'player-left': { gameId: string; playerId: string };
}

// Component prop types
export interface GameBoardProps {
  game: Game;
  onMove: (move: any) => Promise<void>;
  currentUser: User;
  disabled?: boolean;
}

export interface GameControlsProps {
  game: Game;
  onMove: (move: any) => Promise<void>;
  currentUser: User;
  disabled?: boolean;
}

export interface GameCardProps {
  game: Game;
  onJoin: (gameId: string) => void;
  currentUser: User;
}

// Error types
export class GameError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}