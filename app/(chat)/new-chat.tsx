import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { API_BASE_URL } from '../../config/api';
import { useChat } from '../../contexts/ChatContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

interface User {
  id: string;
  displayName: string;
  email: string;
  profilePicture?: string;
}

const API_URL = API_BASE_URL;

export const options = { headerShown: false };

export default function NewChatScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { chats, setChats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  if (!currentUser) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading user...</ThemedText>
      </View>
    );
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/users/search?q=${searchQuery}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data = await response.json();
      const mappedUsers = data.map((user: any) => ({
        id: user.id,
        displayName: user.name || user.displayName || user.username,
        email: user.email || '',
        profilePicture: user.profile_picture || undefined,
      }));
      setUsers(mappedUsers.filter((u: User) => u.id !== String(currentUser?.id)));
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!selectedUser || !currentUser?.id) return;
    try {
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          participants: [currentUser.id, selectedUser.id],
          type: 'individual',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create chat');
      }
      const chat = await response.json();
      
      // Refresh chat list to include the new chat
      await refreshChats();
      
      // Add a small delay to ensure navigation is ready
      setTimeout(() => {
        router.push(`/(chat)/${chat.id}`);
      }, 100);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat. Please try again.');
    }
  };

  const handleUserPress = async (selectedUser: User) => {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          participants: [currentUser.id, selectedUser.id],
          type: 'individual',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create chat');
      }
      const chatData = await response.json();
      const chatId = chatData.id?.toString();
      if (!chatId) {
        throw new Error('Invalid chat ID received');
      }
      
      // Refresh chat list to include the new chat
      await refreshChats();
      
      // Add a small delay to ensure navigation is ready
      setTimeout(() => {
        router.push(`/(chat)/${chatId}`);
      }, 100);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat. Please try again.');
    }
  };

  // Function to refresh chat list
  const refreshChats = async () => {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(`${API_URL}/chats?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setChats(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error refreshing chats:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Custom Header */}
      <View style={{
        paddingTop: 8,
        paddingBottom: 16,
        backgroundColor: '#000',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#23242A',
        flexDirection: 'row',
        justifyContent: 'center',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: 'absolute', left: 16, top: 8, padding: 8 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>New Chat</ThemedText>
      </View>
      <View style={[styles.searchContainer, { backgroundColor: '#23242A', borderRadius: 12, margin: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }]}>
        <Ionicons name="search" size={20} color={theme.secondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: '#fff', flex: 1, fontSize: 16, paddingVertical: 10, backgroundColor: 'transparent' }]}
          placeholder="Search users..."
          placeholderTextColor={theme.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : users.length === 0 && searchQuery.length >= 2 ? (
        <View style={styles.centerContainer}>
          <ThemedText style={styles.emptyText}>No users found.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.userItem,
                { backgroundColor: selectedUser?.id === item.id ? '#2196F3' : '#23242A', borderWidth: selectedUser?.id === item.id ? 2 : 0, borderColor: '#2196F3' }
              ]}
              onPress={async () => {
                setSelectedUser(item);
                setLoading(true);
                await handleUserPress(item);
                setLoading(false);
              }}
            >
              {item.profilePicture ? (
                <Image source={{ uri: item.profilePicture }} style={styles.userAvatar} />
              ) : (
                <View style={[styles.defaultAvatar, { backgroundColor: '#444' }]}>
                  <ThemedText style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</ThemedText>
                </View>
              )}
              <View style={styles.userInfo}>
                <ThemedText style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>{item.displayName}</ThemedText>
                <ThemedText style={{ color: '#B0B0B0', fontSize: 14 }}>{item.email}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
    color: '#fff',
    backgroundColor: 'transparent',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
});
