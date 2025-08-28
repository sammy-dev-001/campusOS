import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { API_BASE_URL } from '../../config/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

interface User {
  id: string;
  displayName: string;
  email: string;
  profilePicture?: string;
}

const API_URL = API_BASE_URL;

export default function NewGroupScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
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
      setUsers(mappedUsers.filter((u: User) => 
        u.id.toString() !== currentUser?.id?.toString() && 
        !selectedUsers.find(su => su.id.toString() === u.id.toString())
      ));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const mediaTypesCompat: any = (ImagePicker as any).MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesCompat,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        // Compress & resize to speed up upload
        const manipulationResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        setGroupImage(manipulationResult.uri || uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      console.log('Validation failed - group name is required');
      setError('Please enter a group name');
      return;
    }

    setCreating(true);
    setError(null);
    
    try {
      console.log('Starting group creation with:', {
        groupName: groupName.trim(),
        participantCount: selectedUsers.length,
        hasImage: false // Temporarily disable image upload
      });

      // Build participants: dedupe, remove falsy, and ensure they're numbers
      const participantIds = [
        ...new Set([
          ...selectedUsers.map(u => Number(u.id)),
          Number(currentUser?.id)
        ].filter(Boolean))
      ];
      
      // Create request body
      const requestBody = {
        name: groupName.trim(),
        participants: participantIds,
        type: 'group'  // Explicitly set type to 'group' for regular groups
      };
      
      // Log the request data being sent
      console.log('Request body:', requestBody);
      console.log('Sending request to:', `${API_URL}/chat-groups`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
      
      try {
        const response = await fetch(`${API_URL}/chat-groups`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log('Response status:', response.status);

        if (!response.ok) {
          let errMsg = `Server responded with status ${response.status}`;
          try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const errorData = await response.json();
              console.log('Error response:', errorData);
              errMsg = errorData.message || errMsg;
            } else {
              const text = await response.text();
              console.log('Non-JSON error response:', text);
              if (text) errMsg = text;
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
          }
          throw new Error(errMsg);
        }

        const result = await response.json();
        console.log('Group created successfully:', result);
        
        if (result?.chat?.id) {
          router.push(`/(chat)/${result.chat.id}`);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error: unknown) {
        const fetchError = error as Error;
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.error('Error in group creation:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      setError(error?.message || 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Create Group',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreateGroup}
              disabled={creating || !groupName.trim() || selectedUsers.length === 0}
              style={[
                styles.createButton,
                (!groupName.trim() || selectedUsers.length === 0) && styles.createButtonDisabled
              ]}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.createButtonText}>Create</ThemedText>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.groupInfoContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
          {groupImage ? (
            <Image source={{ uri: groupImage }} style={styles.groupImage} />
          ) : (
            <View style={[styles.groupImagePlaceholder, { backgroundColor: theme.secondary }]}>
              <Ionicons name="camera" size={24} color={theme.text} />
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.groupNameInput, { color: theme.text, backgroundColor: theme.background }]}
          placeholder="Group name"
          placeholderTextColor={theme.secondary}
          value={groupName}
          onChangeText={setGroupName}
        />
        
        {error && (
          <ThemedText style={[styles.errorText, { color: 'red' }]}>
            {error}
          </ThemedText>
        )}
      </View>

      <View style={[styles.searchSection, { backgroundColor: theme.card }]}>
        <Ionicons name="search" size={20} color={theme.secondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search people..."
          placeholderTextColor={theme.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedUsers.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectedUsersSection}
          data={selectedUsers}
          keyExtractor={item => `selected-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.selectedUserChip, { backgroundColor: theme.card }]}
              onPress={() => {
                setSelectedUsers(prev => prev.filter(u => u.id !== item.id));
                if (searchQuery) fetchUsers();
              }}
            >
              {item.profilePicture ? (
                <Image source={{ uri: item.profilePicture }} style={styles.selectedUserImage} />
              ) : (
                <View style={[styles.selectedUserInitial, { backgroundColor: theme.secondary }]}>
                  <ThemedText>{item.displayName[0].toUpperCase()}</ThemedText>
                </View>
              )}
              <ThemedText style={styles.selectedUserName}>{item.displayName}</ThemedText>
              <Ionicons name="close-circle" size={16} color={theme.text} />
            </TouchableOpacity>
          )}
        />
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6B8BBE" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => `user-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, { backgroundColor: theme.card }]}
              onPress={() => {
                setSelectedUsers(prev => [...prev, item]);
                setUsers(prev => prev.filter(u => u.id !== item.id));
              }}
            >
              {item.profilePicture ? (
                <Image source={{ uri: item.profilePicture }} style={styles.userImage} />
              ) : (
                <View style={[styles.userInitial, { backgroundColor: theme.secondary }]}>
                  <ThemedText>{item.displayName[0].toUpperCase()}</ThemedText>
                </View>
              )}
              <View style={styles.userInfo}>
                <ThemedText style={styles.userName}>{item.displayName}</ThemedText>
                <ThemedText style={styles.userEmail}>{item.email}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.usersList}
          ListEmptyComponent={
            searchQuery.length >= 2 ? (
              <ThemedText style={styles.emptyText}>No users found</ThemedText>
            ) : searchQuery.length > 0 ? (
              <ThemedText style={styles.emptyText}>Type at least 2 characters to search</ThemedText>
            ) : null
          }
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  groupInfoContainer: {
    borderRadius: 12,
    margin: 16,
    padding: 16,
    elevation: 2,
  },
  imagePickerButton: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  groupImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  groupImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameInput: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  selectedUsersSection: {
    maxHeight: 70,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedUserImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  selectedUserInitial: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedUserName: {
    fontSize: 14,
    marginRight: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersList: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  createButton: {
    backgroundColor: '#6B8BBE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
  },
});
