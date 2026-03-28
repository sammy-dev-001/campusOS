import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

interface UserProfile {
  id: string;  // Changed from number to string to match MongoDB ObjectId
  username: string;
  display_name: string;
  firstName?: string;
  lastName?: string;
  profile_picture?: string;
  email?: string;
  bio?: string;
  university?: string;
}

interface UserContextType {
  user: UserProfile | null;
  updateUser: (userData: Partial<UserProfile>) => void;
  setUser: (user: UserProfile | null) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  updateUser: () => { },
  setUser: () => { }
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const { user: authUser, isAuthenticated } = useAuth();

  // Sync with AuthContext
  useEffect(() => {
    if (authUser && isAuthenticated) {
      const newUser: UserProfile = {
        id: String(authUser.id), // Ensure ID is a string
        username: authUser.username || '',
        display_name: authUser.display_name || authUser.username || '',
        profile_picture: authUser.profile_picture,
        email: authUser.email
      };
      setUser(prev => {
        if (
          !prev ||
          prev.id !== newUser.id ||
          prev.username !== newUser.username ||
          prev.display_name !== newUser.display_name ||
          prev.profile_picture !== newUser.profile_picture
        ) {
          return newUser;
        }
        return prev;
      });
    } else {
      setUser(null);
    }
  }, [authUser, isAuthenticated]);

  const updateUser = useCallback((userData: Partial<UserProfile>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  }, []);

  const value = useMemo(() => ({ user, updateUser, setUser }), [user, updateUser]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
