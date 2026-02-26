'use client';

import { createContext, useContext } from 'react';

/**
 * Socket provider is now a no-op.
 * All real-time communication uses HTTP polling instead.
 */
interface SocketContextType {
  socket: null;
  isConnected: boolean;
  joinSession: (sessionId: string, participantId: string) => void;
  leaveSession: (sessionId: string) => void;
  emit: (...args: any[]) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinSession: () => {},
  leaveSession: () => {},
  emit: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  return (
    <SocketContext.Provider
      value={{
        socket: null,
        isConnected: false,
        joinSession: () => {},
        leaveSession: () => {},
        emit: () => {},
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
