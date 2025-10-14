import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import TutorModal from '../components/TutorModal';
import { API_BASE_URL } from '../config/api';

interface Tutor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  courses?: string[];
  bio?: string;
  profilePicture?: string;
}

export default function TutorsScreen() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchTutors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tutors`);
      const data = await response.json();
      setTutors(data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
      // In a real app, show an error message to the user
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateTutor = async (tutorData: {
    name: string;
    email: string;
    phone: string;
    department: string;
    courses: string;
    bio: string;
    image?: string;
  }): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/tutors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tutorData),
    });

    if (!response.ok) {
      throw new Error('Failed to create tutor');
    }

    // Refresh the tutors list
    await fetchTutors();
    return;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTutors();
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  const renderTutorItem = ({ item }: { item: Tutor }) => (
    <TouchableOpacity 
      style={styles.tutorCard}
      onPress={() => router.push(`/tutor-details/${item.id}`)}
    >
      <View style={styles.tutorInfo}>
        {item.profilePicture ? (
          <Image 
            source={{ uri: item.profilePicture }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
        )}
        <View style={styles.tutorDetails}>
          <Text style={styles.tutorName}>{item.name}</Text>
          <Text style={styles.tutorDepartment}>{item.department}</Text>
          {item.courses && item.courses.length > 0 && (
            <Text style={styles.tutorCourses} numberOfLines={1}>
              {item.courses.join(', ')}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#888" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tutors</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tutors}
        renderItem={renderTutorItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color="#888" />
            <Text style={styles.emptyStateText}>No tutors found</Text>
            <Text style={styles.emptyStateSubtext}>Add a tutor to get started</Text>
          </View>
        }
      />

      <TutorModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleCreateTutor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  tutorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorDetails: {
    flex: 1,
  },
  tutorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tutorDepartment: {
    color: '#888',
    fontSize: 14,
    marginBottom: 2,
  },
  tutorCourses: {
    color: '#007AFF',
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#888',
    textAlign: 'center',
  },
});
