import { io } from 'socket.io-client';
import { getAuthToken } from './auth.service';
import { API_BASE_URL } from '../config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    // Get the WebSocket URL from environment or use default
    const wsUrl = process.env.REACT_APP_WS_URL || 
                 API_BASE_URL.replace('http', 'ws');

    this.socket = io(wsUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 20000,
      auth: {
        token: getAuthToken()
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('authenticate', { token: getAuthToken() });
      this.triggerEvent('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.triggerEvent('disconnect', { reason });
      
      if (reason === 'io server disconnect') {
        // Reconnect after a short delay
        setTimeout(() => this.socket.connect(), 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.triggerEvent('error', { error });
    });

    this.socket.on('notification', (data) => {
      this.triggerEvent('notification', data);
    });

    this.socket.on('unreadCount', (data) => {
      this.triggerEvent('unreadCount', data);
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  triggerEvent(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();

// Auto-connect when imported
if (typeof window !== 'undefined') {
  // Only connect in browser environment
  webSocketService.connect();
}

export default webSocketService;
