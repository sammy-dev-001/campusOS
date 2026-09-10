/**
 * AI Buddy Chat Screen
 * EduFi's AI assistant powered by Google Gemini
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Animated,
    Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useTheme } from '../src/contexts/NewThemeContext';
import { EduFiColors } from '../src/theme/edufi';
import { api } from '../src/contexts/AuthContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const CATEGORIES = ['📚 Study', '💰 Finance', '🧠 Wellness'];
const PROMPTS = {
    '📚 Study': [
        "Summarize my last lecture notes",
        "Create a study schedule for finals",
        "Quiz me on BIO 101",
        "How to avoid procrastination?"
    ],
    '💰 Finance': [
        "Create a ₦10k weekly budget",
        "How can I save money on food?",
        "Tips for student side hustles",
        "Explain compound interest"
    ],
    '🧠 Wellness': [
        "I feel overwhelmed with assignments",
        "Quick 5-min relaxation exercise",
        "How to balance social life and academics?",
        "Healthy eating tips on a budget"
    ]
};

const INITIAL_MESSAGE: Message = {
    id: '1',
    role: 'assistant',
    content: "Hi! I'm Eddy, your super friendly AI student companion. ✨\n\nI can help you with:\n• **Academics**: Explaining concepts & study guides\n• **Finance**: Budgeting & expense tracking\n• **Wellness**: Motivation & mental health\n\nWhat would you like to focus on today?",
    timestamp: new Date(),
};

// --- Custom Markdown Parser ---
const parseMarkdown = (text: string, color: string) => {
    // A simple parser for bold (**text**) and lists (- or •)
    const lines = text.split('\n');
    return lines.map((line, index) => {
        let isListItem = false;
        let content = line;

        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
            isListItem = true;
            content = '• ' + line.replace(/^[-•]\s*/, '');
        }

        // Handle Bold (**text**)
        const parts = content.split(/(\*\*.*?\*\*)/g);
        
        return (
            <Text key={index} style={[styles.messageText, { color }, isListItem && styles.markdownListItem]}>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                            <Text key={i} style={{ fontWeight: 'bold' }}>
                                {part.slice(2, -2)}
                            </Text>
                        );
                    }
                    return <Text key={i}>{part}</Text>;
                })}
            </Text>
        );
    });
};

// --- Typing Indicator Component ---
const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (val: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(val, { toValue: -5, duration: 300, easing: Easing.ease, useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration: 300, easing: Easing.ease, useNativeDriver: true }),
                    Animated.delay(400),
                ])
            ).start();
        };
        animate(dot1, 0);
        animate(dot2, 150);
        animate(dot3, 300);
    }, []);

    return (
        <View style={styles.typingContainer}>
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
    );
};


