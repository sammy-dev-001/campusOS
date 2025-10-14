import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Document, DocumentType } from '../src/contexts/DocumentContext';

interface DocumentFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (doc: Omit<Document, 'id' | 'createdAt' | 'rating' | 'ratingsCount'>) => Promise<void>;
  editingDoc?: Document | null;
}

const LEVELS = ['100L', '200L', '300L', '400L', '500L'];
const SEMESTERS = ['First Semester', 'Second Semester'];
const DOC_TYPES: DocumentType[] = ['Notes', 'Past Questions'];

export default function DocumentUploadModal({
  visible,
  onClose,
  onSubmit,
  editingDoc,
}: DocumentFormModalProps) {
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [level, setLevel] = useState('100L');
  const [semester, setSemester] = useState('First Semester');
  const [docType, setDocType] = useState<DocumentType>('Notes');
  const [uploaderName, setUploaderName] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingDoc) {
      setTitle(editingDoc.title);
      setCourseCode(editingDoc.courseCode);
      setLevel(editingDoc.level);
      setSemester(editingDoc.semester);
      setDocType(editingDoc.docType);
      setUploaderName(editingDoc.uploaderName || '');
      // File cannot be re-selected for editing, user must upload a new one if they wish to change it.
      setFile(null); 
    } else {
      resetForm();
    }
  }, [editingDoc, visible]);

  const resetForm = () => {
    setTitle('');
    setCourseCode('');
    setLevel('100L');
    setSemester('First Semester');
    setDocType('Notes');
    setUploaderName('');
    setFile(null);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled === false) {
        setFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !courseCode.trim()) {
      Alert.alert('Error', 'Please fill in Title and Course Code.');
      return;
    }
    if (!editingDoc && !file) {
      Alert.alert('Error', 'Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      // If editing, we might not have a new file.
      // The onSubmit function should handle this case.
      const docData: any = {
        title: title.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        level,
        semester,
        docType,
        uploaderName: uploaderName.trim(),
      };

      if (file) {
        // For React Native, we need to create a file-like object with the correct structure
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = `${Date.now()}.${fileExtension}`;
        
        // Create a file object in the format expected by FormData
        const fileObj = {
          uri: file.uri,
          name: fileName,
          type: file.mimeType || getMimeType(fileExtension)
        };
        
        // Add the file to the form data
        docData.file = fileObj;
      }
      
      // Helper function to get MIME type from file extension
      function getMimeType(ext: string): string {
        const types: {[key: string]: string} = {
          'pdf': 'application/pdf',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc': 'application/msword',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'txt': 'text/plain'
        };
        return types[ext] || 'application/octet-stream';
      }
      
      await onSubmit(docData);
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingDoc ? 'Edit Document' : 'Upload Document'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Form Inputs */}
            <TouchableOpacity style={styles.filePickerButton} onPress={handlePickDocument}>
              <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
              <Text style={styles.filePickerText}>{file ? file.name : 'Select a file (PDF, DOCX, Image)'}</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Introduction to Al" placeholderTextColor="#AAA" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Code *</Text>
              <TextInput style={styles.input} value={courseCode} onChangeText={setCourseCode} placeholder="e.g., CMP 412" autoCapitalize="characters" placeholderTextColor="#AAA" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Level</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={level} onValueChange={setLevel} style={styles.picker} mode="dropdown">
                    {LEVELS.map(l => <Picker.Item key={l} label={l} value={l} />)}
                  </Picker>
                </View>
              </View>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Semester</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={semester} onValueChange={setSemester} style={styles.picker} mode="dropdown">
                    {SEMESTERS.map(s => <Picker.Item key={s} label={s} value={s} />)}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Document Type</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={docType} onValueChange={setDocType} style={styles.picker} mode="dropdown">
                  {DOC_TYPES.map(t => <Picker.Item key={t} label={t} value={t} />)}
                </Picker>
              </View>
            </View>
            
            <View style={[styles.inputGroup, { marginBottom: 30 }]}>
              <Text style={styles.label}>Uploader Name (Optional)</Text>
              <TextInput style={styles.input} value={uploaderName} onChangeText={setUploaderName} placeholder="Your name or anonymous" placeholderTextColor="#AAA" />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : 'Submit Document'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
    closeButton: { padding: 4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1, padding: 20 },
    form: { gap: 20 },
    filePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
    filePickerText: { color: '#007AFF', marginLeft: 10, flex: 1 },
    inputGroup: {
        marginBottom: 16,
        width: '100%',
    },
    label: { color: '#fff', fontSize: 16, fontWeight: '600' },
    input: {
        backgroundColor: '#1E1E1E',
        color: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginTop: 4,
        width: '100%',
    },
    pickerContainer: { backgroundColor: '#1E1E1E', borderRadius: 10, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
    picker: { color: '#fff', backgroundColor: '#1E1E1E', padding: 15 },
    row: { flexDirection: 'row', gap: 20 },
    flex: { flex: 1 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#333' },
    submitButton: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
    submitButtonDisabled: { backgroundColor: '#666' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
}); 