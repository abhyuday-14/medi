import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerUser } from '../../database/dbHelpers';
import { useAppStore } from '../../store/appStore';
import { COLORS, getFontScale } from '../../config/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only numbers'),
  confirmPin: z.string().length(4, 'PIN must be exactly 4 digits'),
}).refine((data) => data.pin === data.confirmPin, {
  message: 'PINs do not match',
  path: ['confirmPin'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { themeMode, contrastMode, fontSizeScale, setUser, setHasPin, setIsLocked } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      pin: '',
      confirmPin: '',
    },
    mode: 'onChange',
  });

  const onSubmit = (data: RegisterFormData) => {
    const userSession = registerUser(data.name, data.email, data.phone, data.pin);
    if (userSession) {
      setUser(userSession);
      setHasPin(true);
      setIsLocked(false);
      Alert.alert('Success', `Welcome to MediTrack, ${data.name}! Your account has been created locally.`);
    } else {
      Alert.alert('Registration Failed', 'An error occurred during registration. Email might be in use.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primary, fontSize: 32 * fontScale }]}>MediTrack</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: 16 * fontScale }]}>
            Create your local secure medical profile
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text, fontSize: 18 * fontScale }]}>Registration Details</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name"
                value={value}
                onChangeText={onChange}
                placeholder="Enter your first and last name"
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email Address"
                value={value}
                onChangeText={onChange}
                placeholder="example@mail.com"
                keyboardType="email-address"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Mobile Phone Number"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. +1 555 0199"
                keyboardType="phone-pad"
                error={errors.phone?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="pin"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Create 4-Digit Security PIN"
                value={value}
                onChangeText={onChange}
                placeholder="Enter 4 numbers"
                secureTextEntry={true}
                keyboardType="number-pad"
                error={errors.pin?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPin"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirm Security PIN"
                value={value}
                onChangeText={onChange}
                placeholder="Re-enter 4 numbers"
                secureTextEntry={true}
                keyboardType="number-pad"
                error={errors.confirmPin?.message}
              />
            )}
          />

          <View style={styles.buttonContainer}>
            <Button title="Register Profile" onPress={handleSubmit(onSubmit)} variant="primary" />
            <Button
              title="Already Registered? Login"
              onPress={() => navigation.navigate('Login')}
              variant="secondary"
            />
          </View>
        </Card>

        <Text style={[styles.disclaimer, { color: theme.textSecondary, fontSize: 12 * fontScale }]}>
          ⚠️ Offline-First Security: All credentials and medical records are stored strictly on your local device.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  buttonContainer: {
    marginTop: 16,
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
