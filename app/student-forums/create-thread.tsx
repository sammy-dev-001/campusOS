import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../../config/api';
import { useUser } from '../../src/contexts/UserContext';

const CATEGORY_LABELS: Record<string, string> = {
  academics: 'Academics',
  rants: 'Rants',
  gist: 'Gist',
  events: 'Events',
};

const CATEGORY_OPTIONS = [
  { key: 'academics', label: 'Academics', icon: 'school-outline', color: '#6BCB77' },
  { key: 'rants', label: 'Rants', icon: 'megaphone-outline', color: '#FF6B6B' },
  { key: 'gist', label: 'Gist', icon: 'chatbubbles-outline', color: '#FFD93D' },
  { key: 'events', label: 'Events', icon: 'calendar-outline', color: '#4D96FF' },
];
const TAG_SUGGESTIONS = ['help', 'funny', 'urgent', 'study', 'party', 'exam', 'news'];

export default function CreateForumThreadScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [categoryPicker, setCategoryPicker] = useState(category || CATEGORY_OPTIONS[0].key);
  const [fabOpen, setFabOpen] = useState(false);
  const [animations] = useState(CATEGORY_OPTIONS.map(() => new Animated.Value(0)));

  const handleAddTag = () => {
    const clean = tagInput.replace(/^#/, '').trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleFab = () => {
    setFabOpen(open => {
      if (!open) {
        Animated.stagger(60, animations.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
            easing: Easing.out(Easing.exp),
          })
        )).start();
      } else {
        Animated.stagger(40, animations.map(anim =>
          Animated.timing(anim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.in(Easing.exp),
          })
        ).reverse()).start();
      }
      return !open;
    });
  };

  const handleCategorySelect = (key: string) => {
    setCategoryPicker(key);
    // Animate back in
    animations.forEach(anim => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.exp),
      }).start();
    });
    setFabOpen(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    if (!user) {
      Alert.alert('Not signed in', 'You must be signed in to create a thread.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/forum-threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category: categoryPicker,
          author_id: user.id,
          author_name: isAnonymous ? 'Anonymous' : `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          tags,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create thread');
      }
      setTitle('');
      setContent('');
      setTags([]);
      setIsAnonymous(false);
      Alert.alert('Success', 'Thread created successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create thread');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Forum Thread</Text>
        <View style={{ width: 24 }} />
      </View>
      {/* Show selected category only */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Ionicons name={CATEGORY_OPTIONS.find(opt => opt.key === categoryPicker)?.icon as any} size={18} color={CATEGORY_OPTIONS.find(opt => opt.key === categoryPicker)?.color} style={{ marginRight: 8 }} />
        <Text style={{ color: CATEGORY_OPTIONS.find(opt => opt.key === categoryPicker)?.color, fontWeight: 'bold', fontSize: 15 }}>{CATEGORY_OPTIONS.find(opt => opt.key === categoryPicker)?.label}</Text>
        {/* Optionally, add a small button to change category if you want */}
        {/* <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}><Text style={{ color: '#4D96FF' }}>Change</Text></TouchableOpacity> */}
      </View>
      {/* Anonymous Toggle */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
        onPress={() => setIsAnonymous(a => !a)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name={isAnonymous ? 'incognito' : 'account'} size={22} color={isAnonymous ? '#FFD93D' : '#888'} style={{ marginRight: 8, transform: [{ scale: isAnonymous ? 1.2 : 1 }] }} />
        <Text style={{ color: isAnonymous ? '#FFD93D' : '#888', fontWeight: 'bold', fontSize: 15 }}>{isAnonymous ? 'Posting as Anonymous' : 'Post as Anonymous?'}</Text>
      </TouchableOpacity>
      {/* Tag Area: Grouped with a moderate vertical gap */}
      <View style={{ marginBottom: 16, paddingBottom: 0 }}>
        {/* Tag Input */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TextInput
            style={{ backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 8, fontSize: 14, flex: 1, marginRight: 8 }}
            placeholder="Add #tags"
            placeholderTextColor="#888"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={handleAddTag}
          />
          <TouchableOpacity onPress={handleAddTag} style={{ backgroundColor: '#4D96FF', borderRadius: 8, padding: 8 }}>
            <Ionicons name="pricetag" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Tag Suggestions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, marginTop: 0 }} contentContainerStyle={{ alignItems: 'center' }}>
          {TAG_SUGGESTIONS.filter(tag => !tags.includes(tag)).map(tag => (
            <TouchableOpacity key={tag} onPress={() => { setTags([...tags, tag]); }} style={{ backgroundColor: '#232323', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 0 }}>
              <Text style={{ color: '#4D96FF', fontWeight: 'bold', fontSize: 13 }}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Selected Tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 0, marginTop: 0 }}>
          {tags.map(tag => (
            <TouchableOpacity key={tag} onPress={() => handleRemoveTag(tag)} style={{ backgroundColor: '#4D96FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 0 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>#{tag} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* Title and Content Inputs */}
      <TextInput
        style={styles.inputTitle}
        placeholder="Thread Title"
        placeholderTextColor="#888"
        value={title}
        onChangeText={setTitle}
        maxLength={80}
      />
      <TextInput
        style={styles.inputContent}
        placeholder="Write your message..."
        placeholderTextColor="#888"
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.submitBtn, (!title.trim() || !content.trim() || loading) && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={!title.trim() || !content.trim() || loading}
        activeOpacity={0.85}
      >
        <Text style={styles.submitBtnText}>{loading ? 'Posting...' : 'Post Thread'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 18,
  },
  categoryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  inputTitle: {
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputContent: {
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    marginBottom: 18,
  },
  submitBtn: {
    backgroundColor: '#4D96FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 