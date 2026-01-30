import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { BrandColors } from '../../src/theme/edufi';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, setUser } = useUser();
  const { logout, user: authUser, isAuthenticated, updateProfilePicture } = useAuth();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [classReminders, setClassReminders] = useState(true);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setUploading(true);
      setError('');

      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        setAvatar(manipulated.uri);
        await updateProfilePicture(manipulated.uri);
        setAvatar(null);
      } catch (e: any) {
        console.error('Error processing image:', e);
        setError(e.message || 'Failed to process the image.');
      }
    } catch (e: any) {
      console.error('Error picking image:', e);
      setError('Failed to pick an image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerBlack}>
        <Text style={[styles.headerText, { color: theme.headerTitle }]}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#232323' : '#F5F5F5' }]}>
            {uploading ? (
              <View style={[styles.avatarImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#222' : '#E0E0E0' }]}>
                <ActivityIndicator size="large" color={theme.action} />
              </View>
            ) : user && user.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
            ) : avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#232323' : '#F5F5F5' }]}>
                <Ionicons name="person" size={64} color={theme.textSecondary} />
              </View>
            )}
            <TouchableOpacity style={[styles.cameraButton, { backgroundColor: theme.action }]} onPress={handlePickImage}>
              <Ionicons name="camera" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: theme.text }]}>{user?.display_name || user?.username || 'User'}</Text>
          <TouchableOpacity>
            <Text style={[styles.editProfile, { color: theme.action }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={{ color: 'red', marginBottom: 8, marginHorizontal: 16, fontSize: 14 }}>{error}</Text> : null}

        {/* Section 1: App Preferences */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : theme.headerTitle }]}>App Preferences</Text>
        <View style={[styles.cardGroup, { backgroundColor: theme.card }]}>
          <View style={styles.settingRowTop}>
            <Ionicons name="moon" size={24} color={theme.action} style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Appearance</Text>
              <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Toggle Dark / Light mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              thumbColor={isDark ? BrandColors.brandGreen : '#222'}
              trackColor={{ false: '#333', true: BrandColors.brandGreen }}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.settingRowBottom}
            activeOpacity={0.7}
            onPress={() => router.push('/notification-settings')}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.action} style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Notifications</Text>
              <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Class reminders (15 mins before)</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section 2: Support & Info */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : theme.headerTitle }]}>Support & Info</Text>
        <View style={[styles.cardGroup, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={styles.settingRowTop}
            activeOpacity={0.7}
            onPress={() => router.push('/about')}
          >
            <MaterialCommunityIcons name="information-outline" size={24} color={theme.action} style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>About EduFi</Text>
              <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Version, terms, and privacy policy</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.settingRowBottom} activeOpacity={0.7}>
            <MaterialCommunityIcons name="help-circle-outline" size={24} color={theme.action} style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Help & Support</Text>
              <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Get assistance or report an issue</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section 3: Account */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : theme.headerTitle }]}>Account</Text>
        <TouchableOpacity style={styles.logoutContainer} activeOpacity={0.8} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 0, paddingHorizontal: 0 },
  headerBlack: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#181818',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4D96FF',
    borderRadius: 18,
    padding: 8,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  editProfile: {
    color: '#4D96FF',
    fontSize: 15,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 8,
  },
  cardGroup: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  settingRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  settingIcon: {
    marginRight: 14,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubLabel: {
    color: '#A0A0A0',
    fontSize: 13,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginLeft: 54,
  },
  logoutContainer: {
    marginHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF5630',
    fontWeight: '600',
    fontSize: 17,
  },
});