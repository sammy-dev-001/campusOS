import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, createContext, memo, useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './NewThemeContext';

type Theme = {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  error: string;
};

type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error';

interface UploadItem {
  id: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
  totalSize: number;
  uploadedSize: number;
  error?: string;
}

interface UploadContextType {
  uploads: UploadItem[];
  addUpload: (file: { name: string; size: number }) => UploadItem;
  updateUploadProgress: (id: string, progress: number, uploadedSize: number) => void;
  completeUpload: (id: string) => void;
  errorUpload: (id: string, error: string) => void;
  clearUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const { theme } = useTheme();

  const addUpload = React.useCallback((file: { name: string; size: number }): UploadItem => {
    const newUpload: UploadItem = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      totalSize: file.size,
      uploadedSize: 0,
    };
    setUploads(prev => [...prev, newUpload]);
    return newUpload;
  }, []);

  const updateUploadProgress = React.useCallback((id: string, progress: number, uploadedSize: number) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id
          ? { ...upload, progress, uploadedSize, status: 'uploading' as const }
          : upload
      )
    );
  }, []);

  const completeUpload = React.useCallback((id: string) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id
          ? { ...upload, progress: 100, status: 'completed' as const }
          : upload
      )
    );
    // Auto-remove completed uploads after a delay
    setTimeout(() => {
      setUploads(prev => prev.filter(upload => upload.id !== id));
    }, 3000);
  }, []);

  const errorUpload = React.useCallback((id: string, error: string) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id
          ? { ...upload, status: 'error' as const, error }
          : upload
      )
    );
  }, []);

  const clearUpload = React.useCallback((id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const value = React.useMemo(() => ({
    uploads,
    addUpload,
    updateUploadProgress,
    completeUpload,
    errorUpload,
    clearUpload,
  }), [uploads, addUpload, updateUploadProgress, completeUpload, errorUpload, clearUpload]);

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadProgressIndicator />
    </UploadContext.Provider>
  );
}

// Separate component for individual upload items
interface UploadItemProps {
  upload: UploadItem;
  onClear: (id: string) => void;
  theme: Theme;
}

const UploadItem = memo(({ upload, onClear, theme }: UploadItemProps) => (
  <View style={styles.uploadItem}>
    <View style={styles.uploadInfo}>
      <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
        {upload.fileName}
      </Text>
      <Text style={[styles.progressText, { color: theme.textSecondary }]}>
        {Math.round(upload.progress)}% • {formatFileSize(upload.uploadedSize)} / {formatFileSize(upload.totalSize)}
      </Text>
    </View>
    <View style={styles.progressBarContainer}>
      <View 
        style={[
          styles.progressBar, 
          { 
            width: `${upload.progress}%`,
            backgroundColor: upload.status === 'error' ? '#ff6b6b' : theme.primary,
          }
        ]} 
      />
    </View>
    {upload.status === 'error' && (
      <TouchableOpacity onPress={() => onClear(upload.id)} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="#ff6b6b" />
      </TouchableOpacity>
    )}
  </View>
));

// Main upload progress indicator component
const UploadProgressIndicator = memo(() => {
  const { uploads, clearUpload } = useUpload();
  const { theme } = useTheme();
  
  if (uploads.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {uploads.map(upload => (
        <UploadItem 
          key={upload.id} 
          upload={upload} 
          onClear={clearUpload} 
          theme={theme} 
        />
      ))}
    </View>
  );
});

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    zIndex: 9999,
  },
  uploadItem: {
    marginBottom: 8,
  },
  uploadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fileName: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
  },
  progressText: {
    fontSize: 12,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'transparent',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    width: '100%',
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
  },
});
