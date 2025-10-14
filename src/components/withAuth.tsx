import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export function withAuth<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function WithAuthWrapper(props: T) {
    const { isAuthenticated, isInitialized } = useAuth();

    useEffect(() => {
      if (isInitialized && !isAuthenticated) {
        router.replace('/login');
      }
    }, [isAuthenticated, isInitialized]);

    if (!isInitialized) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});
