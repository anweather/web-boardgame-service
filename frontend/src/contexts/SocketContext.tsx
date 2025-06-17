import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import io from 'socket.io-client';
import { SocketContextType, SocketEvents } from '../types';
import apiService from '../services/api';

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventCallbacksRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  useEffect(() => {
    // Initialize socket connection
    const initializeSocket = () => {
      try {
        socketRef.current = io(apiService.getSocketUrl(), {
          autoConnect: true,
          transports: ['websocket', 'polling'],
        });

        const socket = socketRef.current;

        // Connection event handlers
        socket.on('connect', () => {
          console.log('Socket connected:', socket.id);
          setIsConnected(true);
        });

        socket.on('disconnect', (reason: any) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
        });

        socket.on('connect_error', (error: any) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
        });

        // Handle reconnection
        socket.on('reconnect', (attemptNumber: any) => {
          console.log('Socket reconnected after', attemptNumber, 'attempts');
          setIsConnected(true);
        });

        socket.on('reconnect_attempt', (attemptNumber: any) => {
          console.log('Socket reconnection attempt:', attemptNumber);
        });

        socket.on('reconnect_error', (error: any) => {
          console.error('Socket reconnection error:', error);
        });

        socket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed');
          setIsConnected(false);
        });

      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      eventCallbacksRef.current.clear();
    };
  }, []);

  const emit = (event: string, data?: any): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: socket not connected`);
    }
  };

  const on = <K extends keyof SocketEvents>(
    event: K,
    callback: (data: SocketEvents[K]) => void
  ): (() => void) => {
    if (!socketRef.current) {
      console.warn(`Cannot register listener for ${event}: socket not initialized`);
      return () => {};
    }

    // Register the callback
    if (!eventCallbacksRef.current.has(event)) {
      eventCallbacksRef.current.set(event, new Set());
    }
    eventCallbacksRef.current.get(event)!.add(callback);

    // Add socket listener
    socketRef.current.on(event, callback);

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
      
      const callbacks = eventCallbacksRef.current.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          eventCallbacksRef.current.delete(event);
        }
      }
    };
  };

  // Generic on method for custom events
  const onAny = (event: string, callback: (data: any) => void): (() => void) => {
    if (!socketRef.current) {
      console.warn(`Cannot register listener for ${event}: socket not initialized`);
      return () => {};
    }

    socketRef.current.on(event, callback);

    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  };

  // Join game room for real-time updates
  const joinGameRoom = (gameId: string): void => {
    emit('join-game', gameId);
  };

  // Leave game room
  const leaveGameRoom = (gameId: string): void => {
    emit('leave-game', gameId);
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    emit,
    on: on as any, // Type assertion for broader event support
    onAny,
    joinGameRoom,
    leaveGameRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Specialized hooks for common socket operations
export const useGameSocket = (gameId?: string) => {
  const { on, joinGameRoom, leaveGameRoom, emit } = useSocket();
  
  useEffect(() => {
    if (gameId) {
      joinGameRoom(gameId);
      return () => leaveGameRoom(gameId);
    }
  }, [gameId, joinGameRoom, leaveGameRoom]);

  return { on, emit };
};

export const useSocketConnection = () => {
  const { isConnected } = useSocket();
  return isConnected;
};