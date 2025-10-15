import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MediaViewer from '../../components/MediaViewer';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Chat, Message, useChat } from '../../src/contexts/ChatContext';
import { ChatWrapper } from './_chat-wrapper';

function getInitials(name?: string) {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Normalize possibly-relative URLs from the API into absolute URLs
function normalizeUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${API_BASE_URL}${u}`;
  return `${API_BASE_URL}/${u}`;
}

// Heuristic specifically for avatars: if API serves files under /uploads but URL is root-level, rewrite
function normalizeAvatarUrl(u?: string | null): string | undefined {
  const n = normalizeUrl(u);
  if (!n) return undefined;
  try {
    const parsed = new URL(n);
    const path = parsed.pathname || '/';
    const looksLikeRootFile = /^\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/i.test(path);
    const alreadyUploads = path.startsWith('/uploads/');
    if (!alreadyUploads && looksLikeRootFile) {
      const rewritten = `${parsed.origin}/uploads${path}`;
      console.log('[Avatar] rewriting to uploads path', { from: n, to: rewritten });
      return rewritten;
    }
  } catch {}
  return n;
}

// Try multiple common fields for user avatar URLs and normalize
function getUserAvatar(u?: any): string | undefined {
  if (!u) return undefined;
  const uu = u?.user ? u.user : u; // support nested user objects
  const candidates = [
    uu?.profilePic,
    uu?.profilePicture,
    uu?.profile_picture,
    uu?.avatar,
    uu?.avatarUrl,
    uu?.avatarURL,
    uu?.photo,
    uu?.photoURL,
    uu?.image,
    uu?.imageUrl,
    uu?.picture,
    uu?.pictureUrl,
  ];
  const first = candidates.find(Boolean) as string | undefined;
  return normalizeAvatarUrl(first);
}

function ChatScreenContent() {
  const { id } = useLocalSearchParams();
  const { user, token, isInitialized } = useAuth();
  const { chats, messages, sendMessage, fetchMessages, socket, deleteMessage } = useChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);
  const isPickingRef = useRef(false);
  const failedAvatarUrlsRef = useRef<Set<string>>(new Set());
  const [, forceRerender] = useState(0); // for avatar error fallback
  // Simple in-memory map for this session; files are persisted on disk
  const thumbCacheRef = useRef<Map<string, string>>(new Map()); // mediaUrl -> cached file uri
  const videoThumbsModuleRef = useRef<any>(null);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerUri, setComposerUri] = useState<string | null>(null);
  const [composerType, setComposerType] = useState<'image' | 'video'>('image');
  const [composerCaption, setComposerCaption] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Find the chat from context or fetch it
  useEffect(() => {
    // Only fetch details when we either have the chat in context OR when
    // the authenticated user and token are available. This prevents firing
    // an unauthenticated request (causing 401) if the effect runs before
    // auth state is initialized.
    const contextChat = (chats || []).find((c: any) => c.id?.toString() === id?.toString());
    if (contextChat) {
      setCurrentChat(contextChat);
      return;
    }

    // If auth isn't initialized yet, or we don't have a user id or token yet, wait.
    if (!isInitialized) {
      console.log('[ChatDetail] deferring fetch until auth is initialized', { id });
      return;
    }
    if (!id || !user?.id) return;
    if (!token) {
      console.log('[ChatDetail] deferring fetch until token is available', { id, userId: user?.id });
      return;
    }

    const fetchChatDetails = async () => {
      try {
        const headers: any = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        const res = await fetch(`${API_BASE_URL}/chats/${id}?userId=${user.id}`, { headers });
        if (res.ok) {
          const chatData = await res.json();
          setCurrentChat(chatData);
        } else {
          const errorData = await res.json().catch(() => ({ message: 'Could not parse error response' }));
          console.error('Failed to fetch chat details:', res.status, errorData);
        }
      } catch (error) {
        console.error('Error fetching chat details:', error);
      }
    };
    fetchChatDetails();
  }, [id, chats, user?.id, token, isInitialized]);

  // Fetch messages when chat ID changes
  useEffect(() => {
    if (id) fetchMessages(id as string);
  }, [id, fetchMessages]); // Added fetchMessages to dependencies to ensure it's called when it changes

  // Messages for this chat
  const chatMessages = Array.isArray(messages?.[id as string]) ? messages[id as string] : [];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages.length]);

  // De-duplicate messages (socket echoes or race conditions)
  const displayedMessages = useMemo(() => {
    const seen = new Set<string>();
    const out: Message[] = [] as any;
    for (const m of chatMessages) {
      const key = m?.id != null
        ? `id:${m.id}`
        : `f:${m?.mediaUrl || ''}|${m?.content || ''}|${m?.createdAt || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
    return out;
  }, [chatMessages]);

  // Join/leave chat room for real-time updates
  useEffect(() => {
    if (socket && id) {
      socket.emit('joinChat', id);
      return () => {
        socket.emit('leaveChat', id);
      };
    }
  }, [socket, id]);

  // Track keyboard visibility to adjust bottom padding only when hidden
  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isGroup = !!currentChat?.isGroup || currentChat?.type === 'study_group' || currentChat?.type === 'group';
  const participants = Array.isArray(currentChat?.participants) ? currentChat.participants : [];
  // Helper to normalize a user object from various shapes: { _id, id, username, displayName, profilePic, profile_picture }
  const normalizeUser = (u: any) => {
    if (!u) return null;
    const src = u?.user ? u.user : u;
    const id = src?._id ?? src?.id ?? src?.userId ?? '';
    const username = src?.username ?? src?.name ?? src?.displayName ?? '';
    const displayName = src?.displayName ?? src?.display_name ?? src?.name ?? src?.username ?? '';
    const profilePic = src?.profilePic ?? src?.profile_picture ?? src?.profilePicture ?? src?.avatar ?? src?.image ?? null;
    return {
      raw: src,
      id: id ? String(id) : '',
      username,
      displayName,
      profilePic,
    };
  };

  // Create a normalized participants list for consistent lookups
  const normalizedParticipants = participants.map((p: any) => normalizeUser(p)).filter(Boolean) as any[];
  // Participants from the API are often objects like { user: { _id, username, profilePic }, ... }
  // Normalize by finding the participant whose nested user id is not the current user id.
  const otherParticipant = !isGroup
    ? normalizedParticipants.find((p: any) => p?.id && String(p.id) !== String(user?.id))
    : null;
  const otherUser = otherParticipant ? otherParticipant.raw : null;

  if (!currentChat || !participants.length) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181A20' }}>
        <ActivityIndicator size="large" color="#FFD600" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading chat...</Text>
      </View>
    );
  }

  // Debug log for troubleshooting name issues
  console.log('Participants:', participants);
  console.log('OtherUser (resolved):', otherUser);
  console.log('CurrentChat:', currentChat);
  console.log('IsGroup:', isGroup);

  // For individual chats, always show the recipient's name
  let chatName = '';
  if (isGroup) {
    chatName = currentChat?.name || 'Study Group';
  } else {
    let recipient = otherUser;
    if (!recipient && participants.length === 2) {
      recipient = participants.find((u: any) => u?.id !== user?.id);
    }
    chatName = (recipient as any)?.displayName || (recipient as any)?.display_name || (recipient as any)?.username || '';
  }
  const chatAvatar = isGroup
    ? getUserAvatar(currentChat)
    : getUserAvatar(otherUser);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(id as string, { content: input.trim(), type: 'text' });
    setInput('');
  };

  const handleFileUpload = async (fileUri: string, fileName?: string | null, mimeType?: string | null) => {
    const safeName = (fileName && fileName.trim().length > 0)
      ? fileName
      : (fileUri.split('/').pop() || `chat-file-${Date.now()}.jpg`);
    const safeType = mimeType || (safeName.toLowerCase().endsWith('.jpg') || safeName.toLowerCase().endsWith('.jpeg')
      ? 'image/jpeg'
      : safeName.toLowerCase().endsWith('.png')
        ? 'image/png'
        : safeName.toLowerCase().endsWith('.mp4')
          ? 'video/mp4'
          : 'application/octet-stream');

    let uploadUri = fileUri;
    // On Android, camera/library often returns content:// URIs which are not always uploadable.
    // For images, re-encode to cache as JPEG/PNG to guarantee a file:// path and smaller size.
    try {
      if (safeType.startsWith('image/')) {
        console.log('[ChatDetail] normalize image via ImageManipulator');
        const manip = await ImageManipulator.manipulateAsync(
          fileUri,
          [],
          {
            compress: Platform.OS === 'android' ? 0.7 : 0.8,
            format: safeType === 'image/png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
          }
        );
        if (manip?.uri) uploadUri = manip.uri;
      } else if (safeType.startsWith('video/') && Platform.OS === 'android' && fileUri.startsWith('content://')) {
        // Copy content URI video to cache file path to ensure fetch can read it
        try {
          const ext = safeName.split('.').pop() || 'mp4';
          const dest = `${FileSystem.cacheDirectory}upload-${Date.now()}.${ext}`;
          console.log('[ChatDetail] normalize video via copy to cache', { dest });
          await FileSystem.copyAsync({ from: fileUri, to: dest });
          uploadUri = dest;
        } catch (copyErr) {
          console.warn('[ChatDetail] video normalization failed, using original uri', copyErr);
        }
      }
    } catch (normErr) {
      console.warn('[ChatDetail] image normalization failed, using original uri', normErr);
    }

    try {
      console.log('[ChatDetail] uploading file to Cloudinary:', { uri: uploadUri, name: safeName, type: safeType });
      
      // Import the upload utility
      const { uploadToCloudinary } = await import('../../utils/fileUpload');
      
      // Upload to Cloudinary
      const result = await uploadToCloudinary({
        uri: uploadUri,
        type: safeType.startsWith('image/') ? 'image' : safeType.startsWith('video/') ? 'video' : 'document',
        name: safeName,
        mimeType: safeType,
      });
      
      console.log('[ChatDetail] Cloudinary upload success:', result.url);
      return result.url;
      
    } catch (error) {
      console.error('File upload error:', error);
      if (isMounted.current) {
        Alert.alert('Upload Error', error instanceof Error ? error.message : 'An unexpected error occurred during upload.');
      }
      return null;
    }
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false) {
        const { uri, name, mimeType } = result.assets[0];
        const fileUrl = await handleFileUpload(uri, name, mimeType);
        if (fileUrl) {
          const messageContent = `File: ${name}`;
          sendMessage(id as string, {
            content: messageContent,
            type: 'text', // We send as text for now, but with a mediaUrl
            mediaUrl: fileUrl,
          });
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  const handlePickMedia = async (type: 'camera' | 'library', mediaTypes: 'Images' | 'Videos') => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    let result: ImagePicker.ImagePickerResult | undefined;
    // Use MediaTypeOptions (installed picker version). Avoids runtime mismatch.
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: mediaTypes === 'Images'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      // Keep allowsEditing only for iOS images to avoid Android edit activity edge cases
      ...(Platform.OS === 'ios' && mediaTypes === 'Images' ? { allowsEditing: true } : {}),
      ...(mediaTypes === 'Images' ? { quality: Platform.OS === 'android' ? 0.6 : 0.8 } : {}),
      // Keep minimal payload on Android to reduce chance of native crashes
      base64: false,
      exif: false,
    };

    try {
      console.log('[ChatDetail] handlePickMedia:start', { type, mediaTypes, platform: Platform.OS });
      // Permissions
      if (type === 'camera') {
        console.log('[ChatDetail] requestCameraPermissionsAsync:request');
        const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
        console.log('[ChatDetail] requestCameraPermissionsAsync:response', camStatus);
        if (camStatus !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required.');
          return;
        }
      } else {
        console.log('[ChatDetail] requestMediaLibraryPermissionsAsync:request');
        const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('[ChatDetail] requestMediaLibraryPermissionsAsync:response', libStatus);
        if (libStatus !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required.');
          return;
        }
      }

      if (type === 'camera') {
        if (mediaTypes === 'Images') {
          console.log('[ChatDetail] launchCameraAsync:images:request', options);
          result = await ImagePicker.launchCameraAsync(options);
          console.log('[ChatDetail] launchCameraAsync:images:response', {
            canceled: result?.canceled,
            assetsCount: result?.assets?.length,
          });
        } else {
          console.log('[ChatDetail] launchCameraAsync:videos:request', options);
          result = await ImagePicker.launchCameraAsync(options);
          console.log('[ChatDetail] launchCameraAsync:videos:response', {
            canceled: result?.canceled,
            assetsCount: result?.assets?.length,
          });
        }
      } else {
        if (mediaTypes === 'Images') {
          console.log('[ChatDetail] launchImageLibraryAsync:images:request', options);
          result = await ImagePicker.launchImageLibraryAsync(options);
          console.log('[ChatDetail] launchImageLibraryAsync:images:response', {
            canceled: result?.canceled,
            assetsCount: result?.assets?.length,
          });
        } else {
          console.log('[ChatDetail] launchImageLibraryAsync:videos:request', options);
          result = await ImagePicker.launchImageLibraryAsync(options);
          console.log('[ChatDetail] launchImageLibraryAsync:videos:response', {
            canceled: result?.canceled,
            assetsCount: result?.assets?.length,
          });
        }
      }

      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[ChatDetail] picker:empty-or-canceled', {
          hasResult: !!result,
          canceled: result?.canceled,
          assetsCount: result?.assets?.length || 0,
        });
        return; // user canceled
      }

      const asset = result.assets[0];
      if (!asset?.uri) return;

      if (!isMounted.current) return;

      const _asset = result.assets[0];
      console.log('[ChatDetail] picker:asset', {
        uri: _asset?.uri,
        width: _asset?.width,
        height: _asset?.height,
        fileName: (_asset as any)?.fileName,
        mimeType: (_asset as any)?.mimeType,
        duration: (_asset as any)?.duration,
        fileSize: (_asset as any)?.fileSize,
        type: mediaTypes,
      });
      // Open composer to allow caption/edit before sending
      console.log('[ChatDetail] composer:open', { uri: asset.uri, inferredType: mediaTypes === 'Images' ? 'image' : 'video' });
      setComposerUri(asset.uri);
      setComposerType(mediaTypes === 'Images' ? 'image' : 'video');
      setComposerCaption('');
      setComposerVisible(true);
      console.log('[ChatDetail] composer:visible');
    } catch (error) {
      console.error(`${type} picker error:`, error);
      Alert.alert('Error', `Could not open the ${type}.`);
    } finally {
      console.log('[ChatDetail] handlePickMedia:finally');
      isPickingRef.current = false;
    }
  };

  const performRotate = async () => {
    if (!composerUri || composerType !== 'image') return;
    try {
      const result = await ImageManipulator.manipulateAsync(
        composerUri,
        [{ rotate: 90 }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setComposerUri(result.uri);
    } catch (e) {
      console.error('Rotate failed:', e);
      Alert.alert('Edit Error', 'Could not rotate image.');
    }
  };

  const performCropSquare = async () => {
    if (!composerUri || composerType !== 'image') return;
    try {
      // We need image dimensions; fallback to square center crop of 80% if unknown
      // Since Image.getSize is async via callback, we do a best-effort square crop box
      const cropSize = 1000; // arbitrary square; ImageManipulator will scale
      const result = await ImageManipulator.manipulateAsync(
        composerUri,
        [{ crop: { originX: 0, originY: 0, width: cropSize, height: cropSize } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setComposerUri(result.uri);
    } catch (e) {
      console.error('Crop failed:', e);
      Alert.alert('Edit Error', 'Could not crop image.');
    }
  };

  const sendFromComposer = async () => {
    if (!composerUri || isSending) return;
    setIsSending(true);
    // Snapshot values before closing composer
    const uriToSend = composerUri;
    const sendingType: Message['type'] = composerType;
    const captionToSend = composerCaption;
    // Close composer immediately for snappy UX
    setComposerVisible(false);
    // Try to infer filename/mime a bit
    const name = uriToSend.split('/').pop() || (sendingType === 'image' ? 'photo.jpg' : 'video.mp4');
    const mime = sendingType === 'image' ? 'image/jpeg' : 'video/mp4';
    const fileUrl = await handleFileUpload(uriToSend, name, mime);
    if (fileUrl) {
      const msg: Partial<Message> = {
        content: captionToSend || (sendingType === 'image' ? 'Photo' : 'Video'),
        type: sendingType,
        mediaUrl: fileUrl,
      };
      try {
        sendMessage(id as string, msg);
        if (!isMounted.current) return;
        setComposerUri(null);
        setComposerCaption('');
        // Scroll to bottom and rely on socket to deliver the new message to avoid duplicates
        setTimeout(() => {
          if (!isMounted.current) return;
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } catch (e) {
        console.error('sendMessage error:', e);
        if (isMounted.current) Alert.alert('Send Error', 'Unable to send the media message.');
      }
    }
    setIsSending(false);
  };

  const showCameraOptions = (mediaTypes: 'Images' | 'Videos') => {
    Alert.alert(
      `Select ${mediaTypes}`,
      '',
      [
        { text: 'Take Photo', onPress: () => handlePickMedia('camera', mediaTypes) },
        { text: 'Choose from Library', onPress: () => handlePickMedia('library', mediaTypes) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openMediaViewer = (uri: string, type: 'image' | 'video') => {
    setSelectedMedia({ uri, type });
    setMediaViewerVisible(true);
  };

  // Generate or retrieve a cached video thumbnail path for a given mediaUrl
  const getOrCreateVideoThumb = async (mediaUrl: string): Promise<string | undefined> => {
    try {
      if (!mediaUrl) return undefined;
      // Normalize to absolute for consistent hashing
      const normalized = normalizeUrl(mediaUrl) || mediaUrl;
      if (thumbCacheRef.current.has(normalized)) {
        const cached = thumbCacheRef.current.get(normalized)!;
        const info = await FileSystem.getInfoAsync(cached);
        if (info.exists) return cached;
      }
      // Create deterministic filename under cacheDirectory
      const safe = encodeURIComponent(normalized).replace(/%/g, '_');
      const dest = `${FileSystem.cacheDirectory}thumb-${safe}.jpg`;
      const existing = await FileSystem.getInfoAsync(dest);
      if (existing.exists) {
        thumbCacheRef.current.set(normalized, dest);
        return dest;
      }
      // Lazy-load module once
      if (!videoThumbsModuleRef.current) {
        try {
          videoThumbsModuleRef.current = await import('expo-video-thumbnails');
        } catch (e) {
          console.warn('[VideoThumb] module import failed', e);
          return undefined;
        }
      }
      const mod = videoThumbsModuleRef.current;
      if (!mod?.getThumbnailAsync) return undefined;
      const result = await mod.getThumbnailAsync(normalized, { time: 0 });
      if (result?.uri) {
        // Move/copy into deterministic cache path
        try {
          await FileSystem.copyAsync({ from: result.uri, to: dest });
          thumbCacheRef.current.set(normalized, dest);
          return dest;
        } catch (e) {
          console.warn('[VideoThumb] copy to cache failed', e);
          // Fallback to using temp uri directly
          thumbCacheRef.current.set(normalized, result.uri);
          return result.uri;
        }
      }
    } catch (e) {
      console.warn('[VideoThumb] getOrCreate failed', e);
    }
    return undefined;
  };

  // Lightweight video thumbnail component (first frame). Falls back gracefully if module unavailable.
  const VideoThumb = ({ uri }: { uri: string }) => {
    const [thumb, setThumb] = useState<string | undefined>(undefined);
    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const cached = await getOrCreateVideoThumb(uri);
          if (mounted && cached) setThumb(cached);
        } catch (e) {
          console.warn('[VideoThumb] Failed to generate thumbnail', e);
        }
      })();
      return () => { mounted = false; };
    }, [uri]);

    if (thumb) {
      return (
        <Image
          source={{ uri: thumb }}
          style={styles.bubbleImage}
          resizeMode="cover"
        />
      );
    }
    // Fallback placeholder icon
    return (
      <View style={[styles.bubbleImage, { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="videocam" size={60} color="#fff" />
      </View>
    );
  };

  // Message bubble
  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    // Log the raw message item with all its properties
    console.log('Message item:', {
      ...item,
      // Add any nested objects that might be getting stringified as [Object]
      sender: item.sender,
      user: item.user,
      participants: item.participants,
    });
    
    // Log the timestamp fields we have access to
  const timestampFields = ['createdAt', 'timestamp', 'date', 'time', 'sentAt', 'created'];
  const timestamps: Record<string, any> = {};
    timestampFields.forEach(field => {
      if (item[field] !== undefined) {
        timestamps[field] = {
          value: item[field],
          type: typeof item[field],
          asDate: new Date(item[field]).toString(),
          isValid: !isNaN(new Date(item[field]).getTime())
        };
      }
    });
    console.log('Message timestamps:', timestamps);
    
  const isOwn = user != null && item != null && String(item.senderId) === String(user.id);
    // Prefer embedded sender object if present; else find in participants; else fall back to otherUser for 1:1 chats
    // Resolve sender: prefer explicit sender object, then try participants list (which may have nested .user), then fall back to otherUser
    const participantMatch = normalizedParticipants.find((p: any) => p?.id && String(p.id) === String(item?.senderId) || p?.id && String(p.id) === String(item?.sender?._id || item?.sender?.id));
    const resolvedFromParticipant = participantMatch ? participantMatch.raw : null;
    const sender = isOwn
      ? user
      : ((item as any)?.sender || resolvedFromParticipant || otherUser);
    
    // Get sender's display name or username
    const senderName = sender?.displayName || sender?.username || 'Unknown User';
    const showSenderName = !isOwn && senderName !== 'Unknown User';
    
    const initials = isOwn
      ? ''
      : getInitials(senderName);
      
    const avatar = isOwn
      ? null
      : getUserAvatar(sender);
      
    if (!isOwn) {
      console.log('[BubbleAvatar] resolved', { senderId: item?.senderId, senderName, avatar });
    }
    
    const mediaUrl = item?.mediaUrl ? normalizeUrl(item.mediaUrl) : undefined;

    return (
      <View style={[
        styles.messageRow,
        { flexDirection: isOwn ? 'row-reverse' : 'row' }
      ]}>
        {/* Avatar only for recipient (not for own messages) */}
        {!isOwn && (
          <View style={styles.avatarWrap}>
            {avatar && !failedAvatarUrlsRef.current.has(avatar) ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatar}
                onError={() => {
                  console.warn('[BubbleAvatar] failed to load', avatar);
                  failedAvatarUrlsRef.current.add(avatar);
                  forceRerender((n) => n + 1);
                }}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
        )}
        {/* Bubble */}
        <View style={{ flex: 1, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          {showSenderName && (
            <Text style={[
              styles.senderName,
              isOwn ? styles.senderNameOwn : styles.senderNameOther
            ]}>
              {senderName}
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => {
              // Contextual menu for message actions
              const msgId = item?.tempId || item?.id;
              const options: any[] = [];
              if (item?.status === 'failed') {
                options.push({ text: 'Retry', onPress: () => {
                  Alert.alert('Retry message?', 'Do you want to retry sending this message?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Retry', onPress: async () => {
                        try {
                          if (msgId) await deleteMessage(msgId, id as string);
                        } catch (e) { console.warn('retry cleanup failed', e); }
                        try { sendMessage(id as string, { content: item.content, type: item.type, mediaUrl: item.mediaUrl }); } catch (e) { console.error('retry send failed', e); }
                      }
                    }
                  ]);
                } });
              }
              options.push({ text: 'Delete', onPress: async () => {
                try { const msgId2 = item?.tempId || item?.id; if (msgId2) await deleteMessage(msgId2, id as string); } catch (e) { console.error('delete failed', e); }
              } });
              options.push({ text: 'Cancel', style: 'cancel' });
              // Present as a simple Alert with options
              Alert.alert('Message actions', '', options as any[]);
            }}
            style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
              showSenderName ? (isOwn ? styles.bubbleOwnWithName : styles.bubbleOtherWithName) : {}
            ]}
          >
            {(item.type === 'image' || item.type === 'video') && mediaUrl ? (
              <TouchableOpacity onPress={() => {
                if (item.type === 'image' || item.type === 'video') {
                  openMediaViewer(mediaUrl!, item.type);
                }
              }}>
                {item.type === 'image' ? (
                  <View style={styles.bubbleImageContainer}>
                    <Image 
                      source={{ uri: mediaUrl }} 
                      style={styles.bubbleImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View style={styles.bubbleVideo}>
                    <Ionicons name="play" size={40} color="white" style={styles.playIcon} />
                    <VideoThumb uri={mediaUrl} />
                  </View>
                )}
              </TouchableOpacity>
            ) : null}
            {item?.content ? (
              <Text style={styles.bubbleText}>{item.content}</Text>
            ) : null}
            {/* Sending indicator removed: no spinner shown for optimistic messages */}
            {item?.status === 'failed' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={[styles.bubbleMeta, { color: '#ff6b6b', marginRight: 8 }]}>Failed to send</Text>
                <TouchableOpacity onPress={() => {
                  Alert.alert('Retry message?', 'Do you want to retry sending this message?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Retry', onPress: async () => {
                        try {
                          const msgId = item?.tempId || item?.id;
                          if (msgId) await deleteMessage(msgId, id as string);
                        } catch (e) { console.warn('retry cleanup failed', e); }
                        try { sendMessage(id as string, { content: item.content, type: item.type, mediaUrl: item.mediaUrl }); } catch (e) { console.error('retry send failed', e); }
                      }
                    }
                  ]);
                }}>
                  <Text style={[styles.bubbleMeta, { color: '#FFD600' }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={[
              styles.bubbleTime,
              isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther
            ]}>
              {item?.createdAt
                ? (() => {
                    try {
                      const date = new Date(item.createdAt);
                      return isNaN(date.getTime()) 
                        ? '??' 
                        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch (e) {
                      console.error('Error formatting date:', e, 'Value:', item.createdAt);
                      return '??';
                    }
                  })()
                : ''}
            </Text>
          </TouchableOpacity>
        </View>
        {/* No avatar for own messages */}
        {isOwn && <View style={styles.avatarWrap} />}
      </View>
    );
  };

  // Header
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View
        style={[styles.header, { paddingTop: 8 }] }
        onLayout={(e) => setHeaderHeight(Math.max(0, Math.round(e.nativeEvent.layout.height)))}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {chatAvatar && !failedAvatarUrlsRef.current.has(chatAvatar) ? (
          <Image
            source={{ uri: chatAvatar }}
            style={styles.headerAvatar}
            onError={() => {
              console.warn('[HeaderAvatar] failed to load', chatAvatar);
              failedAvatarUrlsRef.current.add(chatAvatar);
              forceRerender((n) => n + 1);
            }}
          />
        ) : (
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{getInitials(chatName)}</Text>
          </View>
        )}
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{chatName}</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Use measured header height for iOS; Android uses height behavior with zero offset
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <FlatList
          ref={flatListRef}
          data={displayedMessages}
          renderItem={renderMessage}
          keyExtractor={(item, idx) => {
            // Prefer server id; otherwise compose a stable-ish key to avoid collisions
            const idKey = item && (item as any).id != null ? String((item as any).id) : null;
            if (idKey) return idKey;
            const a = (item as any) || {};
            const parts = [a.mediaUrl, a.content, a.createdAt].filter(Boolean);
            return parts.length ? parts.join('|') : `msg-${idx}`;
          }}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
        <View style={[
          styles.inputBar,
          { paddingBottom: keyboardVisible ? 8 : Math.max(8, insets.bottom) }
        ]}>
          <View style={styles.inputInner}>
            <TouchableOpacity style={styles.inputIcon} onPress={handleAttachFile}>
              <Ionicons name="attach" size={22} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIcon} onPress={() => showCameraOptions('Videos')}>
              <Ionicons name="videocam" size={22} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIcon} onPress={() => showCameraOptions('Images')}>
              <Ionicons name="camera" size={22} color="#888" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              value={input}
              onChangeText={setInput}
              multiline
              underlineColorAndroid="transparent"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Media Composer Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={composerVisible}
        onRequestClose={() => setComposerVisible(false)}
      >
        <View style={styles.composerBackdrop}>
          <View style={styles.composerCard}>
            <Text style={styles.composerTitle}>{composerType === 'image' ? 'Edit Photo & Add Caption' : 'Add Caption to Video'}</Text>
            {composerUri && composerType === 'image' ? (
              <Image source={{ uri: composerUri }} style={styles.composerPreview} resizeMode="contain" />
            ) : null}
            {/* Basic edit actions for images */}
            {composerType === 'image' && (
              <View style={styles.composerActions}>
                <TouchableOpacity style={styles.composerActionBtn} onPress={performRotate}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.composerActionText}>Rotate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.composerActionBtn} onPress={performCropSquare}>
                  <Ionicons name="crop" size={20} color="#fff" />
                  <Text style={styles.composerActionText}>Crop</Text>
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              placeholder="Add a caption..."
              placeholderTextColor="#888"
              style={styles.composerInput}
              value={composerCaption}
              onChangeText={setComposerCaption}
              multiline
            />
            <View style={styles.composerFooter}>
              <TouchableOpacity
                style={[styles.composerBtn, { backgroundColor: '#444', opacity: isSending ? 0.7 : 1 }]}
                onPress={() => setComposerVisible(false)}
                disabled={isSending}
              >
                <Text style={styles.composerBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.composerBtn, { backgroundColor: '#FFD600', opacity: isSending ? 0.7 : 1 }]}
                onPress={sendFromComposer}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[styles.composerBtnText, { color: '#000' }]}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {selectedMedia && (
        <MediaViewer
          visible={mediaViewerVisible}
          onClose={() => setMediaViewerVisible(false)}
          mediaUri={selectedMedia.uri}
          mediaType={selectedMedia.type}
        />
      )}
    </SafeAreaView>
  );
}

export default function ChatScreen() {
  return (
    <ChatWrapper>
      <ChatScreenContent />
    </ChatWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#181A20' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#181A20',
    borderBottomWidth: 1,
    borderBottomColor: '#23242A',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 8,
  },
  senderNameOwn: {
    textAlign: 'right',
    marginRight: 8,
    color: '#B0D2FF',
  },
  senderNameOther: {
    textAlign: 'left',
    marginLeft: 8,
    color: '#B0B0B0',
  },
  headerBack: { marginRight: 8, padding: 4 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#23242A', justifyContent: 'center', alignItems: 'center', marginLeft: 8
  },
  headerAvatarText: { color: '#FFD600', fontWeight: 'bold', fontSize: 16 },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18, marginLeft: 12, flexShrink: 1 },
  messages: { padding: 16, paddingBottom: 8 },
  messageRow: { 
    marginBottom: 8, 
    width: '100%',
    paddingHorizontal: 8,
  },
  avatarWrap: { width: 36, height: 36, marginHorizontal: 4, justifyContent: 'flex-end' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#23242A'
  },
  avatarText: { fontWeight: 'bold', fontSize: 15, color: '#FFD600' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 12,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleOwn: { 
    backgroundColor: '#2196F3', 
    alignSelf: 'flex-end', 
    borderTopRightRadius: 6,
    marginBottom: 4,
  },
  bubbleOther: { 
    backgroundColor: '#23242A', 
    alignSelf: 'flex-start', 
    borderTopLeftRadius: 6,
    marginBottom: 4,
  },
  bubbleOwnWithName: {
    borderTopRightRadius: 6,
    borderTopLeftRadius: 18,
  },
  bubbleOtherWithName: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 18,
  },
  bubbleText: { 
    color: '#fff', 
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  bubbleTime: { 
    fontSize: 11, 
    alignSelf: 'flex-end', 
    marginTop: 4,
    opacity: 0.8,
  },
  bubbleTimeOwn: { 
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  bubbleTimeOther: { 
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
  },
  bubbleImageContainer: { 
    width: 200, 
    height: 120, 
    borderRadius: 10, 
    marginBottom: 6, 
    overflow: 'hidden',
    backgroundColor: '#222' 
  },
  bubbleImage: { 
    width: '100%', 
    height: '100%' 
  },
  bubbleVideo: {
    width: 200,
    height: 120,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    position: 'absolute',
    zIndex: 1,
  },
  inputBar: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#181A20',
    borderTopWidth: 1,
    borderTopColor: '#23242A',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23242A',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#23242A',
  },
  inputIcon: { marginRight: 4, padding: 4 },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  sendButton: {
    marginLeft: 4,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    right: -4,
  },
  composerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  composerCard: {
    backgroundColor: '#1E2026',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  composerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  composerPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#111',
    marginBottom: 12,
  },
  composerActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  composerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2C33',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  composerActionText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 120,
    color: '#fff',
    backgroundColor: '#23242A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2E3036',
  },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  composerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  composerBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});