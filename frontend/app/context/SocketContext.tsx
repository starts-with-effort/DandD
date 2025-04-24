'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Obtener token de acceso (asegúrate de que este es el token de Simple JWT)
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      console.log('No hay token de acceso, no se conectará al socket');
      return;
    }
    
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://127.0.0.1:8000';
    console.log('Conectando a socket en:', SOCKET_URL);
    
    // Crear conexión de socket con autenticación
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token  // Enviamos el token sin el prefijo 'Bearer '
      },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Conectado al servidor de sockets');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Desconectado del servidor de sockets');
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Error de socket:', error);
    });

    setSocket(socketInstance);

    // Limpieza al desmontar
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}