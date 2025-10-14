import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface UploadOptions {
  uri: string;
  type: 'image' | 'video' | 'document';
  name?: string;
  mimeType?: string;
}

export const uploadToCloudinary = async (options: UploadOptions) => {
  const { uri, type, name, mimeType } = options;
  
  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(uri);
  
  if (!fileInfo.exists) {
    throw new Error('File does not exist');
  }

  // Create form data
  const formData = new FormData();
  
  // For web, we need to fetch the file as a blob
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileName = name || `file-${Date.now()}`;
    const file = new File([blob], fileName, { type: mimeType || 'application/octet-stream' });
    formData.append('file', file);
  } else {
    // For mobile, use the file system
    formData.append('file', {
      uri,
      name: name || `file-${Date.now()}`,
      type: mimeType || 'application/octet-stream',
    } as any);
  }

  // Upload to Cloudinary
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) {
    let error = 'Failed to upload file';
    try {
      const data = await response.json();
      error = data.message || error;
    } catch (e) {
      console.error('Error parsing error response:', e);
    }
    throw new Error(error);
  }

  const result = await response.json();
  return {
    url: result.url,
    publicId: result.public_id,
    format: result.format,
    type: result.resource_type,
    size: result.bytes,
  };
};

// Helper function to get MIME type from file extension
export const getMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    
    // Videos
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
};
