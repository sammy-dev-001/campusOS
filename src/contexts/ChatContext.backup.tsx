import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { v4 as uuid } from 'uuid';
import { API_BASE_URL } from '../constants/Config';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Re-export types for external use
export * from './UserContext';
export * from './WebSocketContext';

// Define types for WebSocket context
type WebSocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: any) => void;
};

// Define user type
type User = {
  id: number;
  name: string;
  email: string;
  profilePicture?: string;
};

export interface MessageReaction {
  userId: number;
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
  senderId: number;
  chatId: number | string;
  content: string;
  createdAt: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'file' | 'group' | 'individual';
  mediaUrl?: string;
  sender?: {
    username: string;
    profilePicture?: string;
  };
  tempId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy?: number[];
  reactions?: Record<string, MessageReaction>;
  replyTo?: MessageReply;
  forwardedFrom?: {
    userId: number;
    username: string;
  };
  searchTerms?: string[];
  edited?: boolean;
}

export interface Participant {
  id: number;
  username: string;
  profilePicture?: string;
  profilePictureThumb?: string;
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
}

interface UserStatus {
  [key: string]: 'online' | 'offline';
}

interface ChatContextType {
  // Basic chat functionality
  chats: Chat[];
  activeChat: string | null;
  messages: Record<string, Message[]>;
  userStatus: Record<string, string>;
  isConnected: boolean;
  
