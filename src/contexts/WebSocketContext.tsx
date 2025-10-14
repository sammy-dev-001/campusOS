import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';

type WebSocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (event: string, data: any) => void;
};

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  lastMessage: null,
  sendMessage: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const { user } = useAuth();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Get the auth token from AsyncStorage
  useEffect(() => {
    const getToken = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const { token } = JSON.parse(authData);
          setAuthToken(token);
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    };

    getToken();
  }, []); // Removed user dependency to prevent re-renders

  useEffect(() => {
    if (!user || !authToken) return;

    // Initialize socket connection
    const socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: {
        token: authToken,
        userId: user.id,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      
      // Join user's personal room
      socketInstance.emit('join', { userId: user.id });
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Listen for new messages
    socketInstance.on('new_message', (message) => {
      console.log('New message received:', message);
      setLastMessage(message);
      // You can add additional logic here to handle the new message
      // For example, update your chat state or show a notification
    });

    setSocket(socketInstance);

    // Store the socket instance in the ref
    socketRef.current = socketInstance;

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
