import { LinkProps } from 'expo-router';

declare module 'expo-router' {
  interface LinkProps {
    href: string | Href<string> | Href<Record<string, any>>;
  }
  
  interface Router {
    push: (href: string | { pathname: string; params?: Record<string, any> }) => void;
    replace: (href: string | { pathname: string; params?: Record<string, any> }) => void;
  }
}

declare global {
  namespace ReactNavigation {
    interface RootParamList {
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
    }
  }
}
