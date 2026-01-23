/**
 * Video Compression Service
 * Handles video compression for large files before upload
 */

import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Maximum file size in bytes (50MB - adjust as needed)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// Warning threshold (25MB)
const WARNING_FILE_SIZE = 25 * 1024 * 1024;

export interface MediaFile {
    uri: string;
    type: 'image' | 'video';
    fileSize?: number;
    compressed?: boolean;
}

/**
 * Get file size in bytes
 */
export async function getFileSize(uri: string): Promise<number> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists && 'size' in fileInfo) {
            return fileInfo.size || 0;
        }
        return 0;
    } catch (error) {
        console.error('Error getting file size:', error);
        return 0;
    }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Pick media with automatic compression for large videos
 */
export async function pickMediaWithCompression(): Promise<MediaFile | null> {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your media library');
            return null;
        }

        // First, try picking with high quality to check size
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: false,
            quality: 1,
            videoMaxDuration: 300, // 5 minutes max
        });

        if (result.canceled || result.assets.length === 0) {
            return null;
        }

        const asset = result.assets[0];
        const fileSize = await getFileSize(asset.uri);
        const isVideo = asset.type === 'video';

        console.log(`[MediaPicker] Selected ${asset.type}, size: ${formatFileSize(fileSize)}`);

        // For videos that are too large, re-pick with compression
        if (isVideo && fileSize > MAX_FILE_SIZE) {
            Alert.alert(
                'Video Too Large',
                `Your video is ${formatFileSize(fileSize)}. The maximum allowed size is ${formatFileSize(MAX_FILE_SIZE)}.\n\nWould you like to compress it?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Compress',
                        onPress: async () => {
                            // Re-pick with lower quality
                            const compressedResult = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                                allowsEditing: true, // Editing allows trimming
                                quality: 0.5, // Lower quality for compression
                                videoMaxDuration: 60, // Limit to 1 minute for compression
                                videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
                            });

                            if (!compressedResult.canceled && compressedResult.assets.length > 0) {
                                const compressedAsset = compressedResult.assets[0];
                                const newFileSize = await getFileSize(compressedAsset.uri);
                                console.log(`[MediaPicker] Compressed video size: ${formatFileSize(newFileSize)}`);

                                return {
                                    uri: compressedAsset.uri,
                                    type: 'video' as const,
                                    fileSize: newFileSize,
                                    compressed: true,
                                };
                            }
                        },
                    },
                ]
            );
            return null;
        }

        // For large videos (but under max), show warning
        if (isVideo && fileSize > WARNING_FILE_SIZE) {
            console.log(`[MediaPicker] Large video warning: ${formatFileSize(fileSize)}`);
        }

        return {
            uri: asset.uri,
            type: asset.type as 'image' | 'video',
            fileSize,
            compressed: false,
        };
    } catch (error) {
        console.error('Error picking media:', error);
        Alert.alert('Error', 'Failed to pick media');
        return null;
    }
}

/**
 * Check if file size is acceptable for upload
 */
export function isFileSizeAcceptable(fileSize: number): { acceptable: boolean; message?: string } {
    if (fileSize > MAX_FILE_SIZE) {
        return {
            acceptable: false,
            message: `File is too large (${formatFileSize(fileSize)}). Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
        };
    }
    if (fileSize > WARNING_FILE_SIZE) {
        return {
            acceptable: true,
            message: `Large file (${formatFileSize(fileSize)}). Upload may take longer.`,
        };
    }
    return { acceptable: true };
}

/**
 * Pick video with compression options
 * Returns a promise that resolves with the compressed video or null if cancelled
 */
export async function pickVideoWithCompression(): Promise<MediaFile | null> {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your media library');
            return null;
        }

        // Pick with medium quality and editing enabled for trimming
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 0.7,
            videoMaxDuration: 120, // 2 minutes max
            videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        });

        if (result.canceled || result.assets.length === 0) {
            return null;
        }

        const asset = result.assets[0];
        const fileSize = await getFileSize(asset.uri);

        console.log(`[VideoCompression] Selected video size: ${formatFileSize(fileSize)}`);

        // Check if still too large
        if (fileSize > MAX_FILE_SIZE) {
            Alert.alert(
                'Video Still Too Large',
                `Even after compression, the video is ${formatFileSize(fileSize)}.\n\nPlease try:\n• Trimming the video to a shorter length\n• Recording at a lower resolution\n• Using a different video`,
                [{ text: 'OK' }]
            );
            return null;
        }

        return {
            uri: asset.uri,
            type: 'video',
            fileSize,
            compressed: true,
        };
    } catch (error) {
        console.error('Error picking/compressing video:', error);
        Alert.alert('Error', 'Failed to process video');
        return null;
    }
}
