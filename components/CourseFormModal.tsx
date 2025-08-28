import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Course } from '../contexts/GpaContext';

interface CourseFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (course: Omit<Course, 'id' | 'createdAt'>) => Promise<void>;
  editingCourse?: Course | null;
}

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEMESTERS = [
  '100L First Semester',
  '100L Second Semester',
  '200L First Semester',
  '200L Second Semester',
  '300L First Semester',
  '300L Second Semester',
  '400L First Semester',
  '400L Second Semester',
  '500L First Semester',
  '500L Second Semester',
];

export default function CourseFormModal({
  visible,
  onClose,
  onSubmit,
  editingCourse,
}: CourseFormModalProps) {
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [units, setUnits] = useState('');
  const [grade, setGrade] = useState('A');
  const [semester, setSemester] = useState('100L First Semester');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingCourse) {
      setCourseName(editingCourse.courseName);
      setCourseCode(editingCourse.courseCode);
      setUnits(editingCourse.units.toString());
      setGrade(editingCourse.grade);
      setSemester(editingCourse.semester);
    } else {
      resetForm();
    }
  }, [editingCourse, visible]);

  const resetForm = () => {
    setCourseName('');
    setCourseCode('');
    setUnits('');
    setGrade('A');
    setSemester('100L First Semester');
  };

  const handleSubmit = async () => {
    if (!courseName.trim() || !courseCode.trim() || !units.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const unitsNum = parseInt(units);
    if (isNaN(unitsNum) || unitsNum <= 0 || unitsNum > 10) {
      Alert.alert('Error', 'Please enter a valid number of units (1-10).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        courseName: courseName.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        units: unitsNum,
        grade,
        semester,
      });
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingCourse ? 'Edit Course' : 'Add New Course'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Name *</Text>
              <TextInput
                style={styles.input}
                value={courseName}
                onChangeText={setCourseName}
                placeholder="e.g., Introduction to Computer Science"
                placeholderTextColor="#AAA"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Code *</Text>
              <TextInput
                style={styles.input}
                value={courseCode}
                onChangeText={setCourseCode}
                placeholder="e.g., CMP 101"
                placeholderTextColor="#AAA"
                maxLength={20}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Units (Credit Hours) *</Text>
              <TextInput
                style={styles.input}
                value={units}
                onChangeText={setUnits}
                placeholder="e.g., 3"
                placeholderTextColor="#AAA"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Grade</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={grade}
                  onValueChange={setGrade}
                  style={styles.picker}
                  dropdownIconColor="#fff"
                  mode="dropdown"
                >
                  {GRADES.map((g) => (
                    <Picker.Item key={g} label={g} value={g} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Semester</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={semester}
                  onValueChange={setSemester}
                  style={styles.picker}
                  dropdownIconColor="#fff"
                  mode="dropdown"
                >
                  {SEMESTERS.map((s) => (
                    <Picker.Item key={s} label={s} value={s} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.gradeInfo}>
              <Text style={styles.gradeInfoTitle}>Nigerian University Grading System:</Text>
              <View style={styles.gradeGrid}>
                {GRADES.map((g) => (
                  <View key={g} style={styles.gradeItem}>
                    <Text style={[styles.gradeLetter, { color: getGradeColor(g) }]}>{g}</Text>
                    <Text style={styles.gradePoints}>{getGradePoints(g)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Add Course'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getGradeColor = (grade: string) => {
  const colors: { [key: string]: string } = {
    'A': '#4CAF50',
    'B': '#2196F3',
    'C': '#FFC107',
    'D': '#FF9800',
    'E': '#F44336',
    'F': '#9C27B0',
  };
  return colors[grade] || '#888';
};

const getGradePoints = (grade: string) => {
  const points: { [key: string]: number } = {
    'A': 5.0,
    'B': 4.0,
    'C': 3.0,
    'D': 2.0,
    'E': 1.0,
    'F': 0.0,
  };
  return points[grade] || 0;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#1E1E1E',
    padding: 15,
  },
  gradeInfo: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  gradeInfoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  gradeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  gradeItem: {
    alignItems: 'center',
    marginVertical: 5,
    minWidth: 50,
  },
  gradeLetter: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gradePoints: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 