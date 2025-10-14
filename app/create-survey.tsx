import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../src/contexts/NewThemeContext';
import { lightColors, darkColors } from '../constants/Colors';

type QuestionType = 'multiple_choice' | 'text' | 'rating' | 'scale';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  description?: string;
}

export default function CreateSurveyScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const colors = isDark ? darkColors : lightColors; // Use colors object for all theming
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    { id: Date.now().toString(), text: '', type: 'multiple_choice', options: [''], required: true }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate styles with the current theme colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      padding: 16,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    header: {
      marginBottom: 24,
    },
    titleInput: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      color: colors.text,
    },
    descriptionInput: {
      fontSize: 16,
      marginBottom: 16,
      color: colors.text,
      opacity: 0.8,
    },
    questionContainer: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    questionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    questionInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    deleteButton: {
      padding: 4,
      marginLeft: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 8,
      color: colors.text,
    },
    optionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    optionBullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
      backgroundColor: colors.primary,
    },
    optionInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    removeOptionButton: {
      padding: 4,
      marginLeft: 8,
    },
    addOptionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      padding: 8,
    },
    addOptionText: {
      marginLeft: 8,
      color: colors.primary,
      fontWeight: '500',
    },
    questionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    questionTypeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 4,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    questionTypeText: {
      marginLeft: 8,
      color: colors.text,
      fontSize: 14,
    },
    requiredButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 4,
    },
    requiredText: {
      marginLeft: 4,
      color: colors.text,
      fontSize: 14,
    },
    addQuestionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 8,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addQuestionText: {
      marginLeft: 8,
      color: colors.primary,
      fontWeight: '600',
    },
    addQuestionButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
      gap: 8,
    },
    questionsContainer: {
      marginBottom: 24,
    },
    submitButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 24,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
    },
    textAnswerInput: {
      fontSize: 16,
      color: colors.textSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 8,
      marginTop: 8,
    },
  });

  const addQuestion = (type: QuestionType = 'multiple_choice') => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type,
      required: true,
    };
    
    if (type === 'multiple_choice') {
      newQuestion.options = [''];
    }
    
    setQuestions([...questions, newQuestion]);
    // Scroll to bottom after adding a new question
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...(q.options || []), ''] } 
        : q
    ));
  };

  const updateOption = (questionId: string, optionIndex: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = text;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options && q.options.length > 1) {
        const newOptions = q.options.filter((_, i) => i !== optionIndex);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Basic validation
      if (!title.trim()) {
        Alert.alert('Error', 'Please enter a survey title');
        return;
      }
      
      const validQuestions = questions.filter(q => q.text.trim() !== '');
      if (validQuestions.length === 0) {
        Alert.alert('Error', 'Please add at least one question');
        return;
      }
      
      // Validate that all multiple choice questions have at least 2 options
      for (const q of validQuestions) {
        if (q.type === 'multiple_choice' && (!q.options || q.options.filter(o => o.trim() !== '').length < 2)) {
          Alert.alert('Error', `Question "${q.text || 'Untitled'}" must have at least 2 options`);
          return;
        }
      }
      
      // TODO: Implement survey submission logic
      console.log('Creating survey:', {
        title,
        description,
        questions: validQuestions,
        createdBy: user?.id,
      });
      
      // Navigate back after successful creation
      Alert.alert('Success', 'Survey created successfully!');
      router.back();
      
    } catch (error) {
      console.error('Error creating survey:', error);
      Alert.alert('Error', 'Failed to create survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <View style={styles.questionContainer} key={question.id}>
            <View style={styles.questionHeader}>
              <TextInput
                style={[styles.questionInput, { color: colors.text }]}
                placeholder="Enter your question"
                placeholderTextColor={colors.textSecondary + '80'}
                value={question.text}
                onChangeText={(text) => updateQuestion(question.id, 'text', text)}
                multiline
              />
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => removeQuestion(question.id)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 8 }]}>
              Options
            </Text>
            
            {question.options?.map((option, idx) => (
              <View key={idx} style={styles.optionContainer}>
                <View style={[styles.optionBullet, { backgroundColor: colors.primary }]} />
                <TextInput
                  style={[styles.optionInput, { color: colors.text }]}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={option}
                  onChangeText={(text) => updateOption(question.id, idx, text)}
                />
                {question.options && question.options.length > 1 && (
                  <TouchableOpacity 
                    style={styles.removeOptionButton}
                    onPress={() => removeOption(question.id, idx)}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            <TouchableOpacity 
              style={styles.addOptionButton}
              onPress={() => addOption(question.id)}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.addOptionText, { color: colors.primary }]}>
                Add option
              </Text>
            </TouchableOpacity>
            
            <View style={styles.questionFooter}>
              <TouchableOpacity 
                style={[styles.questionTypeButton, { borderColor: colors.border }]}
                onPress={() => {
                  const newType = question.type === 'multiple_choice' ? 'text' : 'multiple_choice';
                  updateQuestion(question.id, 'type', newType);
                }}
              >
                <Ionicons name="list" size={16} color={colors.textSecondary} />
                <Text style={[styles.questionTypeText, { color: colors.text }]}>
                  Multiple Choice
                </Text>
                <Text style={[
                  styles.requiredText, 
                  { 
                    color: question.required ? colors.primary : colors.textSecondary,
                    marginLeft: 4
                  }
                ]}>
                  Required
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Create Survey',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.submitButton, { opacity: isSubmitting ? 0.5 : 1 }]}
            >
              <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </ThemedText>
            </TouchableOpacity>
          ),
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.scrollContent}>
            <TextInput
              style={[styles.titleInput, { color: colors.text }]}
              placeholder="Survey Title"
              placeholderTextColor={colors.textSecondary + '80'}
              value={title}
              onChangeText={setTitle}
            />
            
            <TextInput
              style={[styles.descriptionInput, { color: colors.textSecondary }]}
              placeholder="Survey description (optional)"
              placeholderTextColor={colors.textSecondary + '80'}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            
            <View style={styles.questionsContainer}>
              {questions.map(renderQuestion)}
            </View>
            
            <View style={styles.addQuestionButtons}>
              <TouchableOpacity 
                style={[styles.addQuestionButton, { borderColor: colors.border }]}
                onPress={() => addQuestion('multiple_choice')}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={[styles.addQuestionText, { color: colors.primary }]}>
                  Add question
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.addQuestionButton, { borderColor: colors.border }]}
                onPress={() => addQuestion('text')}
              >
                <Ionicons name="text" size={18} color={colors.primary} />
                <Text style={[styles.addQuestionText, { color: colors.primary }]}>
                  Add text question
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    padding: 0,
  },
  descriptionInput: {
    fontSize: 16,
    marginBottom: 24,
    padding: 0,
    lineHeight: 22,
  },
  questionsContainer: {
    marginBottom: 16,
  },
  questionContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 4,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionBullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    opacity: 0.5,
  },
  optionInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingRight: 32,
  },
  removeOptionButton: {
    position: 'absolute',
    right: 8,
    padding: 4,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addOptionText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  questionTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  questionTypeText: {
    marginLeft: 6,
    fontSize: 13,
  },
  requiredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  requiredText: {
    fontSize: 13,
  },
  textAnswerInput: {
    fontSize: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addQuestionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -4,
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    margin: 4,
  },
  addQuestionText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  submitButton: {
    padding: 8,
    marginRight: 8,
  },
});
