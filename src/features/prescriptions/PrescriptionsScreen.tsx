import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert, TouchableOpacity, Image, Dimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import {
  getPrescriptions,
  addPrescription,
  deletePrescription,
  renamePrescription,
  PrescriptionDB,
} from '../../database/dbHelpers';
import { saveFileLocally, deleteLocalFile } from '../../services/fileService';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export const PrescriptionsScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const { themeMode, contrastMode, fontSizeScale, user } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [loading, setLoading] = useState(true);
  const [prescriptionsList, setPrescriptionsList] = useState<PrescriptionDB[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('All');
  
  // Modals visibility
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);

  // Form states
  const [tempFileUri, setTempFileUri] = useState<string | null>(null);
  const [tempFileName, setTempFileName] = useState('');
  const [tempFileType, setTempFileType] = useState('');
  const [doctorTag, setDoctorTag] = useState('');
  const [folderName, setFolderName] = useState('All');
  const [selectedPresc, setSelectedPresc] = useState<PrescriptionDB | null>(null);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    if (isFocused && user) {
      loadPrescriptions();
    }
  }, [isFocused, user]);

  const loadPrescriptions = () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = getPrescriptions(user.id);
      setPrescriptionsList(data);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setTempFileUri(file.uri);
        setTempFileName(file.name);
        setTempFileType(file.mimeType?.includes('pdf') ? 'PDF' : 'JPG');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Upload Failed', 'Could not select prescription file.');
    }
  };

  const handleCaptureImage = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'MediTrack needs camera access to snap a paper prescription.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setTempFileUri(file.uri);
        setTempFileName(`camera_prescription_${Date.now()}.jpg`);
        setTempFileType('JPG');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const handleSavePrescription = async () => {
    if (!user || !tempFileUri) {
      Alert.alert('Upload Error', 'Please select a file or snap a picture first.');
      return;
    }

    if (!tempFileName.trim()) {
      Alert.alert('Validation Error', 'Please provide a file name.');
      return;
    }

    try {
      // 1. Copy file permanently
      const permanentUri = await saveFileLocally(tempFileUri, tempFileName);
      if (!permanentUri) {
        throw new Error('Failed to save file locally');
      }

      // 2. Insert record in SQLite
      addPrescription({
        user_id: user.id,
        file_name: tempFileName.trim(),
        file_uri: permanentUri,
        file_type: tempFileType,
        doctor_tag: doctorTag.trim() || null,
        visit_date_tag: new Date().toISOString().split('T')[0],
        folder_name: folderName.trim() || 'All',
      });

      Alert.alert('Success', 'Prescription document saved securely.');
      setUploadModalVisible(false);
      
      // Clear form
      setTempFileUri(null);
      setTempFileName('');
      setTempFileType('');
      setDoctorTag('');
      setFolderName('All');

      loadPrescriptions();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save document locally.');
    }
  };

  const handleShare = async (presc: PrescriptionDB) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(presc.file_uri);
      } else {
        Alert.alert('Error', 'Sharing is not supported on this platform.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (presc: PrescriptionDB) => {
    Alert.alert('Delete Document', 'Are you sure you want to permanently delete this prescription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Delete local file
          await deleteLocalFile(presc.file_uri);
          // Delete DB row
          deletePrescription(presc.id);
          loadPrescriptions();
        },
      },
    ]);
  };

  const handleRename = () => {
    if (!selectedPresc || !newFileName.trim()) return;
    renamePrescription(selectedPresc.id, newFileName.trim());
    setRenameModalVisible(false);
    setSelectedPresc(null);
    setNewFileName('');
    loadPrescriptions();
  };

  // Compile active folders list
  const folders = ['All', ...new Set(prescriptionsList.map((p) => p.folder_name).filter((f) => f !== 'All'))];

  // Filtered prescriptions list
  const filteredList =
    activeFolder === 'All'
      ? prescriptionsList
      : prescriptionsList.filter((p) => p.folder_name === activeFolder);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontSize: 22 * fontScale }]}>Prescription Cabinet</Text>
        <TouchableOpacity
          onPress={() => setUploadModalVisible(true)}
          style={[styles.addBtn, { backgroundColor: theme.primary, minHeight: 48, minWidth: 48 }]}
        >
          <Text style={styles.addBtnText}>+ Add File</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Folders Navigator */}
      <View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.folderList}>
          {folders.map((folder) => (
            <TouchableOpacity
              key={folder}
              onPress={() => setActiveFolder(folder)}
              style={[
                styles.folderTab,
                {
                  backgroundColor: activeFolder === folder ? theme.primary : theme.card,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={{
                  color: activeFolder === folder ? '#FFFFFF' : theme.text,
                  fontWeight: 'bold',
                  fontSize: 14 * fontScale,
                }}
              >
                📁 {folder}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Prescription Files list */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        {filteredList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40 }}>📁</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 16 * fontScale, marginTop: 8, textAlign: 'center' }}>
              No prescription documents inside this cabinet category.
            </Text>
          </View>
        ) : (
          filteredList.map((presc) => (
            <Card key={presc.id} style={styles.prescCard}>
              <View style={styles.prescHeader}>
                <View style={styles.prescMeta}>
                  <Text style={{ fontSize: 28 }}>{presc.file_type === 'PDF' ? '📄' : '🖼️'}</Text>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.fileName, { color: theme.text, fontSize: 15 * fontScale }]} numberOfLines={1}>
                      {presc.file_name}
                    </Text>
                    <Text style={[styles.fileTag, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>
                      Doctor: {presc.doctor_tag || 'General'} | 📅 {presc.visit_date_tag}
                    </Text>
                  </View>
                </View>

                {/* Actions row */}
                <View style={styles.actionsBlock}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPresc(presc);
                      setNewFileName(presc.file_name);
                      setRenameModalVisible(true);
                    }}
                    style={styles.actionIcon}
                  >
                    <Text style={{ fontSize: 15, color: theme.primary }}>✏️ Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleShare(presc)} style={[styles.actionIcon, { marginLeft: 12 }]}>
                    <Text style={{ fontSize: 15, color: theme.primary }}>📤 Share</Text>
                  </TouchableOpacity>

                  {presc.file_type === 'JPG' && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPresc(presc);
                        setPreviewModalVisible(true);
                      }}
                      style={[styles.actionIcon, { marginLeft: 12 }]}
                    >
                      <Text style={{ fontSize: 15, color: theme.success }}>👁️ Preview</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity onPress={() => handleDelete(presc)} style={[styles.actionIcon, { marginLeft: 12 }]}>
                    <Text style={{ fontSize: 15, color: theme.danger }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Upload document modal */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 20 * fontScale }]}>Add Prescription File</Text>

            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              {/* Select method */}
              <View style={styles.uploadRow}>
                <TouchableOpacity onPress={handlePickDocument} style={[styles.uploadBox, { backgroundColor: theme.primaryLight }]}>
                  <Text style={{ fontSize: 24 }}>📄</Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>Select PDF/File</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCaptureImage} style={[styles.uploadBox, { backgroundColor: theme.primaryLight, marginLeft: 16 }]}>
                  <Text style={{ fontSize: 24 }}>📸</Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>Snap Document</Text>
                </TouchableOpacity>
              </View>

              {tempFileUri && (
                <View style={styles.selectedFileBox}>
                  <Text style={{ fontSize: 16 }}>✅ Selected file: {tempFileName}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Type: {tempFileType}</Text>
                </View>
              )}

              <Input label="Rename File Name (Optional)" value={tempFileName} onChangeText={setTempFileName} placeholder="e.g. Cardiac_Prescription.jpg" />
              <Input label="Doctor's Tag / Specialist" value={doctorTag} onChangeText={setDoctorTag} placeholder="e.g. Dr. Robert Chen" />
              <Input label="Folder Cabinet Name (Optional)" value={folderName} onChangeText={setFolderName} placeholder="e.g. Endocrinologist, Dental" />

              <View style={{ marginTop: 24 }}>
                <Button title="Save to Cabinet" onPress={handleSavePrescription} variant="primary" />
                <Button
                  title="Cancel"
                  onPress={() => setUploadModalVisible(false)}
                  variant="secondary"
                  style={{ marginTop: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={previewModalVisible} animationType="fade" transparent={true}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.closeOverlay} onPress={() => setPreviewModalVisible(false)} />
          <View style={styles.previewContainer}>
            {selectedPresc && (
              <Image source={{ uri: selectedPresc.file_uri }} style={styles.previewImage} resizeMode="contain" />
            )}
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>{selectedPresc?.file_name}</Text>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)} style={styles.closePreviewBtn}>
                <Text style={styles.closePreviewTxt}>Close ✗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={renameModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18 * fontScale }]}>Rename Prescription</Text>
            
            <Input label="Enter New File Name" value={newFileName} onChangeText={setNewFileName} placeholder="Lisinopril_Prescription.pdf" />

            <View style={{ marginTop: 16 }}>
              <Button title="Save Rename" onPress={handleRename} variant="primary" />
              <Button title="Cancel" onPress={() => setRenameModalVisible(false)} variant="secondary" style={{ marginTop: 8 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
  },
  addBtn: {
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  folderList: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    height: 48,
    marginVertical: 4,
  },
  folderTab: {
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: 38,
    marginRight: 8,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  prescCard: {
    padding: 12,
    marginBottom: 12,
  },
  prescHeader: {
    alignItems: 'stretch',
  },
  prescMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileName: {
    fontWeight: 'bold',
  },
  fileTag: {
    fontWeight: '500',
    marginTop: 2,
  },
  actionsBlock: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 10,
    paddingTop: 8,
    justifyContent: 'flex-end',
  },
  actionIcon: {
    paddingVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formScroll: {
    paddingBottom: 24,
  },
  uploadRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  uploadBox: {
    flex: 1,
    height: 72,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
  },
  selectedFileBox: {
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 12,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeOverlay: {
    position: 'absolute',
    width: screenWidth,
    height: screenHeight,
  },
  previewContainer: {
    width: '90%',
    height: '75%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewHeader: {
    position: 'absolute',
    top: -40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  closePreviewBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closePreviewTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
