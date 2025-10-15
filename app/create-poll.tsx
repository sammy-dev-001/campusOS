import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { createPoll } from '../services/pollService';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/NewThemeContext';
import { eventBus } from '../src/utils/eventBus';
import { getAuthToken } from '../utils/auth';

export default function CreatePollScreen() {
  const router = useRouter();
  const { isDark, theme } = useTheme();
  
  // Get the appropriate theme colors based on the current theme
  const themeColors = isDark ? {
    background: '#121212',
    text: '#FFFFFF',
    primary: '#BB86FC',
    secondary: '#03DAC6',
    border: '#333333',
    card: '#1E1E1E',
  } : {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#6200EE',
    secondary: '#03DAC6',
    border: '#E0E0E0',
    card: '#F5F5F5',
  };
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    setOptions([...options, '']);
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return; // Keep at least 2 options
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Filter out empty options
      const validOptions = options
        .map(opt => opt.trim())
        .filter(opt => opt !== '');
      
      if (!question.trim() || validOptions.length < 2) {
        throw new Error('Please provide a question and at least 2 options');
      }
      
      // Create poll data with default expiration (7 days from now)
      const defaultExpiration = new Date();
      defaultExpiration.setDate(defaultExpiration.getDate() + 7);
      
      const pollData = {
        question: question.trim(),
        options: validOptions,
        expiresAt: endDate.trim() ? new Date(endDate.trim()) : defaultExpiration,
        isMultipleChoice: false, // Default to single choice for now
        createdBy: String(user?.id || 'anonymous'), // Ensure createdBy is a string
      };
      
      // Ensure expiresAt is a valid Date
      if (isNaN(pollData.expiresAt.getTime())) {
        throw new Error('Invalid expiration date');
      }
      
      // Ensure we have a token and set axios default header if available
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication required', 'Please log in to create a poll.');
        setIsSubmitting(false);
        return;
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  // Call the poll service
  const created = await createPoll(pollData);

  // Emit the created poll for optimistic insertion and navigate back
  try { eventBus.emit('poll:created', created); } catch (e) { /* ignore */ }

  Alert.alert('Success', 'Poll created successfully!');
  router.replace('/polls?refresh=1');
      
    } catch (error: any) {
      console.error('Error creating poll:', error);
      Alert.alert('Error', error?.message || 'Failed to create poll. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen 
        options={{
          title: 'Create Poll',
          headerShown: true,
          headerTransparent: false,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerTitleStyle: {
            color: themeColors.text,
            fontSize: 17,
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            paddingTop: Platform.OS === 'ios' ? 44 : 0,
          },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleCreatePoll}
              disabled={isSubmitting || !question.trim() || options.filter(opt => opt.trim() !== '').length < 2}
              style={styles.headerButton}
            >
              <ThemedText 
                style={[
                  styles.createButton, 
                  { 
                    color: (isSubmitting || !question.trim() || options.filter(opt => opt.trim() !== '').length < 2) 
                      ? themeColors.secondary 
                      : themeColors.primary,
                    fontWeight: '600',
                    fontSize: 17,
                  }
                ]}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </ThemedText>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Question</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Ask a question..."
            placeholderTextColor={theme.secondary}
            value={question}
            onChangeText={setQuestion}
            multiline
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Options</ThemedText>
          {options.map((option, index) => (
            <View key={index} style={[styles.optionContainer, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.optionInput, { color: theme.text }]}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={theme.secondary}
                value={option}
                onChangeText={(text) => updateOption(index, text)}
              />
              {options.length > 2 && (
                <TouchableOpacity 
                  onPress={() => removeOption(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={20} color={theme.secondary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          <TouchableOpacity 
            style={[styles.addButton, { borderColor: theme.border }]}
            onPress={addOption}
          >
            <Ionicons name="add" size={20} color={theme.primary} />
            <ThemedText style={[styles.addButtonText, { color: theme.primary }]}>
              Add Option
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>End Date (Optional)</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.secondary}
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  optionInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  removeButton: {
    padding: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  addButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  createButton: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 16,
  },
});
