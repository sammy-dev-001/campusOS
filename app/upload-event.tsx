import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { API_BASE_URL } from '../config/api';

type ImageAsset = {
  uri: string;
  width?: number;
  height?: number;
  type?: string;
  fileName?: string | null;
  fileSize?: number | null;
  base64?: string | null;
  duration?: number | null;
  exif?: Record<string, any> | null;
};

const categories = ['Social', 'Academic', 'Religious', 'Sports'];

export default function UploadEventScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type || 'image',
        fileName: asset.fileName || null,
        fileSize: asset.fileSize || null,
        base64: asset.base64 || null,
        duration: 'duration' in asset ? (asset as any).duration : null,
        exif: asset.exif || null
      });
    }
  };

  const handleSubmit = async () => {
    setUploading(true);
    setError('');
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('date', date);
      formData.append('time', time);
      formData.append('location', location);
      formData.append('category', category);
      formData.append('isFeatured', isFeatured ? '1' : '0');
      if (image) {
        const imageUriParts = image.uri.split('.');
        const fileType = imageUriParts[imageUriParts.length - 1];
        
        const imageFile = {
          uri: image.uri,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        } as unknown as Blob;
        
        formData.append('image', imageFile);
      }
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload event');
      setSuccess(true);
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setLocation('');
      setCategory(categories[0]);
      setIsFeatured(false);
      setImage(null);
      // Navigate to events page after successful upload
      router.replace('/events');
    } catch (err: any) {
      setError(err.message || 'Error uploading event');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Upload New Event</Text>
        {success && <Text style={styles.success}>Event uploaded successfully!</Text>}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Date (e.g. Saturday, October 26)"
          placeholderTextColor="#888"
          value={date}
          onChangeText={setDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Time (e.g. 6:00 PM - 9:00 PM)"
          placeholderTextColor="#888"
          value={time}
          onChangeText={setTime}
        />
        <TextInput
          style={styles.input}
          placeholder="Location"
          placeholderTextColor="#888"
          value={location}
          onChangeText={setLocation}
        />
        <View style={styles.row}>
          <Text style={styles.label}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catButton, category === cat && styles.catButtonActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catButtonText, category === cat && styles.catButtonTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Featured:</Text>
          <Switch
            value={isFeatured}
            onValueChange={setIsFeatured}
            thumbColor={isFeatured ? '#007AFF' : '#888'}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
          />
        </View>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Text style={styles.imagePickerText}>{image ? 'Change Image' : 'Pick Event Image'}</Text>
        </TouchableOpacity>
        {image && (
          <View style={{ width: '100%', height: 220, backgroundColor: '#222', borderRadius: 10, marginBottom: 14, marginTop: -4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Image
              source={{ uri: image.uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
        )}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Upload Event</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    padding: 24,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  catButton: {
    backgroundColor: '#222',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  catButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  catButtonText: {
    color: '#fff',
    fontSize: 15,
  },
  catButtonTextActive: {
    color: '#121212',
    fontWeight: 'bold',
  },
  imagePicker: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  imagePickerText: {
    color: '#fff',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 14,
    marginTop: -4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  success: {
    color: '#4BB543',
    fontSize: 16,
    marginBottom: 10,
    alignSelf: 'center',
  },
  error: {
    color: 'red',
    fontSize: 15,
    marginBottom: 10,
    alignSelf: 'center',
  },
}); 