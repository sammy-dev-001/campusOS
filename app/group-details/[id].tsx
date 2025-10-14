import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL } from '../../src/constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<{
    id: string;
    name: string;
    code?: string;
    description?: string;
    participants?: any[];
    participants_count?: number;
    color?: string;
    icon?: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const fetchGroupDetails = async () => {
    if (!id) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/chat-groups/${id}`);
      if (!res.ok) throw new Error('Failed to fetch group details');
      const data = await res.json();
      setGroup(prev => ({
        ...prev,
        ...data,
        name: data.name || 'Study Group',
        code: data.code || '',
      }));
      
      // Check if current user is a member
      if (user?.id && data.participants) {
        setIsMember(data.participants.some((p: any) => p.id === user.id));
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      if (!user?.id || !id) return;
      const res = await fetch(`${API_BASE_URL}/chat-groups/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!res.ok) throw new Error('Failed to join group');
      
      // Refresh group details to update member status
      await fetchGroupDetails();
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const handleStartChat = () => {
    if (group?.id) {
      router.push(`/chat/${group.id}`);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupDetails();
  };

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Loading group details...</Text>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Group not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: group.color || '#6C63FF' }]}>
            <MaterialCommunityIcons 
              name={(group.icon as any) || 'account-group'} 
              size={40} 
              color="#fff" 
            />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupCode}>{group.code || ''}</Text>
          
          <View style={styles.memberCount}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.memberCountText}>
              {group.participants_count || group.participants?.length || 0} members
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>
            {group.description || 'No description available.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          <View style={styles.membersList}>
            {group.participants?.map((member: any) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={[styles.memberAvatar, { backgroundColor: '#6C63FF' }]}>
                  <Text style={styles.memberInitial}>
                    {member.name?.charAt(0) || '?'}
                  </Text>
                </View>
                <Text style={styles.memberName}>
                  {member.name || 'Unknown User'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isMember ? (
          <TouchableOpacity 
            style={[styles.button, styles.chatButton]}
            onPress={handleStartChat}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
            <Text style={styles.buttonText}>Open Chat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.button, styles.joinButton]}
            onPress={handleJoinGroup}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.buttonText}>Join Group</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerContent: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  groupCode: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  memberCountText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  membersList: {
    marginTop: 10,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  joinButton: {
    backgroundColor: '#6C63FF',
  },
  chatButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
