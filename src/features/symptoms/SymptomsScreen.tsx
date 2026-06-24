import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { getSymptomsHistory, addSymptomLog, SymptomDB } from '../../database/dbHelpers';
import { saveFileLocally } from '../../services/fileService';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { VitalBadge } from '../../components/VitalBadge';
import { BackgroundGrid } from '../../components/BackgroundGrid';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export const SymptomsScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const { themeMode, contrastMode, fontSizeScale, user } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [loading, setLoading] = useState(true);
  const [symptomLogs, setSymptomLogs] = useState<SymptomDB[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused && user) {
      loadSymptoms();
    }
  }, [isFocused, user]);

  const loadSymptoms = () => {
    if (!user) return;
    setLoading(true);
    try {
      const logs = getSymptomsHistory(user.id, 50);
      setSymptomLogs(logs);
    } catch (error) {
      console.error('Error loading symptoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async (source: 'camera' | 'library') => {
    try {
      let permissionResult;
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'MediTrack needs permission to access your camera/photos to attach logs.');
        return;
      }

      let pickerResult;
      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      if (source === 'camera') {
        pickerResult = await ImagePicker.launchCameraAsync(options);
      } else {
        pickerResult = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!pickerResult.canceled && pickerResult.assets.length > 0) {
        const selectedUri = pickerResult.assets[0].uri;
        
        // Save the image locally permanently
        const savedUri = await saveFileLocally(selectedUri, `symptom_${Date.now()}.jpg`);
        if (savedUri) {
          setPhotoUri(savedUri);
        } else {
          setPhotoUri(selectedUri); // Fallback
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Upload Failed', 'Could not load attachment.');
    }
  };

  const handleSaveSymptom = () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a symptom name.');
      return;
    }

    addSymptomLog({
      user_id: user.id,
      name: name.trim(),
      severity,
      notes: notes.trim() || null,
      photo_uri: photoUri,
    });

    Alert.alert('Saved', 'Symptom log entry added successfully.');
    setModalVisible(false);
    
    // Reset states
    setName('');
    setSeverity(5);
    setNotes('');
    setPhotoUri(null);

    loadSymptoms(); // Refresh
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundGrid />
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Header with log button */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontSize: 22 * fontScale }]}>Symptom Diary</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.addBtn, { backgroundColor: theme.primary, minHeight: 48, minWidth: 48, overflow: 'hidden' }]}
        >
          <ExpoLinearGradient
            colors={themeMode === 'dark' ? ['#3B82F6', '#1E3A8A'] : ['#FF6B6B', '#EF4444', '#D92A2A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.addBtnText, { zIndex: 1 }]}>+ Log Symptom</Text>
        </TouchableOpacity>
      </View>

      {/* Symptoms Timeline List */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        {symptomLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40 }}>🤒</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 16 * fontScale, marginTop: 8, textAlign: 'center' }}>
              No symptoms logged yet. Tap "+ Log Symptom" to record how you feel.
            </Text>
          </View>
        ) : (
          symptomLogs.map((log, index) => {
            const isHighSeverity = log.severity >= 7;
            const isMediumSeverity = log.severity >= 4 && log.severity < 7;
            const badgeStatus = isHighSeverity ? 'critical' : isMediumSeverity ? 'borderline' : 'normal';

            return (
              <View key={log.id} style={styles.timelineItem}>
                {/* Vertical line indicator */}
                <View style={styles.timelineTrack}>
                  <View style={[styles.timelineDot, { backgroundColor: isHighSeverity ? theme.danger : isMediumSeverity ? theme.warning : theme.success }]} />
                  {index < symptomLogs.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                </View>

                {/* Card details */}
                <Card style={styles.symptomCard}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.symptomName, { color: theme.text, fontSize: 16 * fontScale }]}>{log.name}</Text>
                    <VitalBadge status={badgeStatus} label={`Severity ${log.severity}/10`} />
                  </View>
                  
                  <Text style={[styles.timestamp, { color: theme.textSecondary, fontSize: 13 * fontScale }]}>
                    ⏰ {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>

                  {log.notes && (
                    <Text style={[styles.notesText, { color: theme.text, fontSize: 14 * fontScale }]}>
                      {log.notes}
                    </Text>
                  )}

                  {log.photo_uri && (
                    <Image source={{ uri: log.photo_uri }} style={styles.symptomImage} resizeMode="cover" />
                  )}
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Log modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 20 * fontScale }]}>Log New Symptom</Text>

            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Symptom Name / Feeling"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Headache, Chest tightness, Nausea"
              />

              {/* Severity Visual 1-10 selector */}
              <Text style={[styles.formLabel, { color: theme.text, fontSize: 16 * fontScale }]}>
                Severity Level: {severity}/10
              </Text>
              <View style={styles.severityGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = num === severity;
                  const severityColor = num >= 7 ? theme.danger : num >= 4 ? theme.warning : theme.success;
                  
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setSeverity(num)}
                      style={[
                        styles.severityBtn,
                        {
                          backgroundColor: isSelected ? severityColor : 'transparent',
                          borderColor: severityColor,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : severityColor,
                          fontWeight: 'bold',
                          fontSize: 15 * fontScale,
                        }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                label="Additional Context / Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Occurred after lunch, went away after rest"
                multiline={true}
              />

              {/* Attachment option */}
              <Text style={[styles.formLabel, { color: theme.text, fontSize: 16 * fontScale }]}>
                Photo Attachment (Optional)
              </Text>
              
              <View style={styles.photoContainer}>
                {photoUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} />
                    <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removePhotoBtn}>
                      <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>Remove ✗</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      onPress={() => handlePickImage('camera')}
                      style={[styles.photoBtn, { backgroundColor: theme.primaryLight }]}
                    >
                      <Text style={{ fontSize: 18 }}>📸</Text>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                        Use Camera
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handlePickImage('library')}
                      style={[styles.photoBtn, { backgroundColor: theme.primaryLight, marginLeft: 16 }]}
                    >
                      <Text style={{ fontSize: 18 }}>🖼️</Text>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                        Upload Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={{ marginTop: 24 }}>
                <Button title="Save Symptom Entry" onPress={handleSaveSymptom} variant="primary" />
                <Button
                  title="Cancel"
                  onPress={() => setModalVisible(false)}
                  variant="secondary"
                  style={{ marginTop: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
};

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
  scrollList: {
    padding: 16,
    paddingBottom: 120,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineTrack: {
    alignItems: 'center',
    width: 24,
    marginRight: 8,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 18,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 6,
  },
  symptomCard: {
    flex: 1,
    padding: 12,
    marginVertical: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symptomName: {
    fontWeight: 'bold',
  },
  timestamp: {
    fontWeight: '500',
    marginVertical: 4,
  },
  notesText: {
    lineHeight: 20,
    marginTop: 6,
  },
  symptomImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 10,
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
  formLabel: {
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 8,
  },
  severityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  photoContainer: {
    marginTop: 4,
    marginBottom: 16,
  },
  photoActions: {
    flexDirection: 'row',
  },
  photoBtn: {
    flex: 1,
    height: 64,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
  },
  previewContainer: {
    position: 'relative',
    width: 120,
    height: 90,
  },
  previewImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
