import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Button } from '../ui/Button';

const C = {
  white: '#FFFFFF',
  red: '#FF4757',
  textSecondary: '#8888A8',
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <AlertCircle size={40} color={C.red} style={styles.icon} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <Button title="Try Again" onPress={onRetry} variant="secondary" size="sm" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    minHeight: 250,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: C.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
});
