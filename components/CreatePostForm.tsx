import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  Image, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/contexts/NewThemeContext';
import { useUpload } from '../src/contexts/UploadContext';
import { API_BASE_URL } from '../src/constants/Config';

interface CreatePostFormProps {
  onPostCreated?: () => void;
  onCancel?: () => void;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onPostCreated, onCancel }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useTheme();
  const { addUpload, completeUpload } = useUpload();

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        
        // If we have base64 data, use it directly
        if (asset.base64) {
          const base64Data = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
          setMedia(base64Data);
        } else {
          // Fallback to URI if base64 is not available
          setMedia(asset.uri);
        }
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick an image');
    }
  };

  const removeMedia = () => {
    setMedia(null);
  };

  const handleSubmit = async () => {
    console.log('=== Form Submission Started ===');
    console.log('Content:', content);
    console.log('Media exists:', !!media);
    
    if (isSubmitting) {
      console.log('Already submitting, aborting');
      return;
    }
    
    if (!content.trim() && !media) {
      Alert.alert('Error', 'Please add some content or an image to your post');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Preparing post data...');
      const postData: Record<string, any> = {
        content: content.trim(),
        caption: content.trim(), // Some backends expect 'caption' instead of 'content'
        text: content.trim(),   // Another common field name for post content
      };

      // If there's media, add it to the payload
      if (media) {
        postData.media = media;
        console.log('Including media in the post data');
      }

      console.log('Sending post request with payload:', JSON.stringify({
        ...postData,
        media: postData.media ? '[MEDIA DATA]' : null // Don't log actual media data
      }, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });
      
      // Convert headers to a plain object for logging
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Response headers:', headers);
      
      console.log('Response status:', response.status);
      let responseData;
      try {
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        responseData = responseText ? JSON.parse(responseText) : {};
        console.log('Parsed response data:', responseData);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create post');
      }
      
      // If successful, reset the form
      setContent('');
      setMedia(null);
      
      // Notify parent component
      onPostCreated?.();
      
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Create Post</Text>
        <TouchableOpacity 
          onPress={handleSubmit} 
          style={[styles.postButton, (!content.trim() && !media) && styles.postButtonDisabled]}
          disabled={isSubmitting || (!content.trim() && !media)}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="What's on your mind?"
          placeholderTextColor="#888"
          multiline
          value={content}
          onChangeText={setContent}
        />
        
        {media && (
          <View style={styles.mediaPreview}>
            <Image 
              source={{ uri: media }} 
              style={styles.mediaImage} 
              resizeMode="cover"
            />
            <TouchableOpacity 
              style={styles.removeMediaButton}
              onPress={removeMedia}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.mediaButton}
          onPress={pickMedia}
          disabled={isSubmitting}
        >
          <Ionicons name="image" size={24} color={theme.primary} />
          <Text style={[styles.mediaButtonText, { color: theme.text }]}>
            {media ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
  },
  cancelButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  mediaPreview: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: 10,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    borderTopWidth: 1,
    padding: 15,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaButtonText: {
    marginLeft: 10,
    fontSize: 16,
  },
});

export default CreatePostForm;
