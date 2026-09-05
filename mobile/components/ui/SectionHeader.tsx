import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const C = {
  white: '#FFFFFF',
};

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  style?: object;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: C.white,
    fontWeight: '600',
    fontSize: 18,
  },
});
