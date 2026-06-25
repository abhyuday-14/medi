import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Share, TouchableOpacity, Modal } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { updateBiometricsSetting, checkUserExists, getMedicalProfile, getVitalsHistory, getMedications, getSymptomsHistory, getDoctorVisits, getPrescriptions, updateUserPin, resetDatabase } from '../../database/dbHelpers';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PageHeader } from '../../components/PageHeader';
import { IconContainer } from '../../components/IconContainer';
import { Settings, Moon, Contrast, Fingerprint, Lock, Download, Upload, Trash2 } from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const {
    themeMode,
    contrastMode,
    fontSizeScale,
    setThemeMode,
    setContrastMode,
    setFontSizeScale,
    user,
    biometricsEnabled,
    setBiometricsEnabled,
  } = useAppStore();

  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [biometricsAvailable, setBiometricsAvailable] = useState(true);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const handleExportData = async () => {
    if (!user) return;
    try {
      const profile = getMedicalProfile(user.id);
      const vitals = getVitalsHistory(user.id, 1000);
      const meds = getMedications(user.id);
      const symptoms = getSymptomsHistory(user.id, 1000);
      const visits = getDoctorVisits(user.id);
      const prescriptions = getPrescriptions(user.id);

      const backupObject = {
        app: 'MediTrack Backup',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        user: { name: user.name, email: user.email, phone: user.phone },
        medicalProfile: profile,
        vitals,
        medications: meds,
        symptoms,
        doctorVisits: visits,
        prescriptions,
      };

      const backupString = JSON.stringify(backupObject, null, 2);

      await Share.share({
        message: backupString,
        title: 'MediTrack Health Backup Data',
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', 'An error occurred while compiling your data.');
    }
  };

  const handleImportData = () => {
    Alert.alert(
      'Import Data Backup',
      'Importing a backup will merge records into your current offline database. Would you like to restore?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Mock Backup',
          onPress: () => {
            Alert.alert('Success', 'Backup restored successfully! Logs have been synchronized.');
          },
        },
      ]
    );
  };

  const handleResetDemoData = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will erase your database and re-seed the clinic sample evaluation records. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Re-seed',
          style: 'destructive',
          onPress: () => {
            try {
              resetDatabase();
              Alert.alert('Reset Complete', 'Offline database seeded with clean evaluation dataset. Please relaunch the app.');
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  const handleUpdatePin = () => {
    if (!user) return;
    if (!oldPin || !newPin || !confirmNewPin) {
      Alert.alert('Error', 'Please fill in all PIN fields.');
      return;
    }

    const dbUser = checkUserExists();
    if (dbUser && dbUser.pin_hash !== oldPin) {
      Alert.alert('PIN Error', 'Your current security PIN is incorrect.');
      return;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      Alert.alert('PIN Error', 'PIN must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmNewPin) {
      Alert.alert('PIN Error', 'New PIN and confirm PIN must match.');
      return;
    }

    if (updateUserPin(user.id, newPin)) {
      Alert.alert('Success', 'Security PIN code changed successfully.');
      setPinModalVisible(false);
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
    } else {
      Alert.alert('Error', 'Failed to change PIN. Please try again.');
    }
  };

  const handleToggleBiometrics = (val: boolean) => {
    if (!user) return;
    updateBiometricsSetting(user.id, val);
    setBiometricsEnabled(val);
    Alert.alert('Biometrics Updated', `Face ID/Fingerprint login has been ${val ? 'enabled' : 'disabled'}.`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader title="Settings" icon={<Settings size={22} color="#FFFFFF" />} />
      
      <View style={{ paddingHorizontal: 16 }}>
        {/* Accessibility Preferences Card */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16 * fontScale }]}>Accessibility & Visuals</Text>
        <Card>
          {/* Dark Mode toggle */}
          <View style={styles.settingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <IconContainer size={36} backgroundColor="#EFF6FF">
                <Moon size={18} color="#2563EB" />
              </IconContainer>
              <Text style={[styles.settingLabelText, { color: theme.text, fontSize: 16 * fontScale }]}>Dark Theme</Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
              trackColor={{ true: theme.primary }}
            />
          </View>

          <View style={styles.divider} />

          {/* High Contrast Mode toggle */}
          <View style={styles.settingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <IconContainer size={36} backgroundColor="#EFF6FF">
                <Contrast size={18} color="#2563EB" />
              </IconContainer>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.text, fontSize: 16 * fontScale }]}>High Contrast Mode</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Enhance visual borders and color saturation</Text>
              </View>
            </View>
            <Switch
              value={contrastMode === 'high'}
              onValueChange={(val) => setContrastMode(val ? 'high' : 'normal')}
              trackColor={{ true: theme.primary }}
            />
          </View>

          <View style={styles.divider} />

          {/* Text Scaling Selection */}
          <Text style={[styles.settingLabel, { color: theme.text, fontSize: 16 * fontScale, marginBottom: 8, marginTop: 4 }]}>
            Senior Font Size Scale
          </Text>
          <View style={styles.sizeBtnRow}>
            {(['normal', 'large', 'extra-large'] as typeof fontSizeScale[]).map((scale) => (
              <TouchableOpacity
                key={scale}
                onPress={() => setFontSizeScale(scale)}
                style={[
                  styles.sizeBtn,
                  {
                    backgroundColor: fontSizeScale === scale ? theme.primary : theme.background,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: fontSizeScale === scale ? '#FFFFFF' : theme.text,
                    fontWeight: 'bold',
                    fontSize: (scale === 'normal' ? 13 : scale === 'large' ? 15 : 17) * fontScale,
                  }}
                >
                  {scale === 'normal' ? 'Normal' : scale === 'large' ? 'Large' : 'Extra Large'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Security settings */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16 * fontScale }]}>Security & Privacy</Text>
        <Card>
          <View style={styles.settingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <IconContainer size={36} backgroundColor="#EFF6FF">
                <Fingerprint size={18} color="#2563EB" />
              </IconContainer>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.text, fontSize: 16 * fontScale }]}>Biometric Lock</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Use Face ID or Fingerprint to unlock</Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ true: theme.primary }}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity onPress={() => setPinModalVisible(true)} style={styles.settingRowItem}>
            <IconContainer size={36} backgroundColor="#EFF6FF">
              <Lock size={18} color="#2563EB" />
            </IconContainer>
            <Text style={[styles.settingLabelText, { color: theme.primary, fontSize: 16 * fontScale, fontWeight: 'bold' }]}>
              Change 4-Digit Security PIN
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Data Management settings */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16 * fontScale }]}>Data Utilities</Text>
        <Card style={{ marginBottom: 40 }}>
          <TouchableOpacity onPress={handleExportData} style={styles.settingRowItem}>
            <IconContainer size={36} backgroundColor="#EFF6FF">
              <Download size={18} color="#2563EB" />
            </IconContainer>
            <Text style={[styles.settingLabelText, { color: theme.text, fontSize: 16 * fontScale }]}>Export Clinical Logs (JSON Backup)</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={handleImportData} style={styles.settingRowItem}>
            <IconContainer size={36} backgroundColor="#EFF6FF">
              <Upload size={18} color="#2563EB" />
            </IconContainer>
            <Text style={[styles.settingLabelText, { color: theme.text, fontSize: 16 * fontScale }]}>Import Data / Restore Backup</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={handleResetDemoData} style={styles.settingRowItem}>
            <IconContainer size={36} backgroundColor="#FEE2E2">
              <Trash2 size={18} color="#EF4444" />
            </IconContainer>
            <Text style={[styles.settingLabelText, { color: theme.danger, fontSize: 16 * fontScale, fontWeight: 'bold' }]}>
              Reset Database & Re-seed Demo Data
            </Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* PIN Change Modal */}
      <Modal visible={pinModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 20 * fontScale }]}>Change Security PIN</Text>

            <Input
              label="Current 4-Digit PIN"
              value={oldPin}
              onChangeText={setOldPin}
              placeholder="4 digits"
              secureTextEntry={true}
              keyboardType="number-pad"
            />

            <Input
              label="New 4-Digit PIN"
              value={newPin}
              onChangeText={setNewPin}
              placeholder="4 digits"
              secureTextEntry={true}
              keyboardType="number-pad"
            />

            <Input
              label="Confirm New 4-Digit PIN"
              value={confirmNewPin}
              onChangeText={setConfirmNewPin}
              placeholder="Re-enter 4 digits"
              secureTextEntry={true}
              keyboardType="number-pad"
            />

            <View style={{ marginTop: 24 }}>
              <Button title="Save PIN Update" onPress={handleUpdatePin} variant="primary" />
              <Button
                title="Cancel"
                onPress={() => setPinModalVisible(false)}
                variant="secondary"
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontWeight: '600',
  },
  settingLabelText: {
    marginLeft: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  sizeBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sizeBtn: {
    flex: 1,
    marginHorizontal: 4,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickableSetting: {
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});
