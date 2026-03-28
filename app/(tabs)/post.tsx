import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import * as NavigationBar from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Animated, FlatList, Image, Modal, PanResponder, PanResponderInstance, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/NewThemeContext';
import {
  Post,
  Comment,
  AVATAR_COLORS,
  getInitials,
  getAvatarColor,
  extractHashtags,
  getProfilePicUrl,
  isValidProfilePic,
  formatMillis,
  formatTimestamp
} from '../../components/posts';
import PostHeader from '../../components/posts/PostHeader';
import CommentsModal from '../../components/posts/CommentsModal';
import { OfflineBanner } from '../../components/OfflineBanner';
import offlineManager from '../../src/services/OfflineManager';

import { api } from '../../services/api';
import { BrandColors } from '../../src/theme/edufi';

// Feature flag: use native player controls in feed (same as fullscreen)
// Set to false to use our custom minimal transparent overlay controls
const USE_NATIVE_FEED_CONTROLS = false;

export default function PostScreen() {
  const { theme } = useTheme();
  const primaryColor = theme.primary;
  const cardColor = theme.card;
  const textColor = theme.text;
  const textSecondaryColor = theme.textSecondary;
  const backgroundColor = theme.background;
  const { user } = useAuth();
  const router = useRouter();

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
  const [expandedPosts, setExpandedPosts] = useState<{ [key: number]: boolean }>({});
  const [visibleItems, setVisibleItems] = useState<{ id: number, isVideo: boolean }[]>([]);
  const isFocused = useIsFocused();

  // Viewability configuration - using useRef to prevent recreation on re-renders
  const viewabilityConfig = useRef({
    minimumViewTime: 100, // Minimum time an item must be visible before callback is triggered
    itemVisiblePercentThreshold: 50, // At least 50% of the item must be visible
    waitForInteraction: false, // Don't wait for interaction
  }).current;

  // Handle viewable items changes
  const handleViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    console.log('Viewable items changed:', viewableItems.map(v => ({
      id: v.item.id,
      isViewable: v.isViewable,
      type: v.item.media_url?.match(/\.(mp4|mov|avi|mkv)$/i) ? 'video' : 'image'
    })));

    // Update the list of all currently visible items
    const newVisibleItems = viewableItems
      .filter(item => item.isViewable)
      .map(item => ({
        id: item.item.id,
        isVideo: !!item.item.media_url?.match(/\.(mp4|mov|avi|mkv)$/i)
      }));

    setVisibleItems(newVisibleItems);

    // Check if the currently playing video is still visible
    if (playingVideoId) {
      const isStillVisible = newVisibleItems.some(item => item.id === playingVideoId && item.isVideo);
      console.log(`Video ${playingVideoId} is ${isStillVisible ? 'still visible' : 'no longer visible'}`);

      if (!isStillVisible) {
        // If the current video is no longer visible, pause it
        console.log(`Pausing video ${playingVideoId} because it's no longer visible`);
        videoRefs.current[playingVideoId]?.pauseAsync()
          .then(() => console.log(`Successfully paused video ${playingVideoId}`))
          .catch(e => console.error(`Error pausing video ${playingVideoId}:`, e));
        setPlayingVideoId(null);
      }
    }

    // Find the first viewable video that's not the currently playing one
    const newVideoToPlay = viewableItems.find(item =>
      item.isViewable &&
      item.item.media_url?.match(/\.(mp4|mov|avi|mkv)$/i) &&
      item.item.id !== playingVideoId
    );

    // If we found a new video to play
    if (newVideoToPlay) {
      const postId = newVideoToPlay.item.id;

      // Pause the currently playing video if any
      if (playingVideoId && videoRefs.current[playingVideoId]) {
        videoRefs.current[playingVideoId].pauseAsync();
      }

      // Play the new video
      setPlayingVideoId(postId);
      const videoRef = videoRefs.current[postId];
      if (videoRef) {
        videoRef.playAsync().catch(console.error);
      }
    }
  }).current;

  // Pause all videos when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      // Pause the currently playing video
      if (playingVideoId && videoRefs.current[playingVideoId]) {
        videoRefs.current[playingVideoId]?.pauseAsync();
        setPlayingVideoId(null);
      }
    }
  }, [isFocused]);

  // Cleanup timers and videos on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      Object.values(hideTimersRef.current).forEach(t => { if (t) clearTimeout(t); });

      // Pause all videos
      Object.values(videoRefs.current).forEach(ref => {
        if (ref) {
          ref.pauseAsync().catch(console.error);
        }
      });
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
      // Check connectivity first
      const isConnected = await offlineManager.checkNetworkStatus();

      if (isConnected) {
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
        // Cache the feed for offline use
        await offlineManager.cacheFeed(sortedData);
      } else {
        // Offline mode: load from cache
        console.log('Offline mode: Loading posts from cache');
        const cachedPosts = await offlineManager.getCachedFeed();
        if (cachedPosts) {
          setPosts(cachedPosts);
          // Banner handled by OfflineBanner component
        } else {
          Alert.alert('Offline', 'No cached feed available. Please connect to internet to update.');
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch posts:", error);

      // If fetch fails (even if we thought we were online), try cache
      const cachedPosts = await offlineManager.getCachedFeed();
      if (cachedPosts && cachedPosts.length > 0) {
        setPosts(cachedPosts);
        console.log('Loaded cached posts after fetch error');
      } else {
        Alert.alert("Error", "Failed to load posts.");
      }
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

    // Optimistic update
    const postIdStr = typeof postId === 'number' ? postId.toString() : postId;
    const previousPosts = [...posts]; // Keep copy for rollback if needed

    // Update UI immediately
    setPosts(prevPosts => prevPosts.map(post => {
      if (String(post.id) === String(postId)) {
        const isLiked = !post.is_liked;
        const currentLikes = typeof post.likes_count === 'number' && !isNaN(post.likes_count) ? post.likes_count : 0;
        return {
          ...post,
          is_liked: isLiked,
          likes_count: isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
        };
      }
      return post;
    }));

    // Check connectivity
    if (!offlineManager.getNetworkStatus()) {
      // Offline: Add to sync queue
      await offlineManager.addToSyncQueue({
        type: 'UPDATE',
        endpoint: `/posts/${postIdStr}/like`,
        method: 'POST',
        payload: { userId: user.id.toString() }
      });
      console.log('Like action queued for sync');
      return;
    }

    try {
      const response = await api.posts.likePost(postIdStr, { userId: user.id.toString() });

      // If successful, we can optionally update with server response, 
      // but we already did optimistic update.
      // Just ensure cache is updated with new state
      offlineManager.cacheFeed(posts);

    } catch (error) {
      console.error('Error liking post:', error);
      // Rollback on error
      setPosts(previousPosts);
      Alert.alert('Error', 'Failed to like post.');
    }
  };

  const handleComment = async (postId: number, comment: string) => {
    console.log('[handleComment] user object:', user);
    console.log('[handleComment] user.id:', user?.id);

    if (!user?.id) {
      console.log('[handleComment] Auth check failed - user:', user, 'user.id:', user?.id);
      Alert.alert('Error', 'Please log in to comment on posts.');
      return false;
    }

    // Prepare optimistic comment
    const optimisticComment: Comment = {
      id: Date.now(), // Temporary ID
      post_id: postId,
      user_id: parseInt(user.id.toString()) || 0,
      username: user.username || 'Anonymous',
      display_name: user.display_name || user.username || 'User',
      profile_picture: user.profile_picture || '',
      content: comment,
      timestamp: new Date().toISOString(),
      is_liked: false,
      likes_count: 0,
      parent_comment_id: null,
      replies: []
    };

    // Optimistically update comments
    setComments(prev => ({
      ...prev,
      [postId]: [optimisticComment, ...(prev[postId] || [])]
    }));

    // Optimistically update post's comment count
    setPosts(prevPosts => prevPosts.map(post =>
      post.id === postId
        ? { ...post, comments_count: (post.comments_count || 0) + 1 }
        : post
    ));

    // Check offline status
    if (!offlineManager.getNetworkStatus()) {
      await offlineManager.addToSyncQueue({
        type: 'CREATE',
        endpoint: `/posts/${postId}/comments`,
        method: 'POST',
        payload: {
          content: comment,
          author: user.id, // Match 'author' field expected by backend
          post: postId
        }
      });
      console.log('Comment queued for sync');
      return true;
    }

    try {
      const response = await api.posts.commentOnPost(postId, {
        content: comment,
        userId: user.id
      });

      const responseData = response.data || response;

      // Update with real ID from server
      setComments(prev => {
        const postComments = prev[postId] || [];
        // Replace the temporary comment (identified by timestamp match or optimistic ID)
        // For simplicity here, we just replace the first one since we added it to top
        const updatedComments = [...postComments];
        if (updatedComments.length > 0) {
          updatedComments[0] = {
            ...updatedComments[0],
            id: responseData._id || responseData.id || updatedComments[0].id
          };
        }
        return {
          ...prev,
          [postId]: updatedComments
        };
      });

      return true;
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment.');
      // Ideally revert optimistic update here
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

  // formatTimestamp imported from utils

  // Header component extracted

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
              try { ref?.pauseAsync && ref.pauseAsync(); } catch { }
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
    const displayName = (item.author?.display_name || item.author?.username || item.username || '').trim();
    const username = (item.author?.username || item.username || '').trim();
    // Show @username handle only when display_name is genuinely different from username
    const shouldShowHandle = displayName !== '' && username !== '' && displayName.toLowerCase() !== username.toLowerCase();

    return (
      <Pressable style={[styles.postContainer, { backgroundColor: cardColor, borderBottomColor: textSecondaryColor + '20' }]} onPress={() => {
        // TODO: Navigate to post detail screen
        console.log('Post tapped:', item.id);
      }}>
        {/* Thread-style header: avatar + inline name + handle + time */}
        <View style={styles.threadHeader}>
          {item.author?.profile_picture ? (
            <Image source={{ uri: item.author.profile_picture }} style={styles.threadAvatar} />
          ) : (
            <View style={[styles.threadAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.threadAvatarText}>{initials}</Text>
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={[styles.threadName, { color: textColor }]}>{displayName || username}</Text>
              {shouldShowHandle && <Text style={[styles.threadHandle, { color: textSecondaryColor }]}> @{username}</Text>}
              <Text style={[styles.threadTime, { color: textSecondaryColor }]}> · {formatTimestamp(postTimestamp)}</Text>
            </View>
          </View>

          {user?.id === item.userId && (
            <TouchableOpacity onPress={(e) => {
              e.stopPropagation();
              showPostActionSheet(item);
            }}>
              <MaterialCommunityIcons name="dots-horizontal" size={18} color={textSecondaryColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content FIRST - with truncation */}
        {contentWithoutTags.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text
              style={[styles.threadContent, { color: textColor }]}
              numberOfLines={expandedPosts[item.id] ? undefined : 5}
            >
              {contentWithoutTags}
            </Text>
            {contentWithoutTags.split('\n').length > 5 && !expandedPosts[item.id] && (
              <TouchableOpacity onPress={() => setExpandedPosts(prev => ({ ...prev, [item.id]: true }))}>
                <Text style={[styles.readMore, { color: primaryColor }]}>Read more</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Show hashtags if any */}
        {hashtags.length > 0 && (
          <View style={styles.hashtagRow}>
            {hashtags.map((tag, idx) => (
              <View key={tag + idx} style={[styles.hashtagChip, { backgroundColor: idx % 2 === 0 ? textSecondaryColor + '15' : primaryColor + '15' }]}>
                <Text style={[styles.hashtagText, { color: primaryColor }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Media AFTER content (ONLY if exists) */}
        {item.media_url && (
          <View style={{ marginTop: 8 }}>
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
                    style={styles.threadMedia}
                    resizeMode={ResizeMode.COVER}
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
                              <Text style={{ color: textSecondaryColor, fontSize: 12 }}>
                                {formatMillis(videoProgress[item.id]?.position || 0)}
                              </Text>
                              <Text style={{ color: textSecondaryColor, fontSize: 12 }}>
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
              <TouchableOpacity activeOpacity={0.9} onPress={(e) => {
                e.stopPropagation();
                openFullscreen(item);
              }}>
                <Image source={{ uri: item.media_url! }} style={styles.threadMedia} resizeMode="cover" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Thread-style action row */}
        <View style={styles.threadActions}>
          {/* Like */}
          <TouchableOpacity style={styles.threadActionBtn} onPress={(e) => {
            e.stopPropagation();
            handleLike(item.id);
          }}>
            <Ionicons
              name={item.is_liked ? 'heart' : 'heart-outline'}
              size={18}
              color={item.is_liked ? '#FF6B6B' : '#71767B'}
            />
            <Text style={[styles.threadActionText, item.is_liked && { color: '#FF6B6B' }]}>
              {item.likes_count}
            </Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity style={styles.threadActionBtn} onPress={(e) => {
            e.stopPropagation();
            showCommentsModal(item);
          }}>
            <Ionicons name="chatbubble-outline" size={18} color={textSecondaryColor} />
            <Text style={[styles.threadActionText, { color: textSecondaryColor }]}>{item.comments_count}</Text>
          </TouchableOpacity>

          {/* Repost */}
          <TouchableOpacity style={styles.threadActionBtn} onPress={(e) => {
            e.stopPropagation();
          }}>
            <Ionicons name="repeat-outline" size={18} color={textSecondaryColor} />
            <Text style={[styles.threadActionText, { color: textSecondaryColor }]}>0</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.threadActionBtn} onPress={(e) => {
            e.stopPropagation();
          }}>
            <Ionicons name="share-outline" size={18} color={textSecondaryColor} />
          </TouchableOpacity>
        </View>
      </Pressable>
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
    // Theme-aware bubble colors
    const bubbleBg = isReply ? textSecondaryColor + '10' : textSecondaryColor + '08';
    const bubbleBorder = textSecondaryColor + '15';
    const actionColor = '#30B37E'; // BrandGreen for actions
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
              backgroundColor: textSecondaryColor + '20',
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
              backgroundColor: bubbleBg,
              borderRadius: 14,
              padding: 12,
              paddingBottom: 8,
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 4,
              borderWidth: 1,
              borderColor: bubbleBorder,
            }}
          >
            {/* Username row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <ThemedText style={{ fontWeight: 'bold', color: textColor, fontSize: 15 }} type="defaultSemiBold">
                {comment.display_name || comment.username}
              </ThemedText>
              <ThemedText style={{ color: textSecondaryColor, fontSize: 12, marginLeft: 8 }} type="default">
                {formatTimestamp(comment.timestamp || comment.createdAt || comment.publishedAt || '')}
              </ThemedText>
            </View>
            {/* Content */}
            <ThemedText style={{ color: textColor, fontSize: 14, marginBottom: 4 }} type="default">
              {comment.content}
            </ThemedText>
            {/* Actions row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }} onPress={() => handleCommentLike(comment.id)}>
                <Ionicons name={comment.is_liked ? "heart" : "heart-outline"} size={16} color={comment.is_liked ? "#FF6B6B" : textSecondaryColor} />
                <ThemedText style={{ color: textSecondaryColor, fontSize: 13, marginLeft: 4 }} type="default">
                  {comment.likes_count || ''}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }} onPress={() => setReplyingTo(comment.id)}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={actionColor} />
                <ThemedText style={{ color: actionColor, marginLeft: 4, fontSize: 13 }} type="default">Reply</ThemedText>
              </TouchableOpacity>
              {hasReplies && !showReplies && (
                <TouchableOpacity onPress={() => toggleReplies(comment.id)}>
                  <ThemedText style={{ color: actionColor, fontSize: 13 }} type="default">
                    View Replies ({comment.replies?.length || 0})
                  </ThemedText>
                </TouchableOpacity>
              )}
              {hasReplies && showReplies && (
                <TouchableOpacity onPress={() => toggleReplies(comment.id)}>
                  <ThemedText style={{ color: actionColor, fontSize: 13 }} type="default">
                    Hide Replies
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {/* Reply input */}
            {replyingTo === comment.id && (
              <View style={{ marginTop: 10 }}>
                <ThemedText style={{ color: actionColor, marginBottom: 4, fontSize: 12 }} type="default">
                  Replying to {comment.display_name || comment.username}
                </ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        color: textColor,
                        borderColor: actionColor,
                        flex: 1,
                        backgroundColor: textSecondaryColor + '10',
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
                  <TouchableOpacity style={[styles.commentButton, { backgroundColor: actionColor, marginLeft: 8 }]} onPress={() => handleReply(comment.id)}>
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
        try { (ref as any)?.pauseAsync && (ref as any).pauseAsync(); } catch { }
      });
    } catch { }
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
          ref={ref => { videoRefs.current[post.id] = ref; }}
          source={{ uri: post.media_url }}
          style={[styles.postMedia, { backgroundColor: '#1E1E1E' }]}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          shouldPlay={playingVideoId === post.id && isFocused}
          isMuted={mutedMap[post.id] ?? true}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && !status.isPlaying && playingVideoId === post.id && isFocused) {
              videoRefs.current[post.id]?.playAsync().catch(console.error);
            }
          }}
          isLooping
          usePoster={false}
          onError={(e) => console.warn('Video error', e)}
          onLoad={() => {
            if (playingVideoId === post.id && isFocused) {
              videoRefs.current[post.id]?.playAsync().catch(console.error);
            }
          }}
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
    <View style={{ flex: 1, backgroundColor }}>
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
      <PostHeader user={user} backgroundColor={backgroundColor} />
      <OfflineBanner />
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
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={handleViewableItemsChanged}
          removeClippedSubviews={false} // Important for viewability tracking
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No posts yet. Be the first to share something!
            </Text>
          }
        />
      )}

      <CommentsModal
        visible={showComments}
        comments={selectedPost ? comments[selectedPost.id] || [] : []}
        commentText={commentText}
        onClose={() => setShowComments(false)}
        onChangeText={setCommentText}
        onSubmit={() => {
          if (selectedPost && commentText.trim()) {
            handleComment(selectedPost.id, commentText);
            setCommentText('');
          }
        }}
        renderComment={(comment) => renderCommentTree(comment)}
        cardColor={cardColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        primaryColor={primaryColor}
      />

      {/* Android delete modal */}
      {showPostOptions.visible && showPostOptions.post && Platform.OS !== 'ios' && (
        <Modal
          visible={showPostOptions.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPostOptions({ visible: false, post: null })}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: cardColor, borderRadius: 12, padding: 24, width: 280 }}>
              <Text style={{ color: textColor, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Delete Post?</Text>
              <Text style={{ color: textSecondaryColor, marginBottom: 24 }}>Are you sure you want to delete this post?</Text>
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

  // Thread layout styles (Twitter/X-style)
  postContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  threadName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  threadHandle: {
    color: '#888',
    fontSize: 14,
  },
  threadTime: {
    color: '#888',
    fontSize: 14,
  },
  threadContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  readMore: {
    color: '#4D96FF',
    fontSize: 14,
    marginTop: 2,
  },
  threadMedia: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  threadActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    maxWidth: '80%',
  },
  threadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  threadActionText: {
    color: '#71767B',
    fontSize: 13,
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
    paddingHorizontal: 16,
    paddingTop: 0,
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
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
}); 