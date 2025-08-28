import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface MediaViewerProps {
  visible: boolean;
  onClose: () => void;
  mediaUri: string;
  mediaType: 'image' | 'video';
}

export default function MediaViewer({ visible, onClose, mediaUri, mediaType }: MediaViewerProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={32} color="white" />
        </TouchableOpacity>

        {mediaUri && mediaType === 'image' ? (
          <Image source={{ uri: mediaUri }} style={styles.media} resizeMode="contain" />
        ) : mediaUri && mediaType === 'video' ? (
          <Video
            source={{ uri: mediaUri }}
            style={styles.media}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  media: {
    width: '100%',
    height: '100%',
  },
}); 