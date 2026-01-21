import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useTheme } from '../src/contexts/NewThemeContext';

const features = [
  {
    title: 'EduFi Marketplace',
    subtitle: 'Buy & sell student goods',
    icon: 'cart-outline',
    color: '#FFB74D',
    route: '/market-place',
  },
  {
    title: 'Class Reminders',
    subtitle: 'Never miss a lecture',
    icon: 'bell-outline',
    color: '#4FC3F7',
    route: '/class-reminders',
  },
  {
    title: 'Find a Roommate',
    subtitle: 'Connect with students',
    icon: 'account-search-outline',
    color: '#AED581',
    route: '/find-roommate',
  },
  {
    title: 'Student Forums',
    subtitle: 'Discuss student life',
    icon: 'forum-outline',
    color: '#FF8A65',
    route: '/student-forums',
  },
  {
    title: 'App Personalization',
    subtitle: 'Customize your app theme',
    icon: 'palette-outline',
    color: '#BA68C8',
    route: '/settings',
  },
  {
    title: 'About EduFi',
    subtitle: 'Learn about the platform',
    icon: 'information-outline',
    color: '#7986CB',
    route: '/about',
  },
];

export default function MenuScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const handlePress = (route: string) => {
    // A bug in expo-router's web implementation can cause state to persist incorrectly.
    // Using `replace` ensures a clean navigation state.
    router.replace(route as any);
  };

  const renderItem = ({ item }: { item: (typeof features)[0] }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePress(item.route)}>
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}33` }]}>
        <MaterialCommunityIcons name={item.icon as any} size={30} color={item.color} />
      </View>
      <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
      <ThemedText style={styles.cardSubtitle}>{item.subtitle}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={features}
        renderItem={renderItem}
        keyExtractor={(item) => item.title}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={{ paddingTop: 40 }}>
            <ThemedText style={styles.header}>Explore Features</ThemedText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 10,
    },
    header: {
      fontSize: 28,
      fontWeight: 'bold',
      paddingHorizontal: 10,
      paddingVertical: 20,
    },
    row: {
      justifyContent: 'space-between',
    },
    card: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 15,
      padding: 16,
      margin: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 140,
      maxWidth: '48%',
      overflow: 'hidden',
    },
    iconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 11,
      color: theme.secondary,
      textAlign: 'center',
    },
  }); 