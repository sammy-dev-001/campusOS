import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { createContext, JSX, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/Config';
import type { AppNavigationProp } from '../navigation/types';
import { useNotificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';

// Types
export interface MessageReaction {
  userId: string;  // Changed from number to string
  emoji: string;
  timestamp: string;
}

export interface MessageReply {
  messageId: string;
  content: string;
  senderId: number;
  senderName: string;
  isMedia?: boolean;
  mediaUrl?: string;
}

export interface Message {
  id: string;
  senderId: string;  // Changed from number to string
  chatId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isRead?: boolean;
  reactions?: Record<string, MessageReaction>;
  replyTo?: MessageReply;
  type?: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  tempId?: string;
}

export interface Participant {
  id: string;  // Changed from number to string
  username: string;
  displayName?: string;
  profilePic?: string;  // For direct profilePic property
  profilePicture?: string;
  profilePictureThumb?: string;
  status?: 'online' | 'offline' | 'away';
  user?: {
    id: string;
    username: string;
    displayName?: string;
    profilePic?: string;  // For nested user profilePic
    profilePicture?: string;
    [key: string]: any;
  };
  // Allow any additional properties
  [key: string]: any;
}

export interface Chat {
  id: string;
  name?: string;
  isGroup: boolean;
  type?: 'individual' | 'group' | 'study_group';
  participants: Participant[];
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
  updatedAt?: string;
  avatar?: string;
  isTyping?: boolean;
  typingUsers?: number[];
}

interface ChatContextType {
  chats: Chat[];
  activeChat: string | null;
  messages: Record<string, Message[]>;
  userStatus: Record<string, string>;
  isConnected: boolean;
  sendMessage: (chatId: string, message: Partial<Message>) => Promise<Message>;
  deleteMessage: (messageId: string, chatId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => void;
  replyToMessage: (chatId: string, message: Message, replyTo: Message) => void;
  forwardMessage: (message: Message, chatIds: string[]) => void;
  markAsRead: (messageIds: string[], chatId: string) => void;
  markAsDelivered: (messageIds: string[], chatId: string) => void;
  setActiveChat: (chatId: string | null) => void;
  setChats: (chats: Chat[]) => void;
  deleteChat: (chatId: string) => Promise<void>;
  createGroup: (name: string, userIds: number[], image?: string) => Promise<void>;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  searchMessages: (query: string) => Promise<Message[]>;
  sendTypingIndicator: (chatId: string, isTyping: boolean) => void;
  socket: Socket | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }): JSX.Element => {
  // State
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [userStatus, setUserStatus] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Refs to hold the latest values for things used inside callbacks declared earlier
  const userRef = useRef<any>(null);
  const makeAuthenticatedRequestRef = useRef<any>(null);

  // Helper to extract a stable sender id from various server shapes
  const extractSenderId = (raw: any): string => {
    try {
      if (raw === undefined || raw === null) return '';
      if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
      // If the server returns senderId as an object, try common fields
      if (raw._id) return String(raw._id);
      if (raw.id) return String(raw.id);
      if (raw.senderId) return String(raw.senderId);
      if (raw.userId) return String(raw.userId);
      // If it's an object like { _id: {...} } nested, try deeper
      if (raw.sender && (raw.sender._id || raw.sender.id)) {
        return String(raw.sender._id ?? raw.sender.id);
      }
      // Fallback: if it has a toString that yields useful value, use it; otherwise empty
      const maybe = String(raw);
      if (maybe && maybe !== '[object Object]') return maybe;
      return '';
    } catch (e) {
      return '';
    }
  };

  // Define all the required functions with proper types
  const sendMessageFn = useCallback(async (chatId: string, message: Partial<Message>) => {
    if (!chatId) throw new Error('Invalid chatId');
    const content = message.content || '';
    // Create a temporary ID for optimistic UI
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Ensure we have a valid senderId for optimistic messages. If userRef is not available
    // (component unmounted or user state not synced), try AsyncStorage authData as fallback.
    let senderIdVal = 'me';
    try {
      const currentUser = userRef.current;
      if (currentUser?.id) {
        senderIdVal = String(currentUser.id);
      } else {
        const authDataRaw = await AsyncStorage.getItem('authData');
        if (authDataRaw) {
          const parsed = JSON.parse(authDataRaw);
          if (parsed?.user?.id) senderIdVal = String(parsed.user.id);
        }
      }
    } catch (e) {
      console.warn('[sendMessageFn] Failed to read fallback senderId from AsyncStorage', e);
    }

    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      senderId: senderIdVal,
      chatId: chatId,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      ...(message.type ? { type: message.type } : {}),
      ...(message.mediaUrl ? { mediaUrl: message.mediaUrl } : {}),
    };

    // Optimistically add the message to state
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), optimisticMessage]
    }));

    try {
      // Send to server
      const url = `${API_BASE_URL}/chats/${chatId}/messages`;
      const bodyObj: Record<string, any> = { content, media: (message as any).media || [] };
      if (message.replyTo) {
        bodyObj.replyTo = message.replyTo;
      }
      if (message.mediaUrl) {
        bodyObj.mediaUrl = message.mediaUrl;
      }
      if (message.type) {
        bodyObj.type = message.type;
      }
      const body = JSON.stringify(bodyObj);

      const makeReq = makeAuthenticatedRequestRef.current;
      if (!makeReq) throw new Error('Auth request helper not available');

      const response = await makeReq(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const serverMsgRaw = data && data.message ? data.message : data;

      // Normalize server message to our Message shape
      const serverMessage: Message = {
        id: serverMsgRaw._id?.toString?.() || serverMsgRaw.id?.toString?.() || tempId,
        senderId: serverMsgRaw.sender?._id?.toString?.() || serverMsgRaw.sender?.id?.toString?.() ||
          (serverMsgRaw.sender?.toString?.() || optimisticMessage.senderId),
        chatId: chatId,
        content: serverMsgRaw.content || content,
        createdAt: serverMsgRaw.createdAt || new Date().toISOString(),
        status: 'sent',
      };

      // Replace optimistic message with actual server message.
      // Match by tempId when available, otherwise try to find a close match by content/sender/timestamp.
      setMessages(prev => {
        const chatMsgs = prev[chatId] || [];

        let replaced = false;
        const newMsgs = chatMsgs.map(m => {
          if (m.tempId && m.tempId === tempId) {
            replaced = true;
            return { ...serverMessage };
          }
          return m;
        });

        if (!replaced) {
          // Try a heuristic: find the last message with same content and sender within 60s
          for (let i = newMsgs.length - 1; i >= 0; i--) {
            const m = newMsgs[i];
            if (!m) continue;
            if (m.status === 'sending' && m.content === content && String(m.senderId) === String(senderIdVal)) {
              const t1 = new Date(m.createdAt).getTime();
              const t2 = new Date(serverMessage.createdAt).getTime();
              if (Math.abs(t1 - t2) < 60000) {
                newMsgs[i] = { ...serverMessage };
                replaced = true;
                break;
              }
            }
          }
        }

        // If still not replaced, append server message but avoid duplicates
        if (!replaced && !newMsgs.some(m => m.id === serverMessage.id)) {
          newMsgs.push(serverMessage);
        }

        return {
          ...prev,
          [chatId]: newMsgs
        };
      });

      return serverMessage;
    } catch (error) {
      console.error('[sendMessageFn] Error sending message:', error);

      // Mark message as failed in the UI
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          m.tempId === tempId
            ? { ...m, status: 'failed', error: error instanceof Error ? error.message : 'Failed to send' }
            : m
        )
      }));

      throw error;
    }
  }, []);

  const deleteMessageFn = useCallback(async (messageId: string, chatId: string) => {
    try {
      if (!chatId) throw new Error('Invalid chatId for deleteMessage');

      // If it's a tempId (optimistic message), just remove locally
      if (String(messageId).startsWith('temp-')) {
        setMessages(prev => {
          const chatMsgs = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: chatMsgs.filter(m => m.tempId !== messageId && m.id !== messageId)
          };
        });
        return;
      }

      // Otherwise try to delete on the server (best-effort). If server doesn't support, this will fail silently.
      const makeReq = makeAuthenticatedRequestRef.current;
      if (!makeReq) throw new Error('Auth request helper not available');
      const url = `${API_BASE_URL}/chats/${chatId}/messages/${messageId}`;
      const res = await makeReq(url, { method: 'DELETE' });
      if (res && res.ok) {
        setMessages(prev => {
          const chatMsgs = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: chatMsgs.filter(m => m.id !== messageId && m.tempId !== messageId)
          };
        });
      } else {
        // If server delete failed, just remove locally to avoid stuck failed state
        setMessages(prev => {
          const chatMsgs = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: chatMsgs.filter(m => m.id !== messageId && m.tempId !== messageId)
          };
        });
      }
    } catch (error) {
      console.error('[deleteMessageFn] Error deleting message:', error);
      // Fallback: remove locally
      setMessages(prev => {
        const chatMsgs = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: chatMsgs.filter(m => m.id !== messageId && m.tempId !== messageId)
        };
      });
    }
  }, []);

  const editMessageFn = useCallback(async (chatId: string, messageId: string, newContent: string) => {
    // Implementation for editing a message
  }, []);

  const reactToMessageFn = useCallback((chatId: string, messageId: string, emoji: string) => {
    // Implementation for reacting to a message
  }, []);


  const forwardMessageFn = useCallback((message: Message, chatIds: string[]) => {
    // Implementation for forwarding a message
  }, []);

  const markAsReadFn = useCallback((messageIds: string[], chatId: string) => {
    // Implementation for marking messages as read
  }, []);

  const markAsDeliveredFn = useCallback((messageIds: string[], chatId: string) => {
    // Implementation for marking messages as delivered
  }, []);



  const deleteChatFn = useCallback(async (chatId: string): Promise<void> => {
    try {
      const makeReq = makeAuthenticatedRequestRef.current;
      if (!makeReq) throw new Error('Auth request helper not available');

      const url = `${API_BASE_URL}/chats/${chatId}`;
      const response = await makeReq(url, { method: 'DELETE' });

      if (response.ok) {
        // Remove chat from state
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        // Also remove messages for this chat
        setMessages(prev => {
          const newMessages = { ...prev };
          delete newMessages[chatId];
          return newMessages;
        });
      } else {
        throw new Error(`Failed to delete chat: ${response.status}`);
      }
    } catch (error) {
      console.error('[deleteChatFn] Error deleting chat:', error);
      // Still remove locally on error to allow user to continue
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      throw error;
    }
  }, []);

  const sendTypingIndicatorFn = useCallback((chatId: string, isTyping: boolean) => {
    // Implementation for sending typing indicator
  }, []);

  // Refs
  const isFetchingRef = useRef(false);
  const fetchCountRef = useRef(0);
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const MAX_FETCH_ATTEMPTS = 10;
  const initializationAttempted = useRef(false);

  // Hooks
  const { socket: wsSocket, isConnected: isWsConnected } = useWebSocket();
  const { user, logout, refreshToken } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const socket = wsSocket as Socket | null;

  // ...existing code...

  // Initialize chat functionality when WebSocket connects
  useEffect(() => {
    const initializeChat = async () => {
      if (isInitialized || !isWsConnected || !user?.id || initializationAttempted.current) return;

      try {
        console.log('[ChatProvider] Initializing chat functionality');
        initializationAttempted.current = true;
        await fetchChats();
        setIsInitialized(true);
      } catch (error) {
        console.error('[ChatProvider] Failed to initialize chat:', error);
        // Reset the flag to allow retry
        initializationAttempted.current = false;
      }
    };

    initializeChat();
  }, [isWsConnected, user?.id, isInitialized]);

  // Search messages function
  const searchMessages = useCallback(async (query: string): Promise<Message[]> => {
    if (!query.trim()) return [];

    const results: Message[] = [];
    Object.values(messages).forEach(chatMessages => {
      chatMessages.forEach(message => {
        if (message.content.toLowerCase().includes(query.toLowerCase())) {
          results.push(message);
        }
      });
    });

    return results;
  }, [messages]);

  // Typing indicator function
  const sendTypingIndicator = useCallback((chatId: string, isTyping: boolean) => {
    if (!socket) return;

    // Clear any existing timeout
    if (typingTimeouts.current[chatId]) {
      clearTimeout(typingTimeouts.current[chatId]);
    }

    // Send typing indicator
    socket.emit('typing', { chatId, isTyping, userId: user?.id });

    // Set a timeout to automatically set typing to false after 3 seconds
    if (isTyping) {
      typingTimeouts.current[chatId] = setTimeout(() => {
        socket.emit('typing', { chatId, isTyping: false, userId: user?.id });
      }, 3000);
    }
  }, [socket, user?.id]);

  // Wrap chat functions to ensure initialization
  const withChatInitialization = useCallback(<T extends any[]>(fn: (...args: T) => Promise<any>) => {
    return async (...args: T) => {
      if (!isInitialized && isWsConnected) {
        try {
          await fetchChats();
          setIsInitialized(true);
        } catch (error) {
          console.error('[ChatProvider] Failed to initialize chat:', error);
          throw error;
        }
      }
      return fn(...args);
    };
  }, [isInitialized, isWsConnected]);

  // Load chats when the provider mounts or when the user changes
  useEffect(() => {
    const loadChats = async () => {
      // Skip if auth is still loading or no user ID
      if (!user?.id) {
        console.log('[ChatProvider] User not available yet, skipping chat load');
        setChats([]);
        return;
      }

      try {
        console.log('[ChatProvider] User changed, loading chats...');
        await fetchChats();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ChatProvider] Failed to load chats:', errorMessage);
      }
    };

    loadChats();
  }, [user?.id]); // Re-run when user ID changes

  // Fetch chats from the server
  // Get the refreshToken function from AuthContext
  const auth = useAuth();
  const refreshAuthToken = auth?.refreshAuthToken;

  // Handle session expiration
  const handleSessionExpired = useCallback(async (errorMessage: string) => {
    console.error('[ChatProvider] Session expired:', errorMessage);
    setAuthError('Your session has expired. Please log in again.');
    setChats([]);

    if (!refreshAuthToken) {
      console.error('[ChatProvider] refreshToken function is not available');
      return false;
    }

    try {
      // Try to refresh token first
      console.log('[ChatProvider] Attempting to refresh token...');
      const newTokens = await refreshAuthToken();

      if (newTokens) {
        // Token refresh successful, retry the operation
        console.log('[ChatProvider] Token refreshed successfully');
        return true;
      }

      // If we get here, token refresh failed
      console.log('[ChatProvider] Token refresh failed, logging out');

      // Show alert first
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                // Perform logout and cleanup
                await logout();
                // Navigate to login screen using expo-router path
                router.replace('/login');
              } catch (error) {
                console.error('Error during logout:', error);
                // Ensure we still attempt to show login
                router.replace('/login');
              }
              setAuthError(null);
            }
          }
        ]
      );

      return false;
    } catch (error) {
      console.error('[ChatProvider] Error during session expiration handling:', error);
      try {
        await logout();
        // Ensure we navigate to login even if there was an error
        router.replace('/login');
      } catch (logoutError) {
        console.error('Error during logout:', logoutError);
        // Try again to show the login screen
        router.replace('/login');
      }
      return false;
    }
  }, [logout, navigation, refreshAuthToken]);

  // Helper function to make authenticated requests with token refresh
  const makeAuthenticatedRequest = useCallback(async (
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<Response> => {
    const maxRetries = 1; // Maximum number of retry attempts

    try {
      // Log the request details for debugging
      console.log(`[makeAuthenticatedRequest] Making ${options.method || 'GET'} request to:`, url);

      // Get the current auth token
      const authData = await AsyncStorage.getItem('authData');
      if (!authData) {
        throw new Error('No authentication data found in storage');
      }

      const { token } = JSON.parse(authData);
      if (!token) {
        console.error('[makeAuthenticatedRequest] No token found in auth data');
        throw new Error('No authentication token found');
      }

      console.log('[makeAuthenticatedRequest] Making request to:', url);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      // If token expired, try to refresh it and retry
      if (response.status === 401) {
        console.log('[makeAuthenticatedRequest] Token expired or invalid, attempting refresh...');

        // If we've already retried, don't try again
        if (retryCount >= maxRetries) {
          console.log('[makeAuthenticatedRequest] Max retries reached, logging out');
          await logout();
          return response;
        }

        try {
          if (!refreshAuthToken) {
            console.error('[makeAuthenticatedRequest] refreshToken function is not available');
            throw new Error('Authentication service not available');
          }

          console.log('[makeAuthenticatedRequest] Refreshing token...');
          const refreshSuccess = await refreshAuthToken();

          if (refreshSuccess) {
            console.log('[makeAuthenticatedRequest] Token refreshed, retrying request');
            // Recursively call this function with incremented retry count
            return makeAuthenticatedRequest(url, options, retryCount + 1);
          } else {
            console.error('[makeAuthenticatedRequest] Failed to refresh token');
            await logout();
            return response;
          }
        } catch (refreshError) {
          console.error('[makeAuthenticatedRequest] Error refreshing token:', refreshError);
          await logout();
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error('[makeAuthenticatedRequest] Request failed:', error);
      // If it's an auth-related error, decide whether to log out.
      // Do NOT log out for missing auth data (startup race) — only for real auth failures.
      if (error instanceof Error) {
        const msg = error.message || '';
        // If auth data is simply missing from storage (likely because AuthProvider
        // hasn't hydrated yet), don't force a logout. Let callers handle the error.
        if (msg.includes('No authentication data found in storage') || msg.includes('No authentication token found')) {
          console.log('[makeAuthenticatedRequest] Auth data missing in storage; not logging out (possible startup race)');
          throw error;
        }

        // For explicit 401 / token-expired errors or when refresh failed, perform logout
        if (msg.includes('401') || msg.includes('Token expired') || msg.includes('Authentication service not available')) {
          console.log('[makeAuthenticatedRequest] Auth error detected, logging out...');
          await logout();
        }
      }
      throw error;
    }
  }, [refreshAuthToken, logout]);

  // Keep refs up-to-date for use inside callbacks to avoid stale closures
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { makeAuthenticatedRequestRef.current = makeAuthenticatedRequest; }, [makeAuthenticatedRequest]);

  const fetchChats = useCallback(async (): Promise<void> => {
    console.log('[fetchChats] Starting fetchChats');
    console.log('[fetchChats] User ID:', user?.id);
    console.log('[fetchChats] API Base URL:', API_BASE_URL);

    if (!user?.id) {
      console.log('[fetchChats] No user ID available, skipping chat fetch');
      setChats([]);
      return;
    }

    if (isFetchingRef.current) {
      console.log('[fetchChats] Already fetching chats, skipping');
      return;
    }

    if (fetchCountRef.current >= MAX_FETCH_ATTEMPTS) {
      console.log(`[fetchChats] Max fetch attempts (${MAX_FETCH_ATTEMPTS}) reached, skipping`);
      return;
    }

    console.log('[fetchChats] Starting chat fetch');
    isFetchingRef.current = true;
    fetchCountRef.current += 1;

    try {
      const endpoint = `${API_BASE_URL}/chats`;
      console.log(`[fetchChats] Making API request to: ${endpoint}`);

      const startTime = Date.now();
      let response;
      let responseText;

      try {
        console.log('[fetchChats] Sending fetch request...');
        response = await makeAuthenticatedRequest(endpoint, {
          method: 'GET',
        });

        const endTime = Date.now();
        console.log(`[fetchChats] Request completed in ${endTime - startTime}ms`);
        console.log('[fetchChats] Response status:', response.status);

        responseText = await response.text();
        console.log('[fetchChats] Response text length:', responseText.length);

        if (!response.ok) {
          console.error('[fetchChats] API request failed with status:', response.status);
          const errorData = responseText ? JSON.parse(responseText) : null;
          console.error('[fetchChats] Error response data:', errorData);

          // Handle 401 Unauthorized (token expired)
          if (response.status === 401) {
            console.log('[fetchChats] Token expired, attempting to refresh...');
            const sessionRefreshed = await handleSessionExpired(errorData?.message || 'Session expired');
            if (!sessionRefreshed) {
              console.log('[fetchChats] Session refresh failed, user logged out');
              return; // User was logged out
            }
            // If token was refreshed, retry the request
            console.log('[fetchChats] Session refreshed, retrying chat fetch');
            return fetchChats();
          }

          throw new Error(`API request failed with status ${response.status}: ${errorData?.message || response.statusText}`);
        }
      } catch (error) {
        console.error('[fetchChats] Network error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown network error';

        // Check for 401 in error message
        if (errorMessage.includes('401') || errorMessage.includes('Token expired')) {
          const sessionRefreshed = await handleSessionExpired('Session expired');
          if (sessionRefreshed) {
            // If token was refreshed, retry the request
            return fetchChats();
          }
          return;
        }

        throw new Error(`Network error: ${errorMessage}`);
      }

      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
        console.log('[fetchChats] Parsed response data type:', typeof data);
        if (data) {
          console.log('[fetchChats] Response data keys:', Object.keys(data));
          if (Array.isArray(data)) {
            console.log(`[fetchChats] Received ${data.length} chats`);
          } else if (data.data && Array.isArray(data.data)) {
            console.log(`[fetchChats] Received ${data.data.length} chats in data property`);
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error('[fetchChats] Failed to parse response as JSON:', errorMessage);
        throw new Error(`Invalid JSON response (status ${response.status}): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      }

      // Check if data is an array or if it's nested under a 'data' property
      let chatsData = data;
      if (data && !Array.isArray(data) && data.data && Array.isArray(data.data)) {
        console.log('[fetchChats] Found chats in data.data');
        chatsData = data.data;
      } else if (data && !Array.isArray(data)) {
        console.error('[fetchChats] Expected array of chats but got:', typeof data, data);
        setChats([]);
        return;
      }

      if (!Array.isArray(chatsData)) {
        console.error('[fetchChats] Invalid chats data format after processing:', chatsData);
        setChats([]);
        return;
      }

      console.log(`[fetchChats] Found ${chatsData.length} chats in response`);

      console.log(`[fetchChats] Processing ${data.length} chats`);

      // Transform the API response to match the Chat interface
      const transformedChats = (chatsData as any[])
        .filter((chat: any) => {
          const isValid = chat && chat.id;
          if (!isValid) {
            console.warn('[fetchChats] Filtered out invalid chat:', chat);
          }
          return isValid;
        })
        .map((chat: any) => {
          console.log(`[fetchChats] Processing chat:`, chat.id);

          // Log the full participant data for debugging
          console.log(`[fetchChats] Raw participants data:`, JSON.stringify(chat.participants));

          const otherParticipants: Array<{ id: string, displayName?: string, username?: string, profilePicture?: string }> = [];
          if (Array.isArray(chat.participants)) {
            chat.participants.forEach((p: { user?: { id: string, displayName?: string, username?: string } }) => {
              if (p.user && p.user.id !== user?.id) {
                otherParticipants.push({
                  id: p.user.id,
                  displayName: p.user.displayName,
                  username: p.user.username,
                });
              }
            });
          }

          console.log(`[fetchChats] Chat ${chat.id} has ${otherParticipants.length} other participants:`,
            otherParticipants.map(p => ({
              id: p.id,
              displayName: p.displayName || 'no-displayName',
              username: p.username || 'no-username',
              profilePicture: p.profilePicture || 'no-avatar'
            }))
          );

          // Try to get the best available name in this order: chat.name, user.displayName, user.username, or fallback
          let chatName = 'Unknown User';
          if (chat.isGroup) {
            chatName = chat.name || 'Group Chat';
          } else if (otherParticipants.length > 0) {
            const otherUser = otherParticipants[0];
            chatName = otherUser.displayName || otherUser.username || 'Unknown User';

            // If we still have Unknown User, log the full participant for debugging
            if (chatName === 'Unknown User') {
              console.warn(`[fetchChats] Could not determine name for user in chat ${chat.id}:`,
                JSON.stringify(otherUser, null, 2));
            }
          }

          const transformedChat = {
            id: chat.id.toString(),
            name: chatName,
            isGroup: chat.isGroup || false,
            type: chat.type || 'individual',
            participants: Array.isArray(chat.participants) ? chat.participants : [],
            lastMessage: chat.lastMessage ? {
              id: chat.lastMessage.id,
              content: chat.lastMessage.content,
              senderId: chat.lastMessage.senderId,
              chatId: chat.id.toString(),
              createdAt: chat.lastMessage.createdAt,
              status: (chat.lastMessage.status as 'sending' | 'sent' | 'delivered' | 'read' | 'failed') || 'delivered',
              isRead: chat.lastMessage.isRead || false,
            } : null,
            unreadCount: chat.unreadCount || 0,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt || chat.lastMessage?.createdAt || chat.createdAt,
            avatar: chat.avatar || (otherParticipants[0]?.profilePicture || null),
          };

          console.log(`[fetchChats] Transformed chat ${chat.id}:`, transformedChat);
          return transformedChat;
        });

      console.log('Transformed chats:', transformedChats);
      setChats(transformedChats);
      fetchCountRef.current = 0;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in fetchChats:', errorMessage);

      if (chats.length === 0) {
        console.log('No chats available, setting empty array');
        setChats([]);
      }

      throw error;
    } finally {
      isFetchingRef.current = false;
      console.log('Finished fetching chats');
    }
  }, [user?.id, chats.length]);

  // WebSocket event handlers
  const onConnect = useCallback(() => {
    console.log('WebSocket connected');
    setIsConnected(true);
  }, []);

  const onDisconnect = useCallback(() => {
    console.log('WebSocket disconnected');
    setIsConnected(false);
  }, []);

  // Get the notification service
  const { notifyNewMessage } = useNotificationService();
  const { user: currentUser } = useAuth();

  const handleNewMessage = useCallback((payload: any) => {
    try {
      if (!payload) return;

      let message: Message;

      // Handle server payload shape: { chatId, message: { ... } }
      if (payload.chatId && payload.message) {
        const msg = payload.message;
        message = {
          id: msg._id?.toString?.() || msg.id?.toString?.() || msg.id || (msg.tempId || `srv-${Date.now()}`),
          senderId: msg.sender?._id?.toString?.() || msg.sender?.id?.toString?.() || msg.sender?.toString?.() || (msg.sender || ''),
          chatId: payload.chatId?.toString?.() || msg.chatId?.toString?.() || '',
          content: msg.content || '',
          createdAt: msg.createdAt || new Date().toISOString(),
          status: 'sent',
        };
      } else {
        // Assume payload is already a Message-like object
        message = payload as Message;
      }

      const chatId = String((message as any).chatId ?? '').trim();
      if (!chatId) return;

      // Show notification for new messages not sent by the current user and when the chat is not active
      if (message.senderId !== currentUser?.id?.toString() && chatId !== activeChat) {
        // Find the chat to get the sender's name
        const chat = chats.find(c => c.id === chatId);
        const sender = chat?.participants?.find(p => p.id === message.senderId);
        const senderName = sender?.displayName || sender?.username || 'Someone';

        // Show notification
        notifyNewMessage(
          senderName,
          message.content || 'New message',
          chatId
        );
      }

      setMessages(prev => {
        const chatMessages = prev[chatId] || [];

        // Normalize incoming message
        const rawId = (message as any)._id ?? (message as any).id ?? (message as any).tempId ?? `srv-${Date.now()}`;
        const rawSender = extractSenderId((message as any).sender ?? (message as any).senderId ?? message);
        const normalized: Message = {
          id: String(rawId),
          tempId: (message as any).tempId ? String((message as any).tempId) : undefined,
          senderId: String(rawSender),
          chatId: chatId,
          content: message.content ?? '',
          createdAt: message.createdAt ?? new Date().toISOString(),
          status: (message as any).status ?? 'sent'
        } as Message;

        // Try to find an existing optimistic message to replace
        let replaced = false;
        const newMsgs = chatMessages.slice();

        // Find index by these rules (in order):
        // 1) existing.tempId === normalized.tempId
        // 2) existing.tempId === normalized.id (server might return tempId as id)
        // 3) existing.id === normalized.id
        // 4) heuristic: same content & sender within 60s and status sending
        let idx = newMsgs.findIndex(m => m.tempId && normalized.tempId && m.tempId === normalized.tempId);
        if (idx === -1) idx = newMsgs.findIndex(m => m.tempId && m.tempId === normalized.id);
        if (idx === -1) idx = newMsgs.findIndex(m => m.id && normalized.id && m.id === normalized.id);
        if (idx === -1) {
          idx = newMsgs.findIndex(m => m.status === 'sending' && m.content === normalized.content && m.senderId === normalized.senderId && Math.abs(new Date(m.createdAt).getTime() - new Date(normalized.createdAt).getTime()) < 60000);
        }

        if (idx !== -1) {
          // Merge/replace and ensure status is at least 'sent'
          newMsgs[idx] = { ...newMsgs[idx], ...normalized, status: normalized.status || 'sent' } as Message;
          replaced = true;
        }

        // If not replaced, avoid duplicates by id and append
        if (!replaced) {
          const existsById = newMsgs.some(m => m.id && normalized.id && m.id === normalized.id);
          if (!existsById) {
            newMsgs.push(normalized);
          } else {
            // nothing to do
            return prev;
          }
        }

        return {
          ...prev,
          [chatId]: newMsgs
        };
      });
    } catch (error) {
      console.error('[handleNewMessage] Error normalizing incoming message:', error);
    }
  }, []);

  // Set up WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    console.log('Setting up WebSocket listeners');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    // Support both legacy 'new_message' and server's 'newMessage' event names
    socket.on('new_message', handleNewMessage);
    socket.on('newMessage', handleNewMessage);

    // Initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, onConnect, onDisconnect, handleNewMessage]);

  // Fetch chats on mount and when user changes
  useEffect(() => {
    let mounted = true;

    const fetchIfNeeded = async () => {
      if (!user?.id || !mounted) return;

      if (!isFetchingRef.current && fetchCountRef.current === 0) {
        console.log('Triggering initial chat fetch for user:', user.id);
        await fetchChats();
      }
    };

    fetchIfNeeded();

    return () => {
      mounted = false;
    };
  }, [user?.id, fetchChats]);

  // Chat functions with implementations

  const replyToMessageFn = useCallback((chatId: string, message: Message, replyTo: Message) => {
    console.log('Replying to message:', { chatId, message, replyTo });
  }, []);

  const createGroupFn = useCallback(async (name: string, userIds: number[], image?: string) => {
    console.log('Creating group:', { name, userIds, image });
  }, []);

  // Fetch messages function
  const fetchMessagesFn = useCallback(async (chatId: string): Promise<void> => {
    try {
      console.log('[fetchMessages] Fetching messages for chat:', chatId);

      // Early return if chatId is not a string or is empty
      if (!chatId || typeof chatId !== 'string') {
        console.warn('[fetchMessages] Invalid chat ID (not a string or empty):', chatId);
        return;
      }

      // Get current messages before fetching to preserve pending states
      const currentMessages = messages[chatId] || [];
      const pendingMessages = currentMessages.filter(m =>
        m.status === 'sending' || m.status === 'failed' || m.tempId
      );

      console.log(`[fetchMessages] Found ${pendingMessages.length} pending messages to preserve`);

      // Clean the chat ID to remove any potential whitespace
      const cleanedChatId = chatId.trim();

      // Simple validation for MongoDB ObjectId format (24 hex characters)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(cleanedChatId)) {
        console.warn('[fetchMessages] Skipping fetch - invalid chat ID format, expected 24 hex characters:', cleanedChatId);
        return;
      }

      // Get the base URL from environment or config
      const baseUrl = API_BASE_URL || 'https://campusos-backend.onrender.com/api/v1';

      // Construct the URL with the cleaned chat ID
      const url = `${baseUrl}/chats/${cleanedChatId}`;
      console.log('[fetchMessages] Making request to:', url);

      try {
        // Make the authenticated request
        const response = await makeAuthenticatedRequest(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(`[fetchMessages] Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[fetchMessages] Request failed with status ${response.status}:`, errorText);

          if (response.status === 401) {
            console.log('[fetchMessages] Token might be expired, attempting to refresh...');
            const sessionRefreshed = await handleSessionExpired('Session expired. Please log in again.');
            if (sessionRefreshed) {
              console.log('[fetchMessages] Session refreshed, retrying...');
              return fetchMessagesFn(chatId);
            }
            return;
          }

          throw new Error(`Server responded with status ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('[fetchMessages] Response data:', responseData);

        let serverMessages: Message[] = [];

        // Check if the response has a 'messages' or 'data' property
        if (responseData.messages && Array.isArray(responseData.messages)) {
          serverMessages = responseData.messages;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          serverMessages = responseData.data;
        } else if (responseData) {
          console.log('[fetchMessages] No messages array found in response, using empty array');
        }

        // Normalize incoming messages
        const normalizedMessages: Message[] = (serverMessages || []).map((m: any) => {
          const rawId = m._id ?? m.id ?? m.tempId ?? `srv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const rawSender = extractSenderId(m.sender ?? m.senderId ?? m);

          return {
            id: String(rawId),
            tempId: m.tempId ? String(m.tempId) : undefined,
            senderId: String(rawSender),
            chatId: String(m.chatId ?? chatId),
            content: m.content ?? '',
            createdAt: m.createdAt ?? m.timestamp ?? new Date().toISOString(),
            updatedAt: m.updatedAt,
            status: (m.status as Message['status']) ?? 'sent',
            mediaUrl: m.mediaUrl,
            replyTo: m.replyTo,
            type: m.type ?? 'text',
          } as Message;
        });

        // Merge server messages with pending messages
        const mergedMessages = [...normalizedMessages];

        // Add any pending messages that aren't already in the server response
        pendingMessages.forEach(pendingMsg => {
          const exists = mergedMessages.some(m =>
            m.id === pendingMsg.id ||
            (m.tempId && m.tempId === pendingMsg.tempId) ||
            (m.content === pendingMsg.content &&
              m.senderId === pendingMsg.senderId &&
              Math.abs(new Date(m.createdAt).getTime() - new Date(pendingMsg.createdAt).getTime()) < 60000)
          );

          if (!exists) {
            console.log(`[fetchMessages] Preserving pending message: ${pendingMsg.content?.substring(0, 20)}...`);
            mergedMessages.push(pendingMsg);
          }
        });

        // Sort by timestamp
        const sortedMessages = mergedMessages.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        console.log(`[fetchMessages] Merged ${normalizedMessages.length} server messages with ${pendingMessages.length} pending messages`);

        // Update the messages in the state using the merged and sorted array
        setMessages(prev => ({
          ...prev,
          [chatId]: sortedMessages
        }));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[fetchMessages] Request error:', errorMessage);

        // If it's an auth error, try to refresh the session
        if (errorMessage.includes('auth') || errorMessage.includes('token') || errorMessage.includes('401')) {
          console.log('[fetchMessages] Authentication error, attempting to refresh session');
          const sessionRefreshed = await handleSessionExpired(errorMessage);
          if (sessionRefreshed) {
            console.log('[fetchMessages] Session refreshed, retrying message fetch');
            return fetchMessagesFn(chatId);
          }
        }

        // Even if we couldn't fetch new messages, keep the existing ones
        if (currentMessages.length > 0) {
          console.log('[fetchMessages] Keeping existing messages after error');
          return;
        }

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[fetchMessages] Error in fetchMessagesFn:', errorMessage, error);

      // Don't clear existing messages on error, just log it
      console.log('[fetchMessages] Preserving existing messages after error');

      // Re-throw the error to be handled by the caller if needed
      throw new Error(`Failed to fetch messages: ${errorMessage}`);
    }
  }, [handleSessionExpired, makeAuthenticatedRequest, messages, setMessages]);

  // Create context value with all required functions and state
  const contextValue = useMemo<ChatContextType>(() => ({
    chats,
    activeChat,
    messages,
    userStatus,
    isConnected,
    sendMessage: sendMessageFn,
    deleteMessage: deleteMessageFn,
    editMessage: editMessageFn,
    reactToMessage: reactToMessageFn,
    replyToMessage: replyToMessageFn,
    forwardMessage: forwardMessageFn,
    markAsRead: markAsReadFn,
    markAsDelivered: markAsDeliveredFn,
    setActiveChat,
    setChats,
    deleteChat: deleteChatFn,
    createGroup: createGroupFn,
    fetchChats,
    fetchMessages: fetchMessagesFn,
    searchMessages,
    sendTypingIndicator: sendTypingIndicatorFn,
    socket,
  }), [
    chats,
    activeChat,
    messages,
    userStatus,
    isConnected,
    sendMessageFn,
    deleteMessageFn,
    editMessageFn,
    reactToMessageFn,
    replyToMessageFn,
    forwardMessageFn,
    markAsReadFn,
    markAsDeliveredFn,
    setActiveChat,
    setChats,
    deleteChatFn,
    createGroupFn,
    fetchChats,
    fetchMessagesFn,
    searchMessages,
    sendTypingIndicatorFn,
    socket,
  ]);

  // Render the session expired UI if there's an auth error
  if (authError) {
    return (
      <ChatContext.Provider value={contextValue}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
            Your session has expired. Please log in again to continue.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#007bff',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 5,
            }}
            onPress={() => {
              setAuthError(null);
              router.replace('/login');
            }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>Log In Again</Text>
          </TouchableOpacity>
        </View>
      </ChatContext.Provider>
    );
  }

  // Normal render when there's no auth error
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Export the provider component
export { ChatProvider as default };

