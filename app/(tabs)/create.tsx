import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

interface MediaFormData {
  uri: string;
  type: string;
  name: string;
}

const AVATAR_COLORS = ['#4D96FF', '#8A2BE2', '#FF6B6B', '#FFD93D', '#6BCB77', '#FFB86B'];

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

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  // Keep mime/name metadata to build correct FormData on Android (content:// URIs)
  const [imageMeta, setImageMeta] = useState<MediaFormData | null>(null);
  const [videoMeta, setVideoMeta] = useState<MediaFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [editedImageUri, setEditedImageUri] = useState<string | null>(null);
  const [modalCaption, setModalCaption] = useState('');

  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated } = useAuth();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  // Open image crop/rotate modal after picking image
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos and videos.');
        return;
      }
      // Back-compat: prefer new MediaType if available, else fall back to MediaTypeOptions
      const mediaTypesCompat: any = (ImagePicker as any).MediaType?.All ?? ImagePicker.MediaTypeOptions.All;
      const result = await ImagePicker.launchImageLibraryAsync({
        // Prefer new API, fallback to old to satisfy current SDK version
        mediaTypes: mediaTypesCompat,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const type = asset.type;
        const mimeType = (asset as any).mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg');
        const fileName = (asset as any).fileName || (asset.uri?.split('/').pop() ?? (type === 'video' ? 'video.mp4' : 'image.jpg'));
        if (type === 'video' || asset.uri.match(/\.(mp4|mov|avi|mkv)$/i)) {
          setVideoUri(asset.uri);
          setImageUri(null);
          setVideoMeta({ uri: asset.uri, type: mimeType, name: fileName });
          setImageMeta(null);
          setMediaType('video');
          setShowMediaModal(true);
          setModalCaption('');
        } else if (type === 'image') {
          setImageUri(asset.uri);
          setVideoUri(null);
          setImageMeta({ uri: asset.uri, type: mimeType, name: fileName });
          setVideoMeta(null);
          setMediaType('image');
          setShowMediaModal(true);
          setModalCaption('');
        }
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to pick media');
      console.error(error);
    }
  };

  // Image rotate logic (no cropping)
  const handleRotateImage = async (direction: 'left' | 'right') => {
    if (!imageUri && !editedImageUri) return;
    const uri = editedImageUri || imageUri;
    const angle = direction === 'left' ? -90 : 90;
    const manipResult = await ImageManipulator.manipulateAsync(
      uri!,
      [{ rotate: angle }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );
    if (manipResult) {
      setEditedImageUri(manipResult.uri);
    }
  };

  // Confirm media in modal
  const handleConfirmMedia = () => {
    if (mediaType === 'image') {
      setImageUri(editedImageUri || imageUri);
      setVideoUri(null);
    } else if (mediaType === 'video') {
      setVideoUri(videoUri);
      setImageUri(null);
    }
    setContent(modalCaption);
    setShowMediaModal(false);
  };

  // Cancel media modal
  const handleCancelMedia = () => {
    setShowMediaModal(false);
    setEditedImageUri(null);
    setImageUri(null);
    setVideoUri(null);
    setImageMeta(null);
    setVideoMeta(null);
    setMediaType(null);
    setModalCaption('');
  };

  // Post creation logic (uses imageUri or videoUri)
  const createPost = async () => {
    if (!content.trim() && !imageUri && !videoUri) {
      Alert.alert('Error', 'Please add some content, image, or video to your post');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      Alert.alert('Error', 'Please sign in to create a post');
      router.push('/login');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('content', content.trim());
    formData.append('userId', user.id.toString());
    formData.append('username', user.username || user.display_name || 'Unknown User');
    if (imageUri) {
      const filename = imageMeta?.name || imageUri.split('/').pop() || 'image.jpg';
      const inferredTypeFromExt = (() => {
        const m = /\.(\w+)$/.exec(filename || '');
        return m ? `image/${m[1].toLowerCase()}` : 'image/jpeg';
      })();
      const type = imageMeta?.type || inferredTypeFromExt;
      formData.append('media', { uri: imageUri, type, name: filename } as any);
    }
    if (videoUri) {
      const filename = videoMeta?.name || videoUri.split('/').pop() || 'video.mp4';
      const inferredTypeFromExt = (() => {
        const m = /\.(\w+)$/.exec(filename || '');
        return m ? `video/${m[1].toLowerCase()}` : 'video/mp4';
      })();
      const type = videoMeta?.type || inferredTypeFromExt;
      formData.append('media', { uri: videoUri, type, name: filename } as any);
    }
    try {
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });
      if (!response.ok) {
        let errorMsg = 'Failed to create post';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } else {
            const text = await response.text();
            if (text) errorMsg = text;
          }
        } catch {}
        console.error('Upload error:', errorMsg);
        throw new Error(errorMsg);
      }

      setContent('');
      setImageUri(null);
      setEditedImageUri(null);
      setVideoUri(null);
      setImageMeta(null);
      setVideoMeta(null);
      setMediaType(null);
      setModalCaption('');
      router.push('/(tabs)/post');
    } catch (error) {
      console.error('Error creating post:', error);

      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debug logs for video preview
  if (videoUri && !showMediaModal) {
    console.log('Video Preview URI:', videoUri);
  }
  if (mediaType === 'video' && videoUri && showMediaModal) {
    console.log('Modal Video Preview URI:', videoUri);
  }

  return (
    <View style={[styles.container, { backgroundColor: '#121212' }]}> 
      <View style={styles.headerBlack}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.userInfoRow}>
          {user?.profile_picture ? (
            <Image source={{ uri: user.profile_picture }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: getAvatarColor(user?.display_name || user?.username || '') }]}> 
              <Text style={styles.userAvatarText}>{getInitials(user?.display_name || user?.username || '')}</Text>
            </View>
          )}
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.userName}>{user?.display_name || user?.username || 'User'}</Text>
            <Text style={styles.userTime}>Now</Text>
          </View>
        </View>
        {/* Only show the main input if no image is selected */}
        {!(editedImageUri || imageUri) && (
          <TextInput
            style={styles.input}
            textAlignVertical="top"
            placeholder="What's on your mind?"
            placeholderTextColor="#A0A0A0"
            multiline
            value={content}
            onChangeText={setContent}
          />
        )}
        {extractHashtags(content).length > 0 && (
          <View style={styles.hashtagRow}>
            {extractHashtags(content).map((tag, idx) => (
              <View key={tag + idx} style={[styles.hashtagChip, { backgroundColor: idx % 2 === 0 ? '#232323' : '#222D44' }]}> 
                <Text style={styles.hashtagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Show preview only after confirming in modal */}
        {(editedImageUri || imageUri) && !showMediaModal && (
          <View style={styles.mediaPreview}>
            {((editedImageUri || imageUri) && (
              <Image
                source={{ uri: (editedImageUri || imageUri) ?? undefined }}
                style={{ width: '100%', height: 300, borderRadius: 10 }}
                resizeMode="contain"
                onError={() => Alert.alert('Error', 'Failed to load image preview')}
              />
            ))}
            <TouchableOpacity style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }} onPress={() => { setImageUri(null); setEditedImageUri(null); }}>
              <Ionicons name="close-circle" size={28} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
        {videoUri && !showMediaModal && (
          <View style={styles.mediaPreview}>
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.mediaContent}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay={isVideoPlaying}
              onError={() => Alert.alert('Error', 'Failed to load video preview')}
            />
            <TouchableOpacity
              style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
              onPress={() => setVideoUri(null)}
            >
              <Ionicons name="close-circle" size={28} color="#FF6B6B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                justifyContent: 'center', alignItems: 'center', zIndex: 9,
                backgroundColor: 'rgba(0,0,0,0.1)'
              }}
              onPress={() => {
                setIsVideoPlaying((prev) => {
                  if (prev) videoRef.current?.pauseAsync();
                  else videoRef.current?.playAsync();
                  return !prev;
                });
              }}
              activeOpacity={0.5}
            >
              <Ionicons
                name={isVideoPlaying ? 'pause-circle' : 'play-circle'}
                size={56}
                color="rgba(255,255,255,0.7)"
                style={{ opacity: 0.8 }}
              />
            </TouchableOpacity>
          </View>
        )}
        {/* Remove the extra X on editedImageUri/imageUri preview (keep only above) */}
        {(editedImageUri || imageUri) && showMediaModal === false && false && (
          <View style={{ position: 'relative', alignSelf: 'center' }}>
            <Image source={{ uri: editedImageUri || imageUri || undefined }} style={styles.mediaPreview} resizeMode={"contain" as any} />
            {/* Removed X here */}
          </View>
        )}
        {(editedImageUri || imageUri) && (
          <TextInput
            style={[styles.captionInput, { marginTop: 8 }]}
            placeholder="Write a caption..."
            placeholderTextColor="#888"
            value={content || ''}
            onChangeText={setContent}
            multiline
          />
        )}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            onPress={handlePickImage}
            style={styles.mediaButton}
          >
            <MaterialCommunityIcons name="image-plus" size={24} color="#4D96FF" />
            <Text style={styles.mediaButtonText}>Add Photo/Video</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={createPost}
          style={[styles.postButton, loading && { opacity: 0.7 }]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      {/* Media Modal for editing/preview before confirming */}
      {showMediaModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.95)',
          zIndex: 100,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{ width: '90%', maxHeight: '90%', backgroundColor: '#181A20', borderRadius: 16, padding: 16 }}>
            {mediaType === 'image' && (
              <>
                <Image
                  source={{ uri: editedImageUri || imageUri! }}
                  style={{ width: 300, height: 300, alignSelf: 'center', borderRadius: 12, marginBottom: 12 }}
                  resizeMode="contain"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
                  <TouchableOpacity onPress={() => handleRotateImage('left')} style={{ marginHorizontal: 10 }}>
                    <Ionicons name="refresh" size={28} color="#4D96FF" style={{ transform: [{ scaleX: -1 }] }} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRotateImage('right')} style={{ marginHorizontal: 10 }}>
                    <Ionicons name="refresh" size={28} color="#4D96FF" />
                  </TouchableOpacity>
                </View>
              </>
            )}
            {mediaType === 'video' && videoUri && (
              <View style={{ position: 'relative', width: 300, height: 300, alignSelf: 'center', borderRadius: 12, marginBottom: 12 }}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoUri }}
                  style={{ width: 300, height: 300, borderRadius: 12 }}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  shouldPlay={isVideoPlaying}
                  onError={() => Alert.alert('Error', 'Failed to load video preview')}
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center', zIndex: 9,
                    backgroundColor: 'rgba(0,0,0,0.1)'
                  }}
                  onPress={() => {
                    setIsVideoPlaying((prev) => {
                      if (prev) videoRef.current?.pauseAsync();
                      else videoRef.current?.playAsync();
                      return !prev;
                    });
                  }}
                  activeOpacity={0.5}
                >
                  <Ionicons
                    name={isVideoPlaying ? 'pause-circle' : 'play-circle'}
                    size={56}
                    color="rgba(255,255,255,0.7)"
                    style={{ opacity: 0.8 }}
                  />
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={{
                minHeight: 60,
                borderRadius: 10,
                backgroundColor: '#232323',
                color: '#fff',
                fontSize: 16,
                padding: 12,
                marginBottom: 12,
              }}
              placeholder="Write a caption..."
              placeholderTextColor="#A0A0A0"
              multiline
              value={modalCaption}
              onChangeText={setModalCaption}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={handleCancelMedia} style={{ padding: 12, backgroundColor: '#333', borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmMedia} style={{ padding: 12, backgroundColor: '#4D96FF', borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Use & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userTime: {
    color: '#A0A0A0',
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    minHeight: 160,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    color: '#fff',
    fontSize: 17,
    padding: 22,
    marginBottom: 12,
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
  mediaPreview: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#232323',
  },
  mediaContent: {
    width: '100%',
    height: undefined,
    borderRadius: 10,
    resizeMode: 'contain',
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 2,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  mediaButtonText: {
    color: '#4D96FF',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  postButton: {
    backgroundColor: '#4D96FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  captionInput: {
    width: '100%',
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#181818',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 12,
  },
});