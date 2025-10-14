import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
// Using a simple text input for date selection to avoid native module issues
const DateInput = ({ value, onChange, minDate = new Date() }: { value: Date, onChange: (date: Date) => void, minDate?: Date }) => {
  const [date, setDate] = useState(value);
  const [showPicker, setShowPicker] = useState(false);

  const showDatepicker = () => {
    setShowPicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const currentDate = selectedDate < minDate ? minDate : selectedDate;
      setDate(currentDate);
      onChange(currentDate);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View>
      <TouchableOpacity onPress={showDatepicker} className="border border-gray-200 p-3 rounded-lg">
        <Text>{formatDate(date)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          minimumDate={minDate}
          onChange={onDateChange}
        />
      )}
    </View>
  );
};

type Option = {
  id: string;
  text: string;
};

type CreatePollData = {
  question: string;
  options: string[];
  isMultipleChoice: boolean;
  expiresAt: Date;
};

type CreatePollModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePollData) => Promise<void>;
};

export function CreatePollModal({ visible, onClose, onSubmit }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { id: Date.now().toString(), text: '' },
    { id: (Date.now() + 1).toString(), text: '' },
  ]);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default: 1 week from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: Date.now().toString(), text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(option => option.id !== id));
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    const validOptions = options.filter(opt => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      Alert.alert('Error', 'Please add at least 2 options');
      return;
    }

    const now = new Date();
    if (expiresAt <= now) {
      Alert.alert('Error', 'Expiration date must be in the future');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        question: question.trim(),
        options: validOptions.map(opt => opt.text.trim()),
        isMultipleChoice,
        expiresAt,
      });
      // Reset form
      setQuestion('');
      setOptions([
        { id: Date.now().toString(), text: '' },
        { id: (Date.now() + 1).toString(), text: '' },
      ]);
      setIsMultipleChoice(false);
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 1);
      setExpiresAt(newDate);
    } catch (error) {
      console.error('Failed to create poll:', error);
      Alert.alert('Error', 'Failed to create poll. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%] p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-900">Create New Poll</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">Question</Text>
              <TextInput
                placeholder="Ask a question..."
                value={question}
                onChangeText={setQuestion}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-base"
                multiline
                numberOfLines={2}
              />
            </View>

            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-gray-700">Options</Text>
                <Text className="text-xs text-gray-500">{options.length}/10</Text>
              </View>
              
              <View className="space-y-3">
                {options.map((option, index) => (
                  <View key={option.id} className="flex-row items-center">
                    <View className="flex-1">
                      <TextInput
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChangeText={(text) => updateOption(option.id, text)}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-base flex-1"
                      />
                    </View>
                    {options.length > 2 && (
                      <TouchableOpacity 
                        onPress={() => removeOption(option.id)}
                        className="p-2 ml-2"
                      >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {options.length < 10 && (
                <TouchableOpacity
                  onPress={addOption}
                  className="mt-3 flex-row items-center"
                >
                  <Ionicons name="add-circle" size={20} color="#3b82f6" />
                  <Text className="text-blue-500 font-medium ml-2">Add option</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-3">
                Poll Settings
              </Text>
              
              <View className="space-y-4">
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-1">
                        Expiration
                      </Text>
                      <Text className="text-gray-600">
                        {formatDate(expiresAt)}
                      </Text>
                    </View>
                    <Ionicons name="calendar" size={20} color="#6b7280" />
                  </View>
                </TouchableOpacity>

                <View className="flex-row justify-between items-center p-4 border border-gray-200 rounded-lg">
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-1">
                      Multiple Choice
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Allow selecting multiple options
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsMultipleChoice(!isMultipleChoice)}
                    className={`w-12 h-6 rounded-full p-0.5 ${
                      isMultipleChoice ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <View
                      className={`bg-white w-5 h-5 rounded-full ${
                        isMultipleChoice ? 'ml-6' : 'ml-0'
                      }`}
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                        elevation: 2,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="mt-4 pt-4 border-t border-gray-100">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`py-3 rounded-full items-center ${
                isSubmitting ? 'bg-blue-400' : 'bg-blue-500'
              }`}
            >
              <Text className="text-white font-medium">
                {isSubmitting ? 'Creating...' : 'Create Poll'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

    </Modal>
  );
}
