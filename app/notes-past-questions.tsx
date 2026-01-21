import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import WebView from 'react-native-webview';

import DocumentUploadModal from '../components/DocumentUploadModal';
import { useAuth } from '../src/contexts/AuthContext';
import { withAuth } from '../src/components/withAuth';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Document, DocumentType, useDocuments } from '../src/contexts/DocumentContext';

type ActiveTab = DocumentType;

function PdfViewer({ uri }: { uri: string }) {
  if (Platform.OS === 'web') {
    return (
      <iframe
        src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`}
        style={{ width: '100%', height: '100%', border: 'none', background: '#121212' }}
        title="PDF Viewer"
      />
    );
  } else {
    return (
      <WebView
        source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}` }}
        style={{ flex: 1, backgroundColor: '#121212' }}
        originWhitelist={['*']}
        allowFileAccess={true}
      />
    );
  }
}

function PdfViewerModal({ visible, onClose, uri }: { visible: boolean, onClose: () => void, uri: string | null }) {
  if (Platform.OS === 'web') {
    if (!visible || !uri) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(18,18,18,0.98)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
          <span style={{ color: '#fff', fontSize: 18 }}>Document Viewer</span>
          <button onClick={onClose} style={{ fontSize: 24, background: 'none', color: '#fff', border: 'none' }}>×</button>
        </div>
        <iframe
          src={uri}
          style={{ flex: 1, width: '100%', border: 'none', background: '#121212' }}
          title="PDF Viewer"
        />
      </div>
    );
  } else {
    // On mobile, open in system browser and close modal
    useEffect(() => {
      if (visible && uri) {
        WebBrowser.openBrowserAsync(uri);
        onClose();
      }
    }, [visible, uri, onClose]);

    return null;
  }
}

function NotesPastQuestionsScreen() {
  const { user } = useAuth();
  const { documents, addDocument, updateDocument, deleteDocument, downloadDocument, isLoading } = useDocuments();

  const [activeTab, setActiveTab] = useState<ActiveTab>('Notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewingUri, setViewingUri] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter(doc => doc.docType === activeTab)
      .filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [documents, activeTab, searchQuery]);

  const handleAddDocument = async (docData: Omit<Document, 'id' | 'createdAt' | 'rating' | 'ratingsCount'> & { file?: any }) => {
    if (!docData.file) {
      Alert.alert('Error', 'Please select a file to upload.');
      return;
    }
    await addDocument({
      ...docData,
      file: docData.file,
      uploaderName: docData.uploaderName || user?.display_name,
    });
  };

  const handleEditDocument = async (docData: Omit<Document, 'id' | 'createdAt' | 'rating' | 'ratingsCount'> & { file?: any }) => {
    if (editingDoc) {
      // For now, only support re-uploading with a new file
      if (!docData.file) {
        Alert.alert('Error', 'Please select a file to upload.');
        return;
      }
      await addDocument({
        ...docData,
        file: docData.file,
        uploaderName: docData.uploaderName || user?.display_name,
      });
    }
  };

  const handleDeleteDocument = (doc: Document) => {
    Alert.alert('Delete Document', `Are you sure you want to delete ${doc.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDocument(doc.id) },
    ]);
  };

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingDoc(null);
  };

  const handleSubmit = async (docData: Omit<Document, 'id' | 'createdAt' | 'rating' | 'ratingsCount'>) => {
    if (editingDoc) await handleEditDocument(docData);
    else await handleAddDocument(docData);
  };

  const viewDocument = async (doc: Document) => {
    const url = (doc as any).fileUrl || doc.fileUri;
    setViewingUri(url);
    setViewerVisible(true);
  };

  const renderDocItem = ({ item }: { item: Document }) => (
    <View style={styles.docCard}>
      <View style={styles.docIcon}>
        <Ionicons name={item.fileType === 'pdf' ? 'document-text' : 'image'} size={24} color="#007AFF" />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.docMeta}>{item.courseCode} • {item.level} • {item.semester}</Text>
        <Text style={styles.docUploader}>Uploaded by: {item.uploaderName || 'Anonymous'}</Text>
      </View>
      <View style={styles.docActions}>
        <TouchableOpacity onPress={() => viewDocument(item)} style={styles.actionButton}>
          <Ionicons name="eye-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => downloadDocument(item)} style={styles.actionButton}>
          <Ionicons name={item.downloadedUri ? "checkmark-circle" : "cloud-download-outline"} size={20} color={item.downloadedUri ? "#4CAF50" : "#fff"} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
          <Ionicons name="pencil-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteDocument(item)} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 28 }]}>
        <Text style={styles.headerTitle}>Notes & Past Questions</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="cloud-upload" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search and Tabs */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.tabs}>
          {(['Notes', 'Past Questions'] as ActiveTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Document List */}
      {isLoading ? (
        <View style={styles.emptyContainer}><Text style={styles.emptyText}>Loading...</Text></View>
      ) : filteredDocuments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="documents-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No {activeTab} Found</Text>
          <Text style={styles.emptySubtext}>Tap the upload button to add the first one!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocuments}
          renderItem={renderDocItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modals */}
      <DocumentUploadModal visible={modalVisible} onClose={closeModal} onSubmit={handleSubmit} editingDoc={editingDoc} />
      <PdfViewerModal visible={viewerVisible} onClose={() => setViewerVisible(false)} uri={viewingUri} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  uploadButton: { padding: 8 },
  controlsContainer: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: '#007AFF' },
  tabText: { color: '#fff', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  docCard: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, padding: 15, marginBottom: 12, alignItems: 'center' },
  docIcon: { marginRight: 15 },
  docInfo: { flex: 1 },
  docTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  docMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  docUploader: { color: '#666', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  docActions: { flexDirection: 'row', gap: 4 },
  actionButton: { padding: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8 },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#1E1E1E' },
  viewerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pdf: { flex: 1, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
});

export default NotesPastQuestionsScreen;