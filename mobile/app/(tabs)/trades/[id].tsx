import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { ErrorState } from '../../../components/common/ErrorState';
import { useTrade } from '../../../hooks/useTrades';

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-border">
      <Text className="text-textSecondary">{label}</Text>
      <Text className={`font-interMedium ${color || 'text-white'}`}>{value}</Text>
    </View>
  );
}

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trade, isLoading, error, refetch } = useTrade(id);

  const profitColor = (trade?.profit || 0) >= 0 ? 'text-green' : 'text-red';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title={trade ? `${trade.symbol} · ${trade.direction}` : 'Trade Detail'} subtitle={trade?.mt5_ticket ? `Ticket #${trade.mt5_ticket}` : undefined} />
      <ScrollView className="flex-1 px-4">
        {isLoading ? (
          <View className="mt-4"><LoadingSkeleton height={220} /></View>
        ) : error && !trade ? (
          <ErrorState message="Couldn't load this trade." onRetry={refetch} />
        ) : !trade ? (
          <ErrorState message="Trade not found." />
        ) : (
          <>
            <Card className="mt-4 mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className={`${profitColor} font-interBold text-2xl`}>
                  {(trade.profit || 0) >= 0 ? '+' : ''}${trade.profit?.toFixed(2) ?? '0.00'}
                </Text>
                <StatusBadge status={trade.status} />
              </View>
              <Text className={`${profitColor} text-sm mb-4`}>{trade.r_multiple?.toFixed(2) ?? '0.00'}R</Text>

              <Row label="Volume" value={trade.volume.toFixed(2)} />
              <Row label="Entry price" value={trade.entry_price.toFixed(5)} />
              {trade.exit_price != null && <Row label="Exit price" value={trade.exit_price.toFixed(5)} />}
              <Row label="Stop loss" value={trade.stop_loss.toFixed(5)} color="text-red" />
              <Row label="Take profit" value={trade.take_profit.toFixed(5)} color="text-green" />
              <Row label="Commission" value={`$${trade.commission?.toFixed(2) ?? '0.00'}`} />
              <Row label="Swap" value={`$${trade.swap?.toFixed(2) ?? '0.00'}`} />
              <Row label="Opened" value={new Date(trade.opened_at).toLocaleString()} />
              {trade.closed_at && <Row label="Closed" value={new Date(trade.closed_at).toLocaleString()} />}
            </Card>

            <TouchableOpacity onPress={() => router.push(`/(tabs)/more/journal/${trade.id}` as any)}>
              <Card className="flex-row items-center justify-center mb-6">
                <BookOpen size={16} color="#00C896" />
                <Text className="text-green font-interSemiBold ml-2">
                  {trade.journal ? 'View Journal Entry' : 'Add Journal Entry'}
                </Text>
              </Card>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
