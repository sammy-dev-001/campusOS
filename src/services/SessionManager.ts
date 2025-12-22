/**
 * Session Management Service
 * Handles user sessions, activity tracking, and security
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = '@current_session';
const ACTIVE_SESSIONS_KEY = '@active_sessions';
const LAST_ACTIVITY_KEY = '@last_activity';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface Session {
    id: string;
    deviceId: string;
    deviceName: string;
    platform: string;
    createdAt: string;
    lastActivity: string;
    ipAddress?: string;
    location?: string;
    isCurrent: boolean;
}

interface SessionData {
    token: string;
    refreshToken?: string;
    expiresAt: string;
    userId: string;
}

class SessionManager {
    private sessionTimeout: NodeJS.Timeout | null = null;

    /**
     * Create a new session
     */
    async createSession(sessionData: SessionData): Promise<Session> {
        const sessionId = this.generateSessionId();
        const deviceId = await this.getDeviceId();

        const session: Session = {
            id: sessionId,
            deviceId,
            deviceName: this.getDeviceName(),
            platform: Platform.OS,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            isCurrent: true,
        };

        // Store session data securely
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({
            ...sessionData,
            sessionId,
        }));

        // Update active sessions list
        await this.addToActiveSessions(session);

        // Start activity tracking
        this.startActivityTracking();

        return session;
    }

    /**
     * Get current session
     */
    async getCurrentSession(): Promise<SessionData | null> {
        try {
            const data = await SecureStore.getItemAsync(SESSION_KEY);
            if (!data) return null;

            const session = JSON.parse(data);

            // Check if session is expired
            if (new Date(session.expiresAt) < new Date()) {
                await this.clearSession();
                return null;
            }

            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    /**
     * Clear current session
     */
    async clearSession(): Promise<void> {
        try {
            const currentSession = await SecureStore.getItemAsync(SESSION_KEY);
            if (currentSession) {
                const { sessionId } = JSON.parse(currentSession);
                await this.removeFromActiveSessions(sessionId);
            }

            await SecureStore.deleteItemAsync(SESSION_KEY);
            await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);

            this.stopActivityTracking();
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }

    /**
     * Update last activity timestamp
     */
    async updateActivity(): Promise<void> {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(LAST_ACTIVITY_KEY, now);

        // Update in active sessions
        try {
            const sessions = await this.getActiveSessions();
            const currentSession = await SecureStore.getItemAsync(SESSION_KEY);
            if (currentSession) {
                const { sessionId } = JSON.parse(currentSession);
                const updated = sessions.map(s =>
                    s.id === sessionId ? { ...s, lastActivity: now } : s
                );
                await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(updated));
            }
        } catch (error) {
            console.error('Error updating activity:', error);
        }
    }

    /**
     * Check if session is still valid (not timed out)
     */
    async isSessionValid(): Promise<boolean> {
        try {
            const lastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
            if (!lastActivity) return true; // First activity

            const lastActivityTime = new Date(lastActivity).getTime();
            const now = Date.now();

            return (now - lastActivityTime) < SESSION_TIMEOUT_MS;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get all active sessions for the user
     */
    async getActiveSessions(): Promise<Session[]> {
        try {
            const data = await AsyncStorage.getItem(ACTIVE_SESSIONS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting active sessions:', error);
            return [];
        }
    }

    /**
     * Terminate a specific session
     */
    async terminateSession(sessionId: string): Promise<boolean> {
        try {
            const currentSession = await SecureStore.getItemAsync(SESSION_KEY);
            if (currentSession) {
                const { sessionId: currentId } = JSON.parse(currentSession);
                if (sessionId === currentId) {
                    // Can't terminate current session this way
                    return false;
                }
            }

            await this.removeFromActiveSessions(sessionId);
            return true;
        } catch (error) {
            console.error('Error terminating session:', error);
            return false;
        }
    }

    /**
     * Terminate all other sessions
     */
    async terminateAllOtherSessions(): Promise<number> {
        try {
            const sessions = await this.getActiveSessions();
            const currentSession = await SecureStore.getItemAsync(SESSION_KEY);

            if (!currentSession) return 0;

            const { sessionId: currentId } = JSON.parse(currentSession);
            const otherSessions = sessions.filter(s => s.id !== currentId);

            // Keep only current session
            const currentOnly = sessions.filter(s => s.id === currentId);
            await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(currentOnly));

            return otherSessions.length;
        } catch (error) {
            console.error('Error terminating sessions:', error);
            return 0;
        }
    }

    /**
     * Add session to active sessions list
     */
    private async addToActiveSessions(session: Session): Promise<void> {
        const sessions = await this.getActiveSessions();

        // Mark all as not current
        const updated = sessions.map(s => ({ ...s, isCurrent: false }));

        // Add new session
        updated.push(session);

        // Keep only last 10 sessions
        const trimmed = updated.slice(-10);

        await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(trimmed));
    }

    /**
     * Remove session from active sessions
     */
    private async removeFromActiveSessions(sessionId: string): Promise<void> {
        const sessions = await this.getActiveSessions();
        const filtered = sessions.filter(s => s.id !== sessionId);
        await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(filtered));
    }

    /**
     * Start tracking user activity
     */
    private startActivityTracking(): void {
        this.updateActivity();

        // Update activity every 5 minutes
        this.sessionTimeout = setInterval(() => {
            this.updateActivity();
        }, 5 * 60 * 1000);
    }

    /**
     * Stop activity tracking
     */
    private stopActivityTracking(): void {
        if (this.sessionTimeout) {
            clearInterval(this.sessionTimeout);
            this.sessionTimeout = null;
        }
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get or create device ID
     */
    private async getDeviceId(): Promise<string> {
        try {
            let deviceId = await SecureStore.getItemAsync('@device_id');
            if (!deviceId) {
                deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await SecureStore.setItemAsync('@device_id', deviceId);
            }
            return deviceId;
        } catch {
            return `device_${Date.now()}`;
        }
    }

    /**
     * Get device name
     */
    private getDeviceName(): string {
        if (Platform.OS === 'ios') {
            return 'iPhone/iPad';
        } else if (Platform.OS === 'android') {
            return 'Android Device';
        }
        return 'Unknown Device';
    }
}

export const sessionManager = new SessionManager();
export default sessionManager;
