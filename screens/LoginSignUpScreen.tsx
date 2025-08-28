import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { Button } from '../components/ui/Button';
import { API_BASE_URL } from '../config/api';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useThemeColor } from '../hooks/useThemeColor';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    marginLeft: 10,
    backgroundColor: 'transparent',
  },
  doodleContainer: {
    position: 'absolute',
    width: width,
    height: height,
    pointerEvents: 'none',
    zIndex: 0,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: 'transparent',
  },
  logo: {
    marginBottom: 10,
    color: '#3b6ea5', // blue logo
    transform: [{ rotate: '-10deg' }], // Slightly tilt the logo
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%', // full width
    borderRadius: 20,
    padding: 20,
    marginTop: -50,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#ffcccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    width: width * 0.85,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
  },
  inputIcon: {
    marginRight: 10,
    opacity: 0.6,
  },
  passwordToggle: {
    padding: 5,
  },
  fieldError: {
    color: '#ff4444',
    fontSize: 12,
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingLeft: 5,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#3b6ea5',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  authButton: {
    height: 50,
    borderRadius: 25,
    marginTop: 10,
    backgroundColor: '#3b6ea5', // muted blue for Login
  },
  createAccountButton: {
    height: 50,
    borderRadius: 25,
    marginTop: 10,
    backgroundColor: '#3fd6ff', // bright cyan for Create Account
  },
  orTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 15,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ccc',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    marginTop: 10,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // force transparent
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.62,
  },
});

interface MovingDoodleProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  size: number;
  initialX: number;
  initialY: number;
}

