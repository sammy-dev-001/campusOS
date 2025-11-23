import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../../../config/api';
import { useUser } from '../../../src/contexts/UserContext';

function buildCommentTree(flatComments: Array<{ id: number; parent_comment_id?: number | null }>): any[] {
  const map = new Map<number, any>();
  const roots: any[] = [];
  flatComments.forEach((comment) => {
    map.set(comment.id, { ...comment, replies: [] });
  });
  map.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = map.get(comment.parent_comment_id);
      if (parent) parent.replies.push(comment);
    } else {
      roots.push(comment);
    }
  });
  return roots;
}

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [thread, setThread] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [modalAnim] = useState(new Animated.Value(0));
  const inputRef = useRef<TextInput>(null);

  // Animation refs for upvotes/likes, emoji reactions, and trending
  const likeAnim = useRef(new Animated.Value(1)).current;
  const emojiAnims = useRef<Record<string, Animated.Value>>({}).current;
  const fireAnim = useRef(new Animated.Value(1)).current;

  // Upvote/like handler for thread
  const [liked, setLiked] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const handleLike = async () => {
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(likeAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setLiked(l => !l);
    setUpvotes(u => u + (liked ? -1 : 1));
    // TODO: Optionally send to backend
  };
  // Emoji reaction handler for thread
  const [emojiReactions, setEmojiReactions] = useState<Record<string, number>>({});
  const handleEmoji = (emoji: string) => {
    if (!emojiAnims[emoji]) emojiAnims[emoji] = new Animated.Value(1);

    Animated.sequence([
      Animated.timing(emojiAnims[emoji], { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(emojiAnims[emoji], { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setEmojiReactions(prev => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
    // TODO: Optionally send to backend
  };
  // Flicker fire icon for trending
  const animateFire = () => {
    Animated.sequence([
      Animated.timing(fireAnim, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.timing(fireAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(fireAnim, { toValue: 1, friction: 2, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    fetchThread();
    fetchComments();
    fetchUsers();
  }, [id]);

  const fetchThread = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/forum-threads?category=&id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setThread(Array.isArray(data) ? data[0] : data);
      }
    } catch {}
    setLoading(false);
  };

  const fetchComments = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/forum-threads/${id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(buildCommentTree(data));
      }
    } catch {}
    setRefreshing(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {}
  };

  const handleComment = async (parentId: number | null = null) => {
    if (!user || !commentText.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/forum-threads/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          username: user.display_name || user.username,
          content: commentText,
          parent_comment_id: parentId,
        }),
      });
      if (res.ok) {
        setCommentText('');
        setReplyingTo(null);
        fetchComments();
      }
    } catch {}
  };

  // Mention logic
  const handleInputChange = (text: string) => {
    setCommentText(text);
    const match = text.match(/@([\w]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowUserList(true);
    } else {
      setShowUserList(false);
      setMentionQuery('');
    }
  };
  const handleUserSelect = (username: string) => {
    const newText = commentText.replace(/@([\w]*)$/, `@${username} `);
    setCommentText(newText);
    setShowUserList(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };
  const filteredUsers = users.filter(u =>
    mentionQuery && (u.username.toLowerCase().includes(mentionQuery.toLowerCase()) || u.display_name.toLowerCase().includes(mentionQuery.toLowerCase()))
  );

  const renderCommentTree = (comment: any, level = 0) => (
    <View key={comment.id} style={{ marginLeft: level * 24, marginBottom: 14 }}>
      <View style={{ backgroundColor: level ? '#23242a' : '#181a20', borderRadius: 10, padding: 10 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{comment.username}</Text>
        <Text style={{ color: '#ccc', fontSize: 14, marginVertical: 2 }}>{comment.content}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text style={{ color: '#888', fontSize: 12 }}>{new Date(comment.timestamp).toLocaleString()}</Text>
          <TouchableOpacity style={{ marginLeft: 18 }} onPress={() => setReplyingTo(comment.id)}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color="#4D96FF" />
            <Text style={{ color: '#4D96FF', marginLeft: 4, fontSize: 13 }}>Reply</Text>
          </TouchableOpacity>
        </View>
        {replyingTo === comment.id && (
          <View style={{ marginTop: 8 }}>
            <TextInput
              ref={inputRef}
              style={{ backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 8, fontSize: 14, marginBottom: 6 }}
              placeholder="Write a reply..."
              placeholderTextColor="#888"
              value={commentText}
              onChangeText={handleInputChange}
              multiline
              autoFocus
            />
            {showUserList && filteredUsers.length > 0 && (
              <View style={styles.mentionList}>
                {filteredUsers.map(u => (
                  <TouchableOpacity key={u.id} style={styles.mentionItem} onPress={() => handleUserSelect(u.username)}>
                    <Text style={{ color: '#fff' }}>{u.display_name} <Text style={{ color: '#4D96FF' }}>@{u.username}</Text></Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={[styles.replyBtn, { flex: 1 }]} onPress={() => handleComment(comment.id)}>
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginLeft: 10, padding: 10 }} onPress={() => { setReplyingTo(null); setCommentText(''); }}>
                <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      {comment.replies && comment.replies.length > 0 && (
        <View style={{ marginTop: 4 }}>
          {comment.replies.map((reply: any) => renderCommentTree(reply, level + 1))}
        </View>
      )}
    </View>
  );

  const openReplyModal = () => {
    setShowReplyModal(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  };
  const closeReplyModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.exp),
      useNativeDriver: true,
    }).start(() => setShowReplyModal(false));
  };
  const handleReplyModalSubmit = async () => {
    await handleComment(null);
    closeReplyModal();
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#4D96FF" size="large" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {thread && (
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              {/* Trending fire icon animation */}
              {((thread.comment_count ?? 0) > 10 || (thread.upvotes ?? 0) > 10) && (
                <Animated.View style={{ marginRight: 6, transform: [{ scale: fireAnim }], shadowColor: '#FF6B6B', shadowOpacity: 0.7, shadowRadius: 8 }}>
                  <Ionicons name="flame" size={20} color="#FF6B6B" style={{ transform: [{ rotate: '-10deg' }] }} onPress={animateFire} />
                </Animated.View>
              )}
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 8 }}>{thread.title}</Text>
              {thread.tags && Array.isArray(thread.tags) && thread.tags.map((tag: string) => (
                <Text key={tag} style={{ backgroundColor: '#232323', color: '#4D96FF', borderRadius: 8, paddingHorizontal: 8, marginLeft: 6, fontSize: 12, fontWeight: 'bold' }}>#{tag}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {/* Upvote/like animation */}
              <TouchableOpacity onPress={handleLike} style={{ marginRight: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FF6B6B' : '#888'} />
                </Animated.View>
                <Animated.Text style={{ color: liked ? '#FF6B6B' : '#888', fontWeight: 'bold', marginLeft: 4, transform: [{ scale: likeAnim }] }}>{(thread.upvotes || 0) + upvotes}</Animated.Text>
              </TouchableOpacity>
              {/* Emoji reactions animation */}
              {['😂', '🔥', '👍', '😱'].map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => handleEmoji(emoji)} style={{ marginRight: 8 }}>
                  <Animated.Text style={{ fontSize: 18, transform: [{ scale: emojiAnims[emoji] || 1 }] }}>{emoji}</Animated.Text>
                  {emojiReactions[emoji] ? <Text style={{ color: '#FFD93D', fontSize: 12, fontWeight: 'bold', position: 'absolute', top: -8, right: -8 }}>{emojiReactions[emoji]}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: '#4D96FF', fontWeight: 'bold', marginBottom: 4 }}>{thread.category}</Text>
            <Text style={{ color: '#ccc', fontSize: 15 }}>{thread.content}</Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>By {thread.author_name} • {thread.timestamp ? new Date(thread.timestamp).toLocaleString() : ''}</Text>
          </View>
        )}
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Comments</Text>
        {comments.length === 0 ? (
          <Text style={{ color: '#888', marginBottom: 18 }}>No comments yet. Be the first to comment!</Text>
        ) : (
          comments.map(comment => renderCommentTree(comment))
        )}
      </ScrollView>
      {/* Floating Reply Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          right: 24,
          bottom: 32,
          backgroundColor: '#4D96FF',
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
        }}
        onPress={openReplyModal}
        activeOpacity={0.85}
      >
        <Animated.View style={{
          transform: [{ scale: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
        }}>
          <Ionicons name="chatbubble-ellipses" size={30} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
      {/* Animated Reply Modal */}
      <Modal visible={showReplyModal} transparent animationType="fade" onRequestClose={closeReplyModal}>
        <Animated.View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'flex-end',
          opacity: modalAnim,
        }}>
          <Animated.View style={{
            backgroundColor: '#181a20',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            padding: 24,
            paddingBottom: 36,
            width: '100%',
            transform: [{ translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
            opacity: modalAnim,
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, marginBottom: 10 }}>Reply to Thread</Text>
            <TextInput
              ref={inputRef}
              style={{ backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 6 }}
              placeholder="Add a comment..."
              placeholderTextColor="#888"
              value={replyingTo === null ? commentText : ''}
              onChangeText={replyingTo === null ? handleInputChange : undefined}
              multiline
              autoFocus
            />
            {showUserList && filteredUsers.length > 0 && replyingTo === null && (
              <View style={styles.mentionList}>
                {filteredUsers.map(u => (
                  <TouchableOpacity key={u.id} style={styles.mentionItem} onPress={() => handleUserSelect(u.username)}>
                    <Text style={{ color: '#fff' }}>{u.display_name} <Text style={{ color: '#4D96FF' }}>@{u.username}</Text></Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <TouchableOpacity style={[styles.replyBtn, { flex: 1 }]} onPress={handleReplyModalSubmit}>
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Post Comment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginLeft: 10, padding: 10 }} onPress={closeReplyModal}>
                <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  mentionList: {
    backgroundColor: '#232323',
    borderRadius: 8,
    marginBottom: 6,
    paddingVertical: 4,
    maxHeight: 120,
  },
  mentionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  replyBtn: {
    backgroundColor: '#4D96FF',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
}); 