import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../src/contexts/WebSocketContext';

type Message = {
  id: string;
  content: string;
  senderId: number;
  recipientId: number;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
};

export const useChatMessages = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<number | null>(null);
  const { socket, isConnected, sendMessage } = useWebSocket();

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      // TODO: Replace with your actual API call to fetch messages
      // const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`);
      // const data = await response.json();
      // setMessages(data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [chatId]);

  // Send a new message
  const sendChatMessage = useCallback((content: string, recipientId: number) => {
    if (!isConnected) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      content,
      senderId: 0, // This will be set by the server
      recipientId,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    // Optimistic update
    setMessages(prev => [...prev, newMessage]);

    // Send the message via WebSocket
    sendMessage('send_message', {
      chatId,
      content,
      recipientId,
      tempId,
    });
  }, [isConnected, sendMessage, chatId]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // Update the message status if it was previously 'sending'
      setMessages(prev => {
        const existingMessageIndex = prev.findIndex(m => m.id === message.id || m.id === `temp-${message.id}`);
        
        if (existingMessageIndex >= 0) {
          // Update existing message (e.g., change status from 'sending' to 'sent')
          const updatedMessages = [...prev];
          updatedMessages[existingMessageIndex] = {
            ...message,
            status: 'delivered',
          };
          return updatedMessages;
        } else {
          // Add new message
          return [...prev, { ...message, status: 'delivered' }];
        }
      });
    };

    const handleTyping = (data: { userId: number; isTyping: boolean }) => {
      if (data.isTyping) {
        setIsTyping(true);
        setTypingUser(data.userId);
        
        // Reset typing indicator after 3 seconds
        const timer = setTimeout(() => {
          setIsTyping(false);
          setTypingUser(null);
        }, 3000);
        
        return () => clearTimeout(timer);
      } else {
        setIsTyping(false);
        setTypingUser(null);
      }
    };

    // Listen for new messages
    socket.on('new_message', handleNewMessage);
    
    // Listen for typing indicators
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
    };
  }, [socket]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('typing', { chatId, isTyping });
    }
  }, [socket, isConnected, chatId]);

  return {
    messages,
    isTyping,
    typingUser,
    sendMessage: sendChatMessage,
    setTyping: sendTypingIndicator,
    loadMessages,
  };
};
