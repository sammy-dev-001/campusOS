import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../src/contexts/NewThemeContext';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  onPress?: () => void;
}

export default function Avatar({ uri, size = 44, onPress }: AvatarProps) {
  const { theme } = useTheme();
  const avatarStyle = [
    styles.avatar,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.card,
    },
  ];
  if (uri) {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
        <Image source={{ uri }} style={avatarStyle as any} />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={avatarStyle}>
        <Ionicons name="person" size={size * 0.6} color={theme.secondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
}); 