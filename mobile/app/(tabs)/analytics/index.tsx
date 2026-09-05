import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart3 } from "lucide-react-native";
import { MetricCard } from "../../../components/ui/MetricCard";
import { Card } from "../../../components/ui/Card";
import { LoadingSkeleton } from "../../../components/common/LoadingSkeleton";
import { useAnalyticsMetrics, useEquityCurve } from "../../../hooks/useAnalytics";

const C = {
  bg: "#0A0A0F", surface: "#12121A", border: "#2A2A3A",
  white: "#FFFFFF", secondary: "#8888A8", green: "#00C896", red: "#FF4757",
};

function EquitySparkline({ points }: { points: { date: string; equity: number }[] }) {
  if (points.length === 0) return null;
  const values = points.map(p => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={styles.sparklineRow}>
      {points.slice(-30).map((p, i) => {
        const heightPct = ((p.equity - min) / range) * 100;
        return (
          <View
            key={i}
            style={[
              styles.sparklineBar,
              {
                height: `${Math.max(heightPct, 4)}%` as any,
                opacity: 0.4 + (heightPct / 100) * 0.6,
              },
            ]}
          />
        );
      })}
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
                <Text style={styles.cardLabel}>Equity curve</Text>
                <Text style={styles.equityValue}>
                  ${equity.equity_curve[equity.equity_curve.length - 1].equity.toFixed(2)}
                </Text>
                <EquitySparkline points={equity.equity_curve} />
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
  cardLabel: { color: C.secondary, fontSize: 12, marginBottom: 4 },
  equityValue: { color: C.white, fontSize: 22, fontWeight: "700", marginBottom: 12 },
  sparklineRow: { flexDirection: "row", alignItems: "flex-end", height: 96, gap: 2 },
  sparklineBar: { flex: 1, backgroundColor: C.green, borderRadius: 2 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  sectionTitle: { color: C.white, fontWeight: "600", fontSize: 15, marginBottom: 12 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between" },
  breakdownValue: { fontWeight: "700", fontSize: 20, marginTop: 4 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  emptyTitle: { color: C.white, fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySubtitle: { color: C.secondary, fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
});
