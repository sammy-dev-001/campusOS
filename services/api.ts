import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      AsyncStorage.removeItem('token');
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  }
);

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isGroup: boolean;
}

interface User {
  id: string;
  name: string;
}

// Chat API
const chatApi = {
  getChats: () => apiClient.get<Chat[]>('/chats'),
  getMessages: (chatId: string) => apiClient.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId: string, content: string) => 
    apiClient.post(`/chats/${chatId}/messages`, { content }),
  createChat: (userId: string) => 
    apiClient.post<Chat>('/chats', { userId }),
  getChatDetails: (chatId: string) => 
    apiClient.get<Chat>(`/chats/${chatId}`),
  getGroups: () => 
    apiClient.get<Chat[]>('/chats/groups'),
  getDirectMessageConversations: () => 
    apiClient.get<Chat[]>('/chats/direct'),
  createDirectMessage: (userId: string) => 
    apiClient.post<Chat>('/chats/direct', { userId }),
  createGroup: (name: string, userIds: string[]) => 
    apiClient.post<Chat>('/chats/groups', { name, userIds }),
  addUserToGroup: (groupId: string, userId: string) => 
    apiClient.post(`/chats/groups/${groupId}/users`, { userId }),
};

// User API
const userApi = {
  getProfile: () => apiClient.get<User>('/users/profile'),
  updateProfile: (data: Partial<User>) => apiClient.put<User>('/users/profile', data),
  searchUsers: (query: string) => apiClient.get<User[]>(`/users/search?q=${query}`),
};

// Auth API
const authApi = {
  login: (identifier: string, password: string) => 
    apiClient.post('/login', { identifier, password }),
  register: (data: any) => apiClient.post('/signup', data),
  logout: () => apiClient.post('/logout')
};

export const api = {
  chat: chatApi,
  user: userApi,
  auth: authApi,
};

export default apiClient; 