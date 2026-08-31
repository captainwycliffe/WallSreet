import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Cpu } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { EAStatusCard } from '../../../../components/ui/EAStatusCard';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { eaService } from '../../../../services/api';

export default function EAMonitorScreen() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['eaMonitor'],
    queryFn: () => eaService.getMonitor(),
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title="EA Monitor" subtitle="Expert Advisor status across your accounts" />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        <View className="mt-4">
          {isLoading ? (
            <View className="space-y-3">
              <LoadingSkeleton height={100} />
              <LoadingSkeleton height={100} />
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
