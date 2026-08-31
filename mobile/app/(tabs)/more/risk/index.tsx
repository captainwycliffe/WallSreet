import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { MetricCard } from '../../../../components/ui/MetricCard';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { ErrorState } from '../../../../components/common/ErrorState';
import { useRiskDashboard } from '../../../../hooks/useRisk';
import { RiskWarning } from '../../../../types/risk';

const severityColor: Record<RiskWarning['severity'], string> = {
  LOW: '#8888A8',
  MEDIUM: '#FFB800',
  HIGH: '#FF9F45',
  CRITICAL: '#FF4757',
};

function ProgressBar({ pct, limitPct }: { pct: number; limitPct: number }) {
  const ratio = limitPct > 0 ? Math.min(Math.abs(pct) / limitPct, 1) : 0;
  const color = ratio >= 1 ? '#FF4757' : ratio >= 0.75 ? '#FFB800' : '#00C896';
  return (
    <View className="h-2 bg-surface2 rounded-full overflow-hidden mt-2">
      <View style={{ width: `${ratio * 100}%`, backgroundColor: color }} className="h-full rounded-full" />
    </View>
  );
}

export default function RiskDashboardScreen() {
  const { data, isLoading, isFetching, error, refetch } = useRiskDashboard();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title="Risk Dashboard" subtitle="Live exposure and limit tracking" />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        {isLoading ? (
          <View className="mt-6 space-y-4">
            <LoadingSkeleton height={100} />
            <LoadingSkeleton height={100} />
          </View>
        ) : error && !data ? (
          <ErrorState message="Couldn't load risk data." onRetry={refetch} />
        ) : data ? (
          <>
            <View className="flex-row flex-wrap gap-3 mt-4 mb-6">
              <MetricCard label="Open Risk" value={`${data.open_risk_pct.toFixed(1)}%`} />
              <MetricCard label="Today's Risk" value={`${data.daily_risk_pct.toFixed(1)}%`} />
              <MetricCard
                label="Daily P/L"
                value={`${data.daily_pl >= 0 ? '+' : ''}$${data.daily_pl.toFixed(2)}`}
                color={data.daily_pl >= 0 ? 'green' : 'red'}
              />
              <MetricCard label="Exposure" value={`${data.total_exposure_pct.toFixed(1)}%`} />
            </View>

            <Card className="mb-4">
              <Text className="text-white font-interSemiBold mb-1">Daily risk limit</Text>
              <Text className="text-textSecondary text-xs mb-1">
                {data.daily_risk_pct.toFixed(1)}% of {data.limits.daily_risk_limit_pct}% max
              </Text>
              <ProgressBar pct={data.daily_risk_pct} limitPct={data.limits.daily_risk_limit_pct} />
            </Card>

            <Card className="mb-4">
              <Text className="text-white font-interSemiBold mb-1">Drawdown</Text>
              <Text className="text-textSecondary text-xs mb-1">
                {data.daily_drawdown_pct.toFixed(1)}% of {data.limits.max_drawdown_pct}% max (max seen: {data.max_drawdown_pct.toFixed(1)}%)
              </Text>
              <ProgressBar pct={data.daily_drawdown_pct} limitPct={data.limits.max_drawdown_pct} />
            </Card>

            <Card className="mb-4">
              <Text className="text-white font-interSemiBold mb-1">Risk per trade</Text>
              <Text className="text-textSecondary text-xs mb-1">
                {data.risk_per_trade_pct.toFixed(1)}% of {data.limits.risk_per_trade_pct}% target
              </Text>
              <ProgressBar pct={data.risk_per_trade_pct} limitPct={data.limits.risk_per_trade_pct} />
            </Card>

            <Text className="text-white font-interSemiBold text-lg mb-3 mt-2">Warnings</Text>
            {data.warnings.length === 0 ? (
              <Card className="mb-8 items-center py-8">
                <ShieldAlert size={28} color="#00C896" />
                <Text className="text-textSecondary text-sm mt-3">No active risk warnings</Text>
              </Card>
            ) : (
              <View className="mb-8 space-y-2">
                {data.warnings.map((w, i) => (
                  <Card key={i} className="flex-row items-start">
                    <AlertTriangle size={18} color={severityColor[w.severity]} style={{ marginTop: 2 }} />
                    <View className="flex-1 ml-3">
                      <Text className="font-interSemiBold" style={{ color: severityColor[w.severity] }}>
                        {w.severity} · {w.type}
                      </Text>
                      <Text className="text-textSecondary text-sm mt-1">{w.message}</Text>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
