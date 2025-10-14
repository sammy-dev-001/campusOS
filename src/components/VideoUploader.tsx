import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/NewThemeContext';
import { VideoUploadProgress } from './VideoUploadProgress';
import { useVideoUpload } from '../hooks/useVideoUpload';

interface VideoUploaderProps {
  onUploadComplete?: (result: any) => void;
  maxDuration?: number; // in seconds
  maxSize?: number; // in MB
  folder?: string;
  style?: any;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUploadComplete,
  maxDuration = 60, // 1 minute
  maxSize = 50, // 50MB
  folder = 'videos',
  style,
}) => {
  const { theme } = useTheme();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const { uploadVideo, progress, isUploading, error, resetUpload } = useVideoUpload();

  const pickVideo = useCallback(async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission required',
            'Please allow access to your media library to upload videos.'
          );
          return;
        }
      }

      // Launch video picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        videoMaxDuration: maxDuration,
        allowsEditing: false,
        base64: false,
      });

      if (result.canceled) return;

      const video = result.assets?.[0];
      if (!video) return;

      // Check file size
      if (video.fileSize && video.fileSize > maxSize * 1024 * 1024) {
        throw new Error(`Video must be less than ${maxSize}MB`);
      }

      // Check video duration
      if (video.duration && video.duration > maxDuration) {
        throw new Error(`Video must be shorter than ${maxDuration} seconds`);
      }

      setLocalUri(video.uri);
      
      // Start upload automatically
      const uploadResult = await uploadVideo(video.uri, folder);
      onUploadComplete?.(uploadResult);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pick video';
      Alert.alert('Error', errorMessage);
      console.error('Video picker error:', error);
    }
  }, [maxDuration, maxSize, folder, uploadVideo, onUploadComplete]);

  const handleRetry = useCallback(() => {
    if (localUri) {
      uploadVideo(localUri, folder)
        .then(onUploadComplete)
        .catch(console.error);
    }
  }, [localUri, uploadVideo, folder, onUploadComplete]);

  const handleRemove = useCallback(() => {
    resetUpload();
    setLocalUri(null);
  }, [resetUpload]);

  if (localUri) {
    return (
      <View style={[styles.container, style]}>
        <VideoUploadProgress
          uri={localUri}
          progress={progress}
          error={error || undefined}
          onRetry={handleRetry}
          onRemove={handleRemove}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.uploadButton,
        { 
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
      onPress={pickVideo}
      disabled={isUploading}
    >
      <Ionicons 
        name="videocam" 
        size={32} 
        color={theme.textSecondary} 
        style={styles.icon}
      />
      <View>
        <Text style={[styles.buttonText, { color: theme.text }]}>
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </Text>
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          MP4, MOV up to {maxSize}MB, {maxDuration}s max
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
  },
});
