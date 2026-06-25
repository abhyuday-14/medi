import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconContainer } from './IconContainer';
import { COLORS, getFontScale } from '../config/theme';
import { useAppStore } from '../store/appStore';

interface PageHeaderProps {
  title: string;
  icon: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, icon, rightElement }) => {
  const { fontSizeScale, themeMode, contrastMode } = useAppStore();
  const fontScale = getFontScale(fontSizeScale);
  const theme = COLORS[themeMode][contrastMode];

  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <IconContainer size={40} backgroundColor="#2563EB">
          {icon}
        </IconContainer>
        <Text style={[styles.title, { color: theme.text, fontSize: 22 * fontScale }]}>
          {title}
        </Text>
      </View>
      {rightElement}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginLeft: 16,
  },
});
