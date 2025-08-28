import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  profile_picture?: string;
  email?: string;
  bio?: string;
}

interface UserContextType {
  user: UserProfile | null;
  updateUser: (userData: Partial<UserProfile>) => void;
  setUser: (user: UserProfile | null) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  updateUser: () => {},
  setUser: () => {}
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const { user: authUser, isAuthenticated } = useAuth();

  // Sync with AuthContext
  useEffect(() => {
    if (authUser && isAuthenticated) {
      setUser({
        id: authUser.id,
        username: authUser.username,
        display_name: authUser.display_name,
        profile_picture: authUser.profile_picture,
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
