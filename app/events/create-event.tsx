import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/NewThemeContext';

const categories = [
  'Academic', 'Social', 'Sports', 'Workshop', 'Conference', 'Cultural'
];

export default function CreateEventScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date(),
    time: new Date(),
    location: '',
    category: '',
    image: null as string | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImagePreview(uri);
        setFormData(prev => ({ ...prev, image: uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImagePreview(uri);
        setFormData(prev => ({ ...prev, image: uri }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);
      
      // Get the file type from the URI
      const fileType = uri.split('.').pop();
      const fileName = `event_${Date.now()}.${fileType}`;
      
      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileType}`,
      } as any);
      formData.append('upload_preset', process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      
      // Upload to Cloudinary
      const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dgtzqjfbd';
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to upload image');
      }
      
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.location || !formData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = null;
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }

      const eventData = new FormData();
      eventData.append('title', formData.title);
      eventData.append('description', formData.description);
      eventData.append('startDate', formData.date.toISOString());
      eventData.append('endDate', new Date(formData.date.getTime() + 60 * 60 * 1000).toISOString()); // 1 hour later
      eventData.append('location', formData.location);
      eventData.append('category', formData.category);
      if (imageUrl) {
        eventData.append('imageUrl', imageUrl);
      }

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: eventData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event');
      }

      Alert.alert('Success', 'Event created successfully!');
      router.back();
    } catch (error: any) {
      console.error('Error creating event:', error);
      Alert.alert('Error', error?.message || 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Create Event</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.form}>
        {/* Image Upload Section */}
        <View style={styles.imageUploadContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Event Image (Optional)</Text>
          
          {imagePreview ? (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: imagePreview }} 
                style={styles.imagePreview} 
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={[styles.changeImageButton, { backgroundColor: theme.primary }]}
                onPress={pickImage}
                disabled={isUploading}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageUploadButtons}>
              <TouchableOpacity 
                style={[styles.uploadButton, { borderColor: theme.primary }]}
                onPress={pickImage}
                disabled={isUploading}
              >
                <Ionicons name="image" size={24} color={theme.primary} />
                <Text style={[styles.uploadButtonText, { color: theme.primary }]}>
                  {isUploading ? 'Uploading...' : 'Choose from Library'}
                </Text>
              </TouchableOpacity>
              
              <Text style={[styles.orText, { color: theme.textSecondary }]}>or</Text>
              
              <TouchableOpacity 
                style={[styles.uploadButton, { borderColor: theme.primary }]}
                onPress={takePhoto}
                disabled={isUploading}
              >
                <Ionicons name="camera" size={24} color={theme.primary} />
                <Text style={[styles.uploadButtonText, { color: theme.primary }]}>
                  Take a Photo
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={[styles.label, { color: theme.text }]}>Event Title *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Enter event title"
          placeholderTextColor={theme.textSecondary}
          value={formData.title}
          onChangeText={(text) => handleChange('title', text)}
        />

        <Text style={[styles.label, { color: theme.text }]}>Description *</Text>
        <TextInput
          style={[
            styles.input, 
            styles.textArea, 
            { 
              backgroundColor: theme.card, 
              color: theme.text, 
              borderColor: theme.border,
              textAlignVertical: 'top'
            }
          ]}
          placeholder="Enter event description"
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={(text) => handleChange('description', text)}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={[styles.label, { color: theme.text }]}>Date *</Text>
            <TouchableOpacity 
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: theme.text }}>
                {formData.date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    handleChange('date', selectedDate);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.halfWidth}>
            <Text style={[styles.label, { color: theme.text }]}>Time *</Text>
            <TouchableOpacity 
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]} 
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={{ color: theme.text }}>
                {formData.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={formData.time}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selectedTime) {
                    handleChange('time', selectedTime);
                  }
                }}
              />
            )}
          </View>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Location *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Enter event location"
          placeholderTextColor={theme.textSecondary}
          value={formData.location}
          onChangeText={(text) => handleChange('location', text)}
        />

        <Text style={[styles.label, { color: theme.text }]}>Category *</Text>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                formData.category === category && { backgroundColor: theme.primary },
                { borderColor: theme.border }
              ]}
              onPress={() => handleChange('category', category)}
            >
              <Text 
                style={[
                  styles.categoryText,
                  { color: formData.category === category ? '#fff' : theme.text }
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  changeImageText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  imageUploadButtons: {
    marginTop: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  uploadButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  orText: {
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
