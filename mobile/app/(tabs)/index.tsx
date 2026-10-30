import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useAccounts } from '../../hooks/useAccount';
import { usePOIs } from '../../hooks/usePOIs';
import { useTrades } from '../../hooks/useTrades';
import { useRiskDashboard } from '../../hooks/useRisk';
import { useQuery } from '@tanstack/react-query';
import { eaService } from '../../services/api';
import { TradeCard } from '../../components/trade/TradeCard';
import { TradeCalendar } from '../../components/trade/TradeCalendar';
import { POICard } from '../../components/poi/POICard';
import {
  ArrowRight,
  TrendingUp,
  Target,
  ShieldAlert,
  Calendar as CalendarIcon,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  red: '#FF4757',
  amber: '#FFB800',
  cyan: '#00D4FF',
  purple: '#9C6FFF',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  textMuted: '#555577',
};

function LimitProgressBar({ pct, limitPct, label }: { pct: number; limitPct: number; label: string }) {
  const safeLimit = limitPct > 0 ? limitPct : 1;
  const ratio = Math.min(Math.max(pct, 0) / safeLimit, 1);
  const color = ratio >= 1 ? C.red : ratio >= 0.75 ? C.amber : C.green;

  return (
    <View style={styles.limitBarItem}>
      <View style={styles.limitBarHeader}>
        <Text style={styles.limitBarLabel}>{label}</Text>
        <Text style={styles.limitBarVal}>
          <Text style={{ color, fontWeight: '700' }}>{pct.toFixed(1)}%</Text>
          <Text style={{ color: C.textSecondary }}> / {limitPct.toFixed(1)}%</Text>
        </Text>
      </View>
      <View style={styles.limitBarTrack}>
        <View style={[styles.limitBarFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'trades' | 'calendar'>('trades');

  const { data: accounts, refetch: refetchAccounts, isFetching: isFetchingAccounts } = useAccounts();
  const { data: poisData, refetch: refetchPOIs, isFetching: isFetchingPOIs } = usePOIs();
  const { data: tradesData, refetch: refetchTrades, isFetching: isFetchingTrades } = useTrades();
  const { data: riskData, refetch: refetchRisk, isFetching: isFetchingRisk } = useRiskDashboard();

  const { data: eas, refetch: refetchEAs, isFetching: isFetchingEAs } = useQuery({
    queryKey: ['eaMonitor'],
    queryFn: () => eaService.getMonitor(),
    refetchInterval: 10000,
  });

  const isFetching = isFetchingAccounts || isFetchingPOIs || isFetchingTrades || isFetchingRisk || isFetchingEAs;
  const refetchAll = () => {
    refetchAccounts();
    refetchPOIs();
    refetchTrades();
    refetchRisk();
    refetchEAs();
  };

  const account = accounts?.[0];
  const activeEA = eas?.[0];
  const isEAOnline = activeEA?.status === 'ONLINE';

  const pois = poisData?.items || [];
  const trades = tradesData?.items || [];

  const activeTrades = trades.filter((t) => t.status === 'OPEN');
  const pendingPOIs = pois.filter((p) => p.status === 'PENDING');
  const activePOIs = pois.filter((p) => p.status === 'ACTIVE');
  const tpHits = pois.filter((p) => p.status === 'TP_HIT').length;
  const slHits = pois.filter((p) => p.status === 'SL_HIT').length;

  // Active risk limits
  const dailyRiskPct = riskData?.daily_risk_pct ?? 0;
  const dailyRiskLimit = riskData?.limits?.daily_risk_limit_pct ?? 5.0;
  const drawdownPct = riskData?.daily_drawdown_pct ?? 0;
  const maxDrawdownLimit = riskData?.limits?.max_drawdown_pct ?? 10.0;
  const riskPerTrade = riskData?.risk_per_trade_pct ?? 0;
  const riskPerTradeTarget = riskData?.limits?.risk_per_trade_pct ?? 2.0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetchAll}
            tintColor={C.green}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>TRADING COMMAND CENTER</Text>
            <Text style={styles.headerGreeting}>
              Hello, {user?.username ?? 'Trader'}
            </Text>
          </View>
          <View style={[styles.eaPill, { backgroundColor: isEAOnline ? '#00C89622' : '#FF475722' }]}>
            <View style={[styles.eaDot, { backgroundColor: isEAOnline ? C.green : C.red }]} />
            <Text style={[styles.eaPillText, { color: isEAOnline ? C.green : C.red }]}>
              {isEAOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {/* ── Account Card ── */}
        {account ? (
          <View style={styles.card}>
            <Text style={styles.accountBrokerLabel}>
              {account.broker ?? 'Broker'} · {account.name ?? 'Account'}
            </Text>
            <Text style={styles.accountBalance}>
              ${Number(account.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.accountBalanceLabel}>Balance</Text>

            <View style={styles.accountMetricsRow}>
              <View style={styles.accountMetric}>
                <Text style={styles.accountMetricLabel}>Equity</Text>
                <Text style={styles.accountMetricValue}>
                  ${Number(account.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.accountMetric}>
                <Text style={styles.accountMetricLabel}>Open P/L</Text>
                <Text style={[
                  styles.accountMetricValue,
                  { color: (account.open_pl ?? 0) >= 0 ? C.green : C.red },
                ]}>
                  {(account.open_pl ?? 0) >= 0 ? '+' : ''}
                  ${Number(account.open_pl ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.accountMetric}>
                <Text style={styles.accountMetricLabel}>Daily P/L</Text>
                <Text style={[
                  styles.accountMetricValue,
                  { color: (account.daily_pl ?? 0) >= 0 ? C.green : C.red },
                ]}>
                  {(account.daily_pl ?? 0) >= 0 ? '+' : ''}
                  ${Number(account.daily_pl ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No account connected</Text>
          </View>
        )}

        {/* ── Account Limits & Live Risk Section ── */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeaderRow}>
            <View style={styles.riskTitleLeft}>
              <ShieldAlert size={16} color={C.green} />
              <Text style={styles.riskTitleText}>Account Limits & Risk</Text>
            </View>
            <TouchableOpacity
              style={styles.riskDetailLink}
              onPress={() => router.push('/(tabs)/more/risk' as any)}
            >
              <Text style={styles.riskDetailText}>Details</Text>
              <ChevronRight size={14} color={C.green} />
            </TouchableOpacity>
          </View>

          <LimitProgressBar pct={dailyRiskPct} limitPct={dailyRiskLimit} label="Daily Risk Limit" />
          <LimitProgressBar pct={drawdownPct} limitPct={maxDrawdownLimit} label="Max Drawdown" />
          <LimitProgressBar pct={riskPerTrade} limitPct={riskPerTradeTarget} label="Risk Per Trade" />

          {riskData?.warnings && riskData.warnings.length > 0 && (
            <View style={styles.riskWarningBadge}>
              <AlertTriangle size={14} color={C.amber} />
              <Text style={styles.riskWarningText} numberOfLines={1}>
                {riskData.warnings[0].message}
              </Text>
            </View>
          )}
        </View>

        {/* ── POI Counter Row ── */}
        <View style={styles.poiCounterRow}>
          <View style={[styles.poiCounterBox, { borderColor: C.amber }]}>
            <Text style={[styles.poiCounterValue, { color: C.amber }]}>{pendingPOIs.length}</Text>
            <Text style={styles.poiCounterLabel}>Pending</Text>
          </View>
          <View style={[styles.poiCounterBox, { borderColor: C.cyan }]}>
            <Text style={[styles.poiCounterValue, { color: C.cyan }]}>{activePOIs.length}</Text>
            <Text style={styles.poiCounterLabel}>Active</Text>
          </View>
          <View style={[styles.poiCounterBox, { borderColor: C.green }]}>
            <Text style={[styles.poiCounterValue, { color: C.green }]}>{tpHits}</Text>
            <Text style={styles.poiCounterLabel}>TP Hit</Text>
          </View>
          <View style={[styles.poiCounterBox, { borderColor: C.red }]}>
            <Text style={[styles.poiCounterValue, { color: C.red }]}>{slHits}</Text>
            <Text style={styles.poiCounterLabel}>SL Hit</Text>
          </View>
        </View>

        {/* ── Segment Switcher: Active Trades vs Trade Calendar History ── */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'trades' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('trades')}
            activeOpacity={0.7}
          >
            <TrendingUp size={15} color={activeTab === 'trades' ? C.green : C.textSecondary} />
            <Text style={[styles.segmentBtnText, activeTab === 'trades' && styles.segmentBtnTextActive]}>
              Active Trades ({activeTrades.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'calendar' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('calendar')}
            activeOpacity={0.7}
          >
            <CalendarIcon size={15} color={activeTab === 'calendar' ? C.green : C.textSecondary} />
            <Text style={[styles.segmentBtnText, activeTab === 'calendar' && styles.segmentBtnTextActive]}>
              History Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab Content: Active Trades or Calendar History ── */}
        {activeTab === 'trades' ? (
          <View>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <TrendingUp size={18} color={C.green} />
                <Text style={styles.sectionTitle}>Active Positions</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{activeTrades.length}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.sectionAction}
                onPress={() => router.push('/(tabs)/trades')}
              >
                <Text style={styles.sectionActionText}>View All</Text>
                <ArrowRight size={14} color={C.green} />
              </TouchableOpacity>
            </View>

            {activeTrades.length > 0 ? (
              activeTrades.map((trade) => (
                <View key={trade.id} style={styles.cardItem}>
                  <TradeCard
                    trade={trade}
                    onPress={() => router.push(`/(tabs)/trades/${trade.id}` as any)}
                  />
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <TrendingUp size={32} color={C.textMuted} />
                <Text style={styles.emptyStateTitle}>No Active Trades</Text>
                <Text style={styles.emptyStateSubtitle}>Live positions reported by MT5 will appear here</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.calendarSection}>
            <TradeCalendar
              trades={trades}
              onSelectTrade={(trade) => router.push(`/(tabs)/trades/${trade.id}` as any)}
            />
          </View>
        )}

        {/* ── Pending POIs Section ── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={styles.sectionHeaderLeft}>
            <Target size={18} color={C.amber} />
            <Text style={styles.sectionTitle}>Pending POIs</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#FFB80022' }]}>
              <Text style={[styles.sectionBadgeText, { color: C.amber }]}>{pendingPOIs.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => router.push('/(tabs)/pois')}
          >
            <Text style={styles.sectionActionText}>View All</Text>
            <ArrowRight size={14} color={C.green} />
          </TouchableOpacity>
        </View>

        {pendingPOIs.length > 0 ? (
          pendingPOIs.slice(0, 5).map((poi) => (
            <View key={poi.id} style={styles.cardItem}>
              <POICard poi={poi} />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Target size={32} color={C.textMuted} />
            <Text style={styles.emptyStateTitle}>No Pending POIs</Text>
            <Text style={styles.emptyStateSubtitle}>Pending zones will appear here</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
  },
  eaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
  },
  eaDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },
  eaPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // ── Account Card ──
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 14,
  },
  accountBrokerLabel: {
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  accountBalance: {
    fontSize: 32,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.5,
  },
  accountBalanceLabel: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 2,
    marginBottom: 16,
  },
  accountMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  accountMetric: {
    flex: 1,
    alignItems: 'center',
  },
  accountMetricLabel: {
    fontSize: 11,
    color: C.textSecondary,
    marginBottom: 4,
  },
  accountMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },

  // ── Risk & Limits Card ──
  riskCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  riskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskTitleText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
  riskDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDetailText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  limitBarItem: {
    marginBottom: 10,
  },
  limitBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  limitBarLabel: {
    color: C.textSecondary,
    fontSize: 12,
  },
  limitBarVal: {
    fontSize: 12,
  },
  limitBarTrack: {
    height: 6,
    backgroundColor: C.surface2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  limitBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  riskWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
    gap: 6,
  },
  riskWarningText: {
    color: C.amber,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // ── POI Counter Row ──
  poiCounterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  poiCounterBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  poiCounterValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  poiCounterLabel: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // ── Segment Switcher ──
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: '#3A3A50',
  },
  segmentBtnText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: C.white,
    fontWeight: '700',
  },

  // ── Sections ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },
  sectionBadge: {
    backgroundColor: '#00C89622',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.green,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionActionText: {
    fontSize: 12,
    color: C.green,
    fontWeight: '600',
  },
  cardItem: {
    marginBottom: 10,
  },
  calendarSection: {
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
    marginTop: 10,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    color: C.textSecondary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
