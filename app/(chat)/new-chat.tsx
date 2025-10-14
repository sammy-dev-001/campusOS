import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { API_BASE_URL } from '../../config/api';
import { useChat } from '../../src/contexts/ChatContext';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { useUser } from '../../src/contexts/UserContext';

interface User {
  id: string;
  displayName: string;
  email: string;
  profilePicture?: string;
}

const API_URL = API_BASE_URL;

export const options = { headerShown: false };

export default function NewChatScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { chats, setChats } = useChat();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshChatsRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Show loading state while user data is being loaded
  useEffect(() => {
    if (currentUser) {
      setIsLoading(false);
    }
  }, [currentUser]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 10 }}>Loading user data...</ThemedText>
      </View>
    );
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const timer = setTimeout(() => setRefreshing(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle search with debounce
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if query is at least 2 characters
    if (searchQuery.length >= 2) {
      setLoading(true);
      
      // Set a new timeout to debounce the search
      searchTimeoutRef.current = setTimeout(() => {
        fetchUsers(searchQuery);
      }, 500); // 500ms debounce time
    } else if (searchQuery.length === 0) {
      // Clear results if search is empty
      setUsers([]);
      setError(null);
    }

    // Cleanup function to clear timeout on unmount or dependency change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Helper function to fetch full user data if needed
  const fetchUserData = async (userRef: any) => {
    try {
      // If userRef is already an object with _id, return it directly
      if (userRef && typeof userRef === 'object' && userRef._id) {
        return userRef;
      }

      // If userRef is a string (user ID), fetch the full user data
      const userId = typeof userRef === 'string' ? userRef : userRef?._id;
      
      if (!userId) {
        console.error('No valid user reference provided');
        return null;
      }

      const authData = await AsyncStorage.getItem('authData');
      const token = authData ? JSON.parse(authData).token : null;
      
      if (!token) {
        console.error('No auth token available for fetching user data');
        return null;
      }
      
      console.log(`Fetching user data for ID: ${userId}`);
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const fetchUsers = async (query: string) => {
    console.log('[fetchUsers] Starting user search with query:', query);
    
    if (!query.trim()) {
      console.log('[fetchUsers] Empty search query, clearing users');
      setUsers([]);
      return;
    }

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setError(null);
    setLoading(true);
    
    try {
      // Get auth data
      const authData = await AsyncStorage.getItem('authData');
      if (!authData) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const parsedAuth = JSON.parse(authData);
      const token = parsedAuth?.token;
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Make the API request with error boundaries
      const searchUrl = new URL(`${API_URL}/users/search`);
      searchUrl.searchParams.append('q', query.trim()); // Use the query parameter instead of searchQuery
      
      console.log(`[fetchUsers] Making request to: ${searchUrl.toString()}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let response;
      try {
        response = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
      } catch (error) {
        const fetchError = error as Error & { name: string };
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw new Error(`Network error: ${fetchError.message}`);
      } finally {
        clearTimeout(timeoutId);
      }

      console.log(`[fetchUsers] Response status: ${response.status}`);
      
      // Get response text first to handle both JSON and text responses
      const responseText = await response.text();
      console.log('[fetchUsers] Raw response:', responseText);
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorDetails = 'No error details';
        try {
          const errorData = JSON.parse(responseText);
          errorDetails = errorData.message || JSON.stringify(errorData);
          
          // Don't show error for short queries, just clear results
          if (response.status === 400 && errorData.code === 'QUERY_TOO_SHORT') {
            setUsers([]);
            return;
          }
        } catch (e) {
          errorDetails = responseText || 'No error details';
        }
        
        if (response.status === 401) {
          await AsyncStorage.removeItem('authData');
          throw new Error('Your session has expired. Please log in again.');
        }
        
        if (response.status === 500) {
          console.error('[fetchUsers] Server error details:', errorDetails);
          throw new Error('Unable to search for users at this time. The server encountered an error.');
        }
        
        throw new Error(`Error: ${errorDetails}`);
      }

      // Parse successful response
      let data;
      try {
        data = JSON.parse(responseText);
        
        // Handle both array and object with results property
        if (data && data.results && Array.isArray(data.results)) {
          data = data.results; // Use the results array
        } else if (!Array.isArray(data)) {
          console.error('[fetchUsers] Expected array or object with results array but got:', typeof data, data);
          throw new Error('Unexpected response format from server');
        }
      } catch (e) {
        console.error('[fetchUsers] Error parsing response:', e, 'Response:', responseText);
        throw new Error('Unable to process the response from the server');
      }
      
      console.log(`[fetchUsers] Received ${data.length} chat items`);
      
      // Log the raw data structure using console.dir for better inspection
      console.log('[fetchUsers] Raw data structure:');
      console.dir({
        dataLength: data.length,
        firstChat: data[0] ? {
          ...data[0],
          participants: data[0].participants?.map((p: any) => ({
            ...p,
            user: p.user ? {
              _id: p.user._id,
              name: p.user.name,
              username: p.user.username,
              email: p.user.email,
              profilePicture: p.user.profilePicture || p.user.profile_picture || p.user.avatar,
              keys: Object.keys(p.user)
            } : null
          }))
        } : 'No chats',
        dataKeys: Object.keys(data[0] || {})
      }, { depth: null, colors: true });
      
      // Log the first participant's user data if available
      if (data[0]?.participants?.[0]?.user) {
        console.log('First participant user data:', {
          ...data[0].participants[0].user,
          // Add any other user properties you want to see
        });
      }
      
      // Map and filter users with better error handling
      const currentUserId = String(currentUser?.id);
      const validUsers: User[] = [];
      
      // Enhanced logging to show full participant data with proper typing
      interface LoggableUser {
        _id: string;
        displayName: string;
        email: string;
        profilePicture: string | null;
      }

      interface LoggableParticipant {
        isAdmin: boolean;
        lastRead: string;
        unreadCount: number;
        user: LoggableUser | null;
      }

      interface LoggableChat {
        id: string;
        participants: LoggableParticipant[];
        [key: string]: any;
      }

      const loggableData: LoggableChat[] = data.map((chat: any) => ({
        ...chat,
        participants: chat.participants?.map((participant: any) => ({
          ...participant,
          user: participant.user ? {
            _id: participant.user._id,
            displayName: participant.user.displayName || participant.user.name || participant.user.username || 'Unknown',
            email: participant.user.email || '',
            profilePicture: participant.user.profilePicture || participant.user.profile_picture || participant.user.avatar || null
          } : null
        }))
      }));
      
      // Log the raw data structure to understand its shape
      console.log('Raw chat data structure:', {
        chatCount: data.length,
        firstChat: data[0] ? {
          ...data[0],
          participants: data[0].participants?.map((p: any) => ({
            ...p,
            user: p.user ? 'UserObject' : null
          }))
        } : 'No chats',
        dataKeys: data[0] ? Object.keys(data[0]) : []
      });

      // Log the first participant's user data if available
      if (data[0]?.participants?.[0]?.user) {
        console.log('First participant user data keys:', Object.keys(data[0].participants[0].user));
      }
      
      // Process each chat item
      for (const chat of data) {
        try {
          if (!chat || !chat.participants || !Array.isArray(chat.participants)) {
            console.log('Skipping invalid chat item:', chat);
            continue;
          }

          console.log('Processing chat:', {
            id: chat._id || chat.id,
            name: chat.name,
            isGroup: chat.isGroupChat,
            participantCount: chat.participants?.length || 0
          });
          
          // Extract all users from participants
          for (const participant of chat.participants) {
            try {
// Log the participant data for debugging
              interface LoggableParticipantData {
                isAdmin: boolean;
                lastRead: string;
                unreadCount: number;
                user: {
                  _id: string;
                  displayName: string;
                  email: string;
                  profilePicture: string | null;
                } | null;
                [key: string]: any;
              }

              const loggableParticipant: LoggableParticipantData = {
                ...participant,
                user: participant.user ? {
                  _id: participant.user._id,
                  displayName: participant.user.displayName || participant.user.name || participant.user.username || 'Unknown',
                  email: participant.user.email || '',
                  profilePicture: participant.user.profilePicture || participant.user.profile_picture || participant.user.avatar || null
                } : null
              };
              
              // Create a deep clone of the participant to avoid reference issues
              const participantClone = JSON.parse(JSON.stringify(participant));
              
              // Log the participant with all its properties
              console.log('Processing participant:');
              console.dir({
                ...participantClone,
                user: participantClone.user ? {
                  ...participantClone.user,
                  // Add any additional user properties you want to see
                  profilePicture: participantClone.user.profilePicture || 
                                participantClone.user.profile_picture || 
                                participantClone.user.avatar
                } : null
              }, { depth: null, colors: true });
              
              // Log the raw user object properties if available
              if (participantClone.user) {
                console.log('User properties:');
                console.table(
                  Object.entries(participantClone.user).map(([key, value]) => ({
                    Property: key,
                    Type: typeof value,
                    Value: typeof value === 'object' ? JSON.stringify(value) : String(value)
                  }))
                );
              }
              
              // Skip if participant has no user data or is the current user
              if (!participant.user || typeof participant.user !== 'object') {
                console.log('Skipping participant - invalid user data');
                continue;
              }
              
              // Handle user data which might be a direct object, reference, or string ID
              let userData = participant.user;
              
              // If userData is a string (ID), fetch the full user data
              if (typeof userData === 'string' || (userData && !userData._id)) {
                const fetchedUser = await fetchUserData(userData);
                if (fetchedUser) {
                  userData = fetchedUser;
                  console.log('Fetched user data:', {
                    id: userData._id || userData.id,
                    username: userData.username,
                    name: userData.name,
                    email: userData.email,
                    hasProfilePic: !!(userData.profilePic || userData.profilePicture || userData.avatar)
                  });
                } else {
                  console.log('Skipping participant - could not fetch user data for:', userData);
                  continue;
                }
              }
              
              // Ensure we have a valid user ID
              if (!userData?._id && !userData?.id) {
                console.log('Skipping participant - no valid user ID:', userData);
                continue;
              }
              
              if (!userData || !userData._id) {
                console.log('Skipping participant - no valid user ID:', participant);
                continue;
              }
              
              const userId = String(userData._id || userData.id);
              if (userId === currentUser?.id) {
                console.log('Skipping current user:', userId);
                continue;
              }
              
              // Extract display name from various possible fields
              const displayName = userData.displayName || 
                               userData.name || 
                               userData.username || 
                               (userData.profile && (userData.profile.name || userData.profile.username)) ||
                               'Unknown User';
              
              // Extract email from various possible fields
              const email = userData.email || 
                          (userData.profile && userData.profile.email) || 
                          '';
              
              // Extract profile picture from various possible fields
              const profilePicture = userData.profilePicture || 
                                  userData.profile_picture || 
                                  userData.profilePic || 
                                  userData.avatar || 
                                  (userData.profile && (userData.profile.picture || 
                                                       userData.profile.avatar || 
                                                       userData.profile.image)) ||
                                  undefined;
              
              console.log('Processed user:', {
                id: userId,
                displayName,
                email,
                hasPicture: !!profilePicture,
                userData: {
                  ...userData,
                  // Include only relevant user data fields
                  _id: userData._id,
                  id: userData.id,
                  name: userData.name,
                  username: userData.username,
                  email: userData.email,
                  profilePic: userData.profilePic,
                  profilePicture: userData.profilePicture,
                  avatar: userData.avatar,
                  hasProfile: !!userData.profile
                }
              });
              
              // Check if user already exists in validUsers
              const existingUserIndex = validUsers.findIndex((u: User) => u.id === userId);
              if (existingUserIndex === -1) {
                const newUser: User = {
                  id: userId,
                  displayName,
                  email,
                  profilePicture
                };
                validUsers.push(newUser);
              } else {
                console.log('User already exists in validUsers with ID:', userId);
              }
            } catch (e) {
              console.error('Error processing participant:', participant, e);
            }
          }
        } catch (e) {
          console.error('Error processing chat item:', chat, e);
        }
      }
      
      // Filter out current user and invalid entries
      const filteredUsers = validUsers.filter(u => 
        u.id !== currentUserId && u.displayName !== 'Unknown User'
      );
      
      console.log(`[fetchUsers] Found ${filteredUsers.length} valid users after filtering`);
      return filteredUsers;
      
    } catch (error) {
      console.error('[fetchUsers] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('[fetchUsers] Error details:', error);
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!selectedUser || !currentUser?.id) return;
    try {
      // Get auth token from AsyncStorage
      const authData = await AsyncStorage.getItem('authData');
      const token = authData ? JSON.parse(authData).token : null;

      if (!token) {
        throw new Error('Authentication token not found');
      }

      console.log('Creating chat with participants:', [selectedUser.id]);
      
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          participants: [selectedUser.id],  // Just send the ID, backend will format it
          isGroupChat: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create chat');
      }
      
      const chat = await response.json();
      
      // Refresh chat list to include the new chat
      if (refreshChatsRef.current) {
        await refreshChatsRef.current();
      }
      
      // Add a small delay to ensure navigation is ready
      setTimeout(() => {
        router.push(`/(chat)/${chat.id}`);
      }, 100);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat. Please try again.');
    }
  };

  const handleUserPress = useCallback(async (selectedUser: User) => {
    console.log('handleUserPress called with user:', selectedUser);
    
    if (!currentUser) {
      console.error('No current user found');
      setError('Please log in to start a chat');
      return null;
    }
    let effectiveUser = currentUser;
    
    if (!effectiveUser?.id) {
      console.error('No current user ID - current user state:', effectiveUser);
      // Try to get user from AsyncStorage as a fallback
      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const { user: storedUser } = JSON.parse(authData);
          if (storedUser?.id) {
            console.log('Using user data from AsyncStorage');
            effectiveUser = { 
              id: storedUser.id,
              display_name: storedUser.display_name || storedUser.username || '',
              email: storedUser.email,
              username: storedUser.username || '',
              profile_picture: storedUser.profile_picture
            };
          }
        }
      } catch (error) {
        console.error('Error getting user from AsyncStorage:', error);
      }
      
      if (!effectiveUser?.id) {
        setError('Please log in to start a chat');
        return null;
      }
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Get auth token from AsyncStorage
      const authData = await AsyncStorage.getItem('authData');
      console.log('Auth data from storage:', authData ? 'exists' : 'missing');
      
      const token = authData ? JSON.parse(authData).token : null;
      
      if (!token) {
        console.error('No auth token found');
        throw new Error('Authentication token not found');
      }
      
      if (!currentUser?.id) {
        throw new Error('Current user ID is missing');
      }
      console.log('Checking for existing chat between:', currentUser.id, 'and', selectedUser.id);
      
      // First, try to find an existing chat
      console.log('Checking for existing chat with participant:', selectedUser.id);
      const checkResponse = await fetch(`${API_BASE_URL}/chats/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          participants: [selectedUser.id],  // Just send the ID, backend will format it
          isGroupChat: false
        }),
      });
      
      console.log('Check chat response status:', checkResponse.status);
      
      let chatId: string | null = null;
      
      if (checkResponse.ok) {
        // If chat exists, get its ID
        const checkData = await checkResponse.json();
        console.log('Check chat response data:', checkData);
        
        chatId = checkData.chatId || checkData.id || (checkData._id ? checkData._id.toString() : null);
        console.log('Found existing chat ID:', chatId);
      } else if (checkResponse.status !== 404) {
        // Only throw if it's not a 404 (which means no chat exists)
        const errorData = await checkResponse.json().catch(() => ({}));
        console.error('Error checking for chat:', errorData);
        throw new Error(errorData.message || 'Error checking for existing chat');
      }
      
      // If no chat exists, create a new one
      if (!chatId) {
        console.log('No existing chat found, creating new one...');
        
        const createResponse = await fetch(`${API_BASE_URL}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            participants: [currentUser.id, selectedUser.id],
            type: 'individual',
          }),
        });
        
        console.log('Create chat response status:', createResponse.status);
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          console.error('Error creating chat:', errorData);
          throw new Error(errorData.message || 'Failed to create chat');
        }
        
        const createData = await createResponse.json();
        console.log('Create chat response data:', createData);
        
        chatId = createData.id || createData._id || null;
        console.log('Created new chat with ID:', chatId);
        
        if (!chatId) {
          throw new Error('No chat ID received from server');
        }
        
        // Refresh chat list to include the new chat using the ref
        console.log('Refreshing chat list...');
        if (refreshChatsRef.current) {
          await refreshChatsRef.current();
        }
      }
      
      if (!chatId) {
        throw new Error('No chat ID available');
      }
      
      console.log('Navigating to chat:', chatId);
      
      // Navigate to the chat screen with just the chat ID
      // The chat screen will fetch the full chat details
      router.push(`/(chat)/${chatId}`);
      
      return chatId;
    } catch (error) {
      console.error('Error in handleUserPress:', error);
      setError(error instanceof Error ? error.message : 'Failed to start chat. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Function to refresh chat list
  const refreshChats = useCallback(async () => {
    if (!currentUser?.id) {
      console.log('No current user ID, cannot refresh chats');
      return;
    }
    console.log('Refreshing chats for user:', currentUser.id);
    try {
      const authData = await AsyncStorage.getItem('authData');
      const token = authData ? JSON.parse(authData).token : null;
      
      const response = await fetch(`${API_BASE_URL}/chats?userId=${currentUser.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      console.log('Chats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Chats data received:', data);
        setChats(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', errorData);
      }
    } catch (error) {
      console.error('Error refreshing chats:', error);
    }
  }, [currentUser?.id, setChats, refreshChatsRef]);

  // Update the ref when refreshChats changes
  useEffect(() => {
    refreshChatsRef.current = refreshChats;
  }, [refreshChats]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Don't search for queries shorter than 2 characters
    if (text.trim().length < 2) {
      setUsers([]);
      return;
    }
    
    // Set new timeout for debouncing
    setLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers(text);
    }, 300);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#333' : '#eee',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            padding: 8,
            marginRight: 16,
          }}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <ThemedText style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: isDark ? '#fff' : '#000',
          flex: 1,
        }}>
          New Chat
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={{
        margin: 16,
        borderRadius: 12,
        backgroundColor: isDark ? '#1E1E1E' : '#f5f5f5',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
      }}>
        <Ionicons 
          name="search" 
          size={20} 
          color={isDark ? '#666' : '#999'} 
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={{
            flex: 1,
            height: '100%',
            color: isDark ? '#fff' : '#000',
            fontSize: 16,
          }}
          placeholder="Search users..."
          placeholderTextColor={isDark ? '#666' : '#999'}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => {
              setSearchQuery('');
              setUsers([]);
              setError(null);
            }}
            style={{ padding: 4 }}
          >
            <Ionicons name="close-circle" size={20} color={isDark ? '#666' : '#999'} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Error message */}
      {error ? (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <ThemedText style={{ color: '#ff6b6b', textAlign: 'center' }}>{error}</ThemedText>
        </View>
      ) : null}

{loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ThemedText style={{ color: '#ff6b6b', textAlign: 'center' }}>{error}</ThemedText>
        </View>
      ) : users.length === 0 && searchQuery.length >= 2 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText style={{ color: isDark ? '#888' : '#666', fontSize: 16 }}>No users found.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          style={{ width: '100%' }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={{ width: '100%', paddingHorizontal: 16, marginBottom: 8 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: selectedUser?.id === item.id ? '#2196F3' : '#23242A',
                  borderWidth: selectedUser?.id === item.id ? 2 : 0,
                  borderColor: '#2196F3',
                  minHeight: 70,
                  padding: 16,
                  borderRadius: 12,
                  width: '100%',
                }}
                onPress={() => {
                  console.log('User item pressed - TouchableOpacity onPress fired');
                  console.log('User ID:', item.id);
                  console.log('User Name:', item.displayName);
                  
                  // Directly call handleUserPress
                  setSelectedUser(item);
                  setLoading(true);
                  handleUserPress(item)
                    .then(() => console.log('handleUserPress completed'))
                    .catch(error => {
                      console.error('Error in handleUserPress:', error);
                      setError('Failed to open chat. ' + (error instanceof Error ? error.message : 'Please try again.'));
                    })
                    .finally(() => setLoading(false));
                }}
                activeOpacity={0.7}
                delayPressIn={0}
                testID={`user-item-${item.id}`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                {/* User item content */}
                {item.profilePicture ? (
                  <Image 
                    source={{ uri: item.profilePicture }} 
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      marginRight: 16,
                      backgroundColor: '#444'
                    }} 
                  />
                ) : (
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#444',
                    marginRight: 16,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                      {item.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </ThemedText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>
                    {item.displayName || 'Unknown User'}
                  </ThemedText>
                  <ThemedText style={{ color: '#B0B0B0', fontSize: 14 }}>
                    {item.email || ''}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          )}
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
  userItemContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 14,
    padding: 14,
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
