import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from "react-native-svg";
import { BarChart3 } from "lucide-react-native";
import { MetricCard } from "../../../components/ui/MetricCard";
import { Card } from "../../../components/ui/Card";
import { LoadingSkeleton } from "../../../components/common/LoadingSkeleton";
import { useAnalyticsMetrics, useEquityCurve } from "../../../hooks/useAnalytics";

const C = {
  bg: "#0A0A0F", surface: "#12121A", border: "#2A2A3A",
  white: "#FFFFFF", secondary: "#8888A8", green: "#00C896", red: "#FF4757",
};

function EquityLineGraph({ points }: { points: { date: string; equity: number }[] }) {
  const [width, setWidth] = useState(Dimensions.get("window").width - 64);
  if (!points || points.length === 0) return null;

  // If there is only 1 point, add an initial reference point so a line can draw
  const chartPoints = points.length === 1
    ? [{ date: points[0].date, equity: points[0].equity }, points[0]]
    : points.slice(-30);

  const height = 140;
  const padX = 14;
  const padY = 18;

  const values = chartPoints.map((p) => p.equity);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const first = chartPoints[0];
  const latest = chartPoints[chartPoints.length - 1];
  const diff = latest.equity - first.equity;
  const isUp = diff >= 0;
  const strokeColor = isUp ? C.green : C.red;
  const gradId = isUp ? "eqUpGrad" : "eqDownGrad";

  const coords = chartPoints.map((p, i) => {
    const x = padX + (i / Math.max(chartPoints.length - 1, 1)) * (width - 2 * padX);
    const y = height - padY - ((p.equity - minVal) / range) * (height - 2 * padY);
    return { x, y };
  });

  // Build line path
  let lineD = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    lineD += ` L ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
  }

  // Build gradient area path
  const lastX = coords[coords.length - 1].x.toFixed(1);
  const firstX = coords[0].x.toFixed(1);
  const areaD = `${lineD} L ${lastX} ${height} L ${firstX} ${height} Z`;
  const lastCoord = coords[coords.length - 1];

  return (
    <View
      style={styles.graphWrapper}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 60) setWidth(w);
      }}
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
            <Stop offset="70%" stopColor={strokeColor} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* High & Low grid lines */}
        <Line
          x1={padX}
          y1={padY}
          x2={width - padX}
          y2={padY}
          stroke="#2A2A3A"
          strokeDasharray="3, 3"
          strokeWidth="1"
        />
        <Line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#2A2A3A"
          strokeDasharray="3, 3"
          strokeWidth="1"
        />

        {/* Gradient fill */}
        <Path d={areaD} fill={`url(#${gradId})`} />

        {/* Glowing Line */}
        <Path
          d={lineD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current price halo pulse */}
        <Circle cx={lastCoord.x} cy={lastCoord.y} r={7} fill={strokeColor} opacity={0.3} />
        <Circle cx={lastCoord.x} cy={lastCoord.y} r={3.5} fill="#FFFFFF" />
      </Svg>

      {/* Benchmark price labels on the right edge */}
      <View style={styles.benchmarkOverlay}>
        <Text style={styles.benchmarkText}>${maxVal.toFixed(2)}</Text>
        <Text style={styles.benchmarkText}>${minVal.toFixed(2)}</Text>
      </View>

      {/* Bottom axis summary */}
      <View style={styles.axisRow}>
        <Text style={styles.axisDate}>
          {chartPoints[0].date ? chartPoints[0].date.split("T")[0] : ""}
        </Text>
        <View style={[styles.changePill, { backgroundColor: isUp ? "#00C89618" : "#FF475718" }]}>
          <Text style={[styles.changeText, { color: strokeColor }]}>
            {isUp ? "+" : ""}${diff.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.axisDate}>
          {chartPoints[chartPoints.length - 1].date ? chartPoints[chartPoints.length - 1].date.split("T")[0] : "Now"}
        </Text>
      </View>
    </View>
  );
}

