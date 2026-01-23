/**
 * KeyboardSafeWrapper Component
 * A reusable wrapper that handles keyboard avoiding behavior across iOS and Android
 * Prevents soft keyboard from covering input fields
 */

import React, { ReactNode } from 'react';
import {
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
    StyleSheet,
    ViewStyle,
    ScrollView,
    View,
    StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardSafeWrapperProps {
    children: ReactNode;
    /** Additional offset from the keyboard (useful for screens with custom headers) */
    keyboardVerticalOffset?: number;
    /** Whether to wrap content in a ScrollView */
    scrollable?: boolean;
    /** Whether to dismiss keyboard on tap outside input */
    dismissOnTap?: boolean;
    /** Container style */
    style?: StyleProp<ViewStyle>;
    /** Content container style (for ScrollView) */
    contentContainerStyle?: StyleProp<ViewStyle>;
    /** Background color */
    backgroundColor?: string;
    /** Whether to use flex: 1 on container */
    flex?: boolean;
}

/**
 * KeyboardSafeWrapper
 * 
 * Usage:
 * ```tsx
 * <KeyboardSafeWrapper scrollable dismissOnTap>
 *   <TextInput ... />
 * </KeyboardSafeWrapper>
 * ```
 * 
 * For chat screens with input at bottom:
 * ```tsx
 * <KeyboardSafeWrapper keyboardVerticalOffset={60}>
 *   <ChatMessages />
 *   <ChatInput />
 * </KeyboardSafeWrapper>
 * ```
 */
const KeyboardSafeWrapper: React.FC<KeyboardSafeWrapperProps> = ({
    children,
    keyboardVerticalOffset = 0,
    scrollable = false,
    dismissOnTap = true,
    style,
    contentContainerStyle,
    backgroundColor,
    flex = true,
}) => {
    const insets = useSafeAreaInsets();

    // Calculate the vertical offset
    // iOS: Use padding behavior with offset
    // Android: adjustResize is set in app.json, but we use height behavior for extra safety
    const calculatedOffset = Platform.select({
        ios: keyboardVerticalOffset,
        android: keyboardVerticalOffset + (Number(Platform.Version) >= 30 ? 0 : 20),
        default: keyboardVerticalOffset,
    });

    // Platform-specific behavior
    // iOS: "padding" works best and pushes content up
    // Android: "height" works with adjustResize, or undefined if adjustResize handles it
    const keyboardBehavior = Platform.select<'padding' | 'height' | 'position' | undefined>({
        ios: 'padding',
        android: 'height',
        default: undefined,
    });

    const containerStyle: StyleProp<ViewStyle> = [
        flex ? { flex: 1 } : undefined,
        backgroundColor ? { backgroundColor } : undefined,
        style,
    ];

    const renderContent = () => {
        if (scrollable) {
            return (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            );
        }
        return <View style={[styles.content, contentContainerStyle]}>{children}</View>;
    };

    const wrappedContent = dismissOnTap ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            {renderContent()}
        </TouchableWithoutFeedback>
    ) : (
        renderContent()
    );

    return (
        <KeyboardAvoidingView
            style={containerStyle}
            behavior={keyboardBehavior}
            keyboardVerticalOffset={calculatedOffset}
        >
            {wrappedContent}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
    },
});

export default KeyboardSafeWrapper;
