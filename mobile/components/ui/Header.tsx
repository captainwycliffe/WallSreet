import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const C = {
  white: '#FFFFFF',
  border: '#2A2A3A',
  textSecondary: '#8888A8',
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <ChevronLeft size={24} color={C.white} />
      </TouchableOpacity>
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right ? <View style={styles.rightBlock}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    marginRight: 10,
    padding: 6,
    marginLeft: -6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rightBlock: {
    flexShrink: 0,
    marginLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
