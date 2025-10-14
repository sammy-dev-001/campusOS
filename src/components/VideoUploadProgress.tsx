import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/NewThemeContext';

interface VideoUploadProgressProps {
  uri: string;
  progress: number;
  error?: string;
  onRetry?: () => void;
  onRemove?: () => void;
}

export const VideoUploadProgress: React.FC<VideoUploadProgressProps> = ({
  uri,
  progress,
  error,
  onRetry,
  onRemove,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.7)),
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const progressWidth = progress + '%';
  const isComplete = progress >= 100;
  const isError = !!error;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.videoContainer}>
        <Video
          source={{ uri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          isMuted
          shouldPlay={!isError}
        />
        
        {isError ? (
          <View style={[styles.overlay, styles.errorOverlay]}>
            <Ionicons name="warning" size={32} color="#fff" />
            <Text style={styles.errorText}>Upload Failed</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <View style={styles.buttonRow}>
              <Ionicons
                name="refresh"
                size={24}
                color="#fff"
                onPress={onRetry}
                style={styles.iconButton}
              />
              <Ionicons
                name="trash"
                size={24}
                color="#fff"
                onPress={onRemove}
                style={styles.iconButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.overlay}>
            {!isComplete && (
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
            )}
            {isComplete && (
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            )}
          </View>
        )}
      </View>

      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: isError ? '#ff4444' : theme.primary,
            },
          ]}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.filename, { color: theme.text }]} numberOfLines={1}>
          {uri.split('/').pop()}
        </Text>
        <Text style={[styles.status, { color: theme.textSecondary }]}>
          {isError ? 'Failed' : isComplete ? 'Uploaded' : 'Uploading...'}
        </Text>
      </View>

      {!isError && (
        <Ionicons
          name="close"
          size={20}
          color={theme.textSecondary}
          style={styles.closeButton}
          onPress={onRemove}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    padding: 16,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  progressBar: {
    height: 4,
    width: '100%',
  },
  infoContainer: {
    padding: 12,
    paddingRight: 36,
  },
  filename: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  iconButton: {
    padding: 8,
    marginHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
});
