import { useState, useEffect, useCallback } from 'react';
import { Game, GameMove, ApiError } from '../types';
import apiService from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

interface UseGameReturn {
  game: Game | null;
  moves: GameMove[];
  loading: boolean;
  error: string | null;
  makeMove: (move: any) => Promise<void>;
  refreshGame: () => Promise<void>;
  joinGame: () => Promise<void>;
}

export const useGame = (gameId: string): UseGameReturn => {
  const [game, setGame] = useState<Game | null>(null);
  const [moves, setMoves] = useState<GameMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { on, joinGameRoom, leaveGameRoom } = useSocket();

  // Load game data
  const loadGame = useCallback(async () => {
    if (!gameId) return;

    try {
      setLoading(true);
      setError(null);

      const [gameData, movesData] = await Promise.all([
        apiService.getGame(gameId),
        apiService.getGameMoves(gameId).catch(() => []) // Moves might not exist yet
      ]);

      setGame(gameData);
      setMoves(movesData);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load game';
      setError(errorMessage);
      console.error('Error loading game:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Join game room for real-time updates
  useEffect(() => {
    if (gameId) {
      joinGameRoom(gameId);
      return () => leaveGameRoom(gameId);
    }
  }, [gameId, joinGameRoom, leaveGameRoom]);

  // Set up socket event listeners
  useEffect(() => {
    const cleanup: (() => void)[] = [];

    // Listen for game updates
    cleanup.push(
      on('game-update', (data) => {
        if (data.gameId === gameId) {
          setGame(data.game);
        }
      })
    );

    // Listen for move updates
    cleanup.push(
      on('move-made', (data) => {
        if (data.gameId === gameId) {
          setGame(prev => prev ? {
            ...prev,
            currentPlayerId: data.currentPlayerId,
            moveCount: data.moveCount,
            boardState: data.newBoardState,
            status: data.isGameComplete ? 'completed' : prev.status
          } : null);
          
          // Refresh moves to get the latest
          apiService.getGameMoves(gameId)
            .then(setMoves)
            .catch(console.error);
        }
      })
    );

    // Listen for game start
    cleanup.push(
      on('game-started', (data) => {
        if (data.gameId === gameId) {
          loadGame(); // Reload full game state
        }
      })
    );

    // Listen for player join/leave
    cleanup.push(
      on('player-joined', (data) => {
        if (data.gameId === gameId) {
          setGame(prev => prev ? {
            ...prev,
            players: [...(prev.players || []), data.player]
          } : null);
        }
      })
    );

    cleanup.push(
      on('player-left', (data) => {
        if (data.gameId === gameId) {
          setGame(prev => prev ? {
            ...prev,
            players: (prev.players || []).filter(p => p.userId !== data.playerId)
          } : null);
        }
      })
    );

    return () => cleanup.forEach(fn => fn());
  }, [gameId, on, loadGame]);

  // Load game data on mount and gameId change
  useEffect(() => {
    loadGame();
  }, [loadGame]);

  // Make a move
  const makeMove = useCallback(async (move: any) => {
    if (!game || !user) {
      throw new Error('Game or user not available');
    }

    try {
      const response = await apiService.makeMove(game.id, user.id, move);
      
      // Update local game state optimistically
      setGame(prev => prev ? {
        ...prev,
        boardState: response.newBoardState,
        moveCount: (prev.moveCount || 0) + 1,
        status: response.isGameComplete ? 'completed' : prev.status
      } : null);

      // Socket will handle broadcasting to other players
    } catch (err) {
      console.error('Error making move:', err);
      throw err;
    }
  }, [game, user]);

  // Join game
  const joinGame = useCallback(async () => {
    if (!gameId || !user) {
      throw new Error('Game ID or user not available');
    }

    try {
      const updatedGame = await apiService.joinGame(gameId, user.id);
      setGame(updatedGame);
    } catch (err) {
      console.error('Error joining game:', err);
      throw err;
    }
  }, [gameId, user]);

  // Refresh game data
  const refreshGame = useCallback(() => loadGame(), [loadGame]);

  return {
    game,
    moves,
    loading,
    error,
    makeMove,
    refreshGame,
    joinGame,
  };
};

// Hook for managing multiple games (for game lists)
export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { on } = useSocket();

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const gamesData = await apiService.getGames();
      setGames(gamesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load games';
      setError(errorMessage);
      console.error('Error loading games:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for game updates
  useEffect(() => {
    const cleanup = on('game-update', () => {
      loadGames(); // Refresh entire list on any game update
    });

    return cleanup;
  }, [on, loadGames]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const createGame = useCallback(async (gameData: {
    gameType: string;
    name?: string;
    creatorId: string;
  }) => {
    try {
      const newGame = await apiService.createGame(gameData);
      setGames(prev => [newGame, ...prev]);
      return newGame;
    } catch (err) {
      console.error('Error creating game:', err);
      throw err;
    }
  }, []);

  return {
    games,
    loading,
    error,
    loadGames,
    createGame,
  };
};