import React from 'react';
import { View, TouchableOpacity, ViewProps, TouchableOpacityProps } from 'react-native';

interface CardProps extends ViewProps {
  padding?: boolean;
  onPress?: TouchableOpacityProps['onPress'];
  className?: string;
  children: React.ReactNode;
}

export function Card({ padding = true, onPress, className = '', children, ...props }: CardProps) {
  const baseClass = "bg-surface rounded-2xl border border-border overflow-hidden";
  const paddingClass = padding ? "p-4" : "";
  const combinedClass = `${baseClass} ${paddingClass} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} className={combinedClass} {...(props as any)}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={combinedClass} {...props}>
      {children}
    </View>
  );
}
