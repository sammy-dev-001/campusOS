import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemedText } from '../ThemedText';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'secondaryButton';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  children,
  disabled,
  ...props
}: ButtonProps) {

  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return '#ccc';
    
    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return '#f2f2f2';
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'secondaryButton':
        return Colors.light.secondary;
      default:
        return theme.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#999';
    
    switch (variant) {
      case 'primary':
      case 'secondaryButton':
        return '#fff';
      case 'secondary':
        return '#000';
      case 'outline':
      case 'ghost':
        return theme.primary;
      default:
        return '#fff';
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#ccc';
    
    switch (variant) {
      case 'outline':
        return theme.primary;
      default:
        return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 6, paddingHorizontal: 12 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 24 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 16 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          width: fullWidth ? '100%' : 'auto',
          ...getPadding(),
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {leftIcon}

         <ThemedText
  style={[
    styles.text,
    {
      color: getTextColor(),
      fontSize: getFontSize(),
      marginLeft: leftIcon ? 8 : 0,
      marginRight: rightIcon ? 8 : 0,
    },
    textStyle,
  ]}
  type="defaultSemiBold"
>
  {typeof children === 'string' || typeof children === 'number' ? children : null}
</ThemedText>

         {rightIcon}

        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});