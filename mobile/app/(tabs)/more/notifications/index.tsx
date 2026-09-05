import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { NotificationCard } from '../../../../components/ui/NotificationCard';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { notificationsService } from '../../../../services/api';

const C = {
  bg: '#0A0A0F',
  green: '#00C896',
};

export default function NotificationsScreen() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['notificationHistory'],
    queryFn: () => notificationsService.getHistory(),
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Notifications" subtitle="Push alert history" />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        <View style={styles.content}>
          {isLoading ? (
            <View>
              <View style={styles.skeletonGap}><LoadingSkeleton height={80} /></View>
              <View style={styles.skeletonGap}><LoadingSkeleton height={80} /></View>
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

const styles = StyleSheet.create({
  safeArea: {
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
  skeletonGap: {
    marginBottom: 12,
  },
});
