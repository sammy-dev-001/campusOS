// Define the parameter list for your root stack navigator
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

// Add this if you're using React Navigation v6+
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
