import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../config/theme';

interface CardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const { themeMode, contrastMode } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: contrastMode === 'high' ? 2 : 1,
    },
    contrastMode !== 'high' && styles.shadow,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {({ pressed }) => (
          <View style={[cardStyle, { 
            opacity: pressed ? 0.95 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            ...(Platform.OS === 'web' ? { transition: 'transform 0.2s ease-out, opacity 0.2s ease-out' } : {} as any),
          }]}>
            {children}
          </View>
        )}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24, // Premium soft radius
    padding: 20, // Increased padding
    marginVertical: 10,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 4, // Softer, more diffuse shadow
  },
});
