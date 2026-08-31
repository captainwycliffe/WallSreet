import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { useTrades } from '../../../../hooks/useTrades';

export default function JournalIndexScreen() {
  const { data, isLoading, isFetching, error, refetch } = useTrades({ status: 'CLOSED' });
  const router = useRouter();

  const closedTrades = data?.items.filter(t => t.status === 'CLOSED') ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title="Trade Journal" subtitle="Add notes and lessons to your closed trades" />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        <View className="mt-4">
          {isLoading ? (
            <View className="space-y-3">
              <LoadingSkeleton height={70} />
              <LoadingSkeleton height={70} />
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
              const profitColor = (trade.profit || 0) >= 0 ? 'text-green' : 'text-red';
              return (
                <TouchableOpacity
                  key={trade.id}
                  onPress={() => router.push(`/(tabs)/more/journal/${trade.id}` as any)}
                >
                  <Card className="mb-3 flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-white font-interSemiBold mr-2">{trade.symbol}</Text>
                        <Text className="text-textSecondary text-xs">{trade.direction}</Text>
                      </View>
                      <Text className={`${profitColor} font-interMedium text-sm mt-1`}>
                        {(trade.profit || 0) >= 0 ? '+' : ''}${trade.profit?.toFixed(2) ?? '0.00'}
                        {trade.journal ? ' · Journaled' : ''}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#555577" />
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
