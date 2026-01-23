/**
 * QuickAddInput Component
 * WhatsApp-style chat input for natural language transaction entry
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Keyboard,
    Platform,
    Animated,
    Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseTransactionString, formatNaira, getCategoryEmoji, ParsedTransaction } from '../../src/utils/transactionParser';

interface QuickAddInputProps {
    onTransactionParsed?: (transaction: ParsedTransaction) => void;
    onTransactionSaved?: (transaction: ParsedTransaction) => void;
    placeholder?: string;
    theme?: {
        background: string;
        card: string;
        text: string;
        textSecondary: string;
        primary: string;
        border: string;
    };
    bottomOffset?: number;
    variant?: 'sticky' | 'inline';
    label?: string;
}

const QuickAddInput: React.FC<QuickAddInputProps> = ({
    onTransactionParsed,
    onTransactionSaved,
    placeholder = 'e.g., Rice and chicken 2500',
    theme = {
        background: '#121212',
        card: '#1E1E1E',
        text: '#FFFFFF',
        textSecondary: '#888888',
        primary: '#4CAF50',
        border: '#333333',
    },
    bottomOffset = 0,
    variant = 'sticky',
    label,
}) => {
    const [inputText, setInputText] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTranslateY = useRef(new Animated.Value(20)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    // Show toast notification
    const showToastNotification = (message: string, error = false) => {
        setToastMessage(message);
        setIsError(error);
        setShowToast(true);

        // Animate in
        Animated.parallel([
            Animated.timing(toastOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(toastTranslateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Hide after 2.5s
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(toastTranslateY, {
                    toValue: 20,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => setShowToast(false));
        }, 2500);
    };

    // Handle send/submit
    const handleSubmit = () => {
        if (!inputText.trim()) return;

        const transaction = parseTransactionString(inputText);

        if (!transaction) {
            showToastNotification('❌ Could not parse. Try: "Rice 2500"', true);
            return;
        }

        console.log('[QuickAddInput] Parsed transaction:', transaction);

        // Callback for parsed transaction
        if (onTransactionParsed) {
            onTransactionParsed(transaction);
        }

        // Show success toast
        const emoji = getCategoryEmoji(transaction.category);
        showToastNotification(
            `${emoji} Saved ${formatNaira(transaction.amount)} for ${transaction.category}`
        );

        // Callback for saved transaction
        if (onTransactionSaved) {
            onTransactionSaved(transaction);
        }

        // Clear input
        setInputText('');
        Keyboard.dismiss();
    };

    // Calculate effective bottom padding
    // If keyboard is visible, use 8 (minimal padding)
    // If not, use bottomOffset + safe area
    const effectivePaddingBottom = variant === 'inline'
        ? 12
        : (keyboardVisible ? 8 : Math.max(insets.bottom, 0) + bottomOffset);

    // Inline styles for card-like appearance
    const containerStyle = variant === 'inline' ? {
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: 'transparent',
    } : {
        borderTopColor: theme.border,
        backgroundColor: theme.card,
    };

    return (
        <>
            {/* Toast Notification */}
            {showToast && (
                <Animated.View
                    style={[
                        styles.toast,
                        {
                            backgroundColor: isError ? '#FF5252' : '#4CAF50',
                            opacity: toastOpacity,
                            transform: [{ translateY: toastTranslateY }],
                            bottom: 80 + insets.bottom + (keyboardVisible ? 0 : bottomOffset),
                        },
                    ]}
                >
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </Animated.View>
            )}

            {/* Input Bar */}
            <View
                style={[
                    styles.container,
                    containerStyle,
                    {
                        paddingBottom: effectivePaddingBottom,
                        flexDirection: 'column',
                        alignItems: 'stretch',
                    },
                ]}
            >
                {label && (
                    <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
                )}

                <View style={[styles.inputRow, { backgroundColor: theme.card, borderRadius: 30, paddingHorizontal: 8, paddingVertical: 8 }]}>
                    {/* Attachment Icon */}
                    <TouchableOpacity style={{ marginRight: 6 }}>
                        <Ionicons name="attach" size={22} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {/* Input Field */}
                    <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderWidth: 0, paddingHorizontal: 10 }]}>
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: theme.text }]}
                            placeholder={placeholder}
                            placeholderTextColor={theme.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={handleSubmit}
                            returnKeyType="send"
                            blurOnSubmit={false}
                            multiline={false}
                        />
                    </View>

                    {/* Send Button */}
                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={handleSubmit}
                        disabled={!inputText.trim()}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="send"
                            size={20}
                            color={inputText.trim() ? theme.primary : theme.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingTop: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        alignSelf: 'flex-start',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 10,
        minHeight: 40,
        maxHeight: 100,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    toast: {
        position: 'absolute',
        left: 20,
        right: 20,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default QuickAddInput;
