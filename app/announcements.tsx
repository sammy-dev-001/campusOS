import { Feather, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/NewThemeContext';
import { Announcement, AnnouncementCategory, useAnnouncements } from '../src/contexts/AnnouncementContext';
import { API_BASE_URL } from '../src/constants/Config';
import { BrandColors } from '../src/theme/edufi';

const CATEGORY_OPTIONS: AnnouncementCategory[] = ['General', 'Academic', 'Social', 'Emergency'];
const CURRENT_USER_ID = 'user1'; // Replace with actual user ID from context if available

function AnnouncementCard({ item, onPress, onLike, onBookmark }: { item: Announcement, onPress: () => void, onLike: () => void, onBookmark: () => void }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const isLiked = item.likedBy && item.likedBy.includes(CURRENT_USER_ID);
  const isBookmarked = item.bookmarkedBy && item.bookmarkedBy.includes(CURRENT_USER_ID);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.cardAvatar} />
        ) : item.attachmentUrl ? (
          <Image source={{ uri: item.attachmentUrl }} style={styles.cardAvatar} />
        ) : (
          <View style={[styles.cardAvatar, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="notifications" size={24} color="#fff" />
          </View>
        )}
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardAuthor}>{item.author}</Text>
          <Text style={styles.cardDate}>{new Date(item.date).toLocaleString()}</Text>
        </View>
        <View style={[styles.cardTag, item.category !== 'General' && styles.facultyTag]}>
          <Text style={styles.cardTagText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>{item.message}</Text>
      <View style={styles.cardFooter}>
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.readMore}>Read More &gt;</Text>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onLike}>
            <Feather name="heart" size={20} color={isLiked ? '#F55' : '#888'} />
          </TouchableOpacity>
          <Text style={{ color: '#888', marginLeft: 4 }}>{item.likedBy ? item.likedBy.length : 0}</Text>
          <TouchableOpacity style={{ marginLeft: 20 }} onPress={onBookmark}>
            <Feather name="bookmark" size={20} color={isBookmarked ? BrandColors.brandGreen : '#888'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AnnouncementFormModal({ visible, onClose, onSubmit }: { visible: boolean, onClose: () => void, onSubmit: (data: any) => void }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('General');
  const [attachment, setAttachment] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setAttachment({
          uri: result.assets[0].uri,
          name: result.assets[0].name,
          type: result.assets[0].mimeType || 'application/octet-stream',
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick attachment.');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim() || !author.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    await onSubmit({ title, message, author, category, attachment });
    setIsSubmitting(false);
    setTitle(''); setMessage(''); setAuthor(''); setCategory('General'); setAttachment(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={{ padding: 20 }}>
          <Text style={styles.formHeader}>Post New Announcement</Text>
          <TextInput style={styles.input} placeholder="Title*" placeholderTextColor="#AAA" value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Message*" placeholderTextColor="#AAA" value={message} onChangeText={setMessage} multiline />
          <TextInput style={styles.input} placeholder="Author*" placeholderTextColor="#AAA" value={author} onChangeText={setAuthor} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORY_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt} style={[styles.pickerOption, category === opt && styles.pickerOptionActive]} onPress={() => setCategory(opt)}>
                    <Text style={[styles.pickerOptionText, category === opt && styles.pickerOptionTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={styles.filePickerButton} onPress={handlePickAttachment}>
            <Ionicons name="cloud-upload-outline" size={24} color={BrandColors.brandGreen} />
            <Text style={styles.filePickerText}>{attachment ? attachment.name : 'Select an attachment (optional)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Posting...' : 'Post Announcement'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function AnnouncementDetailModal({ visible, onClose, announcement, onEdit, onDelete, onLike, onBookmark }: {
  visible: boolean, onClose: () => void, announcement: Announcement | null, onEdit: () => void, onDelete: () => void, onLike: () => void, onBookmark: () => void
}) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  if (!announcement) return null;
  const isLiked = announcement.likedBy && announcement.likedBy.includes(CURRENT_USER_ID);
  const isBookmarked = announcement.bookmarkedBy && announcement.bookmarkedBy.includes(CURRENT_USER_ID);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.cardHeader}>
            {announcement.profile_picture ? (
              <Image source={{ uri: announcement.profile_picture }} style={styles.cardAvatar} />
            ) : announcement.attachmentUrl ? (
              <Image source={{ uri: announcement.attachmentUrl }} style={styles.cardAvatar} />
            ) : (
              <View style={[styles.cardAvatar, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="notifications" size={24} color="#fff" />
              </View>
            )}
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardAuthor}>{announcement.author}</Text>
              <Text style={styles.cardDate}>{new Date(announcement.date).toLocaleString()}</Text>
            </View>
            <View style={[styles.cardTag, announcement.category !== 'General' && styles.facultyTag]}>
              <Text style={styles.cardTagText}>{announcement.category}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>{announcement.title}</Text>
          <Text style={styles.cardContent}>{announcement.message}</Text>
          {announcement.attachmentUrl && (
            <TouchableOpacity
              onPress={() => {
                if (!announcement.attachmentUrl) return;
                if (Platform.OS === 'web') {
                  window.open(announcement.attachmentUrl, '_blank');
                } else {
                  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
                  const url = announcement.attachmentUrl.startsWith('http')
                    ? announcement.attachmentUrl
                    : `${baseUrl}${announcement.attachmentUrl}`;
                  WebBrowser.openBrowserAsync(url);
                }
              }}
            >
              <Text style={{ color: '#007AFF', marginTop: 10 }}>View Attachment</Text>
            </TouchableOpacity>
          )}
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={onLike}>
              <Feather name="heart" size={20} color={isLiked ? '#F55' : '#888'} />
            </TouchableOpacity>
            <Text style={{ color: '#888', marginLeft: 4 }}>{announcement.likedBy ? announcement.likedBy.length : 0}</Text>
            <TouchableOpacity style={{ marginLeft: 20 }} onPress={onBookmark}>
              <Feather name="bookmark" size={20} color={isBookmarked ? BrandColors.brandGreen : '#888'} />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 20 }} onPress={onEdit}>
              <Feather name="edit" size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 20 }} onPress={onDelete}>
              <Feather name="trash-2" size={20} color="#F55" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function AnnouncementsScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { announcements, isLoading, addAnnouncement, deleteAnnouncement, likeAnnouncement, bookmarkAnnouncement } = useAnnouncements();
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [activeFilter, setActiveFilter] = useState<AnnouncementCategory | 'All'>('All');

  useEffect(() => {
    if (selectedAnnouncement) {
      const updated = announcements.find((a: Announcement) => a.id === selectedAnnouncement.id);
      if (updated) setSelectedAnnouncement(updated);
    }
  }, [announcements]);

  const filtered = announcements.filter((a: Announcement) => activeFilter === 'All' || a.category === activeFilter);

  const handleLike = (id: number) => {
    console.log('Like button pressed for announcement:', id);
    likeAnnouncement(id, 'user1');
  };
  const handleBookmark = (id: number) => {
    console.log('Bookmark button pressed for announcement:', id);
    bookmarkAnnouncement(id, 'user1');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={{ marginRight: 10 }} />
        <TextInput placeholder="Search announcements..." placeholderTextColor="#888" style={styles.searchInput} />
      </View>
      {/* Filters */}
      <View style={styles.filterContainer}>
        {(['All', ...CATEGORY_OPTIONS] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, activeFilter === filter && styles.activeFilter]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Announcements List */}
      {isLoading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="notifications-off" size={64} color="#666" />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16 }}>No Announcements</Text>
          <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8 }}>Tap the button below to post the first announcement!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={({ item }) => (
            <AnnouncementCard
              item={item}
              onPress={() => { setSelectedAnnouncement(item); setDetailVisible(true); }}
              onLike={() => handleLike(item.id)}
              onBookmark={() => handleBookmark(item.id)}
            />
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setFormVisible(true)}>
        <Ionicons name="add" size={24} color="#fff" style={{ marginRight: 5 }} />
        <Text style={styles.fabText}>Post New Announcement</Text>
      </TouchableOpacity>
      {/* Modals */}
      <AnnouncementFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSubmit={addAnnouncement} />
      <AnnouncementDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        announcement={selectedAnnouncement}
        onEdit={() => { }}
        onDelete={() => { selectedAnnouncement && deleteAnnouncement(selectedAnnouncement.id); setDetailVisible(false); }}
        onLike={() => selectedAnnouncement && handleLike(selectedAnnouncement.id)}
        onBookmark={() => selectedAnnouncement && handleBookmark(selectedAnnouncement.id)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardAlt,
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    marginTop: 20,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#1E1E1E',
  },
  activeFilter: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#fff',
  },
  activeFilterText: {
    color: '#000',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the FAB
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardAuthor: {
    color: theme.text,
    fontWeight: 'bold',
  },
  cardDate: {
    color: theme.secondary,
    fontSize: 12,
  },
  cardTag: {
    backgroundColor: theme.cardAlt,
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  facultyTag: {
    backgroundColor: '#F3B62D'
  },
  cardTagText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardContent: {
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 15,
  },
  readMore: {
    color: BrandColors.brandGreen,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -125, // Half of width
    width: 250,
    height: 50,
    borderRadius: 25,
    backgroundColor: BrandColors.brandGreen,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formHeader: {
    color: theme.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    backgroundColor: theme.cardAlt,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    color: theme.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: theme.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  pickerContainer: {
    backgroundColor: theme.cardAlt,
    borderRadius: 5,
    padding: 5,
  },
  pickerOption: {
    padding: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  pickerOptionActive: {
    backgroundColor: theme.background,
  },
  pickerOptionText: {
    color: theme.text,
  },
  pickerOptionTextActive: {
    color: theme.text,
    fontWeight: 'bold',
  },
  filePickerButton: {
    backgroundColor: theme.cardAlt,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filePickerText: {
    color: theme.text,
    fontSize: 16,
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: BrandColors.brandGreen,
    borderRadius: 5,
    padding: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#888',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 