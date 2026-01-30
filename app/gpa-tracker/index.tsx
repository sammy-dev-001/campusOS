import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import CourseFormModal from '../components/CourseFormModal';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { BrandColors } from '../../src/theme/edufi';
import { useAuth } from 'src/contexts/AuthContext';
import { Course, getGradeColor, useGpa } from 'src/contexts/GpaContext';

export default function GpaTrackerScreen() {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const { user } = useAuth();
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    getCurrentSemesterCourses,
    getSemesterSummary,
    getGpaStats,
    getChartData,
    isLoading
  } = useGpa();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const currentSemesterCourses = getCurrentSemesterCourses();
  const gpaStats = getGpaStats();
  const chartData = getChartData();

  const chartConfig = {
    backgroundGradientFrom: isDark ? theme.card : '#ffffff',
    backgroundGradientTo: isDark ? theme.card : '#ffffff',
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(150, 150, 150, ${opacity})` : `rgba(100, 100, 100, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: BrandColors.brandGreen
    }
  };

  // Get current semester for summary
  const currentSemester = currentSemesterCourses.length > 0
    ? currentSemesterCourses[0].semester
    : 'No Courses';
  const semesterSummary = currentSemester !== 'No Courses'
    ? getSemesterSummary(currentSemester)
    : { semester: 'No Courses', gpa: 0, totalCredits: 0, coursesPassed: 0, totalCourses: 0 };

  const handleAddCourse = async (courseData: Omit<Course, 'id' | 'createdAt'>) => {
    await addCourse(courseData);
  };

  const handleEditCourse = async (courseData: Omit<Course, 'id' | 'createdAt'>) => {
    if (editingCourse) {
      // Create a new object with all required Course properties
      const updatedCourse: Course = {
        ...courseData,
        id: editingCourse.id,
        createdAt: editingCourse.createdAt || Date.now()
      };
      await updateCourse(editingCourse.id, updatedCourse);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete ${course.courseName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCourse(course.id)
        },
      ]
    );
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCourse(null);
  };

  const handleSubmit = async (formData: { name: string; creditHours: string; grade: string; semester: string; id?: string }) => {
    const courseData: Omit<Course, 'id' | 'createdAt'> = {
      courseName: formData.name,
      courseCode: formData.name.split(' ').map(word => word[0]).join('').toUpperCase(),
      units: parseInt(formData.creditHours, 10) || 0,
      grade: formData.grade,
      semester: formData.semester
    };

    if (editingCourse) {
      await handleEditCourse(courseData);
    } else {
      await handleAddCourse(courseData);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 12 }]}>
          <Text style={styles.headerTitle}>EduFi</Text>
          <Image source={{ uri: user?.profile_picture || 'https://randomuser.me/api/portraits/men/1.jpg' }} style={styles.headerAvatar} />
        </View>

        {/* Overall GPA Card */}
        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>Overall GPA</Text>
          <Text style={styles.gpaText}>{gpaStats.cumulativeGpa.toFixed(2)}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.buttonText}>Add New Course</Text>
          </TouchableOpacity>

          {courses.length > 0 ? (
            <LineChart
              data={chartData}
              width={screenWidth - 80}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="analytics-outline" size={48} color={theme.secondary} />
              <Text style={styles.emptyChartText}>Add courses to see your progress</Text>
            </View>
          )}
        </View>

        {/* Current Semester Courses */}
        <Text style={styles.sectionTitle}>Current Semester Courses</Text>
        {currentSemesterCourses.length === 0 ? (
          <View style={styles.emptyCourses}>
            <Ionicons name="book-outline" size={48} color={theme.secondary} />
            <Text style={styles.emptyCoursesText}>No courses added yet</Text>
            <Text style={styles.emptyCoursesSubtext}>Tap "Add New Course" to get started</Text>
          </View>
        ) : (
          currentSemesterCourses.map((course: Course, index: number) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={[styles.gradeCircle, { backgroundColor: getGradeColor(course.grade) }]}>
                <Text style={styles.gradeText}>{course.grade}</Text>
              </View>
              <View style={styles.courseInfo}>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.courseTitle}>{course.courseName}</Text>
                <Text style={styles.courseCredits}>{course.units} Credits</Text>
              </View>
              <View style={styles.courseActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(course)}
                >
                  <Ionicons name="pencil" size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteCourse(course)}
                >
                  <Ionicons name="trash" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Semester Summary */}
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.cardTitle}>Semester Summary: {semesterSummary.semester}</Text>
          <Text style={styles.cardSubtitle}>2023/2024</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{semesterSummary.gpa.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Semester GPA</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{semesterSummary.totalCredits}</Text>
              <Text style={styles.summaryLabel}>Total Credits</Text>
            </View>
          </View>
          <View style={styles.summaryCoursesItem}>
            <Text style={styles.summaryValue}>{semesterSummary.coursesPassed}</Text>
            <Text style={styles.summaryLabel}>Courses Passed</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>
              Status: {semesterSummary.totalCourses > 0 ? 'Active' : 'No Courses'}
            </Text>
          </View>
        </View>
        {/* Grade Breakdown */}
        {gpaStats.totalCourses > 0 && (
          <View style={[styles.card, styles.breakdownCard]}>
            <Text style={styles.cardTitle}>Grade Breakdown</Text>
            <View style={styles.breakdownGrid}>
              {Object.entries(gpaStats.gradeBreakdown).map(([grade, count]) => {
                const countValue = count as number;
                return (
                  <React.Fragment key={grade}>
                    <View style={[styles.breakdownGrade, { backgroundColor: getGradeColor(grade) }]}>
                      <Text style={styles.breakdownGradeText}>{grade}</Text>
                    </View>
                    <Text style={styles.breakdownCount}>{countValue}</Text>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Course Form Modal */}
      <CourseFormModal
        visible={modalVisible}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialData={editingCourse ? {
          id: editingCourse.id,
          name: editingCourse.courseName,
          creditHours: editingCourse.units.toString(),
          grade: editingCourse.grade,
          semester: editingCourse.semester
        } : undefined}
      />
    </SafeAreaView>
  );
}



const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  summaryCard: {
    alignItems: 'flex-start',
  },
  breakdownCard: {
    alignItems: 'flex-start',
  },
  cardTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: theme.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
  gpaText: {
    color: BrandColors.brandGreen,
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  button: {
    backgroundColor: BrandColors.brandGreen,
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  chart: {
    borderRadius: 16,
    marginTop: 10,
  },
  emptyChart: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyChartText: {
    color: theme.secondary,
    fontSize: 14,
    marginTop: 10,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  emptyCourses: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCoursesText: {
    color: theme.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyCoursesSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  courseCard: {
    backgroundColor: theme.card,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gradeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  gradeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  courseInfo: {
    flex: 1,
  },
  courseCode: {
    color: theme.text,
    fontWeight: 'bold',
  },
  courseTitle: {
    color: theme.secondary,
  },
  courseCredits: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  courseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
  },
  summaryItem: {
    backgroundColor: isDark ? theme.cardAlt : theme.card,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    elevation: isDark ? 0 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 4,
  },
  summaryCoursesItem: {
    backgroundColor: isDark ? theme.cardAlt : theme.card,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    elevation: isDark ? 0 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 4,
  },
  summaryValue: {
    color: theme.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: theme.secondary,
    fontSize: 12,
  },
  statusPill: {
    backgroundColor: `${BrandColors.brandGreen}20`,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 15,
    alignSelf: 'center',
    marginTop: 10,
  },
  statusText: {
    color: BrandColors.brandGreen,
    fontWeight: 'bold',
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  breakdownItem: {
    alignItems: 'center',
    marginVertical: 8,
    minWidth: 60,
  },
  breakdownGrade: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  breakdownGradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  breakdownCount: {
    color: theme.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 