  // Message actions
  sendMessage: (chatId: string, message: Partial<Message>) => Promise<void>;
  deleteMessage: (messageId: string, chatId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => void;
  replyToMessage: (chatId: string, message: Message, replyTo: Message) => void;
  forwardMessage: (message: Message, chatIds: string[]) => void;
  markAsRead: (messageIds: string[], chatId: string) => void;
  markAsDelivered: (messageIds: string[], chatId: string) => void;
  setActiveChat: (chatId: string | null) => void;
  setChats: (chats: Chat[]) => void;
  createGroup: (name: string, userIds: number[], image?: string) => Promise<void>;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  searchMessages: (query: string) => Promise<Message[]>;
  sendTypingIndicator: (chatId: string, isTyping: boolean) => void;
  socket: Socket | null;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
 

interface ChatProviderProps {
  children: ReactNode;
}

// ChatProvider component with proper TypeScript types
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // State management
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [userStatus, setUserStatus] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs
  const isFetchingRef = useRef(false);
  const fetchCountRef = useRef(0);
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Hooks
  const { socket: wsSocket } = useWebSocket();
  const { user } = useAuth();
  const socket = wsSocket as Socket | null;
  
  // WebSocket event handlers
  const onConnect = useCallback(() => {
    setIsConnected(true);
  }, []);
  
  const onDisconnect = useCallback(() => {
    setIsConnected(false);
  }, []);
  
  // WebSocket event handler for new messages
  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const chatKey = String(message.chatId);
      const chatMessages = prev[chatKey] || [];
      
      // Check if message already exists (in case of duplicates)
      if (chatMessages.some(m => m.id === message.id || m.tempId === message.id)) {
        return prev;
      }
      
      return {
        ...prev,
        [chatKey]: [message, ...chatMessages]
      };
    });
    
    // Update last message in chats
    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.id === String(message.chatId));
      if (chatIndex === -1) return prev;
      
      const updatedChats = [...prev];
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        lastMessage: message,
        updatedAt: message.createdAt || message.timestamp || new Date().toISOString()
      };
      
      // Move the chat to the top
      const [reorderedChat] = updatedChats.splice(chatIndex, 1);
      return [reorderedChat, ...updatedChats];
    });
  }, []);

  // Handle message status updates (sent, delivered, read)
  const handleMessageStatus = useCallback(({ messageId, status, chatId }: { 
    messageId: string; 
    status: Message['status']; 
    chatId: string 
  }) => {
    setMessages(prev => {
      const chatMessages = prev[chatId];
      if (!chatMessages) return prev;
      
      const updatedMessages = chatMessages.map(msg => 
        msg.id === messageId ? { ...msg, status } : msg
      );
      
      return {
        ...prev,
        [chatId]: updatedMessages
      };
    });
  }, []);

  // Handle typing indicators
  const handleTyping = useCallback(({ 
    chatId, 
    userId, 
    isTyping 
  }: { 
    chatId: string; 
    userId: number; 
    isTyping: boolean 
  }) => {
    if (!socket || !user) return;
    
    // Don't show typing indicator for self
    if (userId === user.id) return;
    
    // Update UI to show typing indicator
    setUserStatus((prev: Record<string, string>) => ({
      ...prev,
      [userId.toString()]: isTyping ? 'typing' : 'online'
    }));
    
    // Clear previous timeout if it exists
    if (typingTimeouts.current[userId]) {
      clearTimeout(typingTimeouts.current[userId]);
    }
    
    // Set a timeout to clear the typing status after 3 seconds
    if (isTyping) {
      typingTimeouts.current[userId] = setTimeout(() => {
        setUserStatus((prev: Record<string, string>) => ({
          ...prev,
          [userId.toString()]: 'online'
        }));
      }, 3000) as unknown as NodeJS.Timeout;
    }
  }, [socket, user?.id]);

  // (removed duplicate fetchChats and redundant effect)
  
  // Sort chats by most recent activity (last message or chat creation time)
  const sortedChats = useMemo(() => {
    if (!chats.length) return [];
    return [...chats].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chats]);


  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const token = await SecureStore.getItemAsync('authToken') || await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No auth token found');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized (e.g., token expired)
          console.log('Token expired or invalid');
          // You might want to trigger a logout here
          return;
        }
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(prev => {
        const currentMessages = prev[chatId] || [];
        // Preserve optimistic messages (messages with tempId) that haven't been confirmed yet
        const optimisticMessages = currentMessages.filter(msg => msg.tempId);
        
        // Combine server messages with optimistic messages
        const combinedMessages = [...data, ...optimisticMessages];
        
        // Remove duplicates (in case a tempId message was already confirmed)
        const uniqueMessages = combinedMessages.filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id || (msg.tempId && m.tempId === msg.tempId))
        );
        
        return { ...prev, [chatId]: uniqueMessages };
      });
    } catch (e) {
      // ignore errors
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string, chatId: string) => {
    // Implement delete message logic here
  }, []);

  const sendMessage = useCallback(async (chatId: string, message: Partial<Message>) => {
    if (!user) return;

    const tempId = uuid();
    const newMessage: Message = {
      id: tempId,
      chatId: chatId,
      senderId: Number(user.id),
      content: message.content || '',
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      type: message.type || 'text',
      status: 'sending',
      tempId,
      ...message
    };

    // Optimistic update
    setMessages(prev => ({
      ...prev,
      [String(chatId)]: [...(prev[String(chatId)] || []), newMessage]
    }));

    // Send via WebSocket if available
    if (socket) {
      socket.emit('send_message', {
        ...newMessage,
        tempId
      });
    }

    // Also attempt to persist via REST as a fallback (or in parallel)
    try {
      const token = await SecureStore.getItemAsync('authToken') || await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No auth token found');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          content: newMessage.content,
          type: newMessage.type,
          mediaUrl: newMessage.mediaUrl,
          senderId: newMessage.senderId,
          tempId
        })
      });

      if (res.ok) {
        const saved: Message = await res.json();
        // Reconcile optimistic message with saved one
        setMessages(prev => {
          const list = prev[chatId] || [];
          const idx = list.findIndex(m => m.tempId === tempId);
          if (idx === -1) return prev;
          const updated = [...list];
          updated[idx] = {
            ...updated[idx],
            ...saved,
            status: 'sent',
            tempId: undefined
          } as Message;
          return { ...prev, [chatId]: updated };
        });
      } else {
        // Mark as failed if server rejected and no socket path
        setMessages(prev => {
          const list = prev[chatId] || [];
          const idx = list.findIndex(m => m.tempId === tempId);
          if (idx === -1) return prev;
          const updated = [...list];
          updated[idx] = { ...updated[idx], status: 'failed' } as Message;
          return { ...prev, [chatId]: updated };
        });
      }
    } catch (e) {
      // Network error; keep optimistic but mark as failed
      setMessages(prev => {
        const list = prev[chatId] || [];
        const idx = list.findIndex(m => m.tempId === tempId);
        if (idx === -1) return prev;
        const updated = [...list];
        updated[idx] = { ...updated[idx], status: 'failed' } as Message;
        return { ...prev, [chatId]: updated };
      });
    }
  }, [socket, user]);

  const editMessage = useCallback(async (messageId: string, chatId: string, newContent: string) => {
    if (!socket) return;
    
    setMessages(prev => {
      const chatMessages = prev[chatId];
      if (!chatMessages) return prev;
      
      const messageIndex = chatMessages.findIndex(m => m.id === messageId || m.tempId === messageId);
      if (messageIndex === -1) return prev;
      
      const updatedMessages = [...chatMessages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: newContent,
        edited: true
      };
      
      return {
        ...prev,
        [chatId]: updatedMessages
      };
    });
    
    socket.emit('edit_message', { messageId, chatId, content: newContent });
  }, [socket]);

  const reactToMessage = useCallback((messageId: string, chatId: string, emoji: string) => {
    if (!socket) return;
    
    setMessages(prev => {
      const chatMessages = prev[chatId];
      if (!chatMessages) return prev;
      
      const messageIndex = chatMessages.findIndex(m => m.id === messageId || m.tempId === messageId);
      if (messageIndex === -1) return prev;
      
      const updatedMessages = [...chatMessages];
      const message = updatedMessages[messageIndex];
      
      // Toggle reaction
      const reactions = { ...(message.reactions || {}) };
      const reactionKey = String(user?.id ?? '');
      if (reactions[reactionKey]) {
        delete reactions[reactionKey];
      } else {
        reactions[reactionKey] = {
          userId: Number(user?.id ?? 0),
          emoji,
          timestamp: new Date().toISOString()
        };
      }
      
      updatedMessages[messageIndex] = {
        ...message,
        reactions
      };
      
      return {
        ...prev,
        [chatId]: updatedMessages
      };
    });
    
    socket.emit('react_to_message', { messageId, chatId, emoji, userId: user?.id });
  }, [socket, user?.id]);

  const markAsRead = useCallback((messageIds: string[], chatId: string) => {
    if (!socket) return;
    
    // Update local state
    setMessages(prev => {
      const chatMessages = prev[String(chatId)];
      if (!chatMessages) return prev;
      
      const updatedMessages = chatMessages.map(msg => 
        messageIds.includes(msg.id) && msg.status !== 'read'
          ? { ...msg, status: 'read' as const }
          : msg
      );
      
      return {
        ...prev,
        [String(chatId)]: updatedMessages
      };
    });
    
    // Update chat's last read message
    setChats(prev => prev.map(chat => 
      chat.id === String(chatId) 
        ? { 
            ...chat, 
            unreadCount: 0,
            lastMessage: chat.lastMessage?.status === 'delivered' 
              ? { ...chat.lastMessage, status: 'read' }
              : chat.lastMessage
          } 
        : chat
    ));
    
    // Notify server
    socket.emit('mark_read', { messageIds, chatId: String(chatId) });
  }, [socket]);

  const markAsDelivered = useCallback((messageIds: string[], chatId: string) => {
    if (!socket) return;
    
    setMessages(prev => {
      const chatMessages = prev[String(chatId)];
      if (!chatMessages) return prev;
      
      const updatedMessages = chatMessages.map(msg => 
        messageIds.includes(msg.id) && msg.status === 'sent'
          ? { ...msg, status: 'delivered' as const }
          : msg
      );
      
      return {
        ...prev,
        [String(chatId)]: updatedMessages
      };
    });
    
    socket.emit('mark_delivered', { messageIds, chatId: String(chatId) });
  }, [socket]);

  const isFetchingRef = useRef(false);
  const fetchCountRef = useRef(0);
  const MAX_FETCH_ATTEMPTS = 3;
  
  const fetchChats = useCallback(async (force = false): Promise<void> => {
    // Skip if no user ID
    if (!user?.id) {
      console.log('Skipping fetch - no user ID');
      return;
    }
    
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('Skipping chat fetch - already in progress');
      return;
    }
    
    // Safety check to prevent infinite loops
    if (fetchCountRef.current >= MAX_FETCH_ATTEMPTS) {
      console.warn('Maximum fetch attempts reached, stopping to prevent infinite loop');
      return;
    }
    
    // Set fetching state
    isFetchingRef.current = true;
    const currentFetchId = Date.now();
    
    console.log(`[${currentFetchId}] Fetch attempt ${fetchCountRef.current + 1} of ${MAX_FETCH_ATTEMPTS}`);
    
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Increment fetch counter
      fetchCountRef.current += 1;
      
      const userId = user.userId || user.id;
      console.log(`[${currentFetchId}] Fetching chats for user ID:`, userId);
      
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
  
const messageIndex = chatMessages.findIndex(m => m.id === messageId || m.tempId === messageId);
if (messageIndex === -1) return prev;
  
const updatedMessages = [...chatMessages];
updatedMessages[messageIndex] = {
...updatedMessages[messageIndex],
content: newContent,
edited: true
};
  
return {
...prev,
[chatId]: updatedMessages
};
});
  
