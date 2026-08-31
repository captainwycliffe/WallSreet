import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TradeCard } from '../../../components/trade/TradeCard';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { ErrorState } from '../../../components/common/ErrorState';
import { usePOI } from '../../../hooks/usePOIs';

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-border">
      <Text className="text-textSecondary">{label}</Text>
      <Text className={`font-interMedium ${color || 'text-white'}`}>{value}</Text>
    </View>
  );
}

export default function POIDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: poi, isLoading, error, refetch } = usePOI(id);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title={poi ? `${poi.symbol} · ${poi.direction}` : 'POI Detail'} subtitle={poi?.timeframe} />
      <ScrollView className="flex-1 px-4">
        {isLoading ? (
          <View className="mt-4 space-y-4">
            <LoadingSkeleton height={200} />
          </View>
        ) : error && !poi ? (
          <ErrorState message="Couldn't load this POI." onRetry={refetch} />
        ) : !poi ? (
          <ErrorState message="POI not found." />
        ) : (
          <>
            <Card className="mt-4 mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-interSemiBold text-lg">{poi.poi_type.replace('_', ' ')}</Text>
                <StatusBadge status={poi.status} />
              </View>
              <Row label="Entry price" value={poi.entry_price.toFixed(5)} />
              <Row label="Stop loss" value={poi.stop_loss.toFixed(5)} color="text-red" />
              <Row label="Take profit" value={poi.take_profit.toFixed(5)} color="text-green" />
              <Row label="Zone high" value={poi.zone_high.toFixed(5)} />
              <Row label="Zone low" value={poi.zone_low.toFixed(5)} />
              <Row label="Risk:Reward" value={`1:${poi.risk_reward.toFixed(1)}`} color="text-cyan" />
              <Row label="Detected" value={new Date(poi.created_at).toLocaleString()} />
              {poi.activated_at && <Row label="Activated" value={new Date(poi.activated_at).toLocaleString()} />}
              {poi.closed_at && <Row label="Closed" value={new Date(poi.closed_at).toLocaleString()} />}
            </Card>

            {poi.trade && (
              <>
                <Text className="text-white font-interSemiBold text-lg mb-3">Resulting Trade</Text>
                <TradeCard trade={poi.trade} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
