import React, { useState, useMemo } from 'react';
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
import {
  TrendingUp,
  Calendar as CalendarIcon,
  List,
  RotateCcw,
  Table as TableIcon,
} from 'lucide-react-native';
import { TradeCard } from '../../../components/trade/TradeCard';
import { TradeCalendar } from '../../../components/trade/TradeCalendar';
import { TradeHistoryTable } from '../../../components/trade/TradeHistoryTable';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { useTrades } from '../../../hooks/useTrades';
import { Trade } from '../../../types/trade';

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  textMuted: '#555577',
  green: '#00C896',
  red: '#FF4757',
};

export default function TradesScreen() {
  const { data, isLoading, isFetching, error, refetch } = useTrades();
  const [viewMode, setViewMode] = useState<'calendar_table' | 'cards'>('calendar_table');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const router = useRouter();

  const trades = data?.items || [];
  const openCount = trades.filter((t) => t.status === 'OPEN').length;
  const closedCount = trades.filter((t) => t.status === 'CLOSED').length;

  const totalPnL = useMemo(() => {
    return trades.reduce((acc, t) => acc + (t.profit ?? 0), 0);
  }, [trades]);

  // Helper to extract YYYY-MM-DD from a trade
  const getTradeDateStr = (trade: Trade): string => {
    const raw = trade.closed_at || trade.opened_at;
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Filter trades by selected date if one is selected
  const displayTrades = useMemo(() => {
    if (!selectedDate) return trades;
    return trades.filter((t) => getTradeDateStr(t) === selectedDate);
  }, [trades, selectedDate]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Trade History</Text>
            <Text style={styles.pageSubtitle}>
              {openCount} Open · {closedCount} Closed
            </Text>
          </View>

          {/* Right Header Stats & Mode Toggle */}
          <View style={styles.headerRight}>
            <View style={[styles.pnlBadge, { backgroundColor: totalPnL >= 0 ? '#00C89622' : '#FF475722' }]}>
              <Text style={[styles.pnlBadgeText, { color: totalPnL >= 0 ? C.green : C.red }]}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </Text>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'calendar_table' && styles.toggleBtnActive]}
                onPress={() => setViewMode('calendar_table')}
                activeOpacity={0.7}
              >
                <CalendarIcon size={14} color={viewMode === 'calendar_table' ? C.green : C.textSecondary} />
                <Text style={[styles.toggleBtnText, viewMode === 'calendar_table' && styles.toggleBtnTextActive]}>
                  Calendar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'cards' && styles.toggleBtnActive]}
                onPress={() => setViewMode('cards')}
                activeOpacity={0.7}
              >
                <List size={14} color={viewMode === 'cards' ? C.green : C.textSecondary} />
                <Text style={[styles.toggleBtnText, viewMode === 'cards' && styles.toggleBtnTextActive]}>
                  Cards
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View>
            <View style={styles.skeletonItem}><LoadingSkeleton height={180} /></View>
            <View style={styles.skeletonItem}><LoadingSkeleton height={180} /></View>
          </View>
        ) : error && !data ? (
          <ErrorState message="Couldn't load trades." onRetry={refetch} />
        ) : trades.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No trades yet"
            subtitle="Trades opened by your EA will appear here in real time."
          />
        ) : viewMode === 'calendar_table' ? (
          <View>
            {/* ── Calendar with Net PnL and Weekly Totals ── */}
            <TradeCalendar
              trades={trades}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSelectTrade={(trade) => router.push(`/(tabs)/trades/${trade.id}` as any)}
            />

            {/* Filter active chip if a day is selected */}
            {selectedDate && (
              <View style={styles.filterBar}>
                <Text style={styles.filterBarText}>
                  Showing <Text style={{ color: C.white, fontWeight: '700' }}>{displayTrades.length}</Text> trade{displayTrades.length !== 1 ? 's' : ''} on <Text style={{ color: C.green, fontWeight: '700' }}>{selectedDate}</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedDate(null)}
                  style={styles.clearFilterBtn}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={12} color={C.green} style={{ marginRight: 4 }} />
                  <Text style={styles.clearFilterText}>Show All ({trades.length})</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Trade History Table (Directly below Calendar, matching user screenshots) ── */}
            <TradeHistoryTable
              trades={displayTrades}
              onSelectTrade={(trade) => router.push(`/(tabs)/trades/${trade.id}` as any)}
              title={selectedDate ? `Trade History (${selectedDate})` : 'All Trade History'}
            />
          </View>
        ) : (
          <View style={styles.listViewContainer}>
            {trades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onPress={() => router.push(`/(tabs)/trades/${trade.id}` as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  pageTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  pageSubtitle: {
    color: C.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pnlBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pnlBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 5,
  },
  toggleBtnActive: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: '#3A3A50',
  },
  toggleBtnText: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: C.white,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
    marginBottom: 4,
  },
  filterBarText: {
    fontSize: 12,
    color: C.textSecondary,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 150, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearFilterText: {
    fontSize: 11,
    color: C.green,
    fontWeight: '600',
  },
  listViewContainer: {
    marginTop: 4,
  },
  skeletonItem: {
    marginBottom: 16,
  },
});
