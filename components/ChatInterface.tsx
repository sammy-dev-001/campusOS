import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemedText } from './ThemedText';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  chatId?: string;
  onSendMessage?: (message: string) => void;
  messages?: Message[];
  isLoading?: boolean;
}

export default function ChatInterface({
  chatId,
  onSendMessage,
  messages = [],
  isLoading = false,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const { isDark, theme } = useTheme();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id?.toString();

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage
                ? isDark
                  ? theme.primary
                : theme.primary
                : isDark
                ? '#2c2c2c'
                : '#f0f0f0',
            },
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              {
                color: isOwnMessage
                  ? '#fff'
                  : isDark
                  ? '#fff'
                  : '#000',
              },
            ]}
            type="default"
          >
            {item.text}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ImageBackground
        source={require('../assets/school-doodles.svg')}
        style={StyleSheet.absoluteFill}
        resizeMode="repeat"
        imageStyle={{ opacity: 0.12 }}
      />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? '#1a1a1a' : '#fff',
            borderTopColor: isDark ? '#333' : '#e0e0e0',
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#2c2c2c' : '#f5f5f5',
              color: isDark ? '#fff' : '#000',
            },
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={isDark ? '#666' : '#999'}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: message.trim() ? theme.primary : (isDark ? '#333' : '#ccc'),
            },
          ]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 8,
    padding: 8,
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 