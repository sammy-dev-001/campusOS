import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUser } from '../../src/contexts/UserContext';
import { useTheme } from '../../src/contexts/NewThemeContext';

// Video compression constants
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const WARNING_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB

// Helper functions
function getInitials(name?: string) {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#4D96FF', '#8A2BE2', '#FF6B6B', '#FFD93D', '#6BCB77'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Component
const CreatePostScreen = () => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video'; fileSize?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const { theme } = useTheme();

  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your media library');
        return;
      }

      // First, pick with original quality to check size
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';

        // Get file size
        let fileSize = 0;
        try {
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            fileSize = fileInfo.size || 0;
          }
        } catch (e) {
          console.warn('Could not get file size:', e);
        }

        console.log(`[CreatePost] Selected ${asset.type}, size: ${formatFileSize(fileSize)}`);

        // Check if video is too large
        if (isVideo && fileSize > MAX_VIDEO_SIZE) {
          Alert.alert(
            'Video Too Large',
            `Your video is ${formatFileSize(fileSize)}. Maximum allowed is ${formatFileSize(MAX_VIDEO_SIZE)}.\n\nWould you like to select a compressed version?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Select & Compress',
                onPress: () => pickCompressedVideo(),
              },
            ]
          );
          return;
        }

        // Warn for large files
        if (isVideo && fileSize > WARNING_VIDEO_SIZE) {
          Alert.alert(
            'Large Video',
            `This video is ${formatFileSize(fileSize)}. Upload may take a while.\n\nWould you like to continue or select a compressed version?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Compress', onPress: () => pickCompressedVideo() },
              {
                text: 'Continue',
                onPress: () => setMedia({ uri: asset.uri, type: 'video', fileSize })
              },
            ]
          );
          return;
        }

        setMedia({
          uri: asset.uri,
          type: asset.type as 'image' | 'video',
          fileSize,
        });
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const pickCompressedVideo = async () => {
    try {
      setIsCompressing(true);

      // Pick with compression options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true, // Enable editing for trimming
        quality: 0.5, // Lower quality
        videoMaxDuration: 60, // Limit to 1 minute
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        // Get compressed file size
        let fileSize = 0;
        try {
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            fileSize = fileInfo.size || 0;
          }
        } catch (e) {
          console.warn('Could not get file size:', e);
        }

        console.log(`[CreatePost] Compressed video size: ${formatFileSize(fileSize)}`);

        // Still check if it's acceptable
        if (fileSize > MAX_VIDEO_SIZE) {
          Alert.alert(
            'Still Too Large',
            `The video is still ${formatFileSize(fileSize)}.\n\nPlease try:\n• Trimming to a shorter length\n• Recording at lower resolution\n• Using a different video`,
            [{ text: 'OK' }]
          );
          return;
        }

        setMedia({
          uri: asset.uri,
          type: 'video',
          fileSize,
        });

        Alert.alert('Success', `Video compressed to ${formatFileSize(fileSize)}`);
      }
    } catch (error) {
      console.error('Error picking compressed video:', error);
      Alert.alert('Error', 'Failed to compress video');
    } finally {
      setIsCompressing(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !media) {
      Alert.alert('Error', 'Please add some content or media to your post');
      return;
    }

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('content', content);

      if (media) {
        // For React Native, we need to create a file-like object
        const file = {
          uri: media.uri,
          type: media.type === 'image' ? 'image/jpeg' : 'video/mp4',
          name: `post_${Date.now()}.${media.type === 'image' ? 'jpg' : 'mp4'}`,
        };
        formData.append('media', file as any);
      }

      const response = await fetch('https://campusos-backend.onrender.com/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create post');
      }

      // Reset form
      setContent('');
      setMedia(null);

      // Show success and navigate back
      Alert.alert('Success', 'Your post has been created!', [
        {
          text: 'OK',
          onPress: () => {
            // Use navigation.goBack() instead of replace to avoid re-mounting the entire tab navigator
            router.replace({
              pathname: '/(tabs)/post',
              params: { refresh: Date.now() }
            });
          }
        }
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      const errorMessage = error?.message || 'Failed to create post';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(user?.display_name || user?.username || '') }]}>
            <Text style={styles.avatarText}>{getInitials(user?.display_name || user?.username)}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.display_name || user?.username || 'User'}</Text>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor="#666"
          multiline
          value={content}
          onChangeText={setContent}
        />

        {media && (
          <View style={styles.mediaContainer}>
            {media.type === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.media} resizeMode="contain" />
            ) : (
              <Video
                source={{ uri: media.uri }}
                style={styles.media}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
                isLooping
              />
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setMedia(null)}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: media ? '#4D96FF' : '#2A2A2A' }]}
          onPress={pickMedia}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {media ? 'Change Media' : 'Add Photo/Video'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { opacity: isLoading ? 0.7 : 1 }]}
          onPress={handlePost}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4D96FF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    color: 'white',
    fontSize: 16,
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    marginBottom: 16,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#4D96FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreatePostScreen;
