import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TradeCard } from '../../../components/trade/TradeCard';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { ErrorState } from '../../../components/common/ErrorState';
import { usePOI } from '../../../hooks/usePOIs';

const C = {
  bg: '#0A0A0F',
  border: '#2A2A3A',
  green: '#00C896',
  red: '#FF4757',
  cyan: '#00D4FF',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
};

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: color ?? C.white }]}>{value}</Text>
    </View>
  );
}

export default function POIDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: poi, isLoading, error, refetch } = usePOI(id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={poi ? `${poi.symbol} · ${poi.direction}` : 'POI Detail'} subtitle={poi?.timeframe} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.skeletonWrapper}>
            <LoadingSkeleton height={200} />
          </View>
        ) : error && !poi ? (
          <ErrorState message="Couldn't load this POI." onRetry={refetch} />
        ) : !poi ? (
          <ErrorState message="POI not found." />
        ) : (
          <>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.poiType}>{poi.poi_type.replace('_', ' ')}</Text>
                <StatusBadge status={poi.status} />
              </View>
              <Row label="Entry price" value={poi.entry_price.toFixed(5)} />
              <Row label="Stop loss" value={poi.stop_loss.toFixed(5)} color={C.red} />
              <Row label="Take profit" value={poi.take_profit.toFixed(5)} color={C.green} />
              <Row label="Zone high" value={poi.zone_high.toFixed(5)} />
              <Row label="Zone low" value={poi.zone_low.toFixed(5)} />
              <Row label="Risk:Reward" value={`1:${poi.risk_reward.toFixed(1)}`} color={C.cyan} />
              <Row label="Detected" value={new Date(poi.created_at).toLocaleString()} />
              {poi.activated_at && <Row label="Activated" value={new Date(poi.activated_at).toLocaleString()} />}
              {poi.closed_at && <Row label="Closed" value={new Date(poi.closed_at).toLocaleString()} />}
            </Card>

            {poi.trade && (
              <>
                <Text style={styles.sectionTitle}>Resulting Trade</Text>
                <TradeCard trade={poi.trade} />
              </>
            )}
          </>
        )}
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
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  skeletonWrapper: {
    marginTop: 16,
  },
  card: {
    marginTop: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poiType: {
    color: C.white,
    fontWeight: '600',
    fontSize: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLabel: {
    color: C.textSecondary,
  },
  rowValue: {
    color: C.white,
    fontWeight: '500',
  },
  sectionTitle: {
    color: C.white,
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 12,
  },
});
