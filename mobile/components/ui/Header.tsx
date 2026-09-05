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
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft size={24} color={C.white} />
      </TouchableOpacity>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
    marginLeft: -4,
  },
  titleBlock: {
    flex: 1,
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
});
