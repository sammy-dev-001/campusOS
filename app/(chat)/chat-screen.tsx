import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useAuth } from '../../src/contexts/AuthContext';
import { Message, useChat } from '../../src/contexts/ChatContext';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { useUser } from '../../src/contexts/UserContext';

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: { marginRight: 10 },
  messagesContainer: { flexGrow: 1, paddingBottom: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, fontSize: 16 },
  sendButton: { backgroundColor: '#007AFF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 10, marginLeft: 4, color: 'red' },
  messageBubble: { maxWidth: '80%', borderRadius: 18, padding: 12, marginVertical: 4, flexDirection: 'row', alignItems: 'flex-start' },
  currentUserBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4, marginLeft: '20%' },
  otherUserBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, marginRight: '20%' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  messageContent: { flex: 1 },
  senderName: { fontWeight: '600', fontSize: 12, marginBottom: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timestamp: { fontSize: 10, opacity: 0.8 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  statusIcon: { marginLeft: 0 },
  headerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  headerIcon: { marginLeft: 4 },
  messageContainer: { padding: 10 },
  messageTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
});

const ChatScreen = () => {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  
  // Get chat data from context
  const { 
    chats, 
    messages: contextMessages, 
    sendMessage, 
    activeChat, 
    setActiveChat, 
    markAsRead, 
    sendTypingIndicator
  } = useChat();
  
  
  // Compute a stable current user id
  const currentUserId = useMemo(() => {
    if (user?.id) return String(user.id);
    if (auth?.user?.id) return String(auth.user.id);
    return null;
  }, [user?.id, auth?.user?.id]);
  
  // Find the current chat details
  const currentChat = useMemo(() => {
    return chatId ? chats.find(chat => chat.id === chatId) || null : null;
  }, [chats, chatId]);
  
  // Get messages for the current chat
  const currentMessages = useMemo(() => {
    return chatId ? (contextMessages[chatId] || []) : [];
  }, [contextMessages, chatId]);
  
  // Handle group details navigation
  const handleGroupDetails = useCallback(() => {
    if (!currentChat) return;
    router.push({
      pathname: '/group-details/[id]',
      params: { id: currentChat.id }
    });
  }, [currentChat, router]);
  
  // Handle chat deletion (now handled at a higher level or through API)
  const handleDeleteChat = useCallback(() => {
    if (!currentChat) return;
    
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete this chat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Navigate back after deletion
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete chat. Please try again.');
              console.error('Error deleting chat:', error);
            }
          },
        },
      ]
    );
  }, [currentChat, router]);
  
  // Utility function to get other participant's info
  const getOtherParticipant = useCallback((participants: any[] = [], currentUserId?: string) => {
    if (!participants || !Array.isArray(participants)) {
      console.log('Invalid participants');
      return { username: 'Unknown User', profilePic: '' };
    }

    // Normalize current user id to string for safe comparison (supports number or string ids)
    const currentId = typeof currentUserId !== 'undefined' && currentUserId !== null
      ? String(currentUserId)
      : null;

    // Find the first participant that's not the current user
    const otherParticipant = participants.find(p => {
      const rawId = p?.user?._id ?? p?.user?.id ?? p?.id ?? null;
      if (!rawId) return false;
      const userId = String(rawId);
      return currentId ? userId !== currentId : true;
    });

    if (!otherParticipant?.user) {
      console.log('No other participant found or participant has no user data');
      return { username: 'Unknown User', profilePic: '' };
    }

    return {
      username: otherParticipant.user.username || 'Unknown User',
      profilePic: otherParticipant.user.profilePic || otherParticipant.user.profilePicture || '',
      displayName: otherParticipant.user.displayName || otherParticipant.user.name || 'Unknown User'
    };
  }, []);
  
  // Show loading while checking auth state
  if (auth.isLoading || !auth.isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]} />
    );
  }
  

  // Render each message item
  const renderMessageItem = useCallback(({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.id?.toString();
    const messageStatus = item.status || 'sent';
    
    return (
      <View 
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          { 
            backgroundColor: isCurrentUser ? theme.primary : theme.card,
            alignSelf: isCurrentUser ? 'flex-end' : 'flex-start'
          }
        ]}
      >
        <Text style={{ color: isCurrentUser ? theme.background : theme.text }}>
          {item.content}
        </Text>
        {isCurrentUser && (
          <View style={styles.statusContainer}>
            {messageStatus === 'failed' && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                Failed
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }, [user?.id, theme]);

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
      const ids = (contextMessages[chatId] || []).map(m => m.id).filter(Boolean);
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
  }, [chatId, setActiveChat, markAsRead, currentChat, theme.text, router, navigation, contextMessages]);

  // Also mark newly arrived messages as read while viewing this chat
  useEffect(() => {
    if (!chatId) return;
    const ids = (contextMessages[chatId] || []).map(m => m.id).filter(Boolean);
    if (ids.length) {
      markAsRead(ids, chatId);
    }
  }, [contextMessages, chatId, markAsRead]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && contextMessages[chatId]?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [contextMessages, chatId]);
  
  const handleSend = useCallback(async () => {
    // Prevent sending empty messages or multiple rapid sends
    if (!message.trim() || !chatId || isSending) return;
    
    const messageToSend = message;
    setMessage('');
    setIsSending(true);
    
    // Create a temporary ID for the optimistic update
    const tempId = `temp-${Date.now()}`;
    
    try {
      // Send the message through the context
      await sendMessage(chatId, {
        id: tempId,
        tempId,
        content: messageToSend,
        type: 'text',
        status: 'sending',
        senderId: user?.id?.toString() || 'unknown',
        chatId,
        createdAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [message, chatId, isSending, sendMessage, user?.id]);
  
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
  
  // Helper to get participant display info
  const getParticipantInfo = useCallback((participant: any) => {
    if (!participant) return { displayName: 'Unknown User', username: 'unknown' };
    return {
      displayName: participant.displayName || participant.name || 'Unknown User',
      username: participant.username || 'unknown',
      avatar: participant.profilePic || participant.avatar || null
    };
  }, []);

  // Helper to pull a stable comparable id (prefer last 24 hex chars for ObjectId)
  const getComparableId = useCallback((raw: any) => {
    if (raw === undefined || raw === null) return '';
    try {
      if (typeof raw === 'object') {
        // common nested shapes from server
        if ((raw as any)._id) return String((raw as any)._id).toLowerCase();
        if ((raw as any).id) return String((raw as any).id).toLowerCase();
        if ((raw as any).senderId) return String((raw as any).senderId).toLowerCase();
        if ((raw as any).userId) return String((raw as any).userId).toLowerCase();
        if ((raw as any).sender && ((raw as any).sender._id || (raw as any).sender.id)) {
          return String((raw as any).sender._id ?? (raw as any).sender.id).toLowerCase();
        }
        // Fall back to JSON string if useful
        const json = JSON.stringify(raw);
        const m2 = json.match(/([0-9a-fA-F]{24})/);
        if (m2) return m2[1].toLowerCase();
        return '';
      }
      const s = String(raw).trim();
      // match 24 hex chars (MongoDB ObjectId)
      const m = s.match(/([0-9a-fA-F]{24})$/);
      if (m) return m[1].toLowerCase();
      // fallback: strip non-alphanum and lowercase
      return s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    } catch (e) {
      return '';
    }
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    // Normalize IDs to strings before comparison to avoid mismatches when one side is number and the other is string
    const normalizedSender = getComparableId(item.senderId);
    const normalizedCurrent = currentUserId ? getComparableId(currentUserId) : '';
    const isCurrentUser = normalizedCurrent && normalizedSender === normalizedCurrent;
    const messageStatus = item.status || 'sent';
    const otherUser = getOtherParticipant(currentChat?.participants, currentUserId ?? undefined);
    console.debug('[renderMessage] sender, normalizedSender, currentUserId, normalizedCurrent, isCurrentUser', item.senderId, normalizedSender, currentUserId, normalizedCurrent, isCurrentUser);
    
    return (
      <View 
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          { 
            backgroundColor: isCurrentUser ? theme.primary : theme.card,
            alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
            flexDirection: 'row',
            alignItems: 'flex-start',
            maxWidth: '80%',
            marginVertical: 4,
            padding: 12,
            borderRadius: 18,
            borderBottomLeftRadius: isCurrentUser ? 18 : 4,
            borderBottomRightRadius: isCurrentUser ? 4 : 18,
          },
        ]}
      >
        {!isCurrentUser && otherUser.profilePic ? (
          <Image
            source={{ uri: otherUser.profilePic }}
            style={styles.avatar}
          />
        ) : null}
        
        <View style={{ flex: 1 }}>
          {!isCurrentUser && (
            <ThemedText 
              style={[
                styles.senderName, 
                { 
                  color: isCurrentUser ? theme.background : theme.primary,
                  marginBottom: 4,
                  fontWeight: '600',
                }
              ]}
            >
              {otherUser.username}
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
          
          <View 
            style={[
              styles.messageFooter,
              { 
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginTop: 4,
              }
            ]}
          >
            <ThemedText 
              style={[
                styles.timestamp,
                { 
                  color: isCurrentUser ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
                  fontSize: 12,
                  marginRight: 4,
                }
              ]}
            >
              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : '??:??'}
            </ThemedText>
            {isCurrentUser && (
              <View style={styles.statusContainer}>
                {/* Do not show a loading spinner/icon for 'sending' status. Only render checkmarks for sent/delivered/read */}
                {messageStatus !== 'sending' && (
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
  }, [currentUserId, theme, getOtherParticipant, currentChat?.participants]);
  
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
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => `${item.id || 'temp'}-${index}`}
            contentContainerStyle={[styles.messagesContainer, { paddingHorizontal: 12, paddingTop: 12 }]}
            style={{ flex: 1 }}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={true}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={21}
            updateCellsBatchingPeriod={50}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                <ThemedText style={{ color: theme.text, opacity: 0.7 }}>
                  No messages yet. Start the conversation!
                </ThemedText>
              </View>
            }
          />
        </View>
        
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
            onPress={handleSend}
            disabled={!message.trim() || isSending}
            style={[styles.sendButton, { opacity: message.trim() ? 1 : 0.5 }]}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatScreen;
