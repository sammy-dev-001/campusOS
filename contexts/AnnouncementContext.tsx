import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../config/api';

export type AnnouncementCategory = 'General' | 'Academic' | 'Social' | 'Emergency';

export interface Announcement {
  id: number;
  title: string;
  message: string;
  author: string;
  date: number;
  category: AnnouncementCategory;
  attachmentUrl?: string;
  likes: number;
  likedBy: string[];
  bookmarkedBy: string[];
  profile_picture?: string; // Add this line
}

interface AnnouncementContextType {
  announcements: Announcement[];
  isLoading: boolean;
  addAnnouncement: (data: Omit<Announcement, 'id' | 'date' | 'likes' | 'bookmarkedBy' | 'attachmentUrl'> & { attachment?: any }) => Promise<void>;
  editAnnouncement: (id: number, data: Partial<Announcement> & { attachment?: any }) => Promise<void>;
  deleteAnnouncement: (id: number) => Promise<void>;
  likeAnnouncement: (id: number, userId: string) => Promise<void>;
  bookmarkAnnouncement: (id: number, userId: string) => Promise<void>;
  fetchAnnouncements: () => Promise<void>;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export const useAnnouncements = () => {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) throw new Error('useAnnouncements must be used within AnnouncementProvider');
  return ctx;
};

export const AnnouncementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/announcements`);
      setAnnouncements(res.data);
      console.log('Fetched announcements:', res.data);
    } catch (e) {
      console.error('Error fetching announcements:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const addAnnouncement = async (data: Omit<Announcement, 'id' | 'date' | 'likes' | 'bookmarkedBy' | 'attachmentUrl'> & { attachment?: any }) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('message', data.message);
    formData.append('author', data.author);
    formData.append('category', data.category);
    if (data.attachment) {
      formData.append('attachment', data.attachment);
    }
    try {
      await axios.post(`${API_BASE_URL}/api/announcements`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchAnnouncements();
      Alert.alert('Success', 'Announcement posted!');
    } catch (e) {
      console.error('Error posting announcement:', e);
      Alert.alert('Error', 'Could not post announcement.');
    }
  };

  const editAnnouncement = async (id: number, data: Partial<Announcement> & { attachment?: any }) => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.message) formData.append('message', data.message);
    if (data.author) formData.append('author', data.author);
    if (data.category) formData.append('category', data.category);
    if (data.attachment) formData.append('attachment', data.attachment);
    try {
      await axios.put(`${API_BASE_URL}/api/announcements/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchAnnouncements();
      Alert.alert('Success', 'Announcement updated!');
    } catch (e) {
      console.error('Error editing announcement:', e);
      Alert.alert('Error', 'Could not update announcement.');
    }
  };

  const deleteAnnouncement = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/announcements/${id}`);
      await fetchAnnouncements();
      Alert.alert('Deleted', 'Announcement deleted.');
    } catch (e) {
      console.error('Error deleting announcement:', e);
      Alert.alert('Error', 'Could not delete announcement.');
    }
  };

  const likeAnnouncement = async (id: number, userId: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/announcements/${id}/like`, { userId });
      console.log('Like response:', res.data);
      await fetchAnnouncements();
    } catch (e) {
      console.error('Error liking announcement:', e);
    }
  };

  const bookmarkAnnouncement = async (id: number, userId: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/announcements/${id}/bookmark`, { userId });
      console.log('Bookmark response:', res.data);
      await fetchAnnouncements();
    } catch (e) {
      console.error('Error bookmarking announcement:', e);
    }
  };

  return (
    <AnnouncementContext.Provider value={{ announcements, isLoading, addAnnouncement, editAnnouncement, deleteAnnouncement, likeAnnouncement, bookmarkAnnouncement, fetchAnnouncements }}>
      {children}
    </AnnouncementContext.Provider>
  );
}; 