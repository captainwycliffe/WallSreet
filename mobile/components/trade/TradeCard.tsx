import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Trade } from "../../types/trade";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDistanceToNow } from "date-fns";

const C = { green: "#00C896", red: "#FF4757", white: "#FFFFFF", secondary: "#8888A8", surface2: "#1C1C28", cyan: "#00D4FF" };

interface TradeCardProps { trade: Trade; onPress?: () => void; }

export function TradeCard({ trade, onPress }: TradeCardProps) {
  const isBuy = trade.direction === "BUY";
  const profit = trade.profit || 0;
  const prefix = profit >= 0 ? "+" : "";
  let progress = 0;
  if (trade.current_price && trade.take_profit && trade.entry_price && trade.take_profit > 0) {
    const totalDist = Math.abs(trade.take_profit - trade.entry_price);
    const currDist = isBuy
      ? Math.max(0, trade.current_price - trade.entry_price)
      : Math.max(0, trade.entry_price - trade.current_price);
    progress = Math.min(100, (currDist / totalDist) * 100);
  }
  let duration = "recently";
  try {
    if (trade.opened_at) {
      const d = new Date(trade.opened_at);
      if (!isNaN(d.getTime())) {
        duration = formatDistanceToNow(d, { addSuffix: false });
      }
    }
  } catch {
    duration = "recently";
  }

  const fmt = (val: number | undefined, isStopOrTarget = false) => {
    if (val === undefined || val === null) return "-";
    if (val === 0 && isStopOrTarget) return "None";
    const isCrypto = trade.symbol.includes("BTC") || trade.symbol.includes("ETH") || trade.symbol.includes("XAU") || trade.symbol.includes("NAS");
    return val.toLocaleString("en-US", {
      minimumFractionDigits: isCrypto ? 2 : 4,
      maximumFractionDigits: isCrypto ? 2 : 5,
    });
  };

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.row}>
          <Text style={styles.symbol}>{trade.symbol}</Text>
          <Text style={[styles.dir, { color: isBuy ? C.green : C.red }]}>{trade.direction}</Text>
        </View>
        <StatusBadge status={trade.status} />
      </View>

      <View style={[styles.row, { marginBottom: 12 }]}>
        {[
          { label: "Entry", value: fmt(trade.entry_price), color: C.white },
          { label: "Current", value: fmt(trade.current_price), color: C.white },
          { label: "Stop", value: fmt(trade.stop_loss, true), color: C.red },
          { label: "Target", value: fmt(trade.take_profit, true), color: C.green },
        ].map(({ label, value, color }) => (
          <View key={label}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.row, { marginBottom: 10 }]}>
        <View>
          <Text style={[styles.profit, { color: profit >= 0 ? C.green : C.red }]}>
            {prefix}${profit.toFixed(2)}
          </Text>
          <Text style={[styles.rr, { color: profit >= 0 ? C.green : C.red }]}>
            {prefix}{trade.r_multiple?.toFixed(2) || "0.00"}R
          </Text>
        </View>
        <Text style={styles.duration}>{duration}</Text>
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: isBuy ? C.green : C.red }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  symbol: { color: C.white, fontWeight: "700", fontSize: 17, marginRight: 8 },
  dir: { fontWeight: "700", fontSize: 13 },
  label: { color: C.secondary, fontSize: 11, marginBottom: 4 },
  value: { color: C.white, fontWeight: "500", fontSize: 13 },
  profit: { fontWeight: "700", fontSize: 20 },
  rr: { fontSize: 12, marginTop: 2 },
  duration: { color: C.secondary, fontSize: 12 },
  progressBg: { height: 6, backgroundColor: "#1C1C28", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%" as any, borderRadius: 3 },
});