if (socket) {
  socket.emit('edit_message', { 
    messageId, 
    chatId, 
    content: newContent 
  });
}
}, [socket]);

const reactToMessage = useCallback((messageId: string, chatId: string, emoji: string) => {
  if (!socket) return;
  
  setMessages(prev => {
    const chatMessages = prev[chatId] || [];
    const messageIndex = chatMessages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) return prev;
    
    const updatedMessages = [...chatMessages];
    const message = { ...updatedMessages[messageIndex] };
    
    // Initialize reactions if not exists
    message.reactions = message.reactions || {};
    
    // Toggle reaction
    if (message.reactions[emoji]) {
      delete message.reactions[emoji];
    } else {
      message.reactions[emoji] = {
        userId: user?.id || 0,
        emoji,
        timestamp: new Date().toISOString()
      };
    }
    
    updatedMessages[messageIndex] = message;
    
    return {
      ...prev,
      [chatId]: updatedMessages
    };
  });
  
  socket.emit('react_to_message', { messageId, chatId, emoji });
if (!socket) return;
  
setMessages(prev => {
const chatMessages = prev[chatId];
if (!chatMessages) return prev;
  
const messageIndex = chatMessages.findIndex(m => m.id === messageId || m.tempId === messageId);
if (messageIndex === -1) return prev;
  
const updatedMessages = [...chatMessages];
const message = updatedMessages[messageIndex];
  
// Toggle reaction
const reactions = { ...(message.reactions || {}) };
const reactionKey = String(user?.id ?? '');
if (reactions[reactionKey]) {
delete reactions[reactionKey];
} else {
reactions[reactionKey] = {
userId: Number(user?.id ?? 0),
emoji,
timestamp: new Date().toISOString()
};
}
  
updatedMessages[messageIndex] = {
...message,
reactions
};
  
return {
...prev,
[chatId]: updatedMessages
};
});
  
socket.emit('react_to_message', { messageId, chatId, emoji, userId: user?.id });
}, [socket, user?.id]);

