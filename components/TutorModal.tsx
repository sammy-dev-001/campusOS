import React, { useState } from 'react';
import { 
  Modal, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CameraModal from './CameraModal';

interface TutorModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (tutorData: {
    name: string;
    email: string;
    phone: string;
    department: string;
    courses: string;
    bio: string;
    image?: string;
  }) => Promise<void>;
}

export default function TutorModal({ visible, onClose, onSubmit }: TutorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    courses: '',
    bio: '',
    selfieUri: '',
    idPictureUri: ''
  });
  
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [activeCameraType, setActiveCameraType] = useState<'selfie' | 'id'>('selfie');
  
  const handleCapturePhoto = (uri: string, type: 'selfie' | 'id') => {
    setFormData(prev => ({
      ...prev,
      [`${type}Uri`]: uri
    }));
  };
  
  const openCamera = (type: 'selfie' | 'id') => {
    setActiveCameraType(type);
    setCameraModalVisible(true);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // Basic field validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.department.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    // Photo validation
    if (!formData.selfieUri) {
      Alert.alert('Error', 'Please take a live selfie');
      return;
    }
    
    if (!formData.idPictureUri) {
      Alert.alert('Error', 'Please take a picture of your ID');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create tutor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        courses: '',
        bio: '',
        selfieUri: '',
        idPictureUri: ''
      });
      onClose();
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Become a Tutor</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="Enter your full name"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => handleChange('phone', text)}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Department *</Text>
          <TextInput
            style={styles.input}
            value={formData.department}
            onChangeText={(text) => handleChange('department', text)}
            placeholder="Enter your department"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Courses</Text>
          <TextInput
            style={styles.input}
            value={formData.courses}
            onChangeText={(text) => handleChange('courses', text)}
            placeholder="List courses you can tutor (comma-separated)"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={formData.bio}
            onChangeText={(text) => handleChange('bio', text)}
            placeholder="Tell us about yourself and your tutoring experience"
            multiline
            numberOfLines={4}
          />
        </View>
        
        {/* Selfie Capture */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Live Selfie *</Text>
          <Text style={styles.helperText}>For identity verification</Text>
          <TouchableOpacity 
            style={styles.photoButton}
            onPress={() => openCamera('selfie')}
          >
            {formData.selfieUri ? (
              <Image 
                source={{ uri: formData.selfieUri }} 
                style={styles.photoPreview} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color="#666" />
                <Text style={styles.photoButtonText}>Take a Live Selfie</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* ID Picture Capture */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ID Picture *</Text>
          <Text style={styles.helperText}>Take a clear photo of your school ID</Text>
          <TouchableOpacity 
            style={styles.photoButton}
            onPress={() => openCamera('id')}
          >
            {formData.idPictureUri ? (
              <Image 
                source={{ uri: formData.idPictureUri }} 
                style={styles.photoPreview} 
                resizeMode="contain"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="id-card" size={32} color="#666" />
                <Text style={styles.photoButtonText}>Take Photo of ID</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
    
    {/* Camera Modal */}
      <CameraModal
        visible={cameraModalVisible}
        onClose={() => setCameraModalVisible(false)}
        onCapture={(uri) => handleCapturePhoto(uri, activeCameraType)}
        type={activeCameraType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  helperText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  photoButtonText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#555',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
