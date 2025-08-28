import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface Course {
  id: string;
  courseName: string;
  courseCode: string;
  units: number;
  grade: string;
  semester: string;
  createdAt: number;
}

export interface SemesterSummary {
  semester: string;
  gpa: number;
  totalCredits: number;
  coursesPassed: number;
  totalCourses: number;
}

export interface GpaStats {
  cumulativeGpa: number;
  totalCredits: number;
  totalCourses: number;
  gradeBreakdown: { [key: string]: number };
}

interface GpaContextType {
  courses: Course[];
  addCourse: (course: Omit<Course, 'id' | 'createdAt'>) => Promise<void>;
  updateCourse: (id: string, course: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  getCurrentSemesterCourses: () => Course[];
  getSemesterSummary: (semester: string) => SemesterSummary;
  getGpaStats: () => GpaStats;
  getChartData: () => { labels: string[]; datasets: any[] };
  isLoading: boolean;
}

const GpaContext = createContext<GpaContextType | undefined>(undefined);

export const useGpa = () => {
  const context = useContext(GpaContext);
  if (!context) {
    throw new Error('useGpa must be used within a GpaProvider');
  }
  return context;
};

// Nigerian University Grading System
const GRADE_POINTS: { [key: string]: number } = {
  'A': 5.0,
  'B': 4.0,
  'C': 3.0,
  'D': 2.0,
  'E': 1.0,
  'F': 0.0,
};

const GRADE_COLORS: { [key: string]: string } = {
  'A': '#4CAF50', // Green
  'B': '#2196F3', // Blue
  'C': '#FFC107', // Amber
  'D': '#FF9800', // Orange
  'E': '#F44336', // Red
  'F': '#9C27B0', // Purple
};

export const getGradeColor = (grade: string) => {
  return GRADE_COLORS[grade] || '#888';
};

export const GpaProvider = ({ children }: { children: ReactNode }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const storedCourses = await AsyncStorage.getItem('gpa_courses');
      if (storedCourses) {
        setCourses(JSON.parse(storedCourses));
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCourses = async (newCourses: Course[]) => {
    try {
      await AsyncStorage.setItem('gpa_courses', JSON.stringify(newCourses));
    } catch (error) {
      console.error('Error saving courses:', error);
    }
  };

  const calculateGpa = (courseList: Course[]): number => {
    if (courseList.length === 0) return 0;

    const totalPoints = courseList.reduce((sum, course) => {
      return sum + (GRADE_POINTS[course.grade] || 0) * course.units;
    }, 0);

    const totalCredits = courseList.reduce((sum, course) => sum + course.units, 0);
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  };

  const addCourse = async (courseData: Omit<Course, 'id' | 'createdAt'>) => {
    const newCourse: Course = {
      ...courseData,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };

    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    await saveCourses(updatedCourses);
  };

  const updateCourse = async (id: string, courseData: Partial<Course>) => {
    const updatedCourses = courses.map(course =>
      course.id === id ? { ...course, ...courseData } : course
    );
    setCourses(updatedCourses);
    await saveCourses(updatedCourses);
  };

  const deleteCourse = async (id: string) => {
    const updatedCourses = courses.filter(course => course.id !== id);
    setCourses(updatedCourses);
    await saveCourses(updatedCourses);
  };

  const getCurrentSemesterCourses = (): Course[] => {
    // Get the most recent semester or return empty array
    if (courses.length === 0) return [];
    
    const semesters = [...new Set(courses.map(c => c.semester))];
    const currentSemester = semesters[semesters.length - 1];
    
    return courses
      .filter(course => course.semester === currentSemester)
      .sort((a, b) => b.createdAt - a.createdAt);
  };

  const getSemesterSummary = (semester: string): SemesterSummary => {
    const semesterCourses = courses.filter(course => course.semester === semester);
    const gpa = calculateGpa(semesterCourses);
    const totalCredits = semesterCourses.reduce((sum, course) => sum + course.units, 0);
    const coursesPassed = semesterCourses.filter(course => course.grade !== 'F').length;
    
    return {
      semester,
      gpa,
      totalCredits,
      coursesPassed,
      totalCourses: semesterCourses.length,
    };
  };

  const getGpaStats = (): GpaStats => {
    const cumulativeGpa = calculateGpa(courses);
    const totalCredits = courses.reduce((sum, course) => sum + course.units, 0);
    const totalCourses = courses.length;
    
    const gradeBreakdown = courses.reduce((acc, course) => {
      acc[course.grade] = (acc[course.grade] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      cumulativeGpa,
      totalCredits,
      totalCourses,
      gradeBreakdown,
    };
  };

  const getChartData = () => {
    if (courses.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0], color: () => '#888', strokeWidth: 2 }],
      };
    }

    // Sort courses chronologically
    const sortedCourses = [...courses].sort((a, b) => a.createdAt - b.createdAt);

    // Calculate cumulative GPA after each course
    const cumulativeGpas: number[] = [];
    let cumulativePoints = 0;
    let cumulativeCredits = 0;

    for (const course of sortedCourses) {
      cumulativePoints += (GRADE_POINTS[course.grade] || 0) * course.units;
      cumulativeCredits += course.units;
      const currentCgpa = cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;
      cumulativeGpas.push(currentCgpa);
    }

    return {
      labels: sortedCourses.map(c => c.courseCode),
      datasets: [{
        data: cumulativeGpas,
        color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const value = {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    getCurrentSemesterCourses,
    getSemesterSummary,
    getGpaStats,
    getChartData,
    isLoading,
  };

  return (
    <GpaContext.Provider value={value}>
      {children}
    </GpaContext.Provider>
  );
}; 