function EmptyAnalytics() {
  return (
    <View style={styles.emptyContainer}>
      <BarChart3 size={48} color={C.secondary} />
      <Text style={styles.emptyTitle}>No trades yet</Text>
      <Text style={styles.emptySubtitle}>
        Analytics will populate once you have closed trades.
      </Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { data: metrics, isLoading, isFetching, refetch } = useAnalyticsMetrics();
  const { data: equity } = useEquityCurve();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Performance across all your trades</Text>
        </View>

        {isLoading ? (
          <View style={{ gap: 12 }}>
            <LoadingSkeleton height={100} borderRadius={16} />
            <LoadingSkeleton height={150} borderRadius={16} />
          </View>
        ) : !metrics || metrics.total_trades === 0 ? (
          <EmptyAnalytics />
        ) : (
          <>
            {equity && equity.equity_curve.length > 0 && (
              <Card style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardLabel}>Equity Curve</Text>
                    <Text style={styles.equityValue}>
                      ${equity.equity_curve[equity.equity_curve.length - 1].equity.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <EquityLineGraph points={equity.equity_curve} />
              </Card>
            )}

            <View style={styles.metricsGrid}>
              <MetricCard label="Win Rate" value={`${(metrics.win_rate * 100).toFixed(1)}%`} />
              <MetricCard label="Total Trades" value={metrics.total_trades} />
              <MetricCard
                label="Total P/L"
                value={`$${metrics.total_net_pl.toFixed(2)}`}
                color={metrics.total_net_pl >= 0 ? "green" : "red"}
              />
              <MetricCard label="Profit Factor" value={metrics.profit_factor.toFixed(2)} />
              <MetricCard
                label="Expectancy"
                value={metrics.expectancy.toFixed(2)}
                color={metrics.expectancy >= 0 ? "green" : "red"}
              />
              <MetricCard label="Avg R" value={`${metrics.average_r.toFixed(2)}R`} />
              <MetricCard label="Max Drawdown" value={`${metrics.max_drawdown.toFixed(1)}%`} color="red" />
              <MetricCard label="Avg Win" value={`$${metrics.average_win.toFixed(2)}`} color="green" />
            </View>

            <Card style={[styles.card, { marginBottom: 0 }]}>
              <Text style={styles.sectionTitle}>Win / Loss Breakdown</Text>
              <View style={styles.breakdownRow}>
                <View>
                  <Text style={styles.cardLabel}>Winning trades</Text>
                  <Text style={[styles.breakdownValue, { color: C.green }]}>{metrics.winning_trades}</Text>
                </View>
                <View>
                  <Text style={styles.cardLabel}>Losing trades</Text>
                  <Text style={[styles.breakdownValue, { color: C.red }]}>{metrics.losing_trades}</Text>
                </View>
                <View>
                  <Text style={styles.cardLabel}>Avg loss</Text>
                  <Text style={[styles.breakdownValue, { color: C.red }]}>${metrics.average_loss.toFixed(2)}</Text>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 16 },
  header: { marginTop: 24, marginBottom: 16 },
  title: { color: C.white, fontSize: 24, fontWeight: "700" },
  subtitle: { color: C.secondary, fontSize: 14, marginTop: 4 },
  card: { marginBottom: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLabel: { color: C.secondary, fontSize: 12, marginBottom: 4 },
  equityValue: { color: C.white, fontSize: 24, fontWeight: "800", marginBottom: 8 },
  graphWrapper: { position: "relative", marginTop: 8 },
  benchmarkOverlay: {
    position: "absolute",
    right: 8,
    top: 10,
    bottom: 24,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  benchmarkText: { color: C.secondary, fontSize: 10, fontWeight: "500" },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  axisDate: { color: C.secondary, fontSize: 11 },
  changePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  changeText: { fontSize: 11, fontWeight: "700" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  sectionTitle: { color: C.white, fontWeight: "600", fontSize: 15, marginBottom: 12 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between" },
  breakdownValue: { fontWeight: "700", fontSize: 20, marginTop: 4 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  emptyTitle: { color: C.white, fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySubtitle: { color: C.secondary, fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
});
