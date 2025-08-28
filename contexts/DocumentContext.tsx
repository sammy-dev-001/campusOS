import axios from 'axios';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../config/api';

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
      const res = await axios.get(`${API_BASE_URL}/api/documents`);
      setDocuments(res.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addDocument = async (docData: Omit<Document, 'id' | 'createdAt' | 'rating' | 'ratingsCount' | 'fileUri'> & { file: any }) => {
    const formData = new FormData();
    formData.append('file', docData.file);
    formData.append('title', docData.title);
    formData.append('courseCode', docData.courseCode || '');
    formData.append('level', docData.level || '');
    formData.append('semester', docData.semester || '');
    formData.append('docType', docData.docType || 'Notes');
    formData.append('uploaderName', docData.uploaderName || '');
    try {
      await axios.post(`${API_BASE_URL}/api/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchDocuments();
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Could not upload the document. Please try again.');
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
  );
};

export { getFileType };
