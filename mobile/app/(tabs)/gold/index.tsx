import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, BarChart2, AlertCircle, Clock } from 'lucide-react-native';
import api from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoldQuote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  open_interest: number;
  timestamp: string;
  is_delayed: boolean;
  stale: boolean;
}

interface GoldPositioning {
  report_date: string;
  noncomm_long: number;
  noncomm_short: number;
  comm_long: number;
  comm_short: number;
  net_speculator: number;
  stale: boolean;
}

interface GoldSummary {
  quote: GoldQuote;
  positioning: GoldPositioning | null;
  last_updated: string;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchGoldSummary(): Promise<GoldSummary> {
  const { data } = await api.get<GoldSummary>('/gold/summary');
  return data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── COT Bar ─────────────────────────────────────────────────────────────────

function COTBar({ pos }: { pos: GoldPositioning }) {
  const total = pos.noncomm_long + pos.noncomm_short;
  const longPct = total > 0 ? (pos.noncomm_long / total) * 100 : 50;

  return (
    <View style={styles.cotContainer}>
      <Text style={styles.sectionTitle}>COT Speculator Positioning</Text>
      <Text style={styles.cotDate}>Report date: {pos.report_date}</Text>

      <View style={styles.cotLabelRow}>
        <Text style={styles.cotLong}>LONG {fmtNum(pos.noncomm_long)}</Text>
        <Text style={styles.cotShort}>SHORT {fmtNum(pos.noncomm_short)}</Text>
      </View>

      {/* Bar */}
      <View style={styles.cotBarTrack}>
        <View style={[styles.cotBarLong, { width: `${longPct}%` }]} />
        <View style={[styles.cotBarShort, { width: `${100 - longPct}%` }]} />
      </View>

      <View style={styles.cotLabelRow}>
        <Text style={styles.cotPct}>{longPct.toFixed(1)}%</Text>
        <Text style={styles.cotPct}>{(100 - longPct).toFixed(1)}%</Text>
      </View>

      <Text style={styles.cotNet}>
        Net Speculator: {pos.net_speculator > 0 ? '+' : ''}{fmtNum(pos.net_speculator)} contracts
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function GoldInsightsScreen() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<GoldSummary>({
    queryKey: ['gold-summary'],
    queryFn: fetchGoldSummary,
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 60_000,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFD700" size="large" />
        <Text style={styles.loadingText}>Fetching Gold data…</Text>
      </View>
    );
  }

  // ── Error ──
  if (isError || !data) {
    return (
      <View style={styles.center}>
        <AlertCircle color="#FF4444" size={40} />
        <Text style={styles.errorTitle}>Gold Data Unavailable</Text>
        <Text style={styles.errorSub}>Check DATABENTO_API_KEY or connectivity</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { quote, positioning, last_updated } = data;
  const isUp = quote.change >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const trendColor = isUp ? '#00C896' : '#FF4444';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FFD700" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🥇 Gold Insights</Text>
        <Text style={styles.headerSub}>CME GC Futures · COMEX</Text>
      </View>

      {/* Stale / delayed badge */}
      {(quote.stale || quote.is_delayed) && (
        <View style={styles.delayedBadge}>
          <Clock size={12} color="#888" />
          <Text style={styles.delayedText}>
            {quote.stale ? 'Stale data · ' : ''}Delayed · last {fmtDate(last_updated)}
          </Text>
        </View>
      )}

      {/* Price card */}
      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>{quote.symbol}</Text>
        <Text style={styles.price}>${fmtPrice(quote.price)}</Text>
        <View style={styles.changeRow}>
          <TrendIcon size={18} color={trendColor} />
          <Text style={[styles.change, { color: trendColor }]}>
            {isUp ? '+' : ''}{fmtPrice(quote.change)} ({isUp ? '+' : ''}{quote.change_pct.toFixed(3)}%)
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <BarChart2 size={16} color="#8888A8" />
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>{fmtNum(quote.volume)}</Text>
        </View>
        <View style={styles.statCard}>
          <BarChart2 size={16} color="#8888A8" />
          <Text style={styles.statLabel}>Open Interest</Text>
          <Text style={styles.statValue}>{fmtNum(quote.open_interest)}</Text>
        </View>
      </View>

      {/* COT positioning */}
      {positioning ? (
        <COTBar pos={positioning} />
      ) : (
        <View style={styles.cotUnavailable}>
          <Text style={styles.cotUnavailableText}>COT data temporarily unavailable</Text>
        </View>
      )}

      {/* Last updated */}
      <Text style={styles.lastUpdated}>Updated: {fmtDate(last_updated)}</Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: { marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: '#8888A8', marginTop: 2 },

  delayedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A1A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  delayedText: { fontSize: 11, color: '#888' },

  priceCard: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  priceLabel: { fontSize: 13, color: '#8888A8', marginBottom: 4 },
  price: { fontSize: 38, fontWeight: '800', color: '#FFD700', letterSpacing: -1 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  change: { fontSize: 16, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  statLabel: { fontSize: 11, color: '#8888A8' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  cotContainer: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cotDate: { fontSize: 11, color: '#8888A8', marginBottom: 12 },
  cotLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cotLong: { fontSize: 12, fontWeight: '600', color: '#00C896' },
  cotShort: { fontSize: 12, fontWeight: '600', color: '#FF4444' },
  cotPct: { fontSize: 11, color: '#8888A8' },
  cotBarTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#2A2A3A',
  },
  cotBarLong: { height: 10, backgroundColor: '#00C896' },
  cotBarShort: { height: 10, backgroundColor: '#FF4444' },
  cotNet: { fontSize: 12, color: '#8888A8', marginTop: 8, textAlign: 'center' },

  cotUnavailable: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  cotUnavailableText: { color: '#555577', fontSize: 13 },

  lastUpdated: { fontSize: 11, color: '#555577', textAlign: 'center', marginTop: 8 },

  loadingText: { color: '#8888A8', marginTop: 10 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  errorSub: { fontSize: 13, color: '#8888A8', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: { color: '#0A0A0F', fontWeight: '700', fontSize: 14 },
});
