import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { useTrades } from '../../../../hooks/useTrades';

const C = {
  bg: '#0A0A0F',
  green: '#00C896',
  red: '#FF4757',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  textMuted: '#555577',
};

export default function JournalIndexScreen() {
  const { data, isLoading, isFetching, error, refetch } = useTrades({ status: 'CLOSED' });
  const router = useRouter();

  const closedTrades = data?.items.filter(t => t.status === 'CLOSED') ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Trade Journal" subtitle="Add notes and lessons to your closed trades" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        <View style={styles.content}>
          {isLoading ? (
            <View>
              <View style={styles.skeletonGap}><LoadingSkeleton height={70} /></View>
              <View style={styles.skeletonGap}><LoadingSkeleton height={70} /></View>
            </View>
          ) : error ? (
            <ErrorState message="Couldn't load trades." onRetry={refetch} />
          ) : closedTrades.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No closed trades yet"
              subtitle="Once you have closed trades, you can journal notes and lessons against each one here."
            />
          ) : (
            closedTrades.map((trade) => {
              const profitColor = (trade.profit || 0) >= 0 ? C.green : C.red;
              return (
                <TouchableOpacity
                  key={trade.id}
                  onPress={() => router.push(`/(tabs)/more/journal/${trade.id}` as any)}
                >
                  <Card style={styles.tradeCard}>
                    <View style={styles.tradeInfo}>
                      <View style={styles.tradeHeader}>
                        <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                        <Text style={styles.tradeDirection}>{trade.direction}</Text>
                      </View>
                      <Text style={[styles.tradeProfit, { color: profitColor }]}>
                        {(trade.profit || 0) >= 0 ? '+' : ''}${trade.profit?.toFixed(2) ?? '0.00'}
                        {trade.journal ? ' · Journaled' : ''}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={C.textMuted} />
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
  content: {
    marginTop: 16,
  },
  skeletonGap: {
    marginBottom: 12,
  },
  tradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tradeInfo: {
    flex: 1,
  },
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeSymbol: {
    color: C.white,
    fontWeight: '600',
    marginRight: 8,
  },
  tradeDirection: {
    color: C.textSecondary,
    fontSize: 12,
  },
  tradeProfit: {
    fontWeight: '500',
    fontSize: 14,
    marginTop: 4,
  },
});
