import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  StyleSheet, 
  Image, 
  ViewStyle, 
  TextStyle, 
  ImageStyle,
  useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { api } from '../services/api';
import { API_BASE_URL } from '../src/constants/Config';

// Define the shape of media objects in posts
interface MediaObject {
  url?: string;
  secure_url?: string;
  uri?: string;
  path?: string;
  [key: string]: any; // For any additional properties
}

// Default theme
const defaultTheme = {
  light: {
    primary: '#007AFF',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    secondary: '#8E8E93',
    border: '#D1D1D6',
  },
  dark: {
    primary: '#0A84FF',
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    secondary: '#8E8E93',
    border: '#2C2C2E',
  }
};

// Helper function to safely format timestamps
const formatTimestamp = (timestamp: string | Date | undefined | null): string => {
  // Handle null/undefined/empty cases
  if (!timestamp) {
    console.warn('No timestamp provided, using current time');
    return 'Just now';
  }
  
  let date: Date;
  
  try {
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // First try parsing as is
      date = new Date(timestamp);
      
      // If invalid, try adding 'Z' for UTC
      if (isNaN(date.getTime())) {
        date = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
      }
      
      // If still invalid, try removing milliseconds
      if (isNaN(date.getTime())) {
        const isoString = timestamp.replace(/\.\d+/, '');
        date = new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
      }
    } else {
      console.warn('Unsupported timestamp type, using current time:', typeof timestamp, timestamp);
      date = new Date();
    }
    
    // Final validation
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Less than 1 minute
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    }
    
    // Less than 24 hours
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
    
    // More than a week, return full date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error, 'Timestamp was:', timestamp);
    return 'Just now';
  }
};

