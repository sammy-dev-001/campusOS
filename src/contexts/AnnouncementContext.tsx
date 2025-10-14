import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';

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
      const res = await axios.get(`${API_BASE_URL}/announcements`);
      // Ensure we always set an array, even if the response is null/undefined
      const announcementsData = Array.isArray(res?.data) ? res.data : [];
      setAnnouncements(announcementsData);
      console.log('Fetched announcements:', announcementsData);
    } catch (e) {
      console.error('Error fetching announcements:', e);
      // Set to empty array on error to prevent undefined errors
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const addAnnouncement = async (data: Omit<Announcement, 'id' | 'date' | 'likes' | 'bookmarkedBy' | 'attachmentUrl'> & { attachment?: any }) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('message', data.message);
      formData.append('author', data.author);
      formData.append('category', data.category);
      
      if (data.attachment) {
        // For React Native, we need to create a proper file object
        const file = {
          uri: data.attachment.uri,
          name: data.attachment.name || `file-${Date.now()}`,
          type: data.attachment.type || 'application/octet-stream',
        };
        
        // @ts-ignore - React Native FormData type doesn't match the web API
        formData.append('file', file);
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/announcements`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        transformRequest: (data) => {
          return data; // Let axios handle the FormData
        },
      });
      
      await fetchAnnouncements();
      Alert.alert('Success', 'Announcement posted successfully!');
      return response.data;
    } catch (error: any) {
      console.error('Error posting announcement:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Could not post announcement';
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const editAnnouncement = async (id: number, data: Partial<Announcement> & { attachment?: any }) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      if (data.title) formData.append('title', data.title);
      if (data.message) formData.append('message', data.message);
      if (data.author) formData.append('author', data.author);
      if (data.category) formData.append('category', data.category);
      
      if (data.attachment) {
        // For React Native, we need to create a proper file object
        const file = {
          uri: data.attachment.uri,
          name: data.attachment.name || `file-${Date.now()}`,
          type: data.attachment.type || 'application/octet-stream',
        };
        
        // @ts-ignore - React Native FormData type doesn't match the web API
        formData.append('file', file);
      }

      const response = await axios.put(`${API_BASE_URL}/api/announcements/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        transformRequest: (data) => data, // Let axios handle the FormData
      });

      await fetchAnnouncements();
      Alert.alert('Success', 'Announcement updated successfully!');
      return response.data;
    } catch (error: any) {
      console.error('Error updating announcement:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Could not update announcement';
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAnnouncement = async (id: number) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      await axios.delete(`${API_BASE_URL}/api/announcements/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      
      await fetchAnnouncements();
      Alert.alert('Success', 'Announcement deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Could not delete announcement';
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const likeAnnouncement = async (id: number, userId: string) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/announcements/${id}/like`, 
        { userId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      
      await fetchAnnouncements();
      return response.data;
    } catch (error: any) {
      console.error('Error liking announcement:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Could not like announcement';
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bookmarkAnnouncement = async (id: number, userId: string) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/announcements/${id}/bookmark`,
        { userId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      
      await fetchAnnouncements();
      return response.data;
    } catch (error: any) {
      console.error('Error bookmarking announcement:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Could not bookmark announcement';
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnnouncementContext.Provider 
      value={{ 
        announcements, 
        isLoading, 
        addAnnouncement, 
        editAnnouncement, 
        deleteAnnouncement, 
        likeAnnouncement, 
        bookmarkAnnouncement, 
        fetchAnnouncements 
      }}
    >
      {children}
    </AnnouncementContext.Provider>
  );
};