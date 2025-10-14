import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Animated, FlatList, Image, Modal, PanResponder, PanResponderInstance, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { useAuth } from '../../src/contexts/AuthContext';
import { useThemeColor } from '../../src/hooks/useThemeColor';
interface Post {
  id: number;
  userId: number;
  username: string;
  content: string;
  timestamp: string;
  media_url?: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  author: {
    username: string;
    display_name: string;
    profile_picture: string;
  };
  createdAt?: string;
  publishedAt?: string;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  content: string;
  timestamp: string;
  display_name: string;
  profile_picture: string;
  is_liked: boolean;
  likes_count: number;
  parent_comment_id?: number | null;
  replies?: Comment[];
  createdAt?: string;
  publishedAt?: string;
}

import { api } from '../../services/api';

const AVATAR_COLORS = ['#4D96FF', '#8A2BE2', '#FF6B6B', '#FFD93D', '#6BCB77', '#FFB86B'];
// Feature flag: use native player controls in feed (same as fullscreen)
// Set to false to use our custom minimal transparent overlay controls
const USE_NATIVE_FEED_CONTROLS = false;

function getInitials(name?: string) {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function extractHashtags(text: string) {
  const regex = /#(\w+)/g;
  const tags = [];
  let match;
  while ((match = regex.exec(text))) {
    tags.push(match[1]);
  }
  return tags;
}

// Helper to add cache-busting to profile picture URLs
function getProfilePicUrl(url: string) {
  if (!url) return '';
  const bust = Date.now();
  return url.includes('?') ? `${url}&bust=${bust}` : `${url}?bust=${bust}`;
}

function isValidProfilePic(url: string | undefined | null) {
  return !!url && typeof url === 'string' && url.trim() !== '' && url.trim().toLowerCase() !== 'null';
}

// Helper to format milliseconds as m:ss
function formatMillis(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PostScreen() {
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed legacy fullscreen modal state (using native player fullscreen instead)
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  // Comments state is now a Record where keys are post IDs and values are Comment arrays
  // Comments state is now a Record where keys are post IDs and values are Comment arrays
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const commentsList = selectedPost ? comments[selectedPost.id] || [] : [];
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showPostOptions, setShowPostOptions] = useState<{ visible: boolean, post: Post | null }>({ visible: false, post: null });
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState<{ [key: number]: boolean }>({});
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const videoRefs = useRef<{ [key: number]: Video | null }>({});
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: { position: number; duration: number } }>({});
  const progressBarWidths = useRef<{ [key: number]: number }>({});
  const [dragging, setDragging] = useState<{ id: number | null, x: number }>({ id: null, x: 0 });
  const panResponders = useRef<{ [key: number]: PanResponderInstance }>({});
  // Add dragging state for thumb position and whether dragging is active
  const [draggingThumb, setDraggingThumb] = useState<{ id: number | null, percent: number, active: boolean }>({ id: null, percent: 0, active: false });
  // Store both left offset and width for each progress bar
  const progressBarLayout = useRef<{ [key: number]: { left: number; width: number } }>({});
  // Store the last known bar width for thumb positioning
  const [barWidths, setBarWidths] = useState<{ [key: number]: number }>({});
  // Animated value for ultra-smooth drag
  const dragAnimated = useRef<{ [key: number]: Animated.Value }>({}).current;
  // In-app fullscreen state
  const [fullscreenPostId, setFullscreenPostId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  // Throttle map for progress updates per post
  const lastProgressUpdateRef = useRef<{ [key: number]: number }>({});
  // Overlay UI visibility per post and hide timers
  const [controlsVisible, setControlsVisible] = useState<{ [key: number]: boolean }>({});
  const hideTimersRef = useRef<{ [key: number]: ReturnType<typeof setTimeout> | null }>({});
  // Mute state per post
  const [mutedMap, setMutedMap] = useState<{ [key: number]: boolean }>({});
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Auto-hide controls when a video starts playing
  useEffect(() => {
    if (playingVideoId == null) return;
    // show briefly then hide
    setControlsVisible(prev => ({ ...prev, [playingVideoId!]: true }));
    if (hideTimersRef.current[playingVideoId]) {
      clearTimeout(hideTimersRef.current[playingVideoId]!);
      hideTimersRef.current[playingVideoId] = null;
    }
    hideTimersRef.current[playingVideoId] = setTimeout(() => {
      setControlsVisible(cv => ({ ...cv, [playingVideoId!]: false }));
      hideTimersRef.current[playingVideoId!] = null;
    }, 2000);
  }, [playingVideoId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(hideTimersRef.current).forEach(t => { if (t) clearTimeout(t); });
    };
  }, []);

  // Smooth, throttled playback status handler for in-feed videos
  const handlePlaybackStatusUpdate = (postId: number, status: any) => {
    if (!status?.isLoaded || !status?.durationMillis) return;
    const now = Date.now();
    const last = lastProgressUpdateRef.current[postId] || 0;
    // Throttle to ~100ms when not dragging to reduce setState churn
    if (!draggingThumb.active && now - last < 100) return;
    lastProgressUpdateRef.current[postId] = now;

    const position = status.positionMillis as number;
    const duration = status.durationMillis as number;

    // Update coarse state (used for timestamps) sparingly
    setVideoProgress(prev => {
      const prevEntry = prev[postId];
      if (prevEntry && Math.abs(prevEntry.position - position) < 80 && prevEntry.duration === duration) return prev;
      return { ...prev, [postId]: { position, duration } };
    });

    // Drive the bar immediately to keep UI snappy
    if (!draggingThumb.active) {
      if (!dragAnimated[postId]) {
        dragAnimated[postId] = new Animated.Value(position / Math.max(duration, 1));
      } else {
        dragAnimated[postId].setValue(position / Math.max(duration, 1));
      }
    }
  };

  // Manage Android navigation bar while fullscreen modal is open
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    (async () => {
      try {
        if (fullscreenPostId) {
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setBackgroundColorAsync('#00000000');
          await NavigationBar.setVisibilityAsync('hidden');
        } else {
          await NavigationBar.setVisibilityAsync('visible');
          await NavigationBar.setBehaviorAsync('inset-swipe');
          // Optional: restore to app theme background; keep transparent to avoid flash
          await NavigationBar.setBackgroundColorAsync('#00000000');
        }
      } catch (e) {
        // No-op if API unavailable
      }
    })();
    return () => { cancelled = true; };
  }, [fullscreenPostId]);

  useEffect(() => {
    // Initialize panResponders and Animated.Value for each post
    posts.forEach(post => {
      if (!panResponders.current[post.id]) {
        if (!dragAnimated[post.id]) dragAnimated[post.id] = new Animated.Value(0);
        panResponders.current[post.id] = PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (evt, gestureState) => {
            const progress = videoProgress[post.id];
            const layout = progressBarLayout.current[post.id] || { left: 0, width: 1 };
            const percent = progress ? progress.position / progress.duration : 0;
            setDraggingThumb({ id: post.id, percent, active: true });
            dragAnimated[post.id].setValue(percent);
          },
          onPanResponderMove: (evt, gestureState) => {
            const layout = progressBarLayout.current[post.id] || { left: 0, width: 1 };
            let x = evt.nativeEvent.locationX;
            x = Math.max(0, Math.min(layout.width, x));
            const percent = layout.width > 0 ? x / layout.width : 0;
            setDraggingThumb({ id: post.id, percent, active: true });
            dragAnimated[post.id].setValue(percent);
            // Do NOT call setPositionAsync here for best smoothness
          },
          onPanResponderRelease: (evt, gestureState) => {
            const layout = progressBarLayout.current[post.id] || { left: 0, width: 1 };
            let x = evt.nativeEvent.locationX;
            x = Math.max(0, Math.min(layout.width, x));
            const percent = layout.width > 0 ? x / layout.width : 0;
            const seekTo = percent * (videoProgress[post.id]?.duration || 1);
            videoRefs.current[post.id]?.setPositionAsync(seekTo);
            setDraggingThumb({ id: null, percent: 0, active: false });
          },
          onPanResponderTerminate: () => setDraggingThumb({ id: null, percent: 0, active: false }),
        });
      }
    });
  }, [posts, videoProgress]);

  const toggleReplies = (commentId: number) => {
    setExpandedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const fetchPosts = async () => {
    try {
      const response = await api.posts.getPosts(1, 20); // Get first page with 20 posts
      // The response should be an array of posts or an object with a posts property
      const postsRaw = Array.isArray(response) ? response : response?.data || [];
      // Map backend post objects to the Post interface
      const postsData: Post[] = postsRaw.map((p: any) => ({
        id: p.id ?? p._id ?? 0,
        userId: p.userId ?? p.author?._id ?? 0,
        username: p.username ?? p.author?.username ?? '',
        content: p.content ?? '',
        timestamp: p.timestamp ?? p.createdAt ?? p.publishedAt ?? '',
        media_url: p.media_url ?? (Array.isArray(p.media) && p.media.length > 0 ? p.media[0].url : undefined),
        likes_count: typeof p.likes_count === 'number' ? p.likes_count : (Array.isArray(p.likes) ? p.likes.length : 0),
        comments_count: typeof p.comments_count === 'number' ? p.comments_count : (Array.isArray(p.comments) ? p.comments.length : 0),
        is_liked: p.is_liked ?? false,
        author: {
          username: p.author?.username ?? '',
          display_name: p.author?.display_name ?? p.author?.username ?? '',
          profile_picture: p.author?.profile_picture ?? p.author?.profilePic ?? ''
        },
        createdAt: p.createdAt,
        publishedAt: p.publishedAt
      }));
      // Sort posts by timestamp in descending order
      const sortedData = postsData.sort((postA: Post, postB: Post) => 
        new Date(postB.timestamp).getTime() - new Date(postA.timestamp).getTime()
      );
      setPosts(sortedData);
    } catch (error: any) {
      console.error("Failed to fetch posts:", error);
      Alert.alert("Error", "Failed to load posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: number | string) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to like posts.');
      return;
    }

    try {
      // Ensure both postId and userId are strings for the API call
      const postIdStr = typeof postId === 'number' ? postId.toString() : postId;
      const userIdStr = user.id.toString();
      const response = await api.posts.likePost(postIdStr, { userId: userIdStr });
      
      setPosts(posts.map(post => {
        // Compare IDs as strings to handle both string and number IDs
        if (String(post.id) === String(postId)) {
          // If the response contains the updated post, use its data
          // Otherwise, toggle the like status locally
          const updatedPost = response.data || response;
          const isLiked = updatedPost.likes?.includes?.(user.id) ?? !post.is_liked;
          // Ensure likes_count is always a valid number
          const currentLikes = typeof post.likes_count === 'number' && !isNaN(post.likes_count) ? post.likes_count : 0;
          return {
            ...post,
            is_liked: isLiked,
            likes_count: isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post.');
    }
  };

  const handleComment = async (postId: number, comment: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to comment on posts.');
      return false;
    }

    try {
      const response = await api.posts.commentOnPost(postId, {
        content: comment,
        userId: user.id
      });
      
      // The backend should return the created comment with all necessary fields
      const responseData = response.data || response;
      
      const newComment: Comment = {
        id: responseData._id || responseData.id || Date.now(),
        post_id: postId,
        user_id: responseData.author || user.id,
        username: user.username || 'Anonymous',
        display_name: user.display_name || user.username || 'User',
        profile_picture: user.profile_picture || '',
        content: responseData.content || comment,
        timestamp: responseData.createdAt || new Date().toISOString(),
        is_liked: false,
        likes_count: 0,
        parent_comment_id: null,
        replies: []
      };
      
      // Update the comments for this post
      setComments(prev => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])]
      }));
      
      // Update the comments count in the posts list
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === postId 
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      ));
      
      return true;
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment.');
      return false;
    }
  };

  const handleReply = async (parentId: number) => {
    if (!user?.id || !user?.username || !selectedPost) {
      Alert.alert('Error', 'Please log in to reply.');
      return;
    }
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply.');
      return;
    }

    try {
      const response = await api.posts.replyToComment(parentId, {
        content: replyText.trim(),
        userId: user.id
      });
      
      const newReply: Comment = {
        ...(response.data || response),
        id: response.data?.id || Date.now(),
        post_id: selectedPost.id,
        user_id: user.id,
        username: user.username || 'Anonymous',
        display_name: user.display_name || user.username || 'User',
        profile_picture: user.profile_picture || '',
        content: replyText.trim(),
        timestamp: new Date().toISOString(),
        is_liked: false,
        likes_count: 0,
        parent_comment_id: parentId,
        replies: []
      };
      
      // Update the comments for this post
      setComments(prev => {
        const currentComments = prev[selectedPost.id] || [];
        return {
          ...prev,
          [selectedPost.id]: [newReply, ...currentComments]
        };
      });
      
      // Update the comments count in the posts list
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === selectedPost.id
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      ));
      
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error('Error posting reply:', error);
      Alert.alert('Error', 'Failed to post reply.');
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    try {
      // Using the posts API to like a comment
      const response = await api.posts.likeComment(commentId, { userId: user.id });
      
      // The response should contain the updated comment data
      const updatedComment = response.data || response;
      
      // Update the comments in the UI
      setComments(prev => {
        const updatedComments = { ...prev };
        
        // Find which post contains this comment
        for (const postId in updatedComments) {
          const commentIndex = updatedComments[postId].findIndex(c => c.id === commentId);
          if (commentIndex !== -1) {
            // Create a new array with the updated comment
            const updatedPostComments = [...updatedComments[postId]];
            updatedPostComments[commentIndex] = {
              ...updatedPostComments[commentIndex],
              is_liked: updatedComment.is_liked,
              likes_count: updatedComment.likes_count || updatedPostComments[commentIndex].likes_count
            };
            
            // Update the comments for this post
            updatedComments[postId] = updatedPostComments;
            break;
          }
        }
        
        return updatedComments;
      });
    } catch (error) {
      console.error('Error liking comment:', error);
      Alert.alert('Error', 'Failed to like comment.');
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('No authentication token found. User may need to log in again.');
        // You might want to trigger a re-authentication flow here
        Alert.alert('Authentication Required', 'Please log in to view comments');
        return;
      }
      
      console.log(`[API] Fetching comments for post ${postId}`);
      const response = await api.posts.getComments(postId);
      const commentsData = Array.isArray(response) ? response : response?.data?.comments || [];
      
      // Transform comments to ensure they have all required fields
      const processedComments = commentsData.map((comment: Comment) => ({
        ...comment,
        is_liked: comment.is_liked || false,
        likes_count: comment.likes_count || 0,
        parent_comment_id: comment.parent_comment_id || null,
        replies: comment.replies || []
      }));
      
      console.log(`[API] Fetched ${processedComments.length} comments for post ${postId}`);
      
      setComments(prev => ({
        ...prev,
        [postId]: processedComments
      }));
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      
      // Handle specific error cases
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        if (error.response.status === 401) {
          // Handle unauthorized (token expired or invalid)
          Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
          // Consider triggering a re-authentication flow here
        } else {
          Alert.alert('Error', 'Failed to load comments. Please try again.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        Alert.alert('Connection Error', 'Could not connect to the server. Please check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    }
  };

  const showCommentsModal = (post: Post) => {
    console.log('Opening comments modal for post:', post);
    setSelectedPost(post);
    setShowComments(true);
    fetchComments(post.id);
  };

  const deletePost = async (postId: number) => {
    try {
      await api.posts.deletePost(postId.toString());
      setPosts(posts.filter(post => post.id !== postId));
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post.');
      return false;
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to delete posts.');
      return;
    }

    try {
      const success = await deletePost(postId);
      if (success) {
        // Remove the post from the list
        setPosts(prev => prev.filter(post => post.id !== postId));
        // Remove any comments for this post
        setComments(prev => {
          const newComments = { ...prev };
          delete newComments[postId];
          return newComments;
        });
      }
    } catch (error) {
      console.error('Error handling post deletion:', error);
      Alert.alert('Error', 'Failed to delete post.');
    }
  };

  const showPostActionSheet = (post: Post) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete Post'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(post.id) },
            ]);
          }
        }
      );
    } else {
      setShowPostOptions({ visible: true, post });
    }
  };

  const handleProgress = (itemId: number, status: any) => {
    if (!status.isLoaded) return;
    setVideoProgress(prev => ({
      ...prev,
      [itemId]: {
        position: status.positionMillis,
        duration: status.durationMillis || 1,
      },
    }));
  };

  const handleSeek = (itemId: number, x: number) => {
    const layout = progressBarLayout.current[itemId] || { left: 0, width: 1 };
    const localX = x - layout.left;
    const percent = Math.max(0, Math.min(1, localX / layout.width));
    const seekTo = percent * (videoProgress[itemId]?.duration || 1);
    videoRefs.current[itemId]?.setPositionAsync(seekTo);
    setDraggingThumb({ id: null, percent: 0, active: false });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // Restore formatTimestamp for post time display
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 0) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  const renderHeader = () => (
    <SafeAreaView style={{ backgroundColor: '#121212' }}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedHeaderTitle}>Campus Feed</Text>
        <View style={styles.feedHeaderRight}>
          <TouchableOpacity style={{ marginRight: 12 }}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.feedHeaderAvatar}>
            {user?.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Text style={styles.feedHeaderAvatarText}>{getInitials(user?.display_name || user?.username || '')}</Text>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderPost = (item: Post) => {
    const hashtags = extractHashtags(item.content || '');
    const contentWithoutTags = (item.content || '').replace(/#\w+/g, '').trim();
    const initials = getInitials(item.author?.display_name || item.author?.username || item.username);
    const avatarColor = getAvatarColor(item.author?.display_name || item.author?.username || item.username);
    const progress = videoProgress[item.id];
    const isDragging = draggingThumb.active && draggingThumb.id === item.id;
    const percent = isDragging ? draggingThumb.percent : (progress ? progress.position / progress.duration : 0);
    const barWidth = barWidths[item.id] || 1;
    const thumbSize = 12;
    // Use Animated.Value for thumb and bar fill
    if (!dragAnimated[item.id]) {
      // Initialize once per post id; reused across renders for smoothness
      dragAnimated[item.id] = new Animated.Value(percent);
    }
    const animatedPercent = dragAnimated[item.id];
    const thumbLeft = Animated.multiply(animatedPercent, barWidth).interpolate({
      inputRange: [0, barWidth],
      outputRange: [0, barWidth - thumbSize],
      extrapolate: 'clamp',
    });
    // Helper to toggle play/pause
    const togglePlayPause = () => {
      setPlayingVideoId(prev => {
        if (prev === item.id) {
          // Pause current if it's already playing
          videoRefs.current[item.id]?.pauseAsync();
          return null;
        } else {
          // Pause all other videos to ensure only one plays
          Object.entries(videoRefs.current).forEach(([key, ref]) => {
            if (Number(key) !== item.id) {
              try { ref?.pauseAsync && ref.pauseAsync(); } catch {}
            }
          });
          // Play the selected video
          videoRefs.current[item.id]?.playAsync();
          return item.id;
        }
      });
    };
    // Use the first available date field
    const postTimestamp = item.timestamp || item.createdAt || item.publishedAt || '';
    return (
      <View style={[styles.postCard, { backgroundColor: '#1E1E1E' }]}> 
        <View style={styles.postHeaderRow}>
          {item.author?.profile_picture ? (
            <Image source={{ uri: item.author.profile_picture }} style={styles.postAvatar} />
          ) : (
            <View style={[styles.postAvatar, { backgroundColor: avatarColor }]}> 
              <Text style={styles.postAvatarText}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.postName}>{item.author?.display_name || item.author?.username || item.username}</Text>
            <Text style={styles.postTime}>{formatTimestamp(postTimestamp)}</Text>
          </View>
          <TouchableOpacity onPress={() => {
            if (user?.id === item.userId) {
              showPostActionSheet(item);
            }
          }}>
            <MaterialCommunityIcons name="dots-horizontal" size={22} color="#888" />
          </TouchableOpacity>
        </View>
    
    {/* If image, show image first, then content below */}
    {item.media_url && (
      <>
        {item.media_url?.match(/\.(mp4|mov|avi|mkv)$/i) ? (
          <View style={{ position: 'relative' }}>
            <TouchableWithoutFeedback
              onPress={() => {
                setControlsVisible(prev => ({ ...prev, [item.id]: true }));
                if (hideTimersRef.current[item.id]) {
                  clearTimeout(hideTimersRef.current[item.id]!);
                  hideTimersRef.current[item.id] = null;
                }
                togglePlayPause();
                const isNowPlaying = playingVideoId !== item.id;
                if (isNowPlaying) {
                  hideTimersRef.current[item.id] = setTimeout(() => {
                    setControlsVisible(cv => ({ ...cv, [item.id]: false }));
                    hideTimersRef.current[item.id] = null;
                  }, 2000);
                }
              }}
            >
              <Video
                ref={ref => { videoRefs.current[item.id] = ref; }}
                source={{ uri: item.media_url! }}
                style={[styles.postImage, { backgroundColor: 'transparent' }]}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={playingVideoId === item.id}
                useNativeControls={USE_NATIVE_FEED_CONTROLS}
                isMuted={!!mutedMap[item.id]}
                onError={() => Alert.alert('Error', 'Failed to load video')}
                onPlaybackStatusUpdate={status => handlePlaybackStatusUpdate(item.id, status)}
              />
            </TouchableWithoutFeedback>
            {/* Transparent overlay controls */}
            {(!USE_NATIVE_FEED_CONTROLS) && (
              <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                {/* Top-right controls */}
                <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => setMutedMap(m => ({ ...m, [item.id]: !m[item.id] }))}
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 18, padding: 6 }}
                    accessibilityLabel={mutedMap[item.id] ? 'Unmute' : 'Mute'}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons name={mutedMap[item.id] ? 'volume-off' : 'volume-high'} size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const v: any = videoRefs.current[item.id];
                      if (v && typeof v.presentFullscreenPlayer === 'function') {
                        v.presentFullscreenPlayer();
                      }
                    }}
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 18, padding: 6, marginLeft: 8 }}
                    accessibilityLabel="Enter fullscreen"
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons name="fullscreen" size={20} color="#fff" />
                  </TouchableOpacity>
                  </View>

                  {/* Center play/pause */}
                  {(controlsVisible[item.id] || playingVideoId !== item.id) && (
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 28 }}>
                        <MaterialCommunityIcons name={playingVideoId === item.id ? 'pause' : 'play'} size={28} color="#fff" />
                      </View>
                    </View>
                  )}

                  {/* Bottom progress */}
                  <View
                    style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(12, insets.bottom), paddingVertical: 8 }}
                    onLayout={(e) => {
                      const { x, width } = e.nativeEvent.layout;
                      progressBarLayout.current[item.id] = { left: x, width };
                      setBarWidths(prev => ({ ...prev, [item.id]: width }));
                    }}
                  >
                    {(() => {
                      const barW = barWidths[item.id] || 1;
                      const prog = videoProgress[item.id] || { position: 0, duration: 1 };
                      const percent = prog.duration > 0 ? prog.position / prog.duration : 0;
                      let thumbX = (draggingThumb.active && draggingThumb.id === item.id)
                        ? draggingThumb.percent * barW
                        : percent * barW;
                      thumbX = Math.max(0, Math.min(barW, thumbX));
                      return (
                        <View>
                          <TouchableWithoutFeedback
                            onPress={(evt) => handleSeek(item.id, evt.nativeEvent.pageX)}
                            onPressIn={() => setDraggingThumb({ id: item.id, percent, active: true })}
                            onPressOut={() => setDraggingThumb({ id: null, percent: 0, active: false })}
                          >
                            <View style={{ height: 28, justifyContent: 'center' }}>
                              <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                              <Animated.View
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  height: 3,
                                  backgroundColor: primaryColor,
                                  width: dragAnimated[item.id] ? dragAnimated[item.id].interpolate({ inputRange: [0, 1], outputRange: [0, barW] }) : 0,
                                  borderRadius: 2
                                }}
                              />
                              {/* Thumb */}
                              <View style={{ position: 'absolute', left: thumbX - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: primaryColor }} />
                            </View>
                          </TouchableWithoutFeedback>
                          {/* Timestamp row */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 12 }}>
                              {formatMillis(videoProgress[item.id]?.position || 0)}
                            </Text>
                            <Text style={{ color: '#fff', fontSize: 12 }}>
                              {formatMillis(videoProgress[item.id]?.duration || 0)}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                </View>
              )}
          </View>
        ) : (
<TouchableOpacity activeOpacity={0.9} onPress={() => openFullscreen(item)}>
            <Image source={{ uri: item.media_url! }} style={styles.postImage} resizeMode="contain" />
          </TouchableOpacity>
        )}
      </>
    )}
      
      {/* Show post content if it exists */}
      {contentWithoutTags.length > 0 && (
        <Text style={styles.postContent}>{contentWithoutTags}</Text>
      )}
      
      {/* Show hashtags if any */}
      {hashtags.length > 0 && (
        <View style={styles.hashtagRow}>
          {hashtags.map((tag, idx) => (
            <View key={tag + idx} style={[styles.hashtagChip, { backgroundColor: idx % 2 === 0 ? '#232323' : '#222D44' }]}>
              <Text style={styles.hashtagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Post actions */}
      <View style={styles.postActionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
          <Ionicons name={item.is_liked ? 'heart' : 'heart-outline'} size={20} color={item.is_liked ? '#FF6B6B' : '#888'} />
          <Text style={styles.actionCount}>{item.likes_count}</Text>
        </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => showCommentsModal(item)}>
            <Ionicons name="chatbubble-outline" size={20} color="#888" />
            <Text style={styles.actionCount}>{item.comments_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-outline" size={20} color="#888" />
            <Text style={styles.actionCount}>12</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Helper: Organize comments into a tree
  function buildCommentTree(flatComments: Comment[]): Comment[] {
    const map = new Map<number, Comment & { replies: Comment[] }>();
    const roots: (Comment & { replies: Comment[] })[] = [];
    flatComments.forEach(comment => {
      map.set(comment.id, { ...comment, replies: [] });
    });
    map.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = map.get(comment.parent_comment_id);
        if (parent) parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    });
    return roots;
  }

  // Helper: Flatten comment tree
  function flattenComments(comments: Comment[]): Comment[] {
    let flat: Comment[] = [];
    comments.forEach(comment => {
      flat.push({ ...comment, replies: undefined });
      if (comment.replies && comment.replies.length > 0) {
        flat = flat.concat(flattenComments(comment.replies));
      }
    });
    return flat;
  }

  // Recursive comment renderer
  const renderCommentTree = (comment: Comment, level = 0, parentUsername?: string) => {
    const isReply = level > 0;
    const hasReplies = Array.isArray(comment.replies) && comment.replies.length > 0;
    const showReplies = expandedComments[comment.id] || level > 0;
    return (
      <View
        key={comment.id}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginLeft: isReply ? 32 : 0,
          marginBottom: 12,
        }}
      >
        {/* Avatar */}
        {isValidProfilePic(comment.profile_picture) ? (
            <Image
            source={{ uri: getProfilePicUrl(comment.profile_picture) }}
            style={{
              width: isReply ? 28 : 36,
              height: isReply ? 28 : 36,
              borderRadius: isReply ? 14 : 18,
              marginRight: 10,
              marginTop: 2,
              backgroundColor: '#232323',
              }}
            />
          ) : (
          <View
            style={{
              width: isReply ? 28 : 36,
              height: isReply ? 28 : 36,
              borderRadius: isReply ? 14 : 18,
              marginRight: 10,
              marginTop: 2,
              backgroundColor: primaryColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="person" size={isReply ? 18 : 22} color="#FFFFFF" />
            </View>
          )}
        {/* Bubble */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: isReply ? '#23242a' : '#181a20',
              borderRadius: 14,
              padding: 12,
              paddingBottom: 8,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 4,
              borderWidth: 1,
              borderColor: isReply ? '#23242a' : '#232323',
            }}
          >
            {/* Username row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <ThemedText style={{ fontWeight: 'bold', color: '#fff', fontSize: 15 }} type="defaultSemiBold">
                {comment.display_name || comment.username}
              </ThemedText>
              {/* Verification badge example (optional): */}
              {/* {comment.is_verified && (
                <Ionicons name="checkmark-circle" size={14} color="#4D96FF" style={{ marginLeft: 4 }} />
              )} */}
              <ThemedText style={{ color: '#888', fontSize: 12, marginLeft: 8 }} type="default">
                {formatTimestamp(comment.timestamp || comment.createdAt || comment.publishedAt || '')}
          </ThemedText>
        </View>
            {/* Content */}
            <ThemedText style={{ color: '#fff', fontSize: 14, marginBottom: 4 }} type="default">
              {comment.content}
        </ThemedText>
            {/* Actions row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }} onPress={() => handleCommentLike(comment.id)}>
                <Ionicons name={comment.is_liked ? "heart" : "heart-outline"} size={16} color={comment.is_liked ? "#FF6B6B" : '#888'} />
                <ThemedText style={{ color: '#888', fontSize: 13, marginLeft: 4 }} type="default">
                  {comment.likes_count || ''}
          </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }} onPress={() => setReplyingTo(comment.id)}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={primaryColor} />
                <ThemedText style={{ color: primaryColor, marginLeft: 4, fontSize: 13 }} type="default">Reply</ThemedText>
              </TouchableOpacity>
              {hasReplies && !showReplies && (
                <TouchableOpacity onPress={() => toggleReplies(comment.id)}>
                  <ThemedText style={{ color: '#4D96FF', fontSize: 13 }} type="default">
                    View Replies ({comment.replies?.length || 0})
                  </ThemedText>
          </TouchableOpacity>
              )}
              {hasReplies && showReplies && (
                <TouchableOpacity onPress={() => toggleReplies(comment.id)}>
                  <ThemedText style={{ color: '#4D96FF', fontSize: 13 }} type="default">
                    Hide Replies
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {/* Reply input */}
            {replyingTo === comment.id && (
              <View style={{ marginTop: 10 }}>
                <ThemedText style={{ color: '#4D96FF', marginBottom: 4, fontSize: 12 }} type="default">
                  Replying to {comment.display_name || comment.username}
                </ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        color: textColor,
                        borderColor: primaryColor,
                        flex: 1,
                        backgroundColor: '#232323',
                        borderRadius: 18,
                        fontSize: 14,
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                      },
                    ]}
                    placeholder="Write a reply..."
                    placeholderTextColor={textSecondaryColor}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <TouchableOpacity style={[styles.commentButton, { backgroundColor: primaryColor, marginLeft: 8 }]} onPress={() => handleReply(comment.id)}>
                    <Ionicons name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setReplyingTo(null); setReplyText(''); }} style={{ marginLeft: 8 }}>
                    <Ionicons name="close" size={20} color={textSecondaryColor} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          {/* Replies */}
          {showReplies && (comment.replies || []).map(reply => renderCommentTree(reply, level + 1, comment.display_name || comment.username))}
        </View>
      </View>
    );
  };

  const videoRef = useRef<Video | null>(null);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [showControls, setShowControls] = useState(true); // Always show controls

  const togglePlayPause = async (videoRef: React.RefObject<Video | null>) => {
    if (videoRef.current) {
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
          setIsVideoPaused(true);
        } else {
          await videoRef.current.playAsync();
          setIsVideoPaused(false);
        }
      }
    }
  };

  const openFullscreen = (post: Post) => {
    // Pause all in-feed videos to avoid multiple audio sources
    try {
      Object.values(videoRefs.current).forEach(ref => {
        try { (ref as any)?.pauseAsync && (ref as any).pauseAsync(); } catch {}
      });
    } catch {}
    setPlayingVideoId(null);
    // Open our in-app fullscreen overlay to place navigation above system UI
    setFullscreenPostId(post.id);
  };
  // using in-app modal fullscreen overlay

  // removed legacy fullscreen handler

  // removed legacy fullscreen closer

  // removed legacy video tap handler (not needed with overlay controls)


  // removed legacy fullscreen modal renderer

  const renderPostMedia = (post: Post) => {
    if (!post.media_url) return null;
    
    return (
      <View style={styles.mediaContainer}>
        <Video
          source={{ uri: post.media_url }}
          style={[styles.postMedia, { backgroundColor: '#1E1E1E' }]}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          shouldPlay={false}
          isLooping
          usePoster={false}
        />
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => openFullscreen(post)}
          activeOpacity={0.9}
        >
          <Ionicons name="play-circle" size={60} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fullscreenButton}
          onPress={() => openFullscreen(post)}
          activeOpacity={0.9}
        >
          <View style={styles.fullscreenButtonContent}>
            <Ionicons name="expand" size={30} color="#FFF" />
            <ThemedText style={styles.fullscreenButtonText}>Tap to go fullscreen</ThemedText>
          </View>
        </TouchableOpacity>
        <Image 
          source={{ uri: post.media_url }} 
          style={styles.postMedia}
          resizeMode="cover"
          onError={() => Alert.alert('Error', 'Failed to load image')}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* In-app Fullscreen Modal */}
      <Modal
        visible={fullscreenPostId != null}
        transparent={false}
        onRequestClose={() => setFullscreenPostId(null)}
        animationType="fade"
        statusBarTranslucent
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <StatusBar hidden animated />
          {/* Header above content, safe-area aware */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingTop: insets.top + 8,
              paddingHorizontal: 16,
              paddingBottom: 12,
              backgroundColor: 'rgba(0,0,0,0.35)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 100,
            }}
          >
            <TouchableOpacity onPress={() => setFullscreenPostId(null)} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Fullscreen</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Media area */}
          {(() => {
            const post = posts.find(p => p.id === fullscreenPostId);
            if (!post) return null;
            const isVideo = !!post.media_url && /\.(mp4|mov|avi|mkv)$/i.test(post.media_url);
            if (isVideo) {
              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: insets.bottom }}>
                  <Video
                    source={{ uri: post.media_url! }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay
                    isLooping
                    onError={(e) => console.warn('Fullscreen video error', e)}
                  />
                </View>
              );
            }
            return (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: insets.bottom }}>
                <Image
                  source={{ uri: post.media_url! }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  onError={() => Alert.alert('Error', 'Failed to load image')}
                />
              </View>
            );
          })()}
        </View>
      </Modal>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => renderPost(item)}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.postListContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No posts yet. Be the first to share something!
            </Text>
          }
        />
      )}

      <Modal
        visible={showComments}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComments(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle} type="subtitle">Comments</ThemedText>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.commentsList}>
              {!selectedPost || !comments[selectedPost.id] || comments[selectedPost.id].length === 0 ? (
                <ThemedText style={styles.emptyText} type="default">
                  No comments yet. Be the first to comment!
                </ThemedText>
              ) : (
                comments[selectedPost.id].map(comment => renderCommentTree(comment))
              )}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={[styles.commentInput, { color: textColor, borderColor: primaryColor }]}
                placeholder="Add a comment..."
                placeholderTextColor={textSecondaryColor}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.commentButton, { backgroundColor: primaryColor }]}
                onPress={() => {
                if (selectedPost && commentText.trim()) {
                  handleComment(selectedPost.id, commentText);
                  setCommentText('');
                }
              }}
              >
                <Ionicons name="send" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android delete modal */}
      {showPostOptions.visible && showPostOptions.post && Platform.OS !== 'ios' && (
        <Modal
          visible={showPostOptions.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPostOptions({ visible: false, post: null })}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#222', borderRadius: 12, padding: 24, width: 280 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Delete Post?</Text>
              <Text style={{ color: '#ccc', marginBottom: 24 }}>Are you sure you want to delete this post?</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={() => setShowPostOptions({ visible: false, post: null })} style={{ marginRight: 16 }}>
                  <Text style={{ color: '#4D96FF', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  if (showPostOptions.post) handleDeletePost(showPostOptions.post.id);
                  setShowPostOptions({ visible: false, post: null });
                }}>
                  <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  feedHeaderTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  feedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  feedHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedHeaderAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  postName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postTime: {
    color: '#A0A0A0',
    fontSize: 13,
    marginTop: 2,
  },
  postContent: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 8,
    marginTop: 2,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  hashtagChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  hashtagText: {
    color: '#4D96FF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mediaTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  postMedia: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    zIndex: 5,
  },
  postImage: {
    width: '100%',
    height: 300,
    marginTop: 8,
    borderRadius: 8,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullScreenMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },
  // fullScreenMedia style moved to the bottom of the styles object where it's more complete
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#232323',
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
  },
  actionCount: {
    color: '#A0A0A0',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postListContent: {
    padding: 16,
    paddingBottom: 20,
  },
  // Fullscreen button with better visibility will be defined below
  fullscreenButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullscreenButtonText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  commentsList: {
    flex: 1,
    marginBottom: 16,
  },
  commentItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentProfilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentUsername: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  commentContent: {
    marginLeft: 40,
    marginBottom: 4,
  },
  commentTimestamp: {
    color: '#888',
    fontSize: 12,
    marginLeft: 40,
  },
  commentInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  controlsContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    flexDirection: 'row' as const,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  // Fullscreen button with better visibility
  fullscreenButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 40,
    backgroundColor: 'rgba(30, 136, 229, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    paddingHorizontal: 16,
    zIndex: 100,
    elevation: 5,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  commentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 40,
    marginTop: 4,
  },
  commentLikeButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 4,
  },
  commentLikeCount: {
    marginLeft: 4,
    fontSize: 12,
  },
}); 