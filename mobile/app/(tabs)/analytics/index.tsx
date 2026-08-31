import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3 } from 'lucide-react-native';
import { MetricCard } from '../../../components/ui/MetricCard';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { useAnalyticsMetrics, useEquityCurve } from '../../../hooks/useAnalytics';

// Lightweight bar-based equity sparkline built from plain Views. victory-native
// v41's Skia-based charting API wasn't pulled in here — it's a large,
// version-specific surface that couldn't be verified working in this
// environment, and a simple guaranteed-correct visual beats an unverified
// sophisticated one.
function EquitySparkline({ points }: { points: { date: string; equity: number }[] }) {
  if (points.length === 0) return null;
  const values = points.map(p => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View className="flex-row items-end h-24 gap-1">
      {points.slice(-30).map((p, i) => {
        const heightPct = ((p.equity - min) / range) * 100;
        return (
          <View
            key={i}
            className="flex-1 bg-green rounded-sm"
            style={{ height: `${Math.max(heightPct, 4)}%`, opacity: 0.4 + (heightPct / 100) * 0.6 }}
          />
        );
      })}
    </View>
  );
}

export default function AnalyticsScreen() {
  const { data: metrics, isLoading, isFetching, refetch } = useAnalyticsMetrics();
  const { data: equity } = useEquityCurve();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        <View className="mt-6 mb-4">
          <Text className="text-white text-2xl font-interBold">Analytics</Text>
          <Text className="text-textSecondary mt-1">Performance across all your trades</Text>
        </View>

        {isLoading ? (
          <View className="space-y-4">
            <LoadingSkeleton height={100} />
            <LoadingSkeleton height={150} />
          </View>
        ) : !metrics || metrics.total_trades === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No trades yet"
            subtitle="Analytics will populate once you have closed trades."
          />
        ) : (
          <>
            {equity && equity.equity_curve.length > 0 && (
              <Card className="mb-4">
                <Text className="text-textSecondary text-xs mb-1">Equity curve</Text>
                <Text className="text-white text-xl font-interBold mb-3">
                  ${equity.equity_curve[equity.equity_curve.length - 1].equity.toFixed(2)}
                </Text>
                <EquitySparkline points={equity.equity_curve} />
              </Card>
            )}

            <View className="flex-row flex-wrap gap-3 mb-4">
              <MetricCard label="Win Rate" value={`${(metrics.win_rate * 100).toFixed(1)}%`} />
              <MetricCard label="Total Trades" value={metrics.total_trades} />
              <MetricCard
                label="Total P/L"
                value={`$${metrics.total_net_pl.toFixed(2)}`}
                color={metrics.total_net_pl >= 0 ? 'green' : 'red'}
              />
              <MetricCard label="Profit Factor" value={metrics.profit_factor.toFixed(2)} />
              <MetricCard
                label="Expectancy"
                value={metrics.expectancy.toFixed(2)}
                color={metrics.expectancy >= 0 ? 'green' : 'red'}
              />
              <MetricCard label="Avg R" value={`${metrics.average_r.toFixed(2)}R`} />
              <MetricCard label="Max Drawdown" value={`${metrics.max_drawdown.toFixed(1)}%`} color="red" />
              <MetricCard label="Avg Win" value={`$${metrics.average_win.toFixed(2)}`} color="green" />
            </View>

            <Card className="mb-8">
              <Text className="text-white font-interSemiBold mb-3">Win / Loss breakdown</Text>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-textSecondary text-xs">Winning trades</Text>
                  <Text className="text-green font-interBold text-lg mt-1">{metrics.winning_trades}</Text>
                </View>
                <View>
                  <Text className="text-textSecondary text-xs">Losing trades</Text>
                  <Text className="text-red font-interBold text-lg mt-1">{metrics.losing_trades}</Text>
                </View>
                <View>
                  <Text className="text-textSecondary text-xs">Avg loss</Text>
                  <Text className="text-red font-interBold text-lg mt-1">${metrics.average_loss.toFixed(2)}</Text>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
