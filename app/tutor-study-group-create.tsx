import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../contexts/UserContext';

export default function TutorStudyGroupCreateScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        name: name.trim(),
        participants: [Number(user.id)],
        type: 'study_group',
        description: description.trim() || null,
        code: code.trim() || null
      };

      console.log('Sending request with:', requestBody);

      const response = await fetch(`${API_BASE_URL}/chat-groups`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Create group error:', responseData);
        throw new Error(responseData.message || `Failed to create group (${response.status})`);
      }
      
      console.log('Group created successfully:', responseData);
      
      // Reset form
      setName('');
      setDescription('');
      setCode('');
      
      // Navigate back with success
      router.push({
        pathname: '/tutor-study-group',
        params: { refresh: Date.now() } // Force refresh on the study group list
      });
      
    } catch (error: any) {
      console.error('Create group error:', error);
      Alert.alert(
        'Error',
        typeof error.message === 'string' ? error.message : 'Failed to create group. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setName('');
      setDescription('');
      setCode('');
      setRefreshing(false);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, minHeight: '100%' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ height: 20 }} />
        <Text style={styles.header}>Create Study Group</Text>
        <TextInput
          style={styles.input}
          placeholder="Group Name"
          placeholderTextColor="#fff"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Course Code (e.g. MTH101)"
          placeholderTextColor="#fff"
          value={code}
          onChangeText={setCode}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          placeholderTextColor="#fff"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TouchableOpacity
          style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#18191A', 
    padding: 24 
  },
  header: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 24, 
    textAlign: 'center' 
  },
  input: { 
    backgroundColor: '#23272F', 
    color: '#fff', 
    borderRadius: 10, 
    padding: 14, 
    fontSize: 16, 
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#3A3B3C'
  },
  button: { 
    backgroundColor: '#007AFF', 
    borderRadius: 10, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: '#5D9CEC',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
}); 