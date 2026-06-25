import React from 'react';
import { View, StyleSheet } from 'react-native';

interface IconContainerProps {
  children: React.ReactNode;
  size?: number; // Size of the square container, default 40
  backgroundColor?: string; // Background color, default primary blue
}

export const IconContainer: React.FC<IconContainerProps> = ({
  children,
  size = 40,
  backgroundColor = '#2563EB',
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: 12,
          backgroundColor,
        },
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