export default function AIBuddyScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const saved = await AsyncStorage.getItem('@eddy_chat_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                // convert string timestamps back to Date
                const withDates = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
                setMessages(withDates);
            }
        } catch (e) {
            console.error('Failed to load chat history', e);
        }
    };

    const saveHistory = async (newMessages: Message[]) => {
        try {
            await AsyncStorage.setItem('@eddy_chat_history', JSON.stringify(newMessages));
        } catch (e) {
            console.error('Failed to save chat history', e);
        }
    };

    const clearChat = () => {
        Alert.alert('Clear Chat', 'Are you sure you want to clear your conversation with Eddy?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Clear', 
                style: 'destructive',
                onPress: () => {
                    const reset = [INITIAL_MESSAGE];
                    setMessages(reset);
                    saveHistory(reset);
                }
            }
        ]);
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        // Optional: show a small toast or just rely on OS clipboard notification
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        saveHistory(updatedMessages);
        setInputText('');
        setIsLoading(true);

        // Scroll to bottom immediately
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        try {
            const response = await api.post('/v1/ai/eddy', {
                message: text,
                history: messages.slice(1).map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            });

            const data = response.data;
            const aiResponse = data.data?.response || "I'm sorry, I couldn't process that. Please try again.";

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);
            saveHistory(finalMessages);
        } catch (error: any) {
            const errMessage = error.response?.data?.message || error.message || 'Failed to send message';
            Alert.alert('Error', errMessage);
            // Revert user message on fail
            const reverted = updatedMessages.filter(m => m.id !== userMessage.id);
            setMessages(reverted);
            saveHistory(reverted);
        } finally {
            setIsLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
                {!isUser && (
                    <Image 
                        source={require('../assets/images/eddy_avatar.jpg')} 
                        style={styles.avatarImage} 
                        contentFit="cover"
                        transition={200}
                    />
                )}
                <View style={{ flex: 1, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <TouchableOpacity 
                        onLongPress={() => copyToClipboard(item.content)}
                        delayLongPress={500}
                        activeOpacity={0.8}
                        style={[
                            styles.messageBubble,
                            isUser ? styles.userBubble : [styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.border }]
                        ]}
                    >
                        {parseMarkdown(item.content, isUser ? '#fff' : theme.text)}
                    </TouchableOpacity>
                    <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Premium Header */}
                <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    
                    <View style={styles.headerTitleContainer}>
                        <Image 
                            source={require('../assets/images/eddy_avatar.jpg')} 
                            style={styles.headerAvatar} 
                        />
                        <View style={styles.headerCenter}>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Eddy</Text>
                            <View style={styles.onlineContainer}>
                                <View style={styles.onlineIndicator} />
                                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Online</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
                        <Ionicons name="trash-outline" size={22} color={EduFiColors.error || '#F44336'} />
                    </TouchableOpacity>
                </View>

                {/* Messages List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />

                {/* Typing Indicator */}
                {isLoading && (
                    <View style={styles.loadingWrapper}>
                        <Image 
                            source={require('../assets/images/eddy_avatar.jpg')} 
                            style={styles.avatarImage} 
                        />
                        <View style={[styles.assistantBubble, styles.typingBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <TypingIndicator />
                        </View>
                    </View>
                )}

                {/* Suggestions Box (Only when no user history) */}
                {messages.length <= 1 && (
                    <View style={[styles.suggestedContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                        <View style={styles.tabContainer}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity 
                                    key={cat} 
                                    style={[styles.tab, activeCategory === cat && { backgroundColor: EduFiColors.primary }]}
                                    onPress={() => setActiveCategory(cat)}
                                >
                                    <Text style={[styles.tabText, activeCategory === cat ? { color: '#fff' } : { color: theme.textSecondary }]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.promptGrid}>
                            {(PROMPTS as any)[activeCategory].map((prompt: string, i: number) => (
                                <TouchableOpacity 
                                    key={i} 
                                    style={[styles.promptCard, { borderColor: theme.border, backgroundColor: theme.background }]}
                                    onPress={() => sendMessage(prompt)}
                                >
                                    <Text style={[styles.promptText, { color: theme.text }]} numberOfLines={2}>"{prompt}"</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                    <TouchableOpacity style={styles.attachButton} onPress={() => Alert.alert('Attach File', 'Coming soon!')}>
                        <Ionicons name="add-circle-outline" size={28} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                        placeholder="Ask Eddy anything..."
                        placeholderTextColor={theme.textSecondary}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={1000}
                        editable={!isLoading}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: inputText.trim() && !isLoading ? EduFiColors.primary : theme.border }]}
                        onPress={() => sendMessage(inputText)}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Ionicons name="arrow-up" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    backButton: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    headerCenter: {
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    onlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    onlineIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        marginRight: 4,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    clearButton: {
        padding: 8,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 20,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'flex-end',
    },
    userMessage: {
        justifyContent: 'flex-end',
    },
    assistantMessage: {
        justifyContent: 'flex-start',
    },
    avatarImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
        marginBottom: 16,
    },
    messageBubble: {
        maxWidth: '85%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    userBubble: {
        backgroundColor: EduFiColors.primary,
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        borderWidth: 1,
        borderBottomLeftRadius: 4,
    },
    markdownLine: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    markdownListItem: {
        paddingLeft: 8,
        marginVertical: 2,
    },
    bullet: {
        fontSize: 16,
        lineHeight: 24,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 24,
    },
    timestamp: {
        fontSize: 11,
        marginTop: 4,
        paddingHorizontal: 4,
    },
    loadingWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    typingBubble: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#888',
        marginHorizontal: 2,
    },
    suggestedContainer: {
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderTopWidth: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    promptGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    promptCard: {
        width: '48%',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
    },
    promptText: {
        fontSize: 13,
        lineHeight: 18,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    attachButton: {
        padding: 8,
        marginRight: 4,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 15,
        lineHeight: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        marginBottom: 2,
    },
});
