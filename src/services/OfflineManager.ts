/**
 * Offline Manager Service
 * Handles caching data locally for offline access and syncing when back online
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Storage keys
const STORAGE_KEYS = {
    TIMETABLE: '@offline_timetable',
    NOTES: '@offline_notes',
    EVENTS: '@offline_events',
    ANNOUNCEMENTS: '@offline_announcements',
    STUDY_GROUPS: '@offline_study_groups',
    USER_PROFILE: '@offline_user_profile',
    SYNC_QUEUE: '@offline_sync_queue',
    LAST_SYNC: '@offline_last_sync',
};

interface CachedData<T> {
    data: T;
    timestamp: number;
    expiresIn: number; // milliseconds
}

interface SyncQueueItem {
    id: string;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    payload: any;
    timestamp: number;
    retryCount: number;
}

type NetworkStatusCallback = (isConnected: boolean) => void;

class OfflineManager {
    private isConnected: boolean = true;
    private listeners: NetworkStatusCallback[] = [];
    private unsubscribe: (() => void) | null = null;

    constructor() {
        this.initNetworkListener();
    }

    /**
     * Initialize network status listener
     */
    private initNetworkListener() {
        this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const wasConnected = this.isConnected;
            this.isConnected = state.isConnected ?? false;

            // Notify listeners on status change
            if (wasConnected !== this.isConnected) {
                this.listeners.forEach((callback) => callback(this.isConnected));

                // Process sync queue when back online
                if (this.isConnected) {
                    this.processSyncQueue();
                }
            }
        });
    }

    /**
     * Check current network status
     */
    async checkNetworkStatus(): Promise<boolean> {
        const state = await NetInfo.fetch();
        this.isConnected = state.isConnected ?? false;
        return this.isConnected;
    }

    /**
     * Add network status change listener
     */
    addNetworkListener(callback: NetworkStatusCallback): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((cb) => cb !== callback);
        };
    }

    /**
     * Get current network status
     */
    getNetworkStatus(): boolean {
        return this.isConnected;
    }

    // ==================
    // Caching Methods
    // ==================

    /**
     * Cache data with expiration
     */
    async cacheData<T>(key: string, data: T, expiresIn: number = 24 * 60 * 60 * 1000): Promise<void> {
        try {
            const cached: CachedData<T> = {
                data,
                timestamp: Date.now(),
                expiresIn,
            };
            await AsyncStorage.setItem(key, JSON.stringify(cached));
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    /**
     * Get cached data if not expired
     */
    async getCachedData<T>(key: string): Promise<T | null> {
        try {
            const stored = await AsyncStorage.getItem(key);
            if (!stored) return null;

            const cached: CachedData<T> = JSON.parse(stored);
            const isExpired = Date.now() - cached.timestamp > cached.expiresIn;

            if (isExpired) {
                await AsyncStorage.removeItem(key);
                return null;
            }

            return cached.data;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
        }
    }

    /**
     * Clear specific cached data
     */
    async clearCache(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    /**
     * Clear all offline cache
     */
    async clearAllCache(): Promise<void> {
        try {
            const keys = Object.values(STORAGE_KEYS);
            await AsyncStorage.multiRemove(keys);
        } catch (error) {
            console.error('Error clearing all cache:', error);
        }
    }

    // ==================
    // Specific Caching Methods
    // ==================

    /**
     * Cache timetable data
     */
    async cacheTimetable(timetable: any[]): Promise<void> {
        await this.cacheData(STORAGE_KEYS.TIMETABLE, timetable, 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    /**
     * Get cached timetable
     */
    async getCachedTimetable(): Promise<any[] | null> {
        return this.getCachedData<any[]>(STORAGE_KEYS.TIMETABLE);
    }

    /**
     * Cache notes/documents
     */
    async cacheNotes(notes: any[]): Promise<void> {
        await this.cacheData(STORAGE_KEYS.NOTES, notes, 24 * 60 * 60 * 1000); // 24 hours
    }

    /**
     * Get cached notes
     */
    async getCachedNotes(): Promise<any[] | null> {
        return this.getCachedData<any[]>(STORAGE_KEYS.NOTES);
    }

    /**
     * Cache events
     */
    async cacheEvents(events: any[]): Promise<void> {
        await this.cacheData(STORAGE_KEYS.EVENTS, events, 12 * 60 * 60 * 1000); // 12 hours
    }

    /**
     * Get cached events
     */
    async getCachedEvents(): Promise<any[] | null> {
        return this.getCachedData<any[]>(STORAGE_KEYS.EVENTS);
    }

    /**
     * Cache announcements
     */
    async cacheAnnouncements(announcements: any[]): Promise<void> {
        await this.cacheData(STORAGE_KEYS.ANNOUNCEMENTS, announcements, 6 * 60 * 60 * 1000); // 6 hours
    }

    /**
     * Get cached announcements
     */
    async getCachedAnnouncements(): Promise<any[] | null> {
        return this.getCachedData<any[]>(STORAGE_KEYS.ANNOUNCEMENTS);
    }

    /**
     * Cache user profile
     */
    async cacheUserProfile(profile: any): Promise<void> {
        await this.cacheData(STORAGE_KEYS.USER_PROFILE, profile, 24 * 60 * 60 * 1000); // 24 hours
    }

    /**
     * Get cached user profile
     */
    async getCachedUserProfile(): Promise<any | null> {
        return this.getCachedData<any>(STORAGE_KEYS.USER_PROFILE);
    }

    // ==================
    // Sync Queue Methods
    // ==================

    /**
     * Add item to sync queue for later processing
     */
    async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
        try {
            const queue = await this.getSyncQueue();
            const newItem: SyncQueueItem = {
                ...item,
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                retryCount: 0,
            };
            queue.push(newItem);
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
        } catch (error) {
            console.error('Error adding to sync queue:', error);
        }
    }

    /**
     * Get current sync queue
     */
    async getSyncQueue(): Promise<SyncQueueItem[]> {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error getting sync queue:', error);
            return [];
        }
    }

    /**
     * Process sync queue when online
     */
    async processSyncQueue(): Promise<{ success: number; failed: number }> {
        const result = { success: 0, failed: 0 };

        if (!this.isConnected) {
            return result;
        }

        const queue = await this.getSyncQueue();
        if (queue.length === 0) {
            return result;
        }

        const remainingItems: SyncQueueItem[] = [];

        for (const item of queue) {
            try {
                // Import api dynamically to avoid circular dependencies
                const { api } = await import('../contexts/AuthContext');

                switch (item.method) {
                    case 'POST':
                        await api.post(item.endpoint, item.payload);
                        break;
                    case 'PUT':
                        await api.put(item.endpoint, item.payload);
                        break;
                    case 'PATCH':
                        await api.patch(item.endpoint, item.payload);
                        break;
                    case 'DELETE':
                        await api.delete(item.endpoint);
                        break;
                }
                result.success++;
            } catch (error) {
                item.retryCount++;
                if (item.retryCount < 3) {
                    remainingItems.push(item);
                }
                result.failed++;
            }
        }

        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remainingItems));
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

        return result;
    }

    /**
     * Get last sync timestamp
     */
    async getLastSyncTime(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get pending sync count
     */
    async getPendingSyncCount(): Promise<number> {
        const queue = await this.getSyncQueue();
        return queue.length;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.listeners = [];
    }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

export default offlineManager;
