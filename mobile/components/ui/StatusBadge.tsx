import React from "react";
import { View, Text, StyleSheet } from "react-native";

type StatusType =
  | "DETECTED" | "PENDING" | "ACTIVE" | "TP_HIT" | "SL_HIT"
  | "CLOSED" | "EXPIRED" | "CANCELLED" | "INVALIDATED"
  | "OPEN" | "ONLINE" | "OFFLINE";

interface StatusBadgeProps { status: StatusType; }

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot?: string }> = {
  PENDING:    { bg: "rgba(255,184,0,0.12)",   color: "#FFB800" },
  DETECTED:   { bg: "rgba(255,184,0,0.12)",   color: "#FFB800" },
  ACTIVE:     { bg: "rgba(0,212,255,0.12)",   color: "#00D4FF", dot: "#00D4FF" },
  OPEN:       { bg: "rgba(0,212,255,0.12)",   color: "#00D4FF", dot: "#00D4FF" },
  TP_HIT:     { bg: "rgba(0,200,150,0.12)",   color: "#00C896" },
  ONLINE:     { bg: "rgba(0,200,150,0.12)",   color: "#00C896", dot: "#00C896" },
  SL_HIT:     { bg: "rgba(255,71,87,0.12)",   color: "#FF4757" },
  OFFLINE:    { bg: "rgba(255,71,87,0.12)",   color: "#FF4757", dot: "#FF4757" },
  CLOSED:     { bg: "#1C1C28",               color: "#555577" },
  EXPIRED:    { bg: "#1C1C28",               color: "#555577" },
  CANCELLED:  { bg: "#1C1C28",               color: "#555577" },
  INVALIDATED:{ bg: "#1C1C28",               color: "#555577" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || { bg: "#1C1C28", color: "#8888A8" };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      {cfg.dot && <View style={[styles.dot, { backgroundColor: cfg.dot }]} />}
      <Text style={[styles.text, { color: cfg.color }]}>{status.replace("_", " ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
