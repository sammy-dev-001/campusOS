import { useNotifications } from '../contexts/NotificationContext';

type NotificationType = 'like' | 'comment' | 'message' | 'class' | 'post';

interface NotificationOptions {
  senderName: string;
  postId?: string;
  message?: string;
  classId?: string;
  chatId?: string;
}

export const useNotificationService = () => {
  const { scheduleNotification } = useNotifications();

  const showNotification = async (type: NotificationType, options: NotificationOptions) => {
    const { senderName, postId, message, classId, chatId } = options;
    
    const commonData = {
      postId,
      classId,
      chatId,
      timestamp: new Date().toISOString(),
    };

    switch (type) {
      case 'like':
        await scheduleNotification('like', {
          title: 'New Like',
          body: `${senderName} liked your post`,
          data: { ...commonData, type: 'like' },
        });
        break;

      case 'comment':
        await scheduleNotification('comment', {
          title: 'New Comment',
          body: `${senderName} commented on your post`,
          data: { ...commonData, type: 'comment' },
        });
        break;

      case 'message':
        await scheduleNotification('message', {
          title: `Message from ${senderName}`,
          body: message || 'You have a new message',
          data: { ...commonData, type: 'message' },
        });
        break;

      case 'class':
        await scheduleNotification('class', {
          title: 'Class Update',
          body: message || 'There is an update in your class',
          data: { ...commonData, type: 'class' },
        });
        break;

      case 'post':
        await scheduleNotification('post', {
          title: 'New Post',
          body: `${senderName} created a new post`,
          data: { ...commonData, type: 'post' },
        });
        break;

      default:
        console.warn('Unknown notification type:', type);
    }
  };

  return {
    notifyNewLike: (senderName: string, postId: string) =>
      showNotification('like', { senderName, postId }),
      
    notifyNewComment: (senderName: string, postId: string) =>
      showNotification('comment', { senderName, postId }),
      
    notifyNewMessage: (senderName: string, message: string, chatId: string) =>
      showNotification('message', { senderName, message, chatId }),
      
    notifyClassUpdate: (className: string, message: string, classId: string) =>
      showNotification('class', { senderName: className, message, classId }),
      
    notifyNewPost: (senderName: string, postId: string) =>
      showNotification('post', { senderName, postId }),
  };
};

// Server-side notification handler (to be used in API routes)
export const sendPushNotification = async (expoPushToken: string, title: string, body: string, data: any = {}) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: { ...data, _displayInForeground: true },
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
