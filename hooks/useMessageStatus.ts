import { useEffect, useCallback } from 'react';
import { useWebSocket } from '../src/contexts/WebSocketContext';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export const useMessageStatus = (chatId: string) => {
  const { socket, isConnected } = useWebSocket();

  // Mark messages as delivered
  const markAsDelivered = useCallback((messageIds: string[]) => {
    if (!isConnected || !socket || messageIds.length === 0) return;
    
    socket.emit('mark_delivered', {
      messageIds,
      chatId,
    });
  }, [socket, isConnected, chatId]);

  // Mark messages as read
  const markAsRead = useCallback((messageIds: string[]) => {
    if (!isConnected || !socket || messageIds.length === 0) return;
    
    socket.emit('mark_read', {
      messageIds,
      chatId,
    });
  }, [socket, isConnected, chatId]);

  // Listen for message status updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: { messageId: string; status: MessageStatus }) => {
      // This would be handled by your message list component
      // to update the status of individual messages
      console.log(`Message ${data.messageId} status updated to: ${data.status}`);
    };

    socket.on('message_status', handleStatusUpdate);

    return () => {
      socket.off('message_status', handleStatusUpdate);
    };
  }, [socket]);

  return {
    markAsDelivered,
    markAsRead,
  };
};
