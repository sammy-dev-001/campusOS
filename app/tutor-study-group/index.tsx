import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../src/contexts/AuthContext';

function TutorStudyGroupScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    courseCode: '',
    courseName: '',
    daysOfWeek: [] as string[],
    timeSlot: '',
    experience: '',
    availability: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    // Basic validation
    const requiredFields = ['firstName', 'lastName', 'email', 'department', 'courseName', 'daysOfWeek'] as const;
    const missingFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData];
      return Array.isArray(value) ? value.length === 0 : !value;
    });
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data in the format expected by the backend
      const submissionData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        department: formData.department,
        course_subject: formData.courseName,
        day_of_tutorial: formData.daysOfWeek.join(', '), // Convert array to comma-separated string
        email: formData.email,
        phone: formData.phone || null
      };
      
      console.log('Submitting tutor application:', submissionData);
      
      const response = await fetch(`${API_BASE_URL}/api/tutor-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit application');
      }
      
      const result = await response.json();
      
      Alert.alert(
        'Application Submitted', 
        'Thank you for your interest in becoming a tutor. We will review your application and get back to you soon.'
      );
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        courseCode: '',
        courseName: '',
        daysOfWeek: [],
        timeSlot: '',
        experience: '',
        availability: ''
      });
      
      // Close the modal
      setIsTutorModalVisible(false);
      
    } catch (error) {
      console.error('Error submitting application:', error);
      Alert.alert('Error', 'Failed to submit application. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const [groupSort, setGroupSort] = useState<'members'|'code'>('members');
  const [search, setSearch] = useState('');
  const [fabAnim] = useState(new Animated.Value(0));
  const [fabOpen, setFabOpen] = useState(false);
  const [fabOptionsAnim] = useState([new Animated.Value(0), new Animated.Value(0)]);
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [isTutorModalVisible, setIsTutorModalVisible] = useState(false);
  const [isAddingTutor, setIsAddingTutor] = useState(false);
  const [newTutor, setNewTutor] = useState({
    name: '',
    department: '',
    courses: '',
    email: '',
    phone: ''
  });

  const ICONS = ['flower-tulip','sparkles','book-open-variant','code-tags','flask','pi','palette','atom'];
  const COLORS = ['#F5B7B1','#A9CCE3','#AED6F1','#A3E4D7','#F9E79F','#E8DAEF','#FADBD8','#D6EAF8'];
  const pickIcon = (key: string) => {
    let hash = 0; for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return { icon: ICONS[hash % ICONS.length], color: COLORS[hash % COLORS.length] };
  };

  const fetchStudyGroups = async () => {
    try {
      if (!user?.id) return;

      // Try to get token from AsyncStorage (AuthProvider saves it there)
      const authRaw = await AsyncStorage.getItem('authData');
      const token = authRaw ? (JSON.parse(authRaw).token || null) : null;

      console.debug('[fetchStudyGroups] token present?', !!token);

      if (!token) {
        console.log('[fetchStudyGroups] No token available yet; skipping protected request (startup race)');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/chats?type=study_group&userId=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.debug('[fetchStudyGroups] request sent, status:', res.status);

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[fetchStudyGroups] response body:', text.slice(0, 1000));
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
      }
      let data: any = [];
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.warn('Non-JSON response from /chats:', text.slice(0, 200));
        throw new Error('Unexpected response format from /chats');
      }
      if (Array.isArray(data)) setGroups(data);
    } catch (e) {
      console.error('Error fetching study groups:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchTutors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tutors`);
      if (!res.ok) {
        setTutors([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setTutors(data);
      else setTutors([]);
    } catch (e) {
      console.error('Error fetching tutors:', e);
      setTutors([]);
    }
  };

  const joinGroup = async (groupId: number) => {
    try {
      if (!user?.id) return;

      const authRaw = await AsyncStorage.getItem('authData');
      const token = authRaw ? (JSON.parse(authRaw).token || null) : null;
      console.debug('[joinGroup] token present?', !!token);
      if (!token) {
        console.log('[joinGroup] No token available; cannot join group');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/chat-groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id })
      });
      const bodyText = await res.text().catch(() => '');
      console.debug('[joinGroup] response status:', res.status, 'body preview:', bodyText.slice(0, 200));
      if (!res.ok) {
        throw new Error(`Join failed (${res.status}): ${bodyText.slice(0, 200)}`);
      }
      await fetchStudyGroups();
    } catch (err) {
      console.error('Error joining group:', err);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    fetchStudyGroups();
    fetchTutors();
  }, [user?.id]);

  // Always fetch latest when focused
  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return;
      fetchStudyGroups();
      fetchTutors();
      if (params.refresh) {
        router.setParams({ refresh: undefined });
      }
    }, [params.refresh, router, user?.id])
  );

  // Filtering and sorting logic
  const filteredGroups = groups
    .filter((g: any) =>
      (groupFilters.length === 0 || groupFilters.some((f: string) => 
        g.code === f || 
        g.name === f ||
        g.description === f
      )) &&
      (search === '' || 
        (g.code && g.code.toLowerCase().includes(search.toLowerCase())) || 
        (g.name && g.name.toLowerCase().includes(search.toLowerCase())) ||
        (g.description && g.description.toLowerCase().includes(search.toLowerCase())))
    )
    .sort((a: any, b: any) => 
      groupSort === 'members' ? 
        (((b.participants_count || b.participants?.length || 1) - (a.participants_count || a.participants?.length || 1))) : 
        (a.code || '').localeCompare(b.code || '')
    );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchStudyGroups(), fetchTutors()]).finally(() => setRefreshing(false));
  };

  const toggleGroupFilter = (filter: string) => {
    setGroupFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
  };

  const handleFabPress = () => {
    console.log('FAB pressed, current state:', fabOpen);
    if (!fabOpen) {
      // Opening: animate main FAB first, then stagger the option buttons
      Animated.timing(fabAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        Animated.stagger(80, fabOptionsAnim.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        )).start();
        setFabOpen(true);
        console.log('FAB opened');
      });
    } else {
      // Closing: animate option buttons out first, then main FAB
      Animated.parallel(
        fabOptionsAnim.map(anim =>
          Animated.timing(anim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        )
      ).start(() => {
      Animated.timing(fabAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setFabOpen(false);
          console.log('FAB closed');
        });
      });
    }
  };

  const handleCreateStudyGroup = () => {
    setFabOpen(false);
    fabOptionsAnim.forEach(anim => anim.setValue(0));
    router.push('/tutor-study-group-create');
  };

  const handleGroupPress = (group: any) => {
    console.log('Group pressed:', group?.id);
    // Try navigating to our test screen
    router.push('/test-screen');
  };
  const handleRequestTutor = () => {
    setFabOpen(false);
    fabOptionsAnim.forEach(anim => anim.setValue(0));
    setIsTutorModalVisible(true);
  };

  const handleAddTutor = () => {
    if (!newTutor.name || !newTutor.department) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    const tutor = {
      ...newTutor,
      id: Date.now().toString(),
      courses: newTutor.courses.split(',').map(c => c.trim()).filter(Boolean)
    };
    
    setTutors(prev => [tutor, ...prev]);
    setNewTutor({
      name: '',
      department: '',
      courses: '',
      email: '',
      phone: ''
    });
    setIsAddingTutor(false);
  };
  
  const handleRequestTutorSession = (tutorId: string) => {
    Alert.alert('Request Sent', 'Your tutor request has been sent successfully!');
    setIsTutorModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 40 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.headerAvatar}>
          {user?.profile_picture ? (
            <Image source={{ uri: user.profile_picture }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {user?.display_name ? user.display_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
            </Text>
          )}
        </View>
      </View>

      {/* Two equal halves */}
      <View style={styles.splitContainer}>
        {/* Top half: Tutors */}
        <ScrollView
          style={styles.half}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
        <View style={[styles.sectionContainer, { marginTop: 8 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Request a Tutor</Text>
          </View>
            <Text style={styles.sectionSubtitle}>Get help from peers and approved tutors.</Text>
            {tutors.length > 0 ? (
              <View style={styles.tutorList}>
                {tutors.slice(0, 6).map((t: any) => (
                  <View key={t.id} style={styles.tutorCard}>
                    {t.profile_picture ? (
                      <Image source={{ uri: t.profile_picture }} style={styles.tutorAvatarImg} />
                  ) : (
                    <View style={styles.tutorAvatarFallback}>
                        <Text style={styles.tutorAvatarText}>{(t.display_name || t.username || 'T').charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.tutorName} numberOfLines={1}>{t.display_name || t.username}</Text>
                      <Text style={styles.tutorMeta} numberOfLines={1}>{t.subject || 'Available'}</Text>
                    </View>
                    <TouchableOpacity style={styles.requestBtnSmall}>
                      <Text style={styles.requestBtnTextSmall}>Request</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Bottom half: Study Groups */}
        <View style={styles.half}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Join a Study Group</Text>
            </View>
            <View style={styles.cardGrid}>
            {filteredGroups.length === 0 ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#888', fontSize: 16 }}>No study groups found</Text>
              </View>
            ) : (
                filteredGroups.map(group => {
                  const key = group.code || group.name || String(group.id);
                  const meta = pickIcon(key);
                  const memberCount = group.participants_count || group.participants?.length || 1;
                  const isMember = Array.isArray(group?.participants)
                    ? group.participants.some((p: any) => String((p?.id ?? p)) === String(user?.id))
                    : false;
                  return (
                <TouchableOpacity 
                  key={group.id} 
                  style={styles.groupItem}
                  onPress={() => handleGroupPress(group)}
                >
                  <View style={styles.groupCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={[styles.groupIcon, { backgroundColor: meta.color }]}>
                          <MaterialCommunityIcons name={meta.icon as any} size={20} color="#000" />
                        </View>
                        <View>
                          <Text style={styles.groupTitle} numberOfLines={1}>{group.name || 'Study Group'}</Text>
                  <Text style={styles.groupCode}>{group.code || 'STUDY'}</Text>
                        </View>
                      </View>
                      <Text style={styles.groupDescription} numberOfLines={2}>
                        {group.description || 'Share your stories and get feedback.'}
                      </Text>
                      <View style={[styles.groupMembersRow, { marginTop: 8, marginBottom: 10 }]}>
                        <Ionicons name="people-outline" size={16} color="#A0A0A0" />
                        <Text style={styles.groupMembersTextStrong}>{` ${memberCount} ${memberCount === 1 ? 'Member' : 'Members'}`}</Text>
                      </View>
                      {isMember ? (
                        <TouchableOpacity style={styles.joinBtn} onPress={() => router.push(`/(chat)/${group.id}`)}>
                          <Text style={styles.joinBtnText}>Enter Group</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={styles.joinBtn} onPress={async () => { await joinGroup(group.id); try { router.push(`/(chat)/${group.id}`); } catch {} }}>
                          <Text style={styles.joinBtnText}>Join Now</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                </TouchableOpacity>
                  );
                })
            )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Create study group FAB */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 32,
          right: 24,
          transform: [{ scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
          zIndex: 100,
        }}
      >
       {/* Animated FAB options */}
       {fabOpen && (
         <>
          {console.log('Rendering FAB options, fabOpen:', fabOpen)}
           <Animated.View
             style={{
               position: 'absolute',
               bottom: 80,
               right: 0,
               opacity: fabOptionsAnim[0],
               transform: [
                 { scale: fabOptionsAnim[0] },
                 { translateY: fabOptionsAnim[0].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
               ],
               zIndex: 101,
             }}
           >
             <TouchableOpacity
               onPress={handleCreateStudyGroup}
               style={{
                 backgroundColor: '#007AFF',
                 borderRadius: 24,
                 width: 160,
                 height: 48,
                 alignItems: 'center',
                 justifyContent: 'center',
                 flexDirection: 'row',
                 shadowColor: '#000',
                 shadowOpacity: 0.15,
                 shadowRadius: 6,
                 elevation: 6,
                 marginBottom: 8,
               }}
             >
               <Ionicons name="people" size={22} color="#fff" style={{ marginRight: 8 }} />
               <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Study Group</Text>
             </TouchableOpacity>
           </Animated.View>
           <Animated.View
             style={{
               position: 'absolute',
               bottom: 140,
               right: 0,
               opacity: fabOptionsAnim[1],
               transform: [
                 { scale: fabOptionsAnim[1] },
                 { translateY: fabOptionsAnim[1].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
               ],
               zIndex: 101,
             }}
           >
             <TouchableOpacity
               onPress={handleRequestTutor}
               style={{
                 backgroundColor: '#FFD700',
                 borderRadius: 24,
                 width: 160,
                 height: 48,
                 alignItems: 'center',
                 justifyContent: 'center',
                 flexDirection: 'row',
                 shadowColor: '#000',
                 shadowOpacity: 0.15,
                 shadowRadius: 6,
                 elevation: 6,
                 marginBottom: 8,
               }}
             >
               <Ionicons name="school" size={22} color="#18191A" style={{ marginRight: 8 }} />
               <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Tutor</Text>
             </TouchableOpacity>
           </Animated.View>
         </>
       )}
        <TouchableOpacity
          onPress={handleFabPress}
          style={{
            backgroundColor: '#007AFF',
            borderRadius: 32,
            width: 64,
            height: 64,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 2,
            borderColor: '#4D96FF',
          }}
          activeOpacity={0.85}
        >
          <Ionicons name={fabOpen ? 'close' : 'add'} size={36} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Tutor Modal */}
      <Modal
        visible={isTutorModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsTutorModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsTutorModalVisible(false)}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tutor Requests</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ padding: 20 }}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Become a Tutor</Text>
              <Text style={styles.sectionSubtitle}>Share your knowledge and help other students succeed</Text>
              
              <TextInput 
                style={styles.input} 
                placeholder="First Name *"
                placeholderTextColor="#888"
                value={formData.firstName}
                onChangeText={(text) => setFormData({...formData, firstName: text})}
              />
              
              <TextInput 
                style={styles.input} 
                placeholder="Last Name *"
                placeholderTextColor="#888"
                value={formData.lastName}
                onChangeText={(text) => setFormData({...formData, lastName: text})}
              />
              
              <TextInput 
                style={styles.input} 
                placeholder="Department *"
                placeholderTextColor="#888"
                value={formData.department}
                onChangeText={(text) => setFormData({...formData, department: text})}
              />
              
              <TextInput 
                style={styles.input} 
                placeholder="Course/Subject *"
                placeholderTextColor="#888"
                value={formData.courseName}
                onChangeText={(text) => setFormData({...formData, courseName: text})}
              />
              
              <Text style={styles.label}>Days Available * (Select multiple)</Text>
              <View style={styles.checkboxContainer}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                  <TouchableOpacity 
                    key={day}
                    style={[
                      styles.dayButton, 
                      formData.daysOfWeek.includes(day) && styles.dayButtonSelected
                    ]}
                    onPress={() => {
                      const newDays = formData.daysOfWeek.includes(day)
                        ? formData.daysOfWeek.filter(d => d !== day)
                        : [...formData.daysOfWeek, day];
                      setFormData({...formData, daysOfWeek: newDays});
                    }}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      formData.daysOfWeek.includes(day) && styles.dayButtonSelectedText
                    ]}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TextInput 
                style={styles.input} 
                placeholder="Email *"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#888"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
              />
              
              <TextInput 
                style={styles.input} 
                placeholder="Phone Number"
                keyboardType="phone-pad"
                placeholderTextColor="#888"
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
              />
              
              <Text style={styles.requiredText}>* Required fields</Text>
              
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
  },
  dayButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  dayButtonSelectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Layout
  container: { 
    flex: 1, 
    backgroundColor: '#121212' 
  },
  splitContainer: {
    flex: 1
  },
  half: {
    flex: 1
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Search
  searchInput: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    marginHorizontal: 16,
  },
  
  // Sections
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  
  // Group Cards
  groupItem: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    backgroundColor: '#1E1E1E',
  },
  groupCard: {
    padding: 16,
    borderRadius: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIcon: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 10 
  },
  groupTitle: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    marginBottom: 4 
  },
  groupDescription: { 
    color: '#B0B0B0', 
    fontSize: 12, 
    lineHeight: 16, 
    marginBottom: 6 
  },
  groupMembersRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  groupMembers: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  groupMembersTextStrong: { 
    color: '#D0D0D0', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  groupCode: { 
    color: '#A0A0A0', 
    fontWeight: '600', 
    fontSize: 12 
  },
  
  // Tutor Cards
  tutorList: {
    marginTop: 8,
  },
  tutorCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  requestButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  becomeTutorButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  becomeTutorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noTutorsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
  },
  tutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tutorAvatarImg: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
    marginRight: 12,
  },
  tutorAvatarFallback: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#8A2BE2', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12,
  },
  tutorAvatarText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  tutorName: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 15,
    marginBottom: 2,
  },
  tutorMeta: { 
    color: '#FFD700', 
    fontSize: 12 
  },
  tutorDepartment: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  tutorCourses: {
    color: '#007AFF',
    fontSize: 11,
    marginTop: 2,
  },
  
  // Buttons
  requestBtnSmall: { 
    backgroundColor: '#FFD700', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
  },
  requestBtnTextSmall: { 
    color: '#18191A', 
    fontWeight: 'bold',
    fontSize: 12,
  },
  joinBtn: { 
    backgroundColor: '#007AFF', 
    borderRadius: 8, 
    paddingVertical: 6, 
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  joinBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 12,
  },
  becomeTutorBtn: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    alignItems: 'center',
    marginTop: 16,
  },
  becomeTutorText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14,
  },
  
  // Modal
  modalContent: {
    flex: 1,
    padding: 16,
  },
  
  // Forms
  addTutorForm: {
    padding: 16,
  },
  formTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
    width: '100%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#81C784',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  requiredText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  formButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 32,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default TutorStudyGroupScreen;