const MovingDoodle: React.FC<MovingDoodleProps> = ({ icon, size, initialX, initialY }) => {
  const moveX = useRef(new Animated.Value(initialX)).current;
  const moveY = useRef(new Animated.Value(initialY)).current;

  useEffect(() => {
    const animate = () => {
      const newX = Math.random() * (width * 0.8);
      const newY = Math.random() * (height * 0.8);
      const duration = 15000 + Math.random() * 10000; // 15-25 seconds

      Animated.parallel([
        Animated.timing(moveX, {
          toValue: newX,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(moveY, {
          toValue: newY,
          duration,
          useNativeDriver: true,
        })
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [
          { translateX: moveX },
          { translateY: moveY },
          { rotate: `${Math.random() * 360}deg` },
          { scale: 0.8 + Math.random() * 0.4 }
        ],
      }}
    >
      <MaterialIcons
        name={icon}
        size={size}
        color="#3b6ea5"
        style={{ opacity: 0.3 }}
      />
    </Animated.View>
  );
};

const DoodleBackground = () => {
  const doodles = [
    { name: 'school', size: 45 },
    { name: 'menu-book', size: 40 },
    { name: 'edit', size: 35 },
    { name: 'calculate', size: 40 },
    { name: 'backpack', size: 45 },
    { name: 'science', size: 40 },
    { name: 'psychology', size: 45 },
    { name: 'computer', size: 40 }
  ] as const;

  return (
    <View style={styles.doodleContainer} pointerEvents="none">
      {Array.from({ length: 15 }).map((_, index) => {
        const doodle = doodles[index % doodles.length];
        return (
          <MovingDoodle
            key={index}
            icon={doodle.name}
            size={doodle.size}
            initialX={Math.random() * (width * 0.8)}
            initialY={Math.random() * (height * 0.8)}
          />
        );
      })}
    </View>
  );
};

const LoginSignUpScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const { login, signup, user } = useAuth();
  const { updateUser } = useUser();
  const router = useRouter();
  const { theme } = useTheme();

  const primaryColor = useThemeColor({ light: Colors.light.primary, dark: Colors.dark.primary }, 'primary');
  const backgroundColor = theme.background;
  const textColor = theme.text;
  const textSecondaryColor = theme.secondary;
  const cardColor = theme.card;
  const borderColor = theme.border;
  const logoColor = theme.primary;
  
  const renderDoodles = () => {
    const doodleIcons = ['school', 'menu-book', 'edit', 'calculate', 'backpack'] as const;
    return Array.from({ length: 20 }).map((_, index) => (
      <MaterialIcons 
        key={index}
        name={doodleIcons[index % doodleIcons.length]}
        size={40}
        color="#3b6ea5"
        style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          transform: [{ rotate: `${Math.random() * 360}deg` }],
          opacity: 0.1,
          zIndex: -1 // Move doodles behind content
        }}
      />
    ));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!isLogin) {
      // Signup validation
      if (!username.trim()) {
        newErrors.username = 'Username is required';
      }
      if (!fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      }
      if (!email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = 'Please enter a valid email';
      }
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 3) {
        newErrors.password = 'Password must be at least 3 characters';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      // Login validation
      if (!email.trim()) {
        newErrors.email = 'Email is required';
      }
      if (!password) {
        newErrors.password = 'Password is required';
      }
    }

    console.log("Validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuthentication = async () => {
    // Trim all string inputs
    const trimmedData = {
      username: username.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      password: password,
      confirmPassword: confirmPassword
    };

    console.log("Form values before validation:", trimmedData);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(trimmedData.email, trimmedData.password);
        router.replace('/(tabs)');
      } else {
        // For signup: direct mapping of fields
        const requestBody = {
          loginUsername: trimmedData.username,
          displayName: trimmedData.fullName || trimmedData.username,
          email: trimmedData.email,
          password: trimmedData.password
        };
        
        console.log("Attempting signup with:", {
          ...requestBody,
          password: "[HIDDEN]"
        });
        
        await signup(
          requestBody.loginUsername,
          requestBody.displayName,
          requestBody.email,
          requestBody.password
        );
        // After successful signup, show profile pic modal
        setShowProfilePicModal(true);
        // Do not immediately login/redirect; wait for profile pic modal
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setErrors((prev: Record<string, string>) => ({
        ...prev,
        auth: error.message || 'Authentication failed. Please try again.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    try {
      // Implement social login logic here
      console.log(`Social login with ${provider}`);
    } catch (error: any) {
      setErrors((prev: Record<string, string>) => ({
        ...prev,
        auth: `Social login failed: ${error.message}`
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }
    try {
      // Implement forgot password logic here
      console.log('Forgot password for:', email);
    } catch (error: any) {
      setErrors((prev: Record<string, string>) => ({
        ...prev,
        auth: `Password reset failed: ${error.message}`
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePicPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const handleProfilePicUpload = async () => {
    if (!profilePic) return;
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', {
        uri: profilePic,
        name: 'profile.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('userId', user?.id?.toString() || '');
      const res = await fetch(`${API_BASE_URL}/api/users/upload-profile-pic`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await res.json();
      if (data && data.profilePictureUrl) {
        updateUser({ profilePicture: data.profilePictureUrl });
      }
      setShowProfilePicModal(false);
      setProfilePic(null);
      router.replace('/(tabs)');
    } catch (e) {
      alert('Failed to upload profile picture.');
    } finally {
      setUploadingPic(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor }]}
    >
      <DoodleBackground />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.header}>
          <MaterialIcons 
            name="school" 
            size={80} // Increased size
            color={logoColor} 
            style={styles.logo}
          />
          <ThemedText style={styles.appTitle} type="title">CAMPUS OS</ThemedText>
        </View>

        <View style={[styles.formContainer, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.welcomeText} type="subtitle">
            {isLogin ? 'Welcome Back!' : 'Create an Account'}
          </ThemedText>

          {errors.auth && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{errors.auth}</ThemedText>
            </View>
          )}

          {!isLogin && (
            <>
              <View style={[styles.inputContainer, { borderColor: errors.username ? '#ff4444' : borderColor }]}>
                <Ionicons name="person-outline" size={20} color={textSecondaryColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Username"
                  placeholderTextColor={textSecondaryColor}
                  value={username}                  onChangeText={(text) => {
                    setUsername(text.trim());
                    setErrors(prev => ({ ...prev, username: '' }));
                  }}
                  autoCapitalize="none"
                />
              </View>
              {errors.username && <ThemedText style={styles.fieldError}>{errors.username}</ThemedText>}

              <View style={[styles.inputContainer, { borderColor: errors.fullName ? '#ff4444' : borderColor }]}>
                <Ionicons name="text-outline" size={20} color={textSecondaryColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Full Name"
                  placeholderTextColor={textSecondaryColor}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                />
              </View>
              {errors.fullName && <ThemedText style={styles.fieldError}>{errors.fullName}</ThemedText>}
            </>
          )}

          <View style={[styles.inputContainer, { borderColor: errors.email ? '#ff4444' : borderColor }]}> 
            <Ionicons name="mail-outline" size={20} color={textSecondaryColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Email or Username"
              placeholderTextColor={textSecondaryColor}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors(prev => ({ ...prev, email: '' }));
              }}
              autoCapitalize="none"
            />
          </View>
          {errors.email && <ThemedText style={styles.fieldError}>{errors.email}</ThemedText>}

          <View style={[styles.inputContainer, { borderColor: errors.password ? '#ff4444' : borderColor }]}>
            <Ionicons name="lock-closed-outline" size={20} color={textSecondaryColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Password"
              placeholderTextColor={textSecondaryColor}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors(prev => ({ ...prev, password: '' }));
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={textSecondaryColor} />
            </TouchableOpacity>
          </View>
          {errors.password && <ThemedText style={styles.fieldError}>{errors.password}</ThemedText>}

          {!isLogin && (
            <>
              <View style={[styles.inputContainer, { borderColor: errors.confirmPassword ? '#ff4444' : borderColor }]}>
                <Ionicons name="lock-closed-outline" size={20} color={textSecondaryColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Confirm Password"
                  placeholderTextColor={textSecondaryColor}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.passwordToggle}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={textSecondaryColor} />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <ThemedText style={styles.fieldError}>{errors.confirmPassword}</ThemedText>}
            </>
          )}

          {isLogin && (
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordButton}>
              <ThemedText style={styles.forgotPasswordText} type="defaultSemiBold">
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>
          )}

          <Button
            onPress={handleAuthentication}
            loading={loading}
            fullWidth={true}
            variant="primary"
            style={styles.authButton}
          >
            {isLogin ? 'Login' : 'Create Account'}
          </Button>

          <View style={styles.orTextContainer}>
            <View style={[styles.orLine, { backgroundColor: textSecondaryColor }]} />
            <ThemedText style={styles.orText} type="default">
              or
            </ThemedText>
            <View style={[styles.orLine, { backgroundColor: textSecondaryColor }]} />
          </View>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity onPress={() => handleSocialLogin('google')} style={styles.socialButton}>
              <Ionicons name="logo-google" size={30} color={textSecondaryColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSocialLogin('facebook')} style={styles.socialButton}>
              <Ionicons name="logo-facebook" size={30} color={textSecondaryColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSocialLogin('apple')} style={styles.socialButton}>
              <Ionicons name="logo-apple" size={30} color={textSecondaryColor} />
            </TouchableOpacity>
          </View>

          <Button
            onPress={() => setIsLogin(prev => !prev)}
            fullWidth={true}
            variant="secondary"
            style={styles.createAccountButton}
          >
            {isLogin ? 'Create Account' : 'Login'}
          </Button>
        </View>
      </ScrollView>
      {showProfilePicModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: 300 }}>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Upload a Profile Picture (Optional)</ThemedText>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }} />
            ) : (
              <TouchableOpacity onPress={handleProfilePicPick} style={{ backgroundColor: '#eee', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="camera" size={36} color="#888" />
              </TouchableOpacity>
            )}
            <Button onPress={handleProfilePicPick} style={{ marginBottom: 8 }} variant="secondary">Choose Photo</Button>
            <Button onPress={handleProfilePicUpload} loading={uploadingPic} disabled={!profilePic} style={{ marginBottom: 8 }}>Upload & Continue</Button>
            <Button onPress={() => { setShowProfilePicModal(false); router.replace('/(tabs)'); }} variant="secondary">Skip</Button>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default LoginSignUpScreen;