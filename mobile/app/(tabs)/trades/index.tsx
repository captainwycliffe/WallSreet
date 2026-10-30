import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp, Calendar as CalendarIcon, List } from 'lucide-react-native';
import { TradeCard } from '../../../components/trade/TradeCard';
import { TradeCalendar } from '../../../components/trade/TradeCalendar';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { useTrades } from '../../../hooks/useTrades';

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  green: '#00C896',
};

export default function TradesScreen() {
  const { data, isLoading, isFetching, error, refetch } = useTrades();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const router = useRouter();

  const trades = data?.items || [];
  const openCount = trades.filter((t) => t.status === 'OPEN').length;
  const closedCount = trades.filter((t) => t.status === 'CLOSED').length;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Trades</Text>
            <Text style={styles.pageSubtitle}>
              {openCount} Open · {closedCount} Closed
            </Text>
          </View>

          {/* View Mode Toggle Pill */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
              onPress={() => setViewMode('calendar')}
              activeOpacity={0.7}
            >
              <CalendarIcon size={14} color={viewMode === 'calendar' ? C.green : C.textSecondary} />
              <Text style={[styles.toggleBtnText, viewMode === 'calendar' && styles.toggleBtnTextActive]}>
                Calendar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <List size={14} color={viewMode === 'list' ? C.green : C.textSecondary} />
              <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
                List
              </Text>
            </TouchableOpacity>
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
        ) : viewMode === 'calendar' ? (
          <TradeCalendar
            trades={trades}
            onSelectTrade={(trade) => router.push(`/(tabs)/trades/${trade.id}` as any)}
          />
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
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 12,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: C.white,
    fontWeight: '700',
  },
  listViewContainer: {
    marginTop: 4,
  },
  skeletonItem: {
    marginBottom: 16,
  },
});
