import { User, Game, GameType, GameMove, ApiError, GameListParams } from '../types';

export class ApiService {
  private baseURL: string;

  constructor(baseURL: string = window.location.origin) {
    this.baseURL = baseURL;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: response.statusText 
        }));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData.code
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`Network error: ${error}`);
    }
  }

  // Authentication API methods
  async login(username: string, password: string): Promise<{ user: User; token?: string }> {
    return this.request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(
    username: string, 
    password: string, 
    email: string
  ): Promise<{ user: User; token?: string }> {
    return this.request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    });
  }

  // User API methods
  async getUsers(): Promise<User[]> {
    return this.request('/api/users');
  }

  async getUser(userId: string): Promise<User> {
    return this.request(`/api/users/${userId}`);
  }

  async getUserGames(userId: string): Promise<Game[]> {
    return this.request(`/api/users/${userId}/games`);
  }

  // Game API methods
  async getGames(params?: Partial<GameListParams>): Promise<Game[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.gameType) searchParams.append('gameType', params.gameType);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    const endpoint = query ? `/api/games?${query}` : '/api/games';
    
    return this.request(endpoint);
  }

  async getGame(gameId: string): Promise<Game> {
    return this.request(`/api/games/${gameId}`);
  }

  async createGame(gameData: {
    gameType: string;
    name?: string;
    creatorId: string;
  }): Promise<Game> {
    return this.request('/api/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  }

  async joinGame(gameId: string, userId: string): Promise<Game> {
    return this.request(`/api/games/${gameId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async makeMove(gameId: string, userId: string, move: any): Promise<{
    game: Game;
    newBoardState: any;
    isGameComplete: boolean;
    winner?: string;
  }> {
    return this.request(`/api/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ userId, move }),
    });
  }

  async getGameMoves(gameId: string): Promise<GameMove[]> {
    return this.request(`/api/games/${gameId}/moves`);
  }

  async forceStartGame(gameId: string): Promise<Game> {
    return this.request(`/api/games/${gameId}/force-start`, {
      method: 'POST',
    });
  }

  // Game Types API methods
  async getGameTypes(): Promise<GameType[]> {
    return this.request('/api/game-types');
  }

  async getGameType(gameType: string): Promise<GameType> {
    return this.request(`/api/game-types/${gameType}`);
  }

  async validateGameType(gameType: string, config: any = {}): Promise<{ valid: boolean }> {
    return this.request(`/api/game-types/${gameType}/validate`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Admin API methods
  async purgeDatabase(): Promise<{ message: string }> {
    return this.request('/api/admin/purge', {
      method: 'POST',
    });
  }

  // Utility methods
  getGameImageUrl(gameId: string, options?: { width?: number; height?: number }): string {
    const params = new URLSearchParams();
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    params.append('t', Date.now().toString()); // Cache busting
    
    const query = params.toString();
    return `${this.baseURL}/api/games/${gameId}/image${query ? `?${query}` : ''}`;
  }

  // WebSocket URL for Socket.IO
  getSocketUrl(): string {
    return this.baseURL;
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService;