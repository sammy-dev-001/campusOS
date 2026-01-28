/**
 * AI Buddy Chat Screen
 * EduFi's AI assistant powered by Google Gemini
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/NewThemeContext';
import { EduFiColors } from '../src/theme/edufi';
import { getGeminiApiKey } from '../src/services/geminiCategorization';

// Gemini API endpoint - using 1.5-flash for better free tier availability
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Suggested prompts for quick access - Multi-modal (Academic + Finance + Life)
const SUGGESTED_PROMPTS = [
    "Summarize this PDF",
    "How much did I spend this week?",
    "Quiz me on BIO 101",
    "Create a budget for ₦5k",
];

export default function AIBuddyScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm Eddy, your personal student companion. 🎓\n\nI can help you with:\n• 📚 Explaining complex topics & PDFs\n• 💰 Tracking expenses & budgets\n• 🗓️ Planning study schedules\n• 🧠 Mental health & motivation\n\nWhat would you like help with today?",
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Send message to Gemini
    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const apiKey = await getGeminiApiKey();
            if (!apiKey) {
                throw new Error('AI is not configured. Please add your Gemini API key in Settings.');
            }

            // Multi-modal system prompt (Academic + Finance + Life)
            const systemPrompt = `You are Eddy, a friendly and knowledgeable AI student companion for Nigerian university students using the EduFi app. 

Your role:
- Help students with study tips, learning strategies, and explaining complex topics
- Assist with financial tracking, budgeting, and money management advice
- Provide mental health support, motivation, and wellness tips
- Help with time management, schedules, and productivity
- Offer course selection and career guidance

Your personality:
- Warm, encouraging, and patient like a friendly peer mentor
- Break down complex topics into digestible parts
- Use examples relevant to Nigerian students when possible
- Keep responses concise (2-3 paragraphs max)
- Use **bold text** for key terms and bullet points for lists
- Use emojis sparingly for friendliness 📚💰🧠

Important: You handle ACADEMICS, FINANCE, and WELLNESS. Be helpful across all these domains.`;

            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        { role: 'model', parts: [{ text: 'Understood! I am Eddy, ready to help with academic guidance.' }] },
                        ...messages.slice(1).map(m => ({
                            role: m.role === 'user' ? 'user' : 'model',
                            parts: [{ text: m.content }],
                        })),
                        { role: 'user', parts: [{ text: text }] },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Failed to get AI response');
            }

            const data = await response.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                "I'm sorry, I couldn't process that. Please try again.";

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send message');
            // Remove the user message if failed
            setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        } finally {
            setIsLoading(false);
        }
    };

    // Render a single message
    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userMessage : styles.assistantMessage,
            ]}>
                {!isUser && (
                    <View style={[styles.avatar, { backgroundColor: EduFiColors.primary }]}>
                        <Ionicons name="sparkles" size={16} color="#fff" />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isUser
                        ? { backgroundColor: EduFiColors.primary }
                        : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
                ]}>
                    <Text style={[
                        styles.messageText,
                        { color: isUser ? '#fff' : theme.text },
                    ]}>
                        {item.content}
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
                {/* Header */}
                <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Eddy</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Your Student Companion</Text>
                    </View>
                    <View style={[styles.onlineIndicator, { backgroundColor: '#4CAF50' }]} />
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    onLayout={() => flatListRef.current?.scrollToEnd()}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />

                {/* Suggested Prompts (show only at start) */}
                {messages.length <= 1 && (
                    <View style={styles.suggestedContainer}>
                        <Text style={[styles.suggestedTitle, { color: theme.textSecondary }]}>
                            Try asking:
                        </Text>
                        <View style={styles.suggestedList}>
                            {SUGGESTED_PROMPTS.map((prompt, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.suggestedChip, { borderColor: theme.border }]}
                                    onPress={() => sendMessage(prompt)}
                                >
                                    <Text style={[styles.suggestedText, { color: theme.text }]}>
                                        {prompt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Loading Indicator */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={EduFiColors.primary} />
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                            Thinking...
                        </Text>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={() => Alert.alert('Attach File', 'File attachment coming soon!')}
                    >
                        <Ionicons name="attach" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                        placeholder="Ask about studies, money, or life..."
                        placeholderTextColor={theme.textSecondary}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        editable={!isLoading}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { backgroundColor: inputText.trim() && !isLoading ? EduFiColors.primary : theme.border },
                        ]}
                        onPress={() => sendMessage(inputText)}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    onlineIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    userMessage: {
        justifyContent: 'flex-end',
    },
    assistantMessage: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    suggestedContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    suggestedTitle: {
        fontSize: 13,
        marginBottom: 8,
    },
    suggestedList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestedChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    suggestedText: {
        fontSize: 13,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 13,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
    },
    attachButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
