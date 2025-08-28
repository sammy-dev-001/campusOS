import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://172.26.95.216:3001'; // Using local IP for mobile development

export default function TutorStudyGroupScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const [groupSort, setGroupSort] = useState<'members'|'code'>('members');
  const [search, setSearch] = useState('');
  const [fabAnim] = useState(new Animated.Value(0));
  const [fabOpen, setFabOpen] = useState(false);
  const [fabOptionsAnim] = useState([new Animated.Value(0), new Animated.Value(0)]);
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  const ICONS = ['flower-tulip','sparkles','book-open-variant','code-tags','flask','pi','palette','atom'];
  const COLORS = ['#F5B7B1','#A9CCE3','#AED6F1','#A3E4D7','#F9E79F','#E8DAEF','#FADBD8','#D6EAF8'];
  const pickIcon = (key: string) => {
    let hash = 0; for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return { icon: ICONS[hash % ICONS.length], color: COLORS[hash % COLORS.length] };
  };

  const fetchStudyGroups = async () => {
    try {
      if (!user?.id) return;
      const res = await fetch(`${API_URL}/chats?type=study_group&userId=${user.id}`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = await res.text().catch(() => '');
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
      const res = await fetch(`${API_URL}/tutors`);
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
      const res = await fetch(`${API_URL}/chat-groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const bodyText = await res.text();
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
    // router.push('/tutor-request'); // Implement this screen if needed
    alert('Request Tutor (not implemented)');
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  splitContainer: { flex: 1, flexDirection: 'column' },
  half: { flex: 1 },
  sectionContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#18191A' },
  searchInput: { flex: 1, backgroundColor: '#23272F', borderRadius: 10, color: '#fff', paddingHorizontal: 12, marginHorizontal: 12, height: 40 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8A2BE2', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8, paddingHorizontal: 16 },
  sectionHeader: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionSubtitle: { color: '#B0B0B0', fontSize: 14, marginTop: 4, marginBottom: 12, paddingHorizontal: 16 },
  tutorList: { paddingHorizontal: 12 },
  tutorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18191A', padding: 10, borderRadius: 12, marginBottom: 8 },
  tutorAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  tutorAvatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8A2BE2', justifyContent: 'center', alignItems: 'center' },
  tutorAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tutorName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  tutorMeta: { color: '#FFD700', fontSize: 12 },
  requestBtnSmall: { backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  requestBtnTextSmall: { color: '#18191A', fontWeight: 'bold' },
  becomeTutorBtn: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  becomeTutorText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  groupItem: {
    width: 160,
    marginBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    flexShrink: 0,
  },
  groupCard: {
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 12,
    height: 160,
    justifyContent: 'space-between',
  },
  groupIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  groupCode: { color: '#A0A0A0', fontWeight: '600', fontSize: 12 },
  groupTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  groupDescription: { color: '#B0B0B0', fontSize: 12, lineHeight: 16, marginBottom: 6 },
  groupMembersRow: { flexDirection: 'row', alignItems: 'center' },
  groupMembersTextStrong: { color: '#D0D0D0', fontSize: 13, fontWeight: '600' },
  joinBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
}); 