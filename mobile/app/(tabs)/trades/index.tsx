import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { TradeCard } from '../../../components/trade/TradeCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { useTrades } from '../../../hooks/useTrades';

const C = {
  bg: '#0A0A0F',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  green: '#00C896',
};

export default function TradesScreen() {
  const { data, isLoading, isFetching, error, refetch } = useTrades();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Trades</Text>
          <Text style={styles.pageSubtitle}>Open and closed positions</Text>
        </View>

        {isLoading ? (
          <View>
            <View style={styles.skeletonItem}>
              <LoadingSkeleton height={220} />
            </View>
            <View style={styles.skeletonItem}>
              <LoadingSkeleton height={220} />
            </View>
          </View>
        ) : error && !data ? (
          <ErrorState message="Couldn't load trades." onRetry={refetch} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No trades yet"
            subtitle="Trades opened by your EA will appear here in real time."
          />
        ) : (
          data.items.map((trade) => (
            <TradeCard key={trade.id} trade={trade} onPress={() => router.push(`/(tabs)/trades/${trade.id}` as any)} />
          ))
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
    paddingHorizontal: 16,
  },
  pageHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  pageTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  pageSubtitle: {
    color: C.textSecondary,
    marginTop: 4,
  },
  skeletonItem: {
    marginBottom: 16,
  },
});
