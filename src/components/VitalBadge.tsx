import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';
import { COLORS, getFontScale } from '../config/theme';

export type VitalStatus = 'normal' | 'borderline' | 'critical';

interface VitalBadgeProps {
  status: VitalStatus;
  label?: string;
}

export const VitalBadge: React.FC<VitalBadgeProps> = ({ status, label }) => {
  const { themeMode, contrastMode, fontSizeScale } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  const getStyleConfigs = () => {
    switch (status) {
      case 'critical':
        return {
          bg: theme.dangerLight,
          text: theme.danger,
          border: theme.danger,
          defaultLabel: 'Critical',
        };
      case 'borderline':
        return {
          bg: theme.warningLight,
          text: theme.warning,
          border: theme.warning,
          defaultLabel: 'Borderline',
        };
      case 'normal':
      default:
        return {
          bg: theme.successLight,
          text: theme.success,
          border: theme.success,
          defaultLabel: 'Normal',
        };
    }
  };

  const configs = getStyleConfigs();
  const displayLabel = label || configs.defaultLabel;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: configs.bg,
          borderColor: contrastMode === 'high' ? theme.border : configs.border,
          borderWidth: 1,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: configs.text,
            fontSize: 13 * fontScale,
            fontWeight: '900',
          },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
