import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Cpu } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { EAStatusCard } from '../../../../components/ui/EAStatusCard';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { eaService } from '../../../../services/api';

const C = {
  bg: '#0A0A0F',
  green: '#00C896',
};

export default function EAMonitorScreen() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['eaMonitor'],
    queryFn: () => eaService.getMonitor(),
  });

  return (
    <SafeAreaView style={styles.screen}>
      <Header title="EA Monitor" subtitle="Expert Advisor status across your accounts" />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        <View style={styles.content}>
          {isLoading ? (
            <View>
              <View style={styles.skeletonItem}>
                <LoadingSkeleton height={100} />
              </View>
              <View style={styles.skeletonItem}>
                <LoadingSkeleton height={100} />
              </View>
            </View>
          ) : error ? (
            <ErrorState message="Couldn't load EA status." onRetry={refetch} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={Cpu}
              title="No EAs registered"
              subtitle="Register your Expert Advisor from the MT5 terminal to see its live status here."
            />
          ) : (
            data.map((ea) => <EAStatusCard key={ea.id} ea={ea} />)
          )}
        </View>
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
  content: {
    marginTop: 16,
  },
  skeletonItem: {
    marginBottom: 12,
  },
});