const markAsRead = useCallback((messageIds: string[], chatId: string) => {
if (!socket) return;
  
// Update local state
setMessages(prev => {
const chatMessages = prev[String(chatId)];
if (!chatMessages) return prev;
  
const updatedMessages = chatMessages.map(msg => 
messageIds.includes(msg.id) && msg.status !== 'read'
? { ...msg, status: 'read' as const }
: msg
);
  
return {
...prev,
[String(chatId)]: updatedMessages
};
});
  
// Update chat's last read message
setChats(prev => prev.map(chat => 
chat.id === String(chatId) 
? { 
...chat, 
unreadCount: 0,
lastMessage: chat.lastMessage?.status === 'delivered' 
? { ...chat.lastMessage, status: 'read' }
: chat.lastMessage
} 
: chat
));
  
// Notify server
socket.emit('mark_read', { messageIds, chatId: String(chatId) });
}, [socket]);

const markAsDelivered = useCallback((messageIds: string[], chatId: string) => {
if (!socket) return;
  
setMessages(prev => {
const chatMessages = prev[String(chatId)];
if (!chatMessages) return prev;
  
const updatedMessages = chatMessages.map(msg => 
messageIds.includes(msg.id) && msg.status === 'sent'
? { ...msg, status: 'delivered' as const }
: msg
);
  
return {
...prev,
[String(chatId)]: updatedMessages
};
});
  
socket.emit('mark_delivered', { messageIds, chatId: String(chatId) });
}, [socket]);

