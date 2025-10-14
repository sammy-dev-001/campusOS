import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../src/contexts/NewThemeContext';
import { useTimetable } from '../src/contexts/TimetableContext';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function AddClassForm() {
  const { theme } = useTheme();
  const { addClass } = useTimetable();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    subjectName: '',
    courseCode: '',
    startTime: '',
    endTime: '',
    venue: '',
    lecturerName: '',
    dayOfWeek: 'Monday',
    reminder: true,
  });
  const [showPicker, setShowPicker] = useState(false);

  const handleDaySelect = (day: string) => {
    setFormData({ ...formData, dayOfWeek: day });
    setShowPicker(false);
  };

  const formatTimeInput = (input: string) => {
    // Remove all non-numeric characters
    const numbersOnly = input.replace(/\D/g, '');
    
    // If input is empty, return empty string
    if (numbersOnly.length === 0) return '';
    
    // Get first 4 digits (HHMM)
    const digits = numbersOnly.slice(0, 4);
    
    // Format based on number of digits
    if (digits.length <= 2) {
      // Just hours, no colon yet
      return digits;
    } else if (digits.length === 3) {
      // We have 3 digits - show hours and first minute digit after colon
      const hours = parseInt(digits.slice(0, 2));
      const validHours = Math.min(Math.max(0, hours), 23);
      const firstMinuteDigit = digits[2];
      return `${validHours.toString().padStart(2, '0')}:${firstMinuteDigit}`;
    } else {
      // We have 4 digits - show full time
      const hours = parseInt(digits.slice(0, 2));
      const validHours = Math.min(Math.max(0, hours), 23);
      const minutes = digits.slice(2, 4);
      const validMinutes = Math.min(parseInt(minutes), 59).toString().padStart(2, '0');
      
      return `${validHours.toString().padStart(2, '0')}:${validMinutes}`;
    }
  };

  const handleStartTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    setFormData({ ...formData, startTime: formatted });
  };

  const handleEndTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    setFormData({ ...formData, endTime: formatted });
  };

  const handleSubmit = async () => {
    if (!formData.subjectName.trim() || !formData.startTime.trim() || !formData.endTime.trim() || !formData.venue.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields (Subject Name, Start Time, End Time, and Venue).');
      return;
    }

    // Validate that end time is after start time
    const startTime = formData.startTime;
    const endTime = formData.endTime;
    if (startTime >= endTime) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }

    try {
      await addClass({
        subjectName: formData.subjectName.trim(),
        courseCode: formData.courseCode.trim() || undefined,
        time: `${formData.startTime} - ${formData.endTime}`,
        venue: formData.venue.trim(),
        lecturerName: formData.lecturerName.trim() || undefined,
        dayOfWeek: formData.dayOfWeek,
        reminder: formData.reminder,
      });
      
      Alert.alert('Success', 'Class added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add class. Please try again.');
    }
  };

  const styles = getStyles(theme);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Add New Subject</Text>
            <Text style={styles.headerSubtitle}>Fill in your class details below</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Subject Name */}
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="book-outline" size={20} color={theme.primary} />
              <Text style={styles.inputLabel}>Subject Name *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.subjectName}
              onChangeText={(text) => setFormData({ ...formData, subjectName: text })}
              placeholder="e.g., Calculus I"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Course Code */}
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="code-outline" size={20} color={theme.secondary} />
              <Text style={styles.inputLabel}>Course Code (Optional)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.courseCode}
              onChangeText={(text) => setFormData({ ...formData, courseCode: text })}
              placeholder="e.g., MATH 101"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Time */}
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="time-outline" size={20} color={theme.primary} />
              <Text style={styles.inputLabel}>Start Time *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.startTime}
              onChangeText={handleStartTimeChange}
              placeholder="e.g., 9 → 09:00, 1430 → 14:30, 10:30"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Time */}
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="time-outline" size={20} color={theme.primary} />
              <Text style={styles.inputLabel}>End Time *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.endTime}
              onChangeText={handleEndTimeChange}
              placeholder="e.g., 9 → 09:00, 1430 → 14:30, 10:30"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Venue */}
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="location-outline" size={20} color={theme.primary} />
              <Text style={styles.inputLabel}>Venue *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.venue}
              onChangeText={(text) => setFormData({ ...formData, venue: text })}
              placeholder="e.g., Science Building Room 203"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Lecturer Name */}
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="person-outline" size={20} color={theme.secondary} />
              <Text style={styles.inputLabel}>Lecturer Name (Optional)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.lecturerName}
              onChangeText={(text) => setFormData({ ...formData, lecturerName: text })}
              placeholder="e.g., Dr. Smith"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Reminder Toggle */}
          <View style={[styles.inputCard, styles.reminderCard]}>
            <View style={styles.inputHeader}>
              <Ionicons name="notifications-outline" size={20} color={theme.primary} />
              <Text style={styles.inputLabel}>Remind me 5 mins before class</Text>
            </View>
            <Switch
              trackColor={{ false: '#3e3e3e', true: '#81b0ff' }}
              thumbColor={formData.reminder ? '#007AFF' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={(value) => setFormData({ ...formData, reminder: value })}
              value={formData.reminder}
            />
          </View>

          {/* Day of Week */}
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              <Text style={styles.inputLabel}>Day of Week *</Text>
            </View>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowPicker(true)}>
              <Text style={styles.pickerText}>{formData.dayOfWeek}</Text>
              <Ionicons name="chevron-down" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.submitButtonText}>Add Subject</Text>
          </TouchableOpacity>
        </View>

        {/* Day Picker Modal */}
        {showPicker && (
          <Modal
            visible={showPicker}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowPicker(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Day of Week</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity 
                    key={day} 
                    style={styles.modalItem} 
                    onPress={() => handleDaySelect(day)}
                  >
                    <Text style={styles.modalItemText}>{day}</Text>
                    {formData.dayOfWeek === day && (
                      <Ionicons name="checkmark" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Increased from 20 to 50 to position below the camera notch
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.secondary,
  },
  formContainer: {
    padding: 20,
  },
  inputCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerText: {
    fontSize: 16,
    color: theme.text,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalItemText: {
    fontSize: 16,
    color: theme.text,
  },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}); 