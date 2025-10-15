import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../constants/Config';
import { useAuth } from '../contexts/AuthContext';

interface VideoUploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
  videoUri: string | null;
  uploadId: string | null;
}

export const useVideoUpload = () => {
  const [uploadState, setUploadState] = useState<VideoUploadState>({
    progress: 0,
    isUploading: false,
    error: null,
    videoUri: null,
    uploadId: null,
  });

  const { user } = useAuth();
  // Get the token from AsyncStorage or your auth context
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Replace this with your actual token retrieval logic
    const getToken = async () => {
      try {
        // Example: Get token from AsyncStorage
        const storedToken = await AsyncStorage.getItem('authToken');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Failed to get token:', error);
      }
    };

    getToken();
  }, []);

  const uploadVideo = useCallback(async (fileUri: string, folder = 'videos') => {
    const uploadId = `video-${Date.now()}`;
    
    setUploadState({
      progress: 0,
      isUploading: true,
      error: null,
      videoUri: fileUri,
      uploadId,
    });

    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Prepare form data
      const formData = new FormData();
      
      // For web, we need to fetch the file as a blob
      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const fileName = `video-${Date.now()}.${fileUri.split('.').pop() || 'mp4'}`;
        const file = new File([blob], fileName, { type: 'video/mp4' });
        formData.append('file', file);
      } else {
        // For mobile
        formData.append('file', {
          uri: fileUri,
          name: `video-${Date.now()}.${fileUri.split('.').pop() || 'mp4'}`,
          type: 'video/mp4',
        } as any);
      }

      // Add additional data
      formData.append('folder', folder);
      formData.append('resource_type', 'video');
      formData.append('upload_preset', 'ml_default');

      // Upload to server
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadState(prev => ({
              ...prev,
              progress,
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.response);
            setUploadState(prev => ({
              ...prev,
              isUploading: false,
              progress: 100,
            }));
            resolve(response);
          } else {
            const error = new Error(`Upload failed with status ${xhr.status}`);
            setUploadState(prev => ({
              ...prev,
              isUploading: false,
              error: error.message,
            }));
            reject(error);
          }
        };

        xhr.onerror = () => {
          const error = new Error('Upload failed');
          setUploadState(prev => ({
            ...prev,
            isUploading: false,
            error: error.message,
          }));
          reject(error);
        };

        xhr.open('POST', `${API_BASE_URL}/api/upload`);
        
        // Add authorization header if user is logged in
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        xhr.send(formData);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [token]);

  const resetUpload = useCallback(() => {
    setUploadState({
      progress: 0,
      isUploading: false,
      error: null,
      videoUri: null,
      uploadId: null,
    });
  }, []);

  return {
    uploadVideo,
    resetUpload,
    ...uploadState,
  };
};
