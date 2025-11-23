import React, { useState, useEffect, useRef } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

type CameraModalProps = {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
  type: 'selfie' | 'id';
};

export default function CameraModal({ visible, onClose, onCapture, type }: CameraModalProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
        });
        onCapture(photo.uri);
        onClose();
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  const toggleCameraType = () => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={type === 'selfie' ? 'front' : cameraFacing}
          ratio="16:9"
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
            
            <View style={styles.bottomButtons}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={toggleCameraType}
                disabled={type === 'selfie'}
              >
                <Ionicons name="camera-reverse" size={32} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <View style={{ width: 40 }} /> {/* Spacer for layout */}
            </View>
          </View>
          
          <View style={styles.overlay}>
            {type === 'id' && (
              <View style={styles.idFrame}>
                <Text style={styles.instructionText}>Position ID within frame</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idFrame: {
    width: '90%',
    aspectRatio: 1.6, // Standard ID aspect ratio
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
});
