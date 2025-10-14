import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { useUser } from '../../src/contexts/UserContext';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, setUser } = useUser();
  const { logout, user: authUser, isAuthenticated, updateProfilePicture } = useAuth();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [appNotif, setAppNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [smsNotif, setSmsNotif] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return; // User cancelled the image picker
      }

      setUploading(true);
      setError('');
      
      try {
        // Compress and resize the image
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Update the avatar preview
        setAvatar(manipulated.uri);

        // Use the updateProfilePicture function from AuthContext
        await updateProfilePicture(manipulated.uri);
        
        // If we reach here, the upload was successful
        setAvatar(null); // Clear the temporary avatar state
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
    <View style={[styles.container, { backgroundColor: '#121212' }]}> 
      {/* Header */}
      <View style={styles.headerBlack}>
        <Text style={styles.headerText}>Settings</Text>
        <Ionicons name="notifications-outline" size={26} color="#fff" style={styles.headerBell} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {uploading ? (
              <View style={[styles.avatarImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}> 
                <ActivityIndicator size="large" color="#4D96FF" />
              </View>
            ) : user && user.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
            ) : avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={64} color="#555" />
                <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {(user && user.profile_picture) || avatar ? (
              <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage}>
                <Ionicons name="camera" size={24} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.profileName}>{user?.display_name || user?.username || 'User'}</Text>
          <TouchableOpacity>
            <Text style={styles.editProfile}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={{ color: 'red', marginBottom: 8, fontSize: 16 }}>{error}</Text> : null}

        {/* Notifications Card */}
        <View style={styles.cardGroup}>
          <View style={styles.settingRowTop}>
            <Ionicons name="notifications-outline" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>App Notifications</Text>
              <Text style={styles.settingSubLabel}>Control alerts from CampusOS</Text>
            </View>
            <Switch value={appNotif} onValueChange={setAppNotif} thumbColor={appNotif ? '#4D96FF' : '#222'} trackColor={{ false: '#333', true: '#4D96FF' }} />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <MaterialCommunityIcons name="email-outline" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingSubLabel}>Receive updates via email</Text>
            </View>
            <Switch value={emailNotif} onValueChange={setEmailNotif} thumbColor={emailNotif ? '#4D96FF' : '#222'} trackColor={{ false: '#333', true: '#4D96FF' }} />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRowBottom}>
            <MaterialCommunityIcons name="cellphone-message" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>SMS Notifications</Text>
              <Text style={styles.settingSubLabel}>Get important alerts via text</Text>
            </View>
            <Switch value={smsNotif} onValueChange={setSmsNotif} thumbColor={smsNotif ? '#4D96FF' : '#222'} trackColor={{ false: '#333', true: '#4D96FF' }} />
          </View>
        </View>

        {/* General Settings Card */}
        <View style={styles.cardGroup}>
          <View style={styles.settingRowTop}>
            <Ionicons name="moon" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingSubLabel}>Adjust the app's visual theme</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              thumbColor={isDark ? '#4D96FF' : '#222'}
              trackColor={{ false: '#333', true: '#4D96FF' }}
            />
          </View>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <MaterialCommunityIcons name="help-circle-outline" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Help & Support</Text>
              <Text style={styles.settingSubLabel}>Get assistance or report an issue</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#888" />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <MaterialCommunityIcons name="information-outline" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>About CampusOS</Text>
              <Text style={styles.settingSubLabel}>Version, terms, and privacy policy</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#888" />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Terms & Conditions</Text>
              <Text style={styles.settingSubLabel}>Review app usage policies</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#888" />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRowBottom} activeOpacity={0.7}>
            <MaterialCommunityIcons name="history" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Activity Log</Text>
              <Text style={styles.settingSubLabel}>View your recent app activities</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Account Settings Card */}
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.settingRowTop} activeOpacity={0.7}>
            <MaterialCommunityIcons name="account-circle-outline" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Personal Details</Text>
              <Text style={styles.settingSubLabel}>Update your name, email, and contact info</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#888" />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRowBottom} activeOpacity={0.7}>
            <MaterialCommunityIcons name="lock-outline" size={24} color="#4D96FF" style={styles.settingIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingSubLabel}>Update your account password</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={logout}>
          <MaterialCommunityIcons name="logout" size={22} color="#fff" style={{ marginRight: 8 }} />
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
    backgroundColor: '#121212',
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
    position: 'relative',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  headerBell: {
    position: 'absolute',
    right: 24,
    top: 56,
  },
  profileCard: {
    backgroundColor: '#181818',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: 16,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 2,
  },
  editProfile: {
    color: '#4D96FF',
    fontSize: 15,
    marginTop: 2,
    fontWeight: '500',
  },
  cardGroup: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 22,
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  settingRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'transparent',
  },
  settingRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: 'transparent',
  },
  settingIcon: {
    marginRight: 16,
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
    backgroundColor: '#232323',
    marginLeft: 58,
    marginRight: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5630',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 16,
    marginBottom: 32,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
}); 