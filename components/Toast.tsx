/**
 * Toast Notification Component
 * Provides non-intrusive feedback messages for success, error, warning, and info states
 */

import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EduFiColors } from '../src/theme/edufi';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
    message: string;
    type?: ToastType;
    duration?: number;
    action?: {
        label: string;
        onPress: () => void;
    };
}

interface ToastContextType {
    showToast: (config: ToastConfig) => void;
    hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toast, setToast] = useState<ToastConfig | null>(null);
    const [visible, setVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const insets = useSafeAreaInsets();

    const hideToast = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
            setToast(null);
        });
    }, [slideAnim]);

    const showToast = useCallback((config: ToastConfig) => {
        setToast(config);
        setVisible(true);

        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
        }).start();

        // Auto-hide after duration
        const duration = config.duration || 3000;
        setTimeout(() => {
            hideToast();
        }, duration);
    }, [slideAnim, hideToast]);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            {visible && toast && (
                <ToastComponent
                    toast={toast}
                    slideAnim={slideAnim}
                    insetTop={insets.top}
                    onDismiss={hideToast}
                />
            )}
        </ToastContext.Provider>
    );
}

interface ToastComponentProps {
    toast: ToastConfig;
    slideAnim: Animated.Value;
    insetTop: number;
    onDismiss: () => void;
}

function ToastComponent({ toast, slideAnim, insetTop, onDismiss }: ToastComponentProps) {
    const type = toast.type || 'info';
    const config = getToastConfig(type);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insetTop + 10,
                    backgroundColor: config.backgroundColor,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.content}>
                <Ionicons name={config.icon} size={20} color={config.iconColor} />
                <Text style={[styles.message, { color: config.textColor }]} numberOfLines={2}>
                    {toast.message}
                </Text>
            </View>

            {toast.action && (
                <TouchableOpacity style={styles.actionButton} onPress={toast.action.onPress}>
                    <Text style={[styles.actionText, { color: config.iconColor }]}>
                        {toast.action.label}
                    </Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
                <Ionicons name="close" size={18} color={config.textColor} />
            </TouchableOpacity>
        </Animated.View>
    );
}

function getToastConfig(type: ToastType) {
    switch (type) {
        case 'success':
            return {
                backgroundColor: '#E8F5E9',
                iconColor: EduFiColors.success,
                textColor: '#1B5E20',
                icon: 'checkmark-circle' as const,
            };
        case 'error':
            return {
                backgroundColor: '#FFEBEE',
                iconColor: EduFiColors.error,
                textColor: '#B71C1C',
                icon: 'alert-circle' as const,
            };
        case 'warning':
            return {
                backgroundColor: '#FFF3E0',
                iconColor: EduFiColors.warning,
                textColor: '#E65100',
                icon: 'warning' as const,
            };
        case 'info':
        default:
            return {
                backgroundColor: '#E3F2FD',
                iconColor: EduFiColors.primary,
                textColor: '#0D47A1',
                icon: 'information-circle' as const,
            };
    }
}

// Standalone helper functions for quick toast display
export const toast = {
    success: (message: string) => ({ message, type: 'success' as const }),
    error: (message: string) => ({ message, type: 'error' as const }),
    warning: (message: string) => ({ message, type: 'warning' as const }),
    info: (message: string) => ({ message, type: 'info' as const }),
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 9999,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    message: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '500',
    },
    actionButton: {
        marginLeft: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        marginLeft: 8,
        padding: 4,
    },
});

export default ToastProvider;
