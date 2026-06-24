import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Home, Activity, Pill, Thermometer, FileText, UserIcon } from 'lucide-react-native';

// State & Theme
import { useAppStore } from './src/store/appStore';
import { COLORS, getFontScale } from './src/config/theme';
import { initDatabase } from './src/database/sqliteService';
import { checkUserExists } from './src/database/dbHelpers';
import { requestNotificationPermissions } from './src/services/notificationService';

// Screens
import { LoginScreen } from './src/features/auth/LoginScreen';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { PinUnlockScreen } from './src/features/auth/PinUnlockScreen';
import { DashboardScreen } from './src/features/dashboard/DashboardScreen';
import { VitalsScreen } from './src/features/vitals/VitalsScreen';
import { MedicinesScreen } from './src/features/medicines/MedicinesScreen';
import { SymptomsScreen } from './src/features/symptoms/SymptomsScreen';
import { ReportsScreen } from './src/features/reports/ReportsScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';
import { NotificationsCenterScreen } from './src/features/dashboard/NotificationsCenterScreen';
import { SearchScreen } from './src/features/dashboard/SearchScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main authenticated flow
function TabNavigator() {
  const { themeMode, contrastMode, fontSizeScale } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.card,
          borderBottomWidth: contrastMode === 'high' ? 2 : 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 18 * fontScale,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: themeMode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          height: 64,
          paddingBottom: Platform.OS === 'ios' ? 16 : 8,
          paddingTop: 8,
          borderRadius: 32,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 24 : 16,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <BlurView 
            intensity={themeMode === 'dark' ? 60 : 80} 
            tint={themeMode === 'dark' ? 'dark' : 'light'} 
            style={StyleSheet.absoluteFill} 
          />
        ),
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11 * fontScale,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="VitalsTab"
        component={VitalsScreen}
        options={{
          title: 'Vitals',
          tabBarLabel: 'Vitals',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="MedicinesTab"
        component={MedicinesScreen}
        options={{
          title: 'Meds',
          tabBarLabel: 'Meds',
          tabBarIcon: ({ color, size }) => <Pill color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="SymptomsTab"
        component={SymptomsScreen}
        options={{
          title: 'Symptoms',
          tabBarLabel: 'Symptoms',
          tabBarIcon: ({ color, size }) => <Thermometer color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          title: 'Reports',
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size || 24} />,
        }}
      />
    </Tab.Navigator>
  );
}


export default function App() {
  const {
    user,
    isLocked,
    hasPin,
    themeMode,
    contrastMode,
    setUser,
    setHasPin,
    setBiometricsEnabled,
    setIsLocked,
  } = useAppStore();

  const theme = COLORS[themeMode][contrastMode];

  useEffect(() => {
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800;900&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      const style = document.createElement('style');
      style.appendChild(document.createTextNode(`
        * {
          font-family: 'Urbanist', sans-serif !important;
        }
      `));
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    // 1. Initialize SQLite Database & Tables
    initDatabase();

    // 2. Check if a registered user profile exists
    const localUser = checkUserExists();
    if (localUser) {
      setHasPin(true);
      setBiometricsEnabled(localUser.biometrics_enabled === 1);
      // Auto-lock on launch if PIN exists
      setIsLocked(true);
    }

    // 3. Request push notifications
    requestNotificationPermissions();
  }, []);

  // Show security overlay screen if locked
  if (user && isLocked && hasPin) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
        <PinUnlockScreen />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.card,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        {user ? (
          // Authenticated App Flow
          <>
            <Stack.Screen
              name="MainApp"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NotificationsCenter"
              component={NotificationsCenterScreen}
              options={{ title: 'Notifications Center' }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ title: 'Global Search Cabinet' }}
            />
          </>
        ) : (
          // Unauthenticated Auth Flow
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
