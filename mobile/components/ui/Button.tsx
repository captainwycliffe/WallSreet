import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={C.indicatorColor[variant]} />
      ) : (
        <Text style={[styles.label, styles[`labelColor_${variant}`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const C = {
  green: '#00C896',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  indicatorColor: {
    primary: '#FFFFFF',
    secondary: '#00C896',
    ghost: '#8888A8',
  } as Record<string, string>,
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 14,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  // Variants
  variant_primary: {
    backgroundColor: C.green,
    borderWidth: 0,
  },
  variant_secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.green,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },

  // Sizes
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  size_md: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  size_lg: {
    paddingVertical: 20,
    paddingHorizontal: 32,
  },

  // Label base
  label: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Label colors per variant
  labelColor_primary: {
    color: C.white,
  },
  labelColor_secondary: {
    color: C.green,
  },
  labelColor_ghost: {
    color: C.textSecondary,
  },
});
