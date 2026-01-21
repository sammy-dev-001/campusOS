/**
 * Biometric Authentication Service
 * Handles Face ID, Touch ID, and fingerprint authentication
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const BIOMETRIC_USER_KEY = '@biometric_user_id';

interface BiometricAuthResult {
    success: boolean;
    error?: string;
    biometricType?: string;
}

class BiometricService {
    /**
     * Check if device supports biometric authentication
     */
    async isSupported(): Promise<boolean> {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return compatible && enrolled;
    }

    /**
     * Get available biometric types
     */
    async getBiometricTypes(): Promise<string[]> {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        return types.map(type => {
            switch (type) {
                case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
                    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
                case LocalAuthentication.AuthenticationType.FINGERPRINT:
                    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
                case LocalAuthentication.AuthenticationType.IRIS:
                    return 'Iris';
                default:
                    return 'Biometric';
            }
        });
    }

    /**
     * Check if biometric login is enabled for this device
     */
    async isEnabled(): Promise<boolean> {
        try {
            const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
            return enabled === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Enable biometric login for a user
     */
    async enable(userId: string): Promise<boolean> {
        try {
            // Verify biometrics first
            const result = await this.authenticate('Enable biometric login');
            if (!result.success) {
                return false;
            }

            await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
            await SecureStore.setItemAsync(BIOMETRIC_USER_KEY, userId);
            return true;
        } catch (error) {
            console.error('Error enabling biometric:', error);
            return false;
        }
    }

    /**
     * Disable biometric login
     */
    async disable(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
            await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
        } catch (error) {
            console.error('Error disabling biometric:', error);
        }
    }

    /**
     * Get stored user ID for biometric login
     */
    async getStoredUserId(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(BIOMETRIC_USER_KEY);
        } catch {
            return null;
        }
    }

    /**
     * Authenticate using biometrics
     */
    async authenticate(promptMessage?: string): Promise<BiometricAuthResult> {
        try {
            const isSupported = await this.isSupported();
            if (!isSupported) {
                return { success: false, error: 'Biometric authentication not available' };
            }

            const biometricTypes = await this.getBiometricTypes();
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: promptMessage || `Login with ${biometricTypes[0] || 'Biometrics'}`,
                cancelLabel: 'Use Password',
                disableDeviceFallback: false,
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                return { success: true, biometricType: biometricTypes[0] };
            }

            return {
                success: false,
                error: result.error === 'user_cancel' ? 'Authentication cancelled' : 'Authentication failed'
            };
        } catch (error: any) {
            console.error('Biometric auth error:', error);
            return { success: false, error: error.message || 'Biometric authentication failed' };
        }
    }

    /**
     * Perform biometric login (check enabled + authenticate)
     */
    async biometricLogin(): Promise<{ success: boolean; userId?: string; error?: string }> {
        const isEnabled = await this.isEnabled();
        if (!isEnabled) {
            return { success: false, error: 'Biometric login not enabled' };
        }

        const userId = await this.getStoredUserId();
        if (!userId) {
            return { success: false, error: 'No user configured for biometric login' };
        }

        const authResult = await this.authenticate('Login to EduFi');
        if (!authResult.success) {
            return { success: false, error: authResult.error };
        }

        return { success: true, userId };
    }
}

export const biometricService = new BiometricService();
export default biometricService;
