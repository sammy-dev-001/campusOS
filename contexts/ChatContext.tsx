import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { API_BASE_URL } from '../constants/Config';
import { useUser } from './UserContext';
import { useWebSocket } from './WebSocketContext';

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
  type: 'text' | 'image' | 'video' | 'file';
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
 

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { socket, isConnected, sendMessage: wsSendMessage } = useWebSocket() as unknown as WebSocketContextType;
  
  // State management
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const { user } = useUser() as { user: User | null };
  const [userStatus, setUserStatus] = useState<Record<string, string>>({});
  const typingTimeouts = useRef<Record<string, number>>({});
  
  // Sort chats by most recent activity (last message or chat creation time)
  const sortedChats = useMemo(() => {
    if (!chats.length) return [];
    return [...chats].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chats]);

  // WebSocket event handlers
  const handleNewMessage = (message: Message) => {
    if (!socket) return;
    
    setMessages(prev => {
      const chatId = message.chatId.toString();
      const existingMessages = prev[chatId] || [];
      
      // Check if this is an update to an existing message (like status update)
      const existingMsgIndex = existingMessages.findIndex(
        m => m.id === message.id || m.tempId === message.id
      );

      if (existingMsgIndex >= 0) {
        // Update existing message
        const updatedMessages = [...existingMessages];
        updatedMessages[existingMsgIndex] = {
          ...updatedMessages[existingMsgIndex],
          ...message,
          status: message.status || 'delivered'
        };
        return { ...prev, [chatId]: updatedMessages };
      } else {
        // Add new message
        return {
          ...prev,
          [chatId]: [...existingMessages, { ...message, status: 'delivered' }]
          };
        }
      });  

      // Update last message in chats
      setChats(prev => {
        const chatIndex = prev.findIndex(c => String(c.id) === String(message.chatId));
        if (chatIndex >= 0) {
          const updatedChats = [...prev];
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: message,
            updatedAt: message.createdAt || message.timestamp || new Date().toISOString()
          };
          return updatedChats;
        }
        return prev;
      });
    };

    const handleMessageStatus = ({ messageId, status, chatId }: { 
      messageId: string; 
      status: Message['status']; 
      chatId: string 
    }) => {
      if (!socket) return;
      
      setMessages(prev => {
        const updatedMessages = { ...prev };
        const chatMessages = updatedMessages[chatId];
        
        if (!chatMessages) return prev;
        
        const messageIndex = chatMessages.findIndex(m => m.id === messageId || m.tempId === messageId);
        if (messageIndex === -1) return prev;
        
        const updatedChatMessages = [...chatMessages];
        updatedChatMessages[messageIndex] = {
          ...updatedChatMessages[messageIndex],
          status: status || 'delivered'
        };
        
        return {
          ...prev,
          [chatId]: updatedChatMessages
        };
      });
    };

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
      }, 3000) as unknown as number;
    }
  }, [socket, user?.id]);

  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
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
      }
    } catch (e) {
      // ignore errors
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string, chatId: string) => {
    // Implement delete message logic here
  }, []);

  

  // Implement missing message actions
  const sendMessage = useCallback(async (chatId: string, message: Partial<Message>) => {
    if (!user) return;

    const tempId = uuidv4();
    const newMessage: Message = {
      id: tempId,
      chatId: chatId,
      senderId: user.id,
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
      [chatId]: [...(prev[chatId] || []), newMessage]
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
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (reactions[user?.id || '']) {
        delete reactions[user?.id || ''];
      } else {
        reactions[user?.id || ''] = {
          userId: user?.id || 0,
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
      const chatMessages = prev[chatId];
      if (!chatMessages) return prev;
      
      const updatedMessages = chatMessages.map(msg => 
        messageIds.includes(msg.id) && msg.status !== 'read'
          ? { ...msg, status: 'read' as const }
          : msg
      );
      
      return {
        ...prev,
        [chatId]: updatedMessages
      };
    });
    
    // Update chat's last read message
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
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
    socket.emit('mark_read', { messageIds, chatId });
  }, [socket]);

  const markAsDelivered = useCallback((messageIds: string[], chatId: string) => {
    if (!socket) return;
    
    setMessages(prev => {
      const chatMessages = prev[chatId];
      if (!chatMessages) return prev;
      
      const updatedMessages = chatMessages.map(msg => 
        messageIds.includes(msg.id) && msg.status === 'sent'
          ? { ...msg, status: 'delivered' as const }
          : msg
      );
      
      return {
        ...prev,
        [chatId]: updatedMessages
      };
    });
    
    socket.emit('mark_delivered', { messageIds, chatId });
  }, [socket]);

  // Fetch chats function
  const fetchChats = useCallback(async () => {
    try {
      // Backend expects userId as a query param
      if (!user?.id) return;
      const url = `${API_BASE_URL}/chats?userId=${encodeURIComponent(String(user.id))}`;
      console.log('[ChatContext] fetchChats userId=', user.id, 'url=', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      // Normalize to Chat interface shape expected by UI
      const normalized: Chat[] = (Array.isArray(data) ? data : []).map((c: any) => {
        const participants = (c.participants || []).map((p: any) => ({
          id: p.id,
          username: p.username,
          profilePicture: p.profilePicture || p.profile_picture,
        }));
        const last = c.lastMessage || null;
        const normLast = last
          ? {
              id: String(last.id),
              chatId: String(last.chat_id ?? last.chatId ?? c.id),
              senderId: last.sender_id ?? last.senderId ?? 0,
              content: last.content ?? '',
              createdAt: last.created_at ?? last.createdAt ?? '',
              timestamp: last.created_at ?? last.createdAt ?? '',
              type: (last.type as any) || 'text',
              mediaUrl: last.mediaUrl || last.media_url,
              sender: last.sender || undefined,
              status: (last.status as any) || 'delivered',
            }
          : null;
        return {
          id: String(c.id),
          name: c.name || c.title || undefined,
          isGroup: Boolean(c.isGroup ?? (c.type === 'group')),
          type: c.type || 'individual',
          participants,
          lastMessage: normLast,
          unreadCount: Number(c.unreadCount ?? c.unread_count ?? 0),
          createdAt: c.createdAt || c.created_at || new Date().toISOString(),
          updatedAt: c.updatedAt || c.updated_at,
          avatar: c.groupImage || c.group_image || c.avatar,
        } as Chat;
      });
      console.log('[ChatContext] fetched chats:', Array.isArray(data) ? data.length : 'n/a', 'normalized:', normalized.length);
      setChats(normalized);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  }, [user?.id]);

  // Initialize data and set up WebSocket listeners
  useEffect(() => {
    if (!socket || !user?.id) return;
    
    // Set up WebSocket event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('message_status', handleMessageStatus);
    socket.on('typing', handleTyping);
    
    // Initial data fetch
    fetchChats();
    
    // Clean up event listeners
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status', handleMessageStatus);
      socket.off('typing', handleTyping);
    };
  }, [socket, user?.id]);

  // Fetch chats when user becomes available, even if socket isn't connected yet
  useEffect(() => {
    if (!user?.id) return;
    fetchChats();
  }, [user?.id, fetchChats]);

  const value = useMemo(() => ({
    // Basic chat data
    chats: sortedChats,
    activeChat,
    messages,
    userStatus,
    isConnected,
    
    // Message actions
    sendMessage,
    deleteMessage,
    editMessage,
    reactToMessage,
    replyToMessage: (chatId: string, message: Message, replyTo: Message) => {
      // Implementation for reply to message
      console.log('Replying to message in chat:', chatId, message, 'replying to:', replyTo);
      // You can implement the actual reply logic here
      // For example, creating a new message that references the replyTo message
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
    },
    forwardMessage: (message: Message, targetChatIds: string[]) => {
      // Implementation for forward message
      console.log('Forwarding message:', message, 'to chats:', targetChatIds);
    },
    
    // Message status
    markAsRead,
    markAsDelivered,
    
    // Chat management
    setActiveChat,
    setChats,
    createGroup: async (name: string, participants: number[]) => {
      // Implementation for create group
      console.log('Creating group:', { name, participants });
    },
    
    // Data fetching
    fetchChats,
    fetchMessages,
    searchMessages: async (query: string): Promise<Message[]> => {
      // Implementation for search messages
      console.log('Searching messages with query:', query);
      return [];
    },
    
    // Typing indicators
    sendTypingIndicator: (chatId: string, isTyping: boolean) => {
      if (!socket) return;
      socket.emit('typing', { chatId, isTyping });
    },
    
    // WebSocket
    socket,
  }), [
    sortedChats,
    activeChat,
    messages,
    userStatus,
    sendMessage,
    deleteMessage,
    editMessage,
    reactToMessage,
    markAsRead,
    markAsDelivered,
    fetchChats,
    fetchMessages,
    socket,
    isConnected
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
  };

// Helper to get last message text for a chat
function getLastMessageText(messages: Message[] | undefined): string {
  if (!messages || messages.length === 0) return 'No messages yet';
  const last = messages[messages.length - 1];
  if (last.type === 'image') return 'Photo';
  if (last.type === 'video') return 'Video';
  return last.content || 'No messages yet';
}
