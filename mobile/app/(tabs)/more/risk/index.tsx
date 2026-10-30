import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { MetricCard } from '../../../../components/ui/MetricCard';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { ErrorState } from '../../../../components/common/ErrorState';
import { useRiskDashboard } from '../../../../hooks/useRisk';
import { RiskWarning } from '../../../../types/risk';

const C = {
  bg: '#0A0A0F',
  surface2: '#1C1C28',
  green: '#00C896',
  red: '#FF4757',
  amber: '#FFB800',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
};

const severityColor: Record<RiskWarning['severity'], string> = {
  LOW: '#8888A8',
  MEDIUM: '#FFB800',
  HIGH: '#FF9F45',
  CRITICAL: '#FF4757',
};

function ProgressBar({ pct, limitPct }: { pct: number; limitPct: number }) {
  const ratio = limitPct > 0 ? Math.min(Math.abs(pct) / limitPct, 1) : 0;
  const color = ratio >= 1 ? C.red : ratio >= 0.75 ? C.amber : C.green;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function RiskDashboardScreen() {
  const { data, isLoading, isFetching, error, refetch } = useRiskDashboard();

  const dailyLimit = data?.limits?.daily_risk_limit_pct;
  const maxDrawdownLimit = data?.limits?.max_drawdown_pct;
  const riskPerTradeLimit = data?.limits?.risk_per_trade_pct;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Risk Dashboard" subtitle="Live exposure and risk tracking" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        {isLoading ? (
          <View style={styles.skeletonWrapper}>
            <View style={styles.skeletonGap}><LoadingSkeleton height={100} /></View>
            <View style={styles.skeletonGap}><LoadingSkeleton height={100} /></View>
          </View>
        ) : error && !data ? (
          <ErrorState message="Couldn't load risk data." onRetry={refetch} />
        ) : data ? (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <MetricCard label="Open Risk" value={`${(data.open_risk_pct ?? 0).toFixed(1)}%`} />
              </View>
              <View style={styles.metricItem}>
                <MetricCard label="Today's Risk" value={`${(data.daily_risk_pct ?? 0).toFixed(1)}%`} />
              </View>
              <View style={styles.metricItem}>
                <MetricCard
                  label="Daily P/L"
                  value={`${(data.daily_pl ?? 0) >= 0 ? '+' : ''}$${(data.daily_pl ?? 0).toFixed(2)}`}
                  color={(data.daily_pl ?? 0) >= 0 ? 'green' : 'red'}
                />
              </View>
              <View style={styles.metricItem}>
                <MetricCard label="Exposure" value={`${(data.total_exposure_pct ?? 0).toFixed(1)}%`} />
              </View>
            </View>

            {dailyLimit != null && (
              <Card style={styles.limitCard}>
                <Text style={styles.limitTitle}>Daily Risk</Text>
                <Text style={styles.limitSubtitle}>
                  {(data.daily_risk_pct ?? 0).toFixed(1)}% / {dailyLimit}% limit
                </Text>
                <ProgressBar pct={data.daily_risk_pct ?? 0} limitPct={dailyLimit} />
              </Card>
            )}

            {maxDrawdownLimit != null && (
              <Card style={styles.limitCard}>
                <Text style={styles.limitTitle}>Drawdown</Text>
                <Text style={styles.limitSubtitle}>
                  {(data.daily_drawdown_pct ?? 0).toFixed(1)}% / {maxDrawdownLimit}% limit (max seen: {(data.max_drawdown_pct ?? 0).toFixed(1)}%)
                </Text>
                <ProgressBar pct={data.daily_drawdown_pct ?? 0} limitPct={maxDrawdownLimit} />
              </Card>
            )}

            {riskPerTradeLimit != null && (
              <Card style={styles.limitCard}>
                <Text style={styles.limitTitle}>Risk Per Trade</Text>
                <Text style={styles.limitSubtitle}>
                  {(data.risk_per_trade_pct ?? 0).toFixed(1)}% / {riskPerTradeLimit}% target
                </Text>
                <ProgressBar pct={data.risk_per_trade_pct ?? 0} limitPct={riskPerTradeLimit} />
              </Card>
            )}

            <Text style={styles.warningSectionTitle}>Warnings</Text>
            {data.warnings.length === 0 ? (
              <Card style={styles.noWarningsCard}>
                <ShieldAlert size={28} color={C.green} />
                <Text style={styles.noWarningsText}>No active risk warnings</Text>
              </Card>
            ) : (
              <View style={styles.warningsList}>
                {data.warnings.map((w, i) => (
                  <Card key={i} style={styles.warningCard}>
                    <AlertTriangle size={18} color={severityColor[w.severity]} style={{ marginTop: 2 }} />
                    <View style={styles.warningBody}>
                      <Text style={[styles.warningTitle, { color: severityColor[w.severity] }]}>
                        {w.severity} · {w.type}
                      </Text>
                      <Text style={styles.warningMessage}>{w.message}</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  skeletonWrapper: {
    marginTop: 24,
  },
  skeletonGap: {
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },
  metricItem: {
    width: '48%',
    marginBottom: 12,
  },
  limitCard: {
    marginBottom: 16,
  },
  limitTitle: {
    color: C.white,
    fontWeight: '600',
    marginBottom: 4,
  },
  limitSubtitle: {
    color: C.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: C.surface2,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  warningSectionTitle: {
    color: C.white,
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 12,
    marginTop: 8,
  },
  noWarningsCard: {
    marginBottom: 32,
    alignItems: 'center',
    paddingVertical: 32,
  },
  noWarningsText: {
    color: C.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  warningsList: {
    marginBottom: 32,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  warningBody: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontWeight: '600',
  },
  warningMessage: {
    color: C.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
});
