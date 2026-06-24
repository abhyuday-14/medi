import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, LinearGradient as SvgLinearGradient, Stop, RadialGradient, Path } from 'react-native-svg';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../config/theme';

export const BackgroundGrid: React.FC = () => {
  const { themeMode, contrastMode } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <Path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.text} strokeWidth="0.5" strokeOpacity="0.08" />
          </Pattern>
          <SvgLinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.background} stopOpacity="0" />
            <Stop offset="0.6" stopColor={theme.background} stopOpacity="0.8" />
            <Stop offset="1" stopColor={theme.background} stopOpacity="1" />
          </SvgLinearGradient>
          <RadialGradient id="glow" cx="50%" cy="0%" r="70%">
            <Stop offset="0" stopColor={theme.primary} stopOpacity="0.15" />
            <Stop offset="1" stopColor={theme.background} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
        <Rect width="100%" height="100%" fill="url(#glow)" />
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
    </View>
  );
};
