import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { NotificationCard } from '../../../../components/ui/NotificationCard';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { notificationsService } from '../../../../services/api';

export default function NotificationsScreen() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['notificationHistory'],
    queryFn: () => notificationsService.getHistory(),
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title="Notifications" subtitle="Push alert history" />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        <View className="mt-4">
          {isLoading ? (
            <View className="space-y-3">
              <LoadingSkeleton height={80} />
              <LoadingSkeleton height={80} />
            </View>
          ) : error ? (
            <ErrorState message="Couldn't load notifications." onRetry={refetch} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              subtitle="You'll see EA status alerts and trade notifications here once they start coming in."
            />
          ) : (
            data.map((n) => <NotificationCard key={n.id} notification={n} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
