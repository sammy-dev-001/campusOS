import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface CourseFormData {
  id?: string;
  name: string;
  creditHours: string;
  grade: string;
  semester: string;
}

interface CourseFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (course: CourseFormData) => void;
  initialData?: CourseFormData | null;
}

const grades = [
  'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'
];

const semesters = [
  'Fall 2023', 'Spring 2024', 'Summer 2024',
  'Fall 2024', 'Spring 2025', 'Summer 2025'
];

export default function CourseFormModal({ visible, onClose, onSubmit, initialData }: CourseFormModalProps) {
  const [formData, setFormData] = useState<CourseFormData>(
    initialData || {
      name: '',
      creditHours: '',
      grade: '',
      semester: '',
    }
  );
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showSemesterPicker, setShowSemesterPicker] = useState(false);

  const handleInputChange = (field: keyof CourseFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.creditHours || !formData.grade || !formData.semester) {
      // Simple validation - in a real app, you might want more robust validation
      alert('Please fill in all fields');
      return;
    }
    
    onSubmit({
      ...formData,
      creditHours: formData.creditHours,
    });
    
    // Reset form
    setFormData({
      name: '',
      creditHours: '',
      grade: '',
      semester: '',
    });
    
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {initialData ? 'Edit Course' : 'Add New Course'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Course Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Introduction to Computer Science"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Credit Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 3"
              keyboardType="numeric"
              value={formData.creditHours}
              onChangeText={(text) => handleInputChange('creditHours', text.replace(/[^0-9]/g, ''))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Grade</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowGradePicker(!showGradePicker)}
            >
              <Text style={styles.pickerButtonText}>
                {formData.grade || 'Select Grade'}
              </Text>
              <Ionicons
                name={showGradePicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            
            {showGradePicker && (
              <View style={styles.pickerOptions}>
                {grades.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={styles.pickerOption}
                    onPress={() => {
                      handleInputChange('grade', grade);
                      setShowGradePicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{grade}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Semester</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowSemesterPicker(!showSemesterPicker)}
            >
              <Text style={styles.pickerButtonText}>
                {formData.semester || 'Select Semester'}
              </Text>
              <Ionicons
                name={showSemesterPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            
            {showSemesterPicker && (
              <View style={styles.pickerOptions}>
                {semesters.map((semester) => (
                  <TouchableOpacity
                    key={semester}
                    style={styles.pickerOption}
                    onPress={() => {
                      handleInputChange('semester', semester);
                      setShowSemesterPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{semester}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                {initialData ? 'Update Course' : 'Add Course'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptions: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 150,
    backgroundColor: 'white',
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
