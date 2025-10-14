import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Auth Stack
  login: undefined;
  signup: undefined;
  forgotPassword: undefined;
  
  // Main Tabs
  home: undefined;
  profile: { userId: string };
  settings: undefined;
  
  // Chat
  chat: { chatId: string };
  
  // Other screens
  'events/[id]': {
    id: string;
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    image?: string;
    category?: string;
  };
  
  // Add other routes as needed
  [key: string]: object | undefined;
};

// This type can be used with useNavigation hook
export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;
