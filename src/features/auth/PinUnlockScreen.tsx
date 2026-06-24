import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, BackHandler, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { checkUserExists } from '../../database/dbHelpers';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { Button } from '../../components/Button';

export const PinUnlockScreen: React.FC = () => {
  const { themeMode, contrastMode, fontSizeScale, user, setIsLocked } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const [pin, setPin] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    // Disable Android back button to prevent bypassing the lock screen
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    checkBiometricSupport();

    return () => backHandler.remove();
  }, []);

  const checkBiometricSupport = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricSupported(hasHardware && isEnrolled);
    
    // Auto-trigger biometric lock
    const dbUser = checkUserExists();
    if (dbUser && dbUser.biometrics_enabled === 1) {
      triggerBiometricAuth(dbUser.pin_hash);
    }
  };

  const triggerBiometricAuth = async (pinHash: string) => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock MediTrack',
      disableDeviceFallback: true,
    });

    if (result.success) {
      setIsLocked(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyEnteredPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const verifyEnteredPin = (enteredPin: string) => {
    const dbUser = checkUserExists();
    if (dbUser && dbUser.pin_hash === enteredPin) {
      setIsLocked(false);
    } else {
      Alert.alert('Incorrect PIN', 'The security PIN you entered is incorrect.', [
        { text: 'Try Again', onPress: () => setPin('') }
      ]);
    }
  };

  const handleBiometricsManual = () => {
    const dbUser = checkUserExists();
    if (dbUser) {
      triggerBiometricAuth(dbUser.pin_hash);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.primary, fontSize: 32 * fontScale }]}>MediTrack</Text>
      <Text style={[styles.subtitle, { color: theme.text, fontSize: 18 * fontScale }]}>
        Enter Security PIN to Unlock
      </Text>

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index < pin.length ? theme.primary : 'transparent',
                borderColor: theme.primary,
                borderWidth: 2,
              },
            ]}
          />
        ))}
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIndex) => (
          <View key={rIndex} style={styles.keypadRow}>
            {row.map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => handleKeyPress(num)}
                style={[styles.keyButton, { borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 1 }]}
              >
                <Text style={[styles.keyText, { color: theme.text, fontSize: 24 * fontScale }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.keypadRow}>
          {/* Biometrics option or empty */}
          {biometricSupported ? (
            <TouchableOpacity
              onPress={handleBiometricsManual}
              style={[styles.keyButton, { borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 1, backgroundColor: theme.primaryLight }]}
            >
              <Text style={{ fontSize: 18, color: theme.primary, fontWeight: 'bold' }}>👤</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.keyButton, { opacity: 0 }]} />
          )}

          <TouchableOpacity
            onPress={() => handleKeyPress('0')}
            style={[styles.keyButton, { borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 1 }]}
          >
            <Text style={[styles.keyText, { color: theme.text, fontSize: 24 * fontScale }]}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBackspace}
            style={[styles.keyButton, { borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 1, backgroundColor: theme.dangerLight }]}
          >
            <Text style={{ fontSize: 18, color: theme.danger, fontWeight: 'bold' }}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    width: 140,
    justifyContent: 'space-between',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  keypad: {
    width: '80%',
    maxWidth: 280,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  keyButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  keyText: {
    fontWeight: '700',
  },
});
