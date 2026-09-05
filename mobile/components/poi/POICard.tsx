import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { POI } from "../../types/poi";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDistanceToNow } from "date-fns";

const C = { green: "#00C896", red: "#FF4757", white: "#FFFFFF", secondary: "#8888A8", cyan: "#00D4FF" };

interface POICardProps { poi: POI; onPress?: () => void; }

export function POICard({ poi, onPress }: POICardProps) {
  const isBuy = poi.direction === "BUY";
  const duration = formatDistanceToNow(new Date(poi.created_at), { addSuffix: true });

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          <Text style={styles.symbol}>{poi.symbol}</Text>
          <Text style={[styles.dir, { color: isBuy ? C.green : C.red }]}>{poi.direction}</Text>
          <Text style={styles.tf}>· {poi.timeframe}</Text>
        </View>
        <StatusBadge status={poi.status} />
      </View>

      <View style={[styles.priceRow, { marginBottom: 12 }]}>
        {[
          { label: "Entry", value: poi.entry_price.toFixed(5), color: C.white },
          { label: "SL", value: poi.stop_loss.toFixed(5), color: C.red },
          { label: "TP", value: poi.take_profit.toFixed(5), color: C.green },
          { label: "R:R", value: `1:${poi.risk_reward.toFixed(1)}`, color: C.cyan },
        ].map(({ label, value, color }) => (
          <View key={label}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.type}>{poi.poi_type.replace("_", " ")}</Text>
        <Text style={styles.time}>Created {duration}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  symbol: { color: C.white, fontWeight: "700", fontSize: 17, marginRight: 6 },
  dir: { fontWeight: "700", fontSize: 13, marginRight: 6 },
  tf: { color: C.secondary, fontSize: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: C.secondary, fontSize: 11, marginBottom: 4 },
  value: { fontWeight: "500", fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { color: C.secondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  time: { color: C.secondary, fontSize: 12 },
});
