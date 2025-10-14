import React from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    TouchableOpacityProps,
    View,
    ViewStyle,
} from 'react-native';
import { useTheme } from '../../src/contexts/NewThemeContext';

interface CardProps extends TouchableOpacityProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  style?: ViewStyle;
  children: React.ReactNode;
  onPress?: () => void;
}

export function Card({
  variant = 'elevated',
  style,
  children,
  onPress,
  ...props
}: CardProps) {
  const { isDark } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'filled':
        return isDark ? '#2c2c2c' : '#f5f5f5';
      default:
        return isDark ? '#1a1a1a' : '#ffffff';
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'outlined':
        return isDark ? '#333' : '#e0e0e0';
      default:
        return 'transparent';
    }
  };

  const getElevation = () => {
    switch (variant) {
      case 'elevated':
        return {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.84,
          elevation: 5,
        };
      default:
        return {};
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          ...getElevation(),
        },
        style,
      ]}
      onPress={onPress}
      {...props}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
}); 