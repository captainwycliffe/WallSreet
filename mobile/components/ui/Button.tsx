import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, className }: ButtonProps) {
  const baseClass = "items-center justify-center rounded-xl flex-row";
  
  const variants = {
    primary: "bg-green",
    secondary: "bg-surface2 border border-border",
    danger: "bg-red",
    ghost: "bg-transparent",
  };

  const sizes = {
    sm: "py-2 px-4",
    md: "py-3 px-6",
    lg: "py-4 px-8",
  };

  const textColors = {
    primary: "text-black",
    secondary: "text-white",
    danger: "text-white",
    ghost: "text-white",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'black' : 'white'} />
      ) : (
        <Text className={`${textColors[variant]} font-interSemiBold text-md`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
