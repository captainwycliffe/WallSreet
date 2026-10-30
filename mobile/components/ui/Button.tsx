import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isFullWidth = fullWidth !== undefined ? fullWidth : size !== 'sm';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        isFullWidth ? styles.fullWidth : styles.inline,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={C.indicatorColor[variant]} size={size === 'sm' ? 'small' : 'small'} />
      ) : (
        <Text style={[styles.label, styles[`labelSize_${size}`], styles[`labelColor_${variant}`]]}>{title}</Text>
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
  },
  fullWidth: {
    width: '100%',
  },
  inline: {
    alignSelf: 'flex-start',
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  size_md: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  size_lg: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
  },

  // Label base
  label: {
    fontWeight: '600',
  },
  labelSize_sm: {
    fontSize: 13,
  },
  labelSize_md: {
    fontSize: 15,
  },
  labelSize_lg: {
    fontSize: 17,
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
