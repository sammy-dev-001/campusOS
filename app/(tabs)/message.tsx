import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { API_BASE_URL } from '../../src/constants/Config';
import { useAuth } from '../../src/contexts/AuthContext';
import { Chat, Message, useChat } from '../../src/contexts/ChatContext';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { BrandColors } from '../../src/theme/edufi';

// Filter type for segmented tabs
type FilterType = 'all' | 'groups' | 'dms';

// Extend the Chat interface to include any additional properties needed for the UI
interface ChatItem extends Omit<Chat, 'lastMessage' | 'updatedAt'> {
  // Override lastMessage to make it optional
  lastMessage: Message | null;  // Make it required but allow null
  // Add any additional properties specific to the UI here
  avatar?: string;
  // Add any other UI-specific properties here
}

// Simple time ago formatter
function formatTimeAgo(timestamp?: string) {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return date.toLocaleDateString();
}

const getInitials = (name?: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = ['#6C63FF', '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6F91', '#845EC2'];
function getAvatarColor(id: string | number) {
  if (!id) return AVATAR_COLORS[0];
  const hash = typeof id === 'string' ? id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : id;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function MessageScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chats, userStatus, fetchChats, deleteChat } = useChat();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFabModal, setShowFabModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh chats every time the screen gains focus AND poll every 15s while visible
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let intervalId: ReturnType<typeof setInterval>;

      const refresh = async () => {
        try {
          await fetchChats();
          if (isMounted) {
            setLoading(false);
            setError(null);
          }
        } catch (err) {
          console.error('Failed to load chats:', err);
          if (isMounted) {
            setLoading(false);
            setError(err as Error);
            setErrorMessage('Failed to load chats. Please pull down to refresh.');
          }
        }
      };

      // Fetch immediately on focus
      refresh();

      // Poll every 15 seconds while screen is focused
      intervalId = setInterval(refresh, 15_000);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }, [fetchChats])
  );

  // Sort and filter chats by most recent activity
  const sortedChats = useMemo(() => {
    let filtered = [...chats];

    // Apply filter based on active tab
    if (activeFilter === 'groups') {
      filtered = filtered.filter(chat => chat.isGroup === true);
    } else if (activeFilter === 'dms') {
      filtered = filtered.filter(chat => chat.isGroup !== true);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chat => {
        // Search in chat name
        const chatName = chat.name?.toLowerCase() || '';
        // Search in participant names
        const participantNames = chat.participants?.map(p =>
          (p.displayName || p.username || p.user?.displayName || p.user?.username || '').toLowerCase()
        ).join(' ') || '';
        // Search in last message content
        const lastMsg = (chat.lastMessage?.content || '').toLowerCase();

        return chatName.includes(query) || participantNames.includes(query) || lastMsg.includes(query);
      });
    }

    // Sort by most recent
    return filtered.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chats, activeFilter, searchQuery]);

  // Debug: log context vs local counts
  React.useEffect(() => {
    console.log('[MessageScreen] context chats length:', chats?.length || 0);
    console.log('[MessageScreen] local sortedChats length:', sortedChats?.length || 0);
  }, [chats, sortedChats]);

  const handleNewChat = () => {
    router.push('/(chat)/new-chat' as any);
  };

  const handleNewGroup = () => {
    router.push('/(chat)/new-group' as any);
  };

  const handleChatPress = (chatId: string | number) => {
    console.log('Navigating to chat:', chatId);
    router.push(`/(chat)/${chatId}` as any);
  };

  const handleDeleteChat = (chatId: string | number) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(String(chatId));
            } catch (error) {
              console.error('Failed to delete chat:', error);
              Alert.alert('Error', 'Failed to delete chat. Please try again.');
            }
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      await fetchChats();
    } catch (err) {
      console.error('Failed to refresh chats:', err);
      setError(err as Error);
      setErrorMessage('Failed to refresh chats. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchChats]);



  const renderRightActions = (item: Chat) => (
    <TouchableOpacity
      style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%' }}
      onPress={() => handleDeleteChat(item.id)}
    >
      <Ionicons name="trash" size={24} color="white" />
    </TouchableOpacity>
  );

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    console.log('Chat item:', JSON.stringify(item, null, 2));
    console.log('Current user ID:', user?.id);
    const isUnread = item.unreadCount > 0;

    // Debug log all participants
    console.log('All participants:', JSON.stringify(item.participants?.map(p => ({
      id: p.id,
      userId: p.user?.id || p.user?._id,
      username: p.username || p.user?.username,
      displayName: p.displayName || p.user?.displayName
    })), null, 2));

    // Find the other participant (not the current user)
    const otherParticipant = item.participants?.find(p => {
      const participantId = p.user?.id || p.user?._id || p.id;
      const isOther = participantId !== user?.id;
      console.log(`Participant check:`, {
        participantId,
        currentUserId: user?.id,
        isOther,
        participant: {
          id: p.id,
          userId: p.user?.id || p.user?._id,
          username: p.username || p.user?.username,
          displayName: p.displayName || p.user?.displayName
        }
      });
      return isOther;
    });

    console.log('Other participant found:', otherParticipant ? {
      id: otherParticipant.id,
      userId: otherParticipant.user?.id || otherParticipant.user?._id,
      username: otherParticipant.username || otherParticipant.user?.username,
      displayName: otherParticipant.displayName || otherParticipant.user?.displayName
    } : 'None found');

    // Get all recipients (excluding current user)
    const recipients = (item.participants || []).filter(p => {
      const participantId = p.user?.id || p.user?._id || p.id;
      return participantId !== user?.id;
    });

    console.log('Recipients after filter:', recipients.map(r => ({
      id: r.id,
      userId: r.user?.id || r.user?._id,
      username: r.username || r.user?.username,
      displayName: r.displayName || r.user?.displayName
    })));

    // Helper function to get display name from participant
    const getParticipantName = (p: any) => {
      return p.user?.displayName || p.displayName || p.user?.username || p.username || 'Unknown User';
    };

    // Helper function to get profile picture from participant
    const getParticipantProfilePicture = (p: any) => {
      return p.user?.profilePicture || p.user?.profile_picture || p.user?.avatar || p.profilePicture || p.avatar;
    };

    // For direct messages, prefer displayName/fullName over username
    // For group chats, use the chat name or 'Group Chat' as fallback
    const displayName = item.isGroup
      ? item.name || 'Group Chat'
      : (otherParticipant?.user?.displayName || otherParticipant?.displayName ||
        otherParticipant?.user?.fullName || otherParticipant?.fullName ||
        otherParticipant?.user?.username || otherParticipant?.username || 'Chat');

    const avatarColor = getAvatarColor(item.id);

    // Get profile picture URL, handling both relative and absolute paths
    const getProfilePictureUrl = (url?: string) => {
      if (!url) return null;
      if (url.startsWith('http') || url.startsWith('file:')) {
        return url;
      }
      // Normalize common cases:
      // - plain filename (e.g. "abc.jpg")
      // - "uploads/..." or "/uploads/..."
      // Our backend serves static files from "/uploads"
      const cleaned = url.replace(/^\\+/g, '/');
      if (cleaned.startsWith('/uploads/')) {
        return `${API_BASE_URL}${cleaned}`;
      }
      if (cleaned.startsWith('uploads/')) {
        return `${API_BASE_URL}/${cleaned}`;
      }
      // Fallback: treat as filename under /uploads
      return `${API_BASE_URL}/uploads/${cleaned.replace(/^\/+/, '')}`;
    };

    const lastMessage = item.lastMessage;
    const lastMessageTime = lastMessage?.createdAt ? formatTimeAgo(lastMessage.createdAt) : '';

    // Get the correct profile picture URL
    let avatarUri = null;
    if (item.isGroup) {
      // For group chats, use the chat's avatar
      avatarUri = item.avatar ? getProfilePictureUrl(item.avatar) : null;
    } else if (otherParticipant) {
      // For direct messages, use the other participant's profile picture
      const profilePic = otherParticipant.user?.profilePic || otherParticipant.user?.profilePicture ||
        otherParticipant.profilePic || otherParticipant.profilePicture;
      avatarUri = profilePic ? getProfilePictureUrl(profilePic) : null;

      // Log for debugging
      console.log('Profile picture for', otherParticipant.user?.username || otherParticipant.username, ':', profilePic);
    }

    let lastMessageContent = 'No messages yet';
    if (lastMessage) {
      if (typeof lastMessage === 'string') {
        lastMessageContent = lastMessage;
      } else {
        switch (lastMessage.type) {
          case 'image':
            lastMessageContent = '[Image]';
            break;
          case 'video':
            lastMessageContent = '[Video]';
            break;
          case 'file':
            lastMessageContent = '[File]';
            break;
          default:
            lastMessageContent = lastMessage.content || 'No messages yet';
        }
      }
    }

    const isOnline = otherParticipant && userStatus?.[otherParticipant.id] === 'online';

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={[styles.chatItem, { backgroundColor: theme.card }]}
          onPress={() => handleChatPress(item.id)}
          accessibilityLabel={`Open chat with ${displayName}`}
          accessibilityRole="button"
        >
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={[
                  styles.avatar,
                  styles.avatarBorder,
                  styles.avatarImage,
                  item.isGroup && styles.groupAvatar
                ]}
                accessibilityLabel={`Profile picture of ${displayName}`}
              />
            ) : (
              <View style={[
                styles.avatarPlaceholder,
                styles.avatarBorder,
                { backgroundColor: avatarColor },
                item.isGroup && styles.groupAvatar
              ]}>
                <ThemedText style={styles.avatarText}>
                  {getInitials(displayName)}
                </ThemedText>
              </View>
            )}
            {!item.isGroup && otherParticipant && (
              <View
                style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#BDBDBD' }]}
                accessibilityLabel={isOnline ? 'Online' : 'Offline'}
              />
            )}
          </View>
          <View style={styles.chatInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText style={[styles.chatName, { color: theme.text }]}>{displayName}</ThemedText>
              {item.lastMessage?.createdAt && (
                <ThemedText style={styles.chatTime}>
                  {formatTimeAgo(item.lastMessage.createdAt)}
                </ThemedText>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={[styles.lastMessage, { color: theme.secondary, marginTop: 2 }]} numberOfLines={1}>
                {lastMessageContent}
              </ThemedText>
              {isUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: '#2196F3' }]}>
                  <ThemedText style={styles.unreadCount}>{item.unreadCount}</ThemedText>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={BrandColors.brandGreen} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ThemedText style={[styles.emptyText, { color: theme.secondary, marginBottom: 16 }]}>
          {error instanceof Error ? error.message : String(error)}
        </ThemedText>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: BrandColors.brandGreen }]}
          onPress={() => {
            setLoading(true);
            setError(null);
            setTimeout(() => setLoading(false), 1000);
          }}
          accessibilityLabel="Retry loading chats"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={24} color="white" />
          <ThemedText style={styles.actionButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: 12, paddingBottom: 12 }]}>
        <ThemedText style={styles.headerTitle}>Messages</ThemedText>
        <View style={styles.headerAvatarContainer}>
          <TouchableOpacity>
            {user?.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <ThemedText style={styles.headerAvatarText}>{getInitials(user?.display_name)}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={theme.secondary} style={{ marginLeft: 12, marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingRight: 12 }}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Filter Tabs */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentTab, activeFilter === 'all' && styles.segmentTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <ThemedText style={[styles.segmentTabText, activeFilter === 'all' && styles.segmentTabTextActive]}>All</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentTab, activeFilter === 'groups' && styles.segmentTabActive]}
          onPress={() => setActiveFilter('groups')}
        >
          <ThemedText style={[styles.segmentTabText, activeFilter === 'groups' && styles.segmentTabTextActive]}>Groups</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentTab, activeFilter === 'dms' && styles.segmentTabActive]}
          onPress={() => setActiveFilter('dms')}
        >
          <ThemedText style={[styles.segmentTabText, activeFilter === 'dms' && styles.segmentTabTextActive]}>DMs</ThemedText>
        </TouchableOpacity>
      </View>

      {(() => { console.log('[MessageScreen] render gate local length:', sortedChats?.length || 0); return null; })()}

      <FlatList
        style={{ flex: 1 }}
        data={sortedChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.chatList}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          /* Eddy AI Assistant Pin */
          <TouchableOpacity
            style={[styles.chatItem, styles.eddyPinItem]}
            onPress={() => router.push('/ai-buddy' as any)}
            accessibilityLabel="Chat with Eddy AI Assistant"
            accessibilityRole="button"
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.eddyAvatar]}>
                <Ionicons name="sparkles" size={22} color="#FFF" />
              </View>
            </View>
            <View style={styles.chatInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText style={styles.chatName}>Eddy</ThemedText>
              </View>
              <ThemedText style={[styles.lastMessage, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                I'm here to help with studies & finance!
              </ThemedText>
            </View>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles" size={64} color={theme.secondary} />
            <ThemedText style={[styles.emptyText, { color: theme.secondary }]}>
              No chats yet. Tap + to start a conversation!
            </ThemedText>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowFabModal(true)}
        accessibilityLabel="New conversation"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* FAB Modal */}
      <Modal
        visible={showFabModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFabModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFabModal(false)}
        >
          <View style={styles.fabModalContent}>
            <TouchableOpacity
              style={styles.fabModalOption}
              onPress={() => {
                setShowFabModal(false);
                handleNewChat();
              }}
            >
              <View style={[styles.fabModalIcon, { backgroundColor: BrandColors.brandGreen }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
              </View>
              <ThemedText style={styles.fabModalText}>Start Chat</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabModalOption}
              onPress={() => {
                setShowFabModal(false);
                handleNewGroup();
              }}
            >
              <View style={[styles.fabModalIcon, { backgroundColor: BrandColors.brandGreen }]}>
                <Ionicons name="people-outline" size={22} color="#FFF" />
              </View>
              <ThemedText style={styles.fabModalText}>Create Group</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    position: 'relative',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'left',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerAvatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFD600',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardAlt,
    borderRadius: 10,
    marginHorizontal: 16,
    height: 44,
    marginBottom: 16,
  },
  searchBarText: {
    color: theme.textSecondary,
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    paddingVertical: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 18,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginRight: 8,
  },
  newChatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  newGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD600',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  newGroupButtonText: {
    color: '#FFD600',
    fontWeight: 'bold',
    fontSize: 15,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    marginHorizontal: 12,
    marginBottom: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: theme.card,
  },
  groupAvatar: {
    borderRadius: 10,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.card,
  },
  chatInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatList: {
    paddingBottom: 100,
  },
  chatTime: {
    color: '#888',
    fontSize: 13,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    resizeMode: 'cover',
  },
  // Segmented Control Tabs
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.cardAlt,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: BrandColors.brandGreen,
  },
  segmentTabText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTabTextActive: {
    color: '#FFF',
  },
  // Eddy AI Assistant Pin
  eddyPinItem: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: BrandColors.brandGreen,
  },
  eddyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eddyBadge: {
    backgroundColor: BrandColors.brandGreen,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eddyBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BrandColors.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999,
  },
  // FAB Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingRight: 20,
    alignItems: 'flex-end',
  },
  fabModalContent: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 8,
    minWidth: 180,
  },
  fabModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  fabModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fabModalText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
});