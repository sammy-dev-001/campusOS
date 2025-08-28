import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { API_BASE_URL } from '../../config/api';
import { Message, useChat } from '../../contexts/ChatContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

const ChatScreen = () => {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  
  // Get chats from the chat context
  const { chats, messages, sendMessage, activeChat, setActiveChat, markAsRead, sendTypingIndicator } = useChat();
  
  // Find the current chat details
  const currentChat = useMemo(() => {
    if (!activeChat) return null;
    return chats.find(chat => chat.id === activeChat) || null;
  }, [activeChat, chats]);

  // Define the chat type
  interface Chat {
    id: string;
    name: string;
    type: 'direct' | 'group' | 'study_group';
    code?: string;
  }
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Set active chat when component mounts
  useEffect(() => {
    if (chatId) {
      setActiveChat(chatId);
      // Mark messages as read when opening the chat
      const ids = (messages[chatId] || []).map(m => m.id).filter(Boolean);
      if (ids.length) {
        markAsRead(ids, chatId);
      }
    }

    // Set up the header with a clickable title
    if (currentChat && (currentChat.isGroup || currentChat.type === 'study_group')) {
      navigation.setOptions({
        headerTitle: () => (
          <Pressable 
            onPress={() => {
              console.log('Navigating to group details with ID:', currentChat.id);
              // @ts-ignore - Using direct string path
              router.push({
                pathname: '/group-details/[id]',
                params: { id: currentChat.id }
              });
            }}
            style={({ pressed }) => ({
              padding: 10,
              borderRadius: 8,
              backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center'
            })}
          >
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: theme.text, fontWeight: '600' }]}>
                {currentChat.name || 'Chat'}
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={18} 
                color={theme.text} 
                style={{ marginLeft: 4, opacity: 0.8 }}
              />
            </View>
          </Pressable>
        ),
        headerTitleAlign: 'center',
      });
    } else if (currentChat) {
      // For non-group chats, just show the name
      navigation.setOptions({
        headerTitle: currentChat.name || 'Chat',
        headerTitleAlign: 'center',
      });
    }
    
    return () => {
      setActiveChat(null);
    };
  }, [chatId, setActiveChat, markAsRead, currentChat, theme.text, router, navigation, messages]);

  // Also mark newly arrived messages as read while viewing this chat
  useEffect(() => {
    if (!chatId) return;
    const ids = (messages[chatId] || []).map(m => m.id).filter(Boolean);
    if (ids.length) {
      markAsRead(ids, chatId);
    }
  }, [messages, chatId, markAsRead]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && messages[chatId]?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, chatId]);
  
  const handleSend = useCallback(async () => {
    if (!message.trim() || !chatId || isSending) return;
    
    const messageToSend = message;
    setMessage('');
    setIsSending(true);
    
    try {
      await sendMessage(chatId, {
        content: messageToSend,
        type: 'text',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally show error to user
    } finally {
      setIsSending(false);
    }
  }, [message, chatId, isSending, sendMessage]);
  
  const handleTyping = useCallback((text: string) => {
    setMessage(text);
    if (!isTyping && text) {
      setIsTyping(true);
      sendTypingIndicator(chatId, true);
    } else if (!text && isTyping) {
      setIsTyping(false);
      sendTypingIndicator(chatId, false);
    }
  }, [isTyping, chatId, sendTypingIndicator]);
  
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.id;
    const messageStatus = item.status || 'sent';
    
    return (
      <View 
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          { backgroundColor: isCurrentUser ? theme.primary : theme.card },
        ]}
      >
        {!isCurrentUser && item.sender?.profilePicture && (
          <Image
            source={{ uri: `${API_BASE_URL}${item.sender.profilePicture}` }}
            style={styles.avatar}
          />
        )}
        <View style={styles.messageContent}>
          {!isCurrentUser && (
            <ThemedText style={styles.senderName}>
              {item.sender?.username || 'Unknown'}
            </ThemedText>
          )}
          <ThemedText 
            style={[
              styles.messageText,
              { color: isCurrentUser ? theme.background : theme.text },
            ]}
          >
            {item.content}
          </ThemedText>
          <View style={styles.messageFooter}>
            <ThemedText 
              style={[
                styles.timestamp,
                { color: isCurrentUser ? theme.background : theme.text },
              ]}
            >
              {new Date(item.timestamp || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </ThemedText>
            {isCurrentUser && (
              <View style={styles.statusContainer}>
                {messageStatus === 'sending' ? (
                  <Ionicons 
                    name="time"
                    size={14} 
                    color={isCurrentUser ? theme.background : theme.text}
                    style={styles.statusIcon}
                  />
                ) : (
                  <>
                    <Ionicons 
                      name="checkmark"
                      size={14} 
                      color={messageStatus === 'read' || messageStatus === 'delivered' ? 
                        theme.primary : (isCurrentUser ? theme.background : theme.text)}
                      style={styles.statusIcon}
                    />
                    <Ionicons 
                      name="checkmark"
                      size={14} 
                      color={messageStatus === 'read' ? 
                        theme.primary : (isCurrentUser ? theme.background : theme.text)}
                      style={[styles.statusIcon, { marginLeft: -4 }]}
                    />
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [user?.id, theme]);
  
  const renderTestButton = () => (
    <TouchableOpacity 
      style={{
        backgroundColor: 'red',
        padding: 12,
        borderRadius: 8,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
      }}
      onPress={() => {
        console.log('Test button pressed');
        router.push('/group-details/123');
      }}
    >
      <Text style={{ color: 'white', fontWeight: 'bold' }}>Test Nav</Text>
    </TouchableOpacity>
  );

  // Test navigation function
  const testNavigation = () => {
    if (!currentChat) return;
    console.log('Navigating to group details for chat:', currentChat.id);
    router.push({
      pathname: '/group-details/[id]',
      params: { id: currentChat.id }
    });
  };

  if (!currentChat) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages[chatId!] || []}
        keyExtractor={(item) => item.id || item.tempId || Math.random().toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          value={message}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          placeholderTextColor={`${theme.text}80`}
          multiline
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity 
          style={[styles.sendButton, { 
            backgroundColor: message.trim() ? theme.primary : theme.text + '40',
            opacity: !message.trim() || isSending ? 0.5 : 1
          }]}
          onPress={handleSend}
          disabled={!message.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerIcon: {
    marginLeft: 4,
  },
  container: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
  },
  currentUserBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    marginLeft: '20%',
  },
  otherUserBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    marginRight: '20%',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    flex: 1,
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  statusIcon: {
    marginLeft: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
