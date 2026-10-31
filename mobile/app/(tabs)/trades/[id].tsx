import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { ErrorState } from '../../../components/common/ErrorState';
import { useTrade } from '../../../hooks/useTrades';

const C = {
  bg: '#0A0A0F',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  red: '#FF4757',
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

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trade, isLoading, error, refetch } = useTrade(id);

  const profitColor = (trade?.profit || 0) >= 0 ? C.green : C.red;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={trade ? `${trade.symbol} · ${trade.direction}` : 'Trade Detail'} subtitle={trade?.mt5_ticket ? `Ticket #${trade.mt5_ticket}` : undefined} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.skeletonWrapper}><LoadingSkeleton height={220} /></View>
        ) : error && !trade ? (
          <ErrorState message="Couldn't load this trade." onRetry={refetch} />
        ) : !trade ? (
          <ErrorState message="Trade not found." />
        ) : (
          <>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.profitText, { color: profitColor }]}>
                  {(trade.profit || 0) >= 0 ? '+' : ''}${trade.profit?.toFixed(2) ?? '0.00'}
                </Text>
                <StatusBadge status={trade.status} />
              </View>
              <Text style={[styles.rMultiple, { color: profitColor }]}>{trade.r_multiple?.toFixed(2) ?? '0.00'}R</Text>

              <Row label="Volume" value={`${Number(parseFloat(String(trade.volume)).toFixed(4))}`} />
              <Row label="Entry price" value={trade.entry_price.toFixed(5)} />
              {trade.exit_price != null && <Row label="Exit price" value={trade.exit_price.toFixed(5)} />}
              <Row label="Stop loss" value={trade.stop_loss.toFixed(5)} color={C.red} />
              <Row label="Take profit" value={trade.take_profit.toFixed(5)} color={C.green} />
              <Row label="Commission" value={`$${trade.commission?.toFixed(2) ?? '0.00'}`} />
              <Row label="Swap" value={`$${trade.swap?.toFixed(2) ?? '0.00'}`} />
              <Row label="Opened" value={new Date(trade.opened_at).toLocaleString()} />
              {trade.closed_at && <Row label="Closed" value={new Date(trade.closed_at).toLocaleString()} />}
            </Card>

            <TouchableOpacity onPress={() => router.push(`/(tabs)/more/journal/${trade.id}` as any)}>
              <Card style={styles.journalCard}>
                <BookOpen size={16} color={C.green} />
                <Text style={styles.journalText}>
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
  profitText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  rMultiple: {
    fontSize: 14,
    marginBottom: 16,
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
  journalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  journalText: {
    color: C.green,
    fontWeight: '600',
    marginLeft: 8,
  },
});
