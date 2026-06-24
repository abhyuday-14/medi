import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { loginWithPin, checkUserExists, resetUserPin } from '../../database/dbHelpers';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { themeMode, contrastMode, fontSizeScale, setUser, setIsLocked } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Forgot PIN state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  useEffect(() => {
    checkBiometricSupport();
    prefillEmailIfSingleUser();
  }, []);

  const checkBiometricSupport = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricSupported(hasHardware && isEnrolled);
  };

  const prefillEmailIfSingleUser = () => {
    const defaultUser = checkUserExists();
    if (defaultUser) {
      setEmail(defaultUser.email);
      // Auto-trigger biometrics if enabled
      if (defaultUser.biometrics_enabled === 1) {
        triggerBiometricAuth(defaultUser);
      }
    }
  };

  const handleLogin = () => {
    setErrorMessage('');
    if (!email || !pin) {
      setErrorMessage('Please enter your registered email and 4-digit PIN.');
      return;
    }

    const session = loginWithPin(email, pin);
    if (session) {
      setUser(session);
      setIsLocked(false);
    } else {
      setErrorMessage('Incorrect email or security PIN. Please try again.');
    }
  };

  const triggerBiometricAuth = async (targetUser?: any) => {
    const user = targetUser || checkUserExists();
    if (!user) {
      Alert.alert('Error', 'No registered profile found. Please register first.');
      return;
    }

    if (user.biometrics_enabled === 0) {
      Alert.alert('Biometrics Disabled', 'Biometric login is not enabled. Please log in with your PIN first and enable it in settings.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock MediTrack',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: true,
    });

    if (result.success) {
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      });
      setIsLocked(false);
    }
  };

  const handleResetPin = () => {
    if (!recoveryEmail || !recoveryPhone || !newPin || !confirmNewPin) {
      Alert.alert('Error', 'All recovery fields are required.');
      return;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      Alert.alert('Validation Error', 'PIN must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmNewPin) {
      Alert.alert('Validation Error', 'New PINs do not match.');
      return;
    }

    const success = resetUserPin(recoveryEmail, recoveryPhone, newPin);
    if (success) {
      Alert.alert('Success', 'Your security PIN has been reset successfully. Please log in.');
      setResetModalVisible(false);
      setEmail(recoveryEmail);
      setPin('');
      setRecoveryEmail('');
      setRecoveryPhone('');
      setNewPin('');
      setConfirmNewPin('');
    } else {
      Alert.alert('Reset Failed', 'Incorrect email or mobile number match. Please check your credentials.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.primary, fontSize: 36 * fontScale }]}>MediTrack</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: 16 * fontScale }]}>
          Your Personal Health tracking Log
        </Text>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.text, fontSize: 18 * fontScale }]}>Profile Secure Login</Text>

        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="example@mail.com"
          keyboardType="email-address"
        />

        <Input
          label="4-Digit Security PIN"
          value={pin}
          onChangeText={setPin}
          placeholder="Enter 4 numbers"
          secureTextEntry={true}
          keyboardType="number-pad"
        />

        <TouchableOpacity onPress={() => setResetModalVisible(true)} style={styles.forgotBtn}>
          <Text style={[styles.forgotText, { color: theme.primary, fontSize: 15 * fontScale }]}>
            Forgot Security PIN?
          </Text>
        </TouchableOpacity>

        {errorMessage ? (
          <View style={{ backgroundColor: theme.dangerLight, padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: theme.danger, textAlign: 'center', fontWeight: 'bold' }}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <Button title="Login" onPress={handleLogin} variant="primary" />

          {biometricSupported && (
            <Button
              title="Use Biometric Login"
              onPress={() => triggerBiometricAuth()}
              variant="secondary"
              style={{ marginTop: 8 }}
            />
          )}

          <Button
            title="Create New Profile"
            onPress={() => navigation.navigate('Register')}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
        </View>
      </Card>

      {/* Recovery PIN Modal */}
      <Modal visible={resetModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 0 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 20 * fontScale }]}>Reset Security PIN</Text>
            
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
              <Input
                label="Registered Email"
                value={recoveryEmail}
                onChangeText={setRecoveryEmail}
                placeholder="example@mail.com"
                keyboardType="email-address"
              />

              <Input
                label="Registered Mobile Phone"
                value={recoveryPhone}
                onChangeText={setRecoveryPhone}
                placeholder="e.g. +1 555 0199"
                keyboardType="phone-pad"
              />

              <Input
                label="New 4-Digit PIN"
                value={newPin}
                onChangeText={setNewPin}
                placeholder="4 numbers"
                secureTextEntry={true}
                keyboardType="number-pad"
              />

              <Input
                label="Confirm New 4-Digit PIN"
                value={confirmNewPin}
                onChangeText={setConfirmNewPin}
                placeholder="Re-enter 4 numbers"
                secureTextEntry={true}
                keyboardType="number-pad"
              />

              <View style={{ marginTop: 16 }}>
                <Button title="Verify & Reset PIN" onPress={handleResetPin} variant="primary" />
                <Button
                  title="Cancel"
                  onPress={() => setResetModalVisible(false)}
                  variant="secondary"
                  style={{ marginTop: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginVertical: 4,
    padding: 6,
  },
  forgotText: {
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 16,
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});
