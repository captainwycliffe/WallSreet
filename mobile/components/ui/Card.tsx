import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";

interface CardProps {
  padding?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function Card({ padding = true, onPress, style, children }: CardProps) {
  const cardStyle = [styles.card, padding && styles.padded, style];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#12121A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    overflow: "hidden",
  },
  padded: {
    padding: 16,
  },
});
