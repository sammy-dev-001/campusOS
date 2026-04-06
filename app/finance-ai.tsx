/**
 * Finance AI Chat Screen
 * EduFi's Finance-focused AI assistant powered by Google Gemini
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
import { useFinance } from '../src/contexts/FinanceContext';
import { API_BASE_URL } from '../src/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend AI chat endpoint
const CHAT_API_URL = `${API_BASE_URL}/ai/chat`;

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Suggested prompts for quick access - Finance focused
const SUGGESTED_PROMPTS = [
    "How can I save more money this month?",
    "Analyze my spending patterns",
    "Tips for budgeting as a student",
    "How to reduce my expenses?",
];

export default function FinanceAIScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const { transactions, budgets } = useFinance();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your personal finance AI assistant. 💰\n\nI can help you with:\n• Analyzing your spending patterns\n• Budget tips and advice\n• Saving strategies\n• Financial planning\n\nHow can I help you manage your money today?",
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Build context about user's finances for AI
    const buildFinanceContext = () => {
        const safeTransactions = transactions || [];
        const safeBudgets = budgets || [];

        const recentTransactions = safeTransactions.slice(0, 10);
        const totalSpent = safeTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
        const totalIncome = safeTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const balance = totalIncome - totalSpent;

        // Get spending by category
        const categorySpending: Record<string, number> = {};
        safeTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const cat = t.category || 'Other';
                categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(t.amount || 0);
            });

        return `
User's Financial Data:
- Current Balance: ₦${balance.toLocaleString()}
- Total Income (recent): ₦${totalIncome.toLocaleString()}
- Total Expenses (recent): ₦${totalSpent.toLocaleString()}
- Active budgets: ${safeBudgets.length}
- Spending by category: ${Object.entries(categorySpending).map(([cat, amt]) => `${cat}: ₦${amt.toLocaleString()}`).join(', ') || 'No data'}
- Recent transactions: ${recentTransactions.length > 0
                ? recentTransactions.map(t => `${t.category || 'Unknown'}: ₦${Math.abs(t.amount) || 0}`).join(', ')
                : 'No recent transactions'}
        `.trim();
    };

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
            const authData = await AsyncStorage.getItem('authData');
            const token = authData ? JSON.parse(authData).token : null;

            const financeContext = buildFinanceContext();

            // Finance-focused system prompt to guide the AI
            const systemPrompt = `You are a helpful AI financial advisor for Nigerian university students using the EduFi app.
 
Your role:
- Analyze spending patterns and give personalized advice
- Help with budgeting and saving strategies
- Provide practical financial tips for students
- Answer questions about money management

Your personality:
- Supportive and non-judgmental about finances
- Use Nigerian Naira (₦) for all amounts
- Keep responses concise (2-3 paragraphs max)
- Give actionable, practical advice
- Use emojis sparingly 💰

${financeContext}

Important: Base your advice on the user's actual financial data shown above. Be specific about their spending and suggest improvements.`;

            // Prepare history for backend
            const history = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            // Add system prompt as the core instruction by prepending it 
            // or sending it as a message if the backend supports it.
            // In our backend aiService, it uses its own system prompt for Campus Buddy,
            // but we can pass our custom prompt as the first message or combine it.
            const fullMessage = `${systemPrompt}\n\nUser Question: ${text}`;

            const response = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: fullMessage,
                    history: history.slice(1) // Remove the first assistant message from history
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to get AI response');
            }

            const data = await response.json();
            const aiResponse = data.data?.response ||
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
            setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userMessage : styles.assistantMessage,
            ]}>
                {!isUser && (
                    <View style={[styles.avatar, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="wallet" size={16} color="#fff" />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isUser
                        ? { backgroundColor: '#4CAF50' }
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
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Finance AI</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Your Money Advisor</Text>
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

                {/* Suggested Prompts */}
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

                {/* Loading */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#4CAF50" />
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                            Analyzing...
                        </Text>
                    </View>
                )}

                {/* Input */}
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                        placeholder="Ask about your finances..."
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
                            { backgroundColor: inputText.trim() && !isLoading ? '#4CAF50' : theme.border },
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
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: { padding: 4 },
    headerCenter: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    headerSubtitle: { fontSize: 12, marginTop: 2 },
    onlineIndicator: { width: 10, height: 10, borderRadius: 5 },
    messagesList: { padding: 16, paddingBottom: 8 },
    messageContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    userMessage: { justifyContent: 'flex-end' },
    assistantMessage: { justifyContent: 'flex-start' },
    avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
    messageText: { fontSize: 15, lineHeight: 22 },
    suggestedContainer: { paddingHorizontal: 16, paddingBottom: 12 },
    suggestedTitle: { fontSize: 13, marginBottom: 8 },
    suggestedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    suggestedChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
    suggestedText: { fontSize: 13 },
    loadingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    loadingText: { marginLeft: 8, fontSize: 13 },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
    input: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
    sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
