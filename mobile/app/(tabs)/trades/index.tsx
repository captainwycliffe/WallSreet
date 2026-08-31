import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { TradeCard } from '../../../components/trade/TradeCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { useTrades } from '../../../hooks/useTrades';

export default function TradesScreen() {
  const { data, isLoading, isFetching, error, refetch } = useTrades();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        <View className="mt-6 mb-4">
          <Text className="text-white text-2xl font-interBold">Trades</Text>
          <Text className="text-textSecondary mt-1">Open and closed positions</Text>
        </View>

        {isLoading ? (
          <View className="space-y-4">
            <LoadingSkeleton height={220} />
            <LoadingSkeleton height={220} />
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