const isFetchingRef = useRef(false);
const fetchCountRef = useRef(0);
const MAX_FETCH_ATTEMPTS = 3;
  
const fetchChats = useCallback(async (force = false): Promise<void> => {
if (!user?.id) {
console.log('No user ID available, skipping chat fetch');
return;
}
  
if (isFetchingRef.current) {
console.log('Already fetching chats, skipping');
return;
}
  
if (fetchCountRef.current >= MAX_FETCH_ATTEMPTS) {
console.log('Max fetch attempts reached, skipping');
return;
}
  
console.log('Fetching chats...');
isFetchingRef.current = true;
fetchCountRef.current += 1;
  
try {
const token = await AsyncStorage.getItem('token');
if (!token) {
throw new Error('No authentication token found');
}
  
console.log('Making API request to fetch chats');
const response = await fetch(`${API_BASE_URL}/api/chats`, {
method: 'GET',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`,
},
});
  
console.log('Received response with status:', response.status);
  
if (!response.ok) {
const errorText = await response.text();
console.error('Error response:', errorText);
throw new Error(`Failed to fetch chats: ${response.status} ${response.statusText}`);
}
  
const data = await response.json();
console.log('Fetched chats data:', data);
  
if (!Array.isArray(data)) {
console.error('Expected array of chats but got:', data);
setChats([]);
return;
}
  
// Transform the API response to match the Chat interface
const transformedChats = data
.filter((chat: any) => chat && chat.id) // Filter out any invalid chat objects
.map((chat: any) => {
// Get other participants (excluding the current user)
const otherParticipants = Array.isArray(chat.participants) 
? chat.participants.filter((p: any) => p.id !== user?.id)
: [];
  
// Determine chat name (use group name or other participant's name)
const chatName = chat.isGroup 
? chat.name 
: otherParticipants[0]?.name || 'Unknown User';
  
// Transform the chat object to match the Chat interface
return {
id: chat.id,
name: chatName,
isGroup: chat.isGroup || false,
type: chat.type || 'direct',
participants: Array.isArray(chat.participants) ? chat.participants : [],
lastMessage: chat.lastMessage ? {
id: chat.lastMessage.id,
content: chat.lastMessage.content,
senderId: chat.lastMessage.senderId,
senderName: chat.lastMessage.sender?.name || 'Unknown',
timestamp: chat.lastMessage.createdAt,
status: 'delivered',
isRead: chat.lastMessage.isRead || false,
} : null,
unreadCount: chat.unreadCount || 0,
createdAt: chat.createdAt,
updatedAt: chat.updatedAt || chat.lastMessage?.createdAt || chat.createdAt,
avatar: chat.avatar || (otherParticipants[0]?.avatar || null),
};
})
.filter(Boolean) as Chat[]; // Remove any null entries from invalid chats
  
console.log('Transformed chats:', transformedChats);
setChats(transformedChats);
fetchCountRef.current = 0; // Reset fetch count on success
} catch (error) {
console.error('Error in fetchChats:', error);
  
// If we have no chats yet, set an empty array to prevent infinite loading
if (chats.length === 0) {
console.log('No chats available, setting empty array');
setChats([]);
}
  
// Rethrow the error to be caught by the component
throw error;
} finally {
isFetchingRef.current = false;
console.log('Finished fetching chats');
}
}, [user?.id, chats.length]);

// Memoize the connect handler to prevent unnecessary re-renders
const onConnect = useCallback(() => {
console.log('WebSocket connected');
setIsConnected(true);
// Only attempt to fetch chats if this is the initial connection
// The chats will be fetched by the initial useEffect
console.log('WebSocket connected, not fetching chats to prevent loops');
}, []);

// Memoize the disconnect handler
const onDisconnect = useCallback(() => {
console.log('WebSocket disconnected');
setIsConnected(false);
}, []);

// Fetch chats when the component mounts or user ID changes
useEffect(() => {
let mounted = true;
  
const fetchIfNeeded = async () => {
if (!user?.id || !mounted) return;
  
console.log('Checking if we need to fetch chats', {
hasUser: !!user?.id,
isFetching: isFetchingRef.current,
fetchCount: fetchCountRef.current
});
  
// Only fetch if we haven't fetched yet and we're not already fetching
if (!isFetchingRef.current && fetchCountRef.current === 0) {
console.log('Triggering initial chat fetch for user:', user.id);
await fetchChats(true);
} else if (mounted) {
console.log('Skipping fetch:', {
reason: isFetchingRef.current ? 'already_fetching' : 
fetchCountRef.current > 0 ? 'already_fetched' : 'unknown',
isFetching: isFetchingRef.current,
fetchCount: fetchCountRef.current
});
}
};
  
fetchIfNeeded();
  
return () => {
mounted = false;
};
}, [user?.id]); // Removed fetchChats from dependencies to prevent infinite loop
  
// Set up WebSocket listeners
useEffect(() => {
if (!socket) return;
  
console.log('Setting up WebSocket listeners');
  
// Set up event listeners
socket.on('connect', onConnect);
socket.on('disconnect', onDisconnect);
socket.on('new_message', handleNewMessage);
socket.on('message_status', handleMessageStatus);
socket.on('typing', handleTyping);
  
// Set initial connection state
setIsConnected(socket.connected);
  
// Clean up
return () => {
socket.off('connect', onConnect);
socket.off('disconnect', onDisconnect);
socket.off('new_message', handleNewMessage);
socket.off('message_status', handleMessageStatus);
socket.off('typing', handleTyping);
  
// Clear all typing timeouts
Object.values(typingTimeouts.current).forEach(clearTimeout);
typingTimeouts.current = {};
};
}, [socket, onConnect, onDisconnect, handleNewMessage, handleMessageStatus, handleTyping]);

// Helper functions for context value
const replyToMessage = useCallback((chatId: string, message: Message, replyTo: Message) => {
if (socket && user) {
const replyMessage: Partial<Message> = {
content: message.content,
replyTo: {
messageId: replyTo.id,
content: replyTo.content,
senderId: replyTo.senderId,
senderName: replyTo.sender?.username || 'Unknown',
isMedia: replyTo.type !== 'text',
mediaUrl: replyTo.mediaUrl
}
};
sendMessage(chatId, replyMessage);
}
}, [socket, user]); // Removed sendMessage from dependencies to prevent circular dependency

const forwardMessage = useCallback((message: Message, targetChatIds: string[]) => {
// Implementation for forward message
console.log('Forwarding message:', message, 'to chats:', targetChatIds);
}, []);

const createGroup = useCallback(async (name: string, userIds: number[], image?: string) => {
// Implementation for create group
console.log('Creating group with name:', name, 'userIds:', userIds, 'image:', image);
}, []);

const searchMessages = useCallback(async (query: string) => {
// Implementation for search messages
console.log('Searching messages with query:', query);
return [];
}, []);

const sendTypingIndicator = useCallback((chatId: string, isTyping: boolean) => {
if (!socket) return;
socket.emit('typing', { chatId, isTyping });
}, [socket]);

const value = useMemo((): ChatContextType => ({
// Basic chat data
chats: sortedChats,
activeChat,
messages,
userStatus,
isConnected,
  
// Message actions
sendMessage: sendMessage as (chatId: string, message: Partial<Message>) => Promise<void>,
deleteMessage,
editMessage,
reactToMessage,
replyToMessage,
forwardMessage,
  
// Message status
markAsRead,
markAsDelivered,
setActiveChat,
setChats,
createGroup,
fetchChats: async () => {
await fetchChats();
},
fetchMessages,
searchMessages,
sendTypingIndicator,
  
// WebSocket
socket,
}), [
sortedChats,
activeChat,
messages,
userStatus,
isConnected,
socket
// Removed function dependencies to prevent re-renders
]);

return (
<ChatContext.Provider value={value}>
{children}
</ChatContext.Provider>
);

}

// Helper to get last message text for a chat
function getLastMessageText(messages: Message[] | undefined): string {
if (!messages || messages.length === 0) return 'No messages yet';
const last = messages[messages.length - 1];
if (last.type === 'image') return 'Photo';
if (last.type === 'video') return 'Video';
return last.content || 'No messages yet';
  const last = messages[messages.length - 1];
  if (last.type === 'image') return 'Photo';
  if (last.type === 'video') return 'Video';
  return last.content || 'No messages yet';
}
