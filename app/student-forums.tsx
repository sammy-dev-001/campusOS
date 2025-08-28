import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { API_BASE_URL } from '../config/api';

const CATEGORIES = [
  { key: 'academics', label: 'Academics', icon: 'school-outline', color: '#6BCB77' },
  { key: 'rants', label: 'Rants', icon: 'megaphone-outline', color: '#FF6B6B' },
  { key: 'gist', label: 'Gist', icon: 'chatbubbles-outline', color: '#FFD93D' },
  { key: 'events', label: 'Events', icon: 'calendar-outline', color: '#4D96FF' },
];

const SORT_OPTIONS = [
  { key: 'latest', label: 'Latest' },
  { key: 'popular', label: 'Popular' },
  { key: 'most_replies', label: 'Most Replies' },
];

type Thread = {
  id: number;
  title: string;
  content: string;
  category: string;
  author_id: number;
  author_name: string;
  timestamp: string;
  comment_count?: number;
  upvotes?: number;
  tags?: string[];
};

export default function StudentForumsScreen() {
  const [categories] = useState(CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('academics');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [modalAnim] = useState(new Animated.Value(0));
  const [threads, setThreads] = useState<Thread[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState('latest');
  const [likedThreads, setLikedThreads] = useState<{ [id: number]: boolean }>({});
  const [emojiReactions, setEmojiReactions] = useState<{ [id: number]: { [emoji: string]: number } }>({});
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [animations] = useState(CATEGORIES.map(() => new Animated.Value(0)));

  // Animation refs for upvotes/likes, emoji reactions, and trending
  const likeAnims = useRef<Record<number, Animated.Value>>({}).current;
  const emojiAnims = useRef<Record<string, Animated.Value>>({}).current;
  const fireAnims = useRef<Record<number, Animated.Value>>({}).current;

  // Track which emojis the user has reacted to per thread
  const [userEmojiReactions, setUserEmojiReactions] = useState<Record<number, string[]>>({});

  const fetchThreads = async (category: string) => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/forum-threads?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error('Failed to fetch threads');
      let data = await res.json();
      // Fetch comment counts for each thread
      const counts = await Promise.all(
        data.map(async (thread: Thread) => {
          try {
            const res2 = await fetch(`${API_BASE_URL}/forum-threads/${thread.id}/comments`);
            if (!res2.ok) return 0;
            const comments = await res2.json();
            return Array.isArray(comments) ? comments.length : 0;
          } catch { return 0; }
        })
      );
      data = data.map((thread: Thread, i: number) => ({ ...thread, comment_count: counts[i] }));
      setThreads(data);
    } catch (e) {
      setThreads([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchThreads(activeCategory);
  }, [activeCategory]);

  const onRefresh = () => {
    fetchThreads(activeCategory);
  };

  const openCategoryModal = () => {
    setShowCategoryModal(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  };

  const closeCategoryModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.exp),
      useNativeDriver: true,
    }).start(() => setShowCategoryModal(false));
  };

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    closeCategoryModal();
    setTimeout(() => {
      router.push({ pathname: '/student-forums/create-thread', params: { category: cat.key } });
    }, 250);
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

  const handleFabCategorySelect = (cat: typeof CATEGORIES[0]) => {
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
    setTimeout(() => {
      router.push({ pathname: '/student-forums/create-thread', params: { category: cat.key } });
    }, 250);
  };

  // Sort threads based on selected sort option
  const sortedThreads = [...threads].sort((a, b) => {
    if (sort === 'latest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (sort === 'popular') {
      return (b.upvotes || 0) - (a.upvotes || 0);
    } else if (sort === 'most_replies') {
      return (b.comment_count || 0) - (a.comment_count || 0);
    }
    return 0;
  });

  // Upvote/like handler
  const handleLike = async (threadId: number) => {
    if (!likeAnims[threadId]) likeAnims[threadId] = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(likeAnims[threadId], { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(likeAnims[threadId], { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setLikedThreads(prev => ({ ...prev, [threadId]: !prev[threadId] }));
    try {
      await fetch(`${API_BASE_URL}/forum-threads/${threadId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: !likedThreads[threadId] }),
      });
      fetchThreads(activeCategory); // Re-fetch to update upvotes
    } catch {}
  };

  // Emoji reaction handler
  const handleEmoji = (threadId: number, emoji: string) => {
    const key = `${threadId}_${emoji}`;
    if (!emojiAnims[key]) emojiAnims[key] = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(emojiAnims[key], { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(emojiAnims[key], { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setEmojiReactions(prev => {
      const current = prev[threadId]?.[emoji] || 0;
      const userHasReacted = userEmojiReactions[threadId]?.includes(emoji);
      const newCount = userHasReacted ? Math.max(0, current - 1) : current + 1;
      return {
        ...prev,
        [threadId]: {
          ...(prev[threadId] || {}),
          [emoji]: newCount,
        },
      };
    });
    setUserEmojiReactions(prev => {
      const userSet = new Set(prev[threadId] || []);
      if (userSet.has(emoji)) {
        userSet.delete(emoji);
      } else {
        userSet.add(emoji);
      }
      return { ...prev, [threadId]: Array.from(userSet) };
    });
    // TODO: Optionally send to backend
  };

  // Flicker fire icon for trending
  const animateFire = (threadId: number) => {
    if (!fireAnims[threadId]) fireAnims[threadId] = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(fireAnims[threadId], { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.timing(fireAnims[threadId], { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(fireAnims[threadId], { toValue: 1, friction: 2, useNativeDriver: true }),
    ]).start();
  };

  return (
    <>
      <ThemedView style={[styles.container, { flexDirection: 'row', paddingTop: 0, paddingHorizontal: 0 }]}> 
        {/* Sidebar: Categories */}
        <View style={{ width: 80, backgroundColor: '#181a20', paddingTop: 40, borderRightWidth: 1, borderRightColor: '#232323', alignItems: 'center', borderTopRightRadius: 18, borderBottomRightRadius: 18, minHeight: '100%' }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 18, letterSpacing: 1 }}>Forums</Text>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={{
                backgroundColor: activeCategory === cat.key ? cat.color : 'transparent',
                borderRadius: 16,
                marginBottom: 14,
                width: 56,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: activeCategory === cat.key ? 2 : 0,
                borderColor: activeCategory === cat.key ? '#fff' : 'transparent',
                shadowColor: activeCategory === cat.key ? cat.color : 'transparent',
                shadowOpacity: activeCategory === cat.key ? 0.4 : 0,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: activeCategory === cat.key ? 6 : 0,
                position: 'relative',
              }}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={cat.icon as any} size={28} color={activeCategory === cat.key ? '#fff' : cat.color} style={{ marginBottom: 2 }} />
              <Text style={{ color: activeCategory === cat.key ? '#fff' : '#aaa', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>{cat.label}</Text>
              {/* Future: Trending/hot indicator or notification dot */}
              {/* {cat.key === 'events' && <View style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B6B' }} />} */}
            </TouchableOpacity>
          ))}
        </View>
        {/* Main Content: Threads */}
        <View style={{ flex: 1, backgroundColor: '#121212', paddingTop: 40 }}>
          <Text style={styles.header}>Student Forums</Text>
          {/* Filter/Sort Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 12 }}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={{
                  backgroundColor: sort === opt.key ? '#4D96FF' : '#232323',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  marginRight: 10,
                }}
                onPress={() => setSort(opt.key)}
              >
                <Text style={{ color: sort === opt.key ? '#fff' : '#aaa', fontWeight: 'bold', fontSize: 13 }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={sortedThreads}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 100, marginTop: 0 }}
            renderItem={({ item }) => {
              const isTrending = (item.comment_count ?? 0) > 10 || (item.upvotes ?? 0) > 10;
              const isAnonymous = item.author_name?.toLowerCase() === 'anonymous';
              const liked = likedThreads[item.id];
              const emojis = emojiReactions[item.id] || {};
              return (
                <TouchableOpacity style={[styles.threadCard, isTrending && { borderColor: '#FF6B6B', borderWidth: 2, shadowColor: '#FF6B6B', shadowOpacity: 0.2, shadowRadius: 8 }]} onPress={() => router.push(`/student-forums/thread/${item.id}`)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    {isTrending && (
                      <Animated.View style={{ marginRight: 6, transform: [{ scale: fireAnims[item.id] || 1 }], shadowColor: '#FF6B6B', shadowOpacity: 0.7, shadowRadius: 8 }}>
                        <MaterialCommunityIcons name="fire" size={18} color="#FF6B6B" style={{ transform: [{ rotate: '-10deg' }] }} onPress={() => animateFire(item.id)} />
                      </Animated.View>
                    )}
                    <ThemedText style={styles.threadTitle}>{item.title}</ThemedText>
                    {item.tags && Array.isArray(item.tags) && item.tags.map((tag: string) => (
                      <Text key={tag} style={{ backgroundColor: '#232323', color: '#4D96FF', borderRadius: 8, paddingHorizontal: 8, marginLeft: 6, fontSize: 12, fontWeight: 'bold' }}>#{tag}</Text>
                    ))}
                  </View>
                  <Text style={{ color: '#ccc', fontSize: 14, marginBottom: 6 }} numberOfLines={2}>
                    {item.content}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    {isAnonymous ? (
                      <MaterialCommunityIcons name="incognito" size={18} color="#FFD93D" style={{ marginRight: 4 }} />
                    ) : (
                      <Ionicons name="person-circle-outline" size={18} color="#888" style={{ marginRight: 4 }} />
                    )}
                    <Text style={styles.threadMeta}>{isAnonymous ? 'Anonymous' : item.author_name || 'User'}</Text>
                    <Text style={styles.threadMeta}>• {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</Text>
                    <Text style={styles.threadMeta}>• {item.comment_count ?? 0} {item.comment_count === 1 ? 'reply' : 'replies'}</Text>
                  </View>
                  {/* Upvote/Like and Emoji Reactions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <TouchableOpacity onPress={() => handleLike(item.id)} style={{ marginRight: 16, flexDirection: 'row', alignItems: 'center' }}>
                      <Animated.View style={{ transform: [{ scale: likeAnims[item.id] || 1 }] }}>
                        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FF6B6B' : '#888'} />
                      </Animated.View>
                      <Animated.Text style={{ color: liked ? '#FF6B6B' : '#888', fontWeight: 'bold', marginLeft: 4, transform: [{ scale: likeAnims[item.id] || 1 }] }}>{(item.upvotes || 0) + (liked ? 1 : 0)}</Animated.Text>
                    </TouchableOpacity>
                    {/* Emoji reactions */}
                    {['😂', '🔥', '👍', '😱'].map(emoji => {
                      const userHasReacted = (userEmojiReactions[item.id] || []).includes(emoji);
                      return (
                        <TouchableOpacity key={emoji} onPress={() => handleEmoji(item.id, emoji)} style={{ marginRight: 8 }}>
                          <Animated.Text style={{ fontSize: 18, opacity: userHasReacted ? 1 : 0.7, transform: [{ scale: emojiAnims[`${item.id}_${emoji}`] || 1 }] }}>{emoji}</Animated.Text>
                          {emojis[emoji] ? <Text style={{ color: '#FFD93D', fontSize: 12, fontWeight: 'bold', position: 'absolute', top: -8, right: -8 }}>{emojis[emoji]}</Text> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<ThemedText style={styles.noThreads}>No threads yet.</ThemedText>}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
          {/* Animated Exploding FAB for Category Selection */}
          <View style={{ position: 'absolute', bottom: 36, right: 24, zIndex: 20 }} pointerEvents="box-none">
            {CATEGORIES.map((cat, i) => {
              // Explode towards top left: arc from 180deg (left) to 270deg (up)
              const angle = Math.PI + (Math.PI / 2) * (i / (CATEGORIES.length - 1));
              const radius = 130; // Increased from 90 to 130 for more outward movement
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <Animated.View
                  key={cat.key}
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    opacity: animations[i],
                    transform: [
                      { translateX: animations[i].interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
                      { translateY: animations[i].interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
                      { scale: animations[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] }) },
                    ],
                  }}
                  pointerEvents={fabOpen ? 'auto' : 'none'}
                >
                  <TouchableOpacity
                    onPress={() => handleFabCategorySelect(cat)}
                    style={{
                      backgroundColor: cat.color,
                      borderRadius: 32,
                      width: 56,
                      height: 56,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      elevation: 6,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={cat.icon as any} size={28} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
            <TouchableOpacity
              onPress={toggleFab}
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
          </View>
        </View>
      </ThemedView>
      {/* Remove the old modal-based category picker */}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 40,
    paddingHorizontal: 0,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    alignSelf: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 0,
  },
  categoryBox: {
    backgroundColor: '#232323',
    borderRadius: 8,
    height: 68,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 80,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  categoryBoxLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 4,
  },
  threadCard: {
    backgroundColor: '#232323',
    borderRadius: 14,
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  threadTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  threadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  threadMeta: {
    color: '#A0A0A0',
    fontSize: 13,
    marginRight: 10,
  },
  noThreads: {
    color: '#888',
    alignSelf: 'center',
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    backgroundColor: '#007AFF',
    borderRadius: 32,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
}); 