import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

// Helper function to get MIME type from file extension
const getMimeType = (extension: string): string => {
  const mimeTypes: { [key: string]: string } = {
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    'csv': 'text/csv',
    
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    
    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'mkv': 'video/x-matroska'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '../constants/Config';

export type DocumentType = 'Notes' | 'Past Questions';

export interface Document {
  id: string;
  title: string;
  courseCode: string;
  level: string;
  semester: string;
  docType: DocumentType;
  uploaderName?: string;
  fileUri: string; // This can be a local URI from DocumentPicker or a permanent one from FileSystem
  fileName: string;
  fileType: 'pdf' | 'docx' | 'png' | 'jpeg' | 'other';
  downloadedUri?: string; // Local URI after downloading for offline access
  createdAt: number;
  rating: number; // Simple rating for now
  ratingsCount: number;
}

interface DocumentContextType {
  documents: Document[];
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'rating' | 'ratingsCount' | 'fileUri'> & { file: any }) => Promise<void>;
  updateDocument: (id: string, doc: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  downloadDocument: (doc: Document) => Promise<string | null>;
  rateDocument: (id: string, newRating: number) => Promise<void>;
  isLoading: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};

const getFileType = (fileName: string): Document['fileType'] => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'docx': return 'docx';
    case 'png': return 'png';
    case 'jpeg':
    case 'jpg': return 'jpeg';
    default: return 'other';
  }
};

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/documents`);
      // Ensure we always set an array, even if the response is not in the expected format
      const documents = Array.isArray(res.data) ? res.data : [];
      setDocuments(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Set to empty array on error to prevent undefined errors
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addDocument = async (docData: Omit<Document, 'id' | 'createdAt' | 'rating' | 'ratingsCount' | 'fileUri'> & { file: any }) => {
    try {
      setIsLoading(true);
      
      // Get file info
      const fileToUpload = docData.file;
      const fileExtension = fileToUpload.name.split('.').pop()?.toLowerCase() || '';
      const mimeType = fileToUpload.mimeType || getMimeType(fileExtension);
      const fileName = fileToUpload.name || `document-${Date.now()}.${fileExtension}`;
      
      // Create form data
      const formData = new FormData();
      
      // Read the file as a blob first
      const response = await fetch(fileToUpload.uri);
      const blob = await response.blob();
      
      // Create a new file from the blob
      const fileObj = new File([blob], fileName, { type: mimeType });
      
      // Append the file to form data
      formData.append('file', fileObj);
      
      // Prepare metadata
      const metadata = {
        title: docData.title,
        courseCode: docData.courseCode || '',
        level: docData.level || '',
        semester: docData.semester || '',
        docType: docData.docType || 'Notes',
        uploaderName: docData.uploaderName || ''
      };
      
      // Append metadata as a JSON string
      formData.append('metadata', JSON.stringify(metadata));
      
      // Log the upload details for debugging
      console.log('Preparing to upload file:', {
        name: fileName,
        type: mimeType,
        size: fileToUpload.size,
        metadata
      });

      // Get the authentication token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Use XMLHttpRequest instead of fetch for better FormData handling
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', `${API_BASE_URL}/api/documents`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              // Refresh the documents list
              await fetchDocuments();
              resolve();
            } catch (error) {
              console.error('Error parsing response:', error);
              reject(new Error('Invalid server response'));
            }
          } else {
            let errorMessage = 'Failed to upload document';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              console.error('Error parsing error response:', e);
            }
            reject(new Error(errorMessage));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error occurred'));
        };
        
        xhr.upload.onprogress = (event) => {
          // You can add progress tracking here if needed
          console.log(`Upload progress: ${(event.loaded / event.total) * 100}%`);
        };
        
        // Send the form data
        xhr.send(formData as any);
      });
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not upload the document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDocument = async (id: string, docData: Partial<Document>) => {};
  const deleteDocument = async (id: string) => {};
  const downloadDocument = async (doc: Document) => null;
  const rateDocument = async (id: string, newRating: number) => {};

  const value = {
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    rateDocument,
    isLoading,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  ) as React.ReactNode;
};

export { getFileType };