interface Post {
  id: string;
  userId: string;
  username: string;
  content: string;
  media_url: string;
  timestamp: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export default function PostsList() {
  const colorScheme = useColorScheme() || 'light';
  const theme = defaultTheme[colorScheme];
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Debug log to check theme and posts
  useEffect(() => {
    console.log('Current theme:', theme);
    console.log('Number of posts:', posts.length);
    if (posts.length > 0) {
      console.log('First post data:', JSON.stringify(posts[0], null, 2));
      console.log('First post media URL:', posts[0].media_url);
      console.log('First post content:', posts[0].content);
      
      // Log the first few posts for debugging
      posts.slice(0, 3).forEach((post, index) => {
        console.log(`Post ${index + 1} (${post.id}):`, {
          content: post.content,
          hasMedia: !!post.media_url,
          mediaUrl: post.media_url,
          username: post.username,
          timestamp: post.timestamp
        });
      });
    }
  }, [posts, theme]);

  // Function to transform a single post from backend format to our frontend format
  const transformPost = (post: any): Post | null => {
    if (!post) {
      console.error('[ERROR] Cannot transform null or undefined post');
      return null;
    }

    console.log(`[DEBUG] Transforming post ${post._id || 'unknown'}`);
    
    // Handle author information
    let authorId = 'unknown';
    let username = 'Unknown';
    let userInitials = 'U';
    
    // Handle author which could be an object or an array with an object
    const author = Array.isArray(post.author) ? post.author[0] : post.author;
    
    if (author) {
      if (typeof author === 'object') {
        authorId = author._id || 'unknown';
        username = author.username || 'Unknown';
        // Generate initials from username or use first letter of username
        userInitials = username.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
        console.log(`[DEBUG] Author object for post ${post._id}:`, { authorId, username, userInitials });
      } else if (typeof author === 'string') {
        authorId = author;
        username = author; // Fallback to using the ID as username
        console.log(`[DEBUG] Author string for post ${post._id}:`, authorId);
      }
    } else {
      console.warn(`[DEBUG] No author for post ${post._id}`);
    }
    
    // Handle media URL - check both media array and media_url fields
    let mediaUrl = '';
    try {
      // First try the media array (could be an array of media objects)
      if (post.media && Array.isArray(post.media) && post.media.length > 0) {
        console.log(`[DEBUG] Media array for post ${post._id}:`, JSON.stringify(post.media, null, 2));
        
        // Get the first media item and type it properly
        const firstMedia = post.media[0] as string | MediaObject;
        
        // Handle different possible media object structures
        if (typeof firstMedia === 'string') {
          mediaUrl = firstMedia;
        } else if (firstMedia && typeof firstMedia === 'object') {
          // Try different possible URL fields in order of preference
          mediaUrl = (firstMedia as MediaObject).url || 
                    (firstMedia as MediaObject).secure_url || 
                    (firstMedia as MediaObject).uri || 
                    (firstMedia as MediaObject).path || '';
          
          // Handle case where the URL is in a nested format (e.g., { url: { ... } })
          if (mediaUrl && typeof mediaUrl === 'object') {
            mediaUrl = (mediaUrl as { url?: string }).url || '';
          }
        }
        
        // If we have a URL that's not absolute, prepend the base URL
        if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('file')) {
          mediaUrl = `${API_BASE_URL}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
        }
      } 
      // If no media array, try direct media_url
      else if (post.media_url) {
        mediaUrl = post.media_url;
        if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('file')) {
          mediaUrl = `${API_BASE_URL}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
        }
      }
      
      console.log(`[DEBUG] Final media URL for post ${post._id}:`, mediaUrl);
    } catch (error) {
      console.error(`[ERROR] Error processing media for post ${post._id}:`, error);
    }
    
    // Handle timestamp - try multiple possible fields
    let postDate = new Date();
    const possibleDateFields = ['createdAt', 'publishedAt', 'timestamp', 'date'];
    
    for (const field of possibleDateFields) {
      if (post[field]) {
        const date = new Date(post[field]);
        if (!isNaN(date.getTime())) {
          postDate = date;
          break;
        }
      }
    }
    
    // Log the raw post data for debugging
    console.log('[DEBUG] Raw post data:', JSON.stringify({
      postId: post._id,
      content: post.content,
      text: post.text,
      caption: post.caption,
      allFields: Object.keys(post)
    }, null, 2));

    // Transform the post data to match our frontend Post interface
    const transformedPost: Post = {
      id: post._id || `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: authorId,
      username: username,
      // Check multiple possible fields for the caption/content
      content: post.content || post.text || post.caption || post.description || post.title || '',
      media_url: mediaUrl,
      timestamp: postDate.toISOString(),
      likes_count: post.likeCount || post.likes_count || (Array.isArray(post.likes) ? post.likes.length : 0) || 0,
      comments_count: post.commentCount || post.comments_count || (Array.isArray(post.comments) ? post.comments.length : 0) || 0,
      is_liked: (Array.isArray(post.likes) && post.likes.length > 0) || post.is_liked || false
    };

    console.log('[DEBUG] Transformed post:', JSON.stringify({
      id: transformedPost.id,
      content: transformedPost.content,
      hasMedia: !!transformedPost.media_url,
      username: transformedPost.username
    }, null, 2));
    
    console.log(`[DEBUG] Transformed post ${post._id}:`, transformedPost);
    return transformedPost;
  };

  const fetchPosts = async () => {
    console.log('[PostsList] Fetching posts...');
    setLoading(true);
    
    try {
      console.log('[DEBUG] API_BASE_URL:', API_BASE_URL);
      console.log('[DEBUG] Making API call to get posts...');
      
      const response = await api.posts.getPosts();
      
      console.log('[DEBUG] Raw API response:', JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: Array.isArray(response.data) ? 
          `Array with ${response.data.length} items` : 
          typeof response.data,
        firstItem: Array.isArray(response.data) && response.data.length > 0 ? 
          response.data[0] : 
          'No items in data array'
      }, null, 2));
      
      if (!response) {
        console.error('[ERROR] No response received from API');
        setLoading(false);
        return;
      }
      
      if (!response.data) {
        console.error('[ERROR] No data in response:', response);
        setLoading(false);
        return;
      }
      
      if (!Array.isArray(response.data)) {
        console.error('[ERROR] Expected array but got:', typeof response.data);
        console.error('[ERROR] Response data:', response.data);
        setLoading(false);
        return;
      }
      
      console.log(`[DEBUG] Received ${response.data.length} posts from API`);
      
      // Log the first 3 posts for debugging
      response.data.slice(0, 3).forEach((post: any, index: number) => {
        console.log(`[DEBUG] Post ${index + 1} raw data:`, JSON.stringify({
          id: post._id,
          author: post.author,
          hasMedia: !!(post.media && post.media.length > 0),
          content: post.content,
          timestamp: post.createdAt
        }, null, 2));
      });
      
      // Transform all posts
      const transformedPosts = response.data
        .map((post: any, index: number) => {
          console.log(`[DEBUG] Transforming post ${index + 1}/${response.data.length}`);
          try {
            const transformed = transformPost(post);
            console.log(`[DEBUG] Post ${index + 1} transformed successfully`);
            return transformed;
          } catch (error) {
            console.error(`[ERROR] Failed to transform post at index ${index}:`, 
              error instanceof Error ? error.message : 'Unknown error');
            console.error('[ERROR] Post data that caused the error:', post);
            return null;
          }
        })
        .filter((post): post is Post => {
          const isValid = post !== null;
          if (!isValid) {
            console.warn('[WARN] Filtered out invalid post during transformation');
          }
          return isValid;
        });
      
      console.log(`[PostsList] Successfully transformed ${transformedPosts.length}/${response.data.length} posts`);
      if (transformedPosts.length > 0) {
        console.log('[DEBUG] First transformed post:', JSON.stringify(transformedPosts[0], null, 2));
      } else {
        console.warn('[WARN] No valid posts after transformation');
      }
      
      setPosts(transformedPosts);
      setLoading(false);
      
    } catch (error: unknown) {
      console.error('[ERROR] Error fetching posts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setLoading(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

// ... (rest of the code remains the same)
  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 10 }}>Loading posts...</ThemedText>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.centered, { padding: 20 }]}>
        <Ionicons name="newspaper-outline" size={48} color={theme.secondary} />
        <ThemedText style={{ marginTop: 16, fontSize: 18, textAlign: 'center' }}>
          No posts yet
        </ThemedText>
        <ThemedText style={{ marginTop: 8, color: theme.secondary, textAlign: 'center' }}>
          Be the first to share something with your community!
        </ThemedText>
      </View>
    );
  }

  console.log('[RENDER] Rendering PostsList', {
    postCount: posts.length,
    loading,
    refreshing
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={posts}
        keyExtractor={(item, index) => item?.id?.toString() || `post-${index}`}
        renderItem={({ item, index }) => {
          if (!item) {
            console.warn(`[WARN] Invalid post at index ${index}`);
            return null;
          }
          
          // Log detailed post information for debugging
          console.log(`[RENDER] Rendering post ${index}:`, {
            id: item.id,
            content: item.content,
            hasMedia: !!item.media_url,
            mediaUrl: item.media_url,
            author: item.username,
            timestamp: item.timestamp
          });
          
          // Generate initials from username for avatar
          const getInitials = (name: string) => {
            if (!name) return 'U';
            return name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2);
          };
          return (
            <View style={[styles.postContainer, { backgroundColor: theme.card }]}>
              <View style={styles.postHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.avatarText}>
                    {item.username?.charAt(0)?.toUpperCase() || '?'}
                  </ThemedText>
                </View>
                <View style={styles.postUserInfo}>
                  <ThemedText style={[styles.username, { color: theme.text }]}>{item.username || 'Unknown'}</ThemedText>
                  <ThemedText style={[styles.timestamp, { color: theme.secondary }]}>
                    {formatTimestamp(item.timestamp)}
                  </ThemedText>
                </View>
              </View>
              {item.content ? (
                <ThemedText style={[styles.postContent, { color: theme.text }]}>{item.content}</ThemedText>
              ) : null}
              {item.media_url ? (
                <View style={styles.imageContainer}>
                  <Image 
                    source={{ uri: item.media_url }} 
                    style={styles.postImage}
                    resizeMode="contain"
                    onError={(e) => {
                      console.log('Error loading image:', {
                        error: e.nativeEvent.error,
                        url: item.media_url,
                        postId: item.id
                      });
                    }}
                    onLoadStart={() => console.log('Loading image:', item.media_url)}
                    onLoadEnd={() => console.log('Image loaded:', item.media_url)}
                  />
                  {!item.media_url.startsWith('http') && (
                    <ThemedText style={styles.imageErrorText}>
                      Invalid image URL
                    </ThemedText>
                  )}
                </View>
              ) : (
                <View style={styles.noMediaContainer}>
                  <Ionicons name="image-outline" size={48} color={theme.secondary} />
                  <ThemedText style={{ color: theme.secondary, marginTop: 8 }}>
                    No media available
                  </ThemedText>
                </View>
              )}
              <View style={[styles.postFooter, { borderTopColor: theme.border }]}>
                <View style={styles.postAction}>
                  <Ionicons 
                    name={item.is_liked ? 'heart' : 'heart-outline'} 
                    size={20} 
                    color={item.is_liked ? '#FF3B30' : theme.text} 
                  />
                  <ThemedText style={[styles.actionText, { color: theme.text }]}>{item.likes_count}</ThemedText>
                </View>
                <View style={styles.postAction}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.text} />
                  <ThemedText style={[styles.actionText, { color: theme.text }]}>{item.comments_count}</ThemedText>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <ThemedText style={{ color: theme.text }}>No posts to display</ThemedText>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={[styles.listContent, { backgroundColor: theme.background }]}
      />
    </View>
  );
}

interface Styles {
  centered: ViewStyle;
  listContent: ViewStyle;
  postContainer: ViewStyle;
  postHeader: ViewStyle;
  avatar: ViewStyle;
  avatarText: TextStyle;
  postUserInfo: ViewStyle;
  username: TextStyle;
  timestamp: TextStyle;
  postContent: TextStyle;
  postImage: ImageStyle;
  imageContainer: ViewStyle;
  noMediaContainer: ViewStyle;
  imageErrorText: TextStyle;
  postFooter: ViewStyle;
  postAction: ViewStyle;
  actionText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  } as ViewStyle,
  listContent: {
    padding: 16,
    width: '100%',
    maxWidth: 600, // Limit width on larger screens
    alignSelf: 'center',
  } as ViewStyle,
  postContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  } as ViewStyle,
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  } as ViewStyle,
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  } as TextStyle,
  postUserInfo: {
    flex: 1,
  } as ViewStyle,
  username: {
    fontWeight: '600',
    fontSize: 16,
  } as TextStyle,
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    color: '#333',
  } as TextStyle,
  imageContainer: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  } as ViewStyle,
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  } as ImageStyle,
  noMediaContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  } as ViewStyle,
  imageErrorText: {
    color: '#ff3b30',
    marginTop: 8,
    textAlign: 'center',
  } as TextStyle,
  postFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
    marginTop: 12,
  } as ViewStyle,
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  } as ViewStyle,
  actionText: {
    marginLeft: 6,
    fontSize: 14,
  } as TextStyle,
});
