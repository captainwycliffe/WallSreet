import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { eaService } from '../../services/api';
import { TradeCard } from '../../components/trade/TradeCard';
import { POICard } from '../../components/poi/POICard';
import {
  ArrowRight,
  TrendingUp,
  Target,
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
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  textMuted: '#555577',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: accounts, refetch: refetchAccounts, isFetching: isFetchingAccounts } = useAccounts();
  const { data: poisData, refetch: refetchPOIs, isFetching: isFetchingPOIs } = usePOIs();
  const { data: tradesData, refetch: refetchTrades, isFetching: isFetchingTrades } = useTrades();

  const { data: eas, refetch: refetchEAs, isFetching: isFetchingEAs } = useQuery({
    queryKey: ['eaMonitor'],
    queryFn: () => eaService.getMonitor(),
    refetchInterval: 10000,
  });

  const isFetching = isFetchingAccounts || isFetchingPOIs || isFetchingTrades || isFetchingEAs;
  const refetchAll = () => {
    refetchAccounts();
    refetchPOIs();
    refetchTrades();
    refetchEAs();
  };

  const account = accounts?.[0];
  const activeEA = eas?.[0];
  const isEAOnline = activeEA?.status === 'ONLINE';

  const pois = poisData?.items || [];
  const trades = tradesData?.items || [];

  const activeTrades = trades.filter((t) => t.status === 'OPEN');
  const pendingOrders = pois.filter((p) => p.status === 'PENDING' || p.status === 'ACTIVE');

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

        {/* ── Account Balance Card ── */}
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

        {/* ── Active Positions Section ── */}
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
            <Text style={styles.sectionActionText}>History</Text>
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
            <TrendingUp size={28} color={C.textMuted} />
            <Text style={styles.emptyStateTitle}>No Active Trades</Text>
            <Text style={styles.emptyStateSubtitle}>Live positions reported by MT5 will appear here</Text>
          </View>
        )}

        {/* ── Pending Orders Section ── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={styles.sectionHeaderLeft}>
            <Target size={18} color={C.amber} />
            <Text style={styles.sectionTitle}>Pending Orders</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#FFB80022' }]}>
              <Text style={[styles.sectionBadgeText, { color: C.amber }]}>{pendingOrders.length}</Text>
            </View>
          </View>
        </View>

        {pendingOrders.length > 0 ? (
          pendingOrders.map((poi) => (
            <View key={poi.id} style={styles.cardItem}>
              <POICard poi={poi} />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Target size={28} color={C.textMuted} />
            <Text style={styles.emptyStateTitle}>No Pending Orders</Text>
            <Text style={styles.emptyStateSubtitle}>Live pending orders placed by your EA will appear here</Text>
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
    borderRadius: 4,
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
    padding: 20,
    marginBottom: 20,
  },
  accountBrokerLabel: {
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 6,
  },
  accountBalance: {
    fontSize: 34,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.5,
  },
  accountBalanceLabel: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
    marginBottom: 18,
  },
  accountMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.border,
  },

  // ── Section Headers ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    marginLeft: 8,
  },
  sectionBadge: {
    backgroundColor: '#00C89622',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
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

  // ── Empty State ──
  emptyState: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
    marginTop: 10,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 20,
  },
});
