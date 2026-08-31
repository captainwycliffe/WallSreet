import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import { POICard } from '../../../components/poi/POICard';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { usePOIs } from '../../../hooks/usePOIs';

export default function POIsScreen() {
  const { data, isLoading, isFetching, error, refetch } = usePOIs();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        <View className="mt-6 mb-4">
          <Text className="text-white text-2xl font-interBold">POIs</Text>
          <Text className="text-textSecondary mt-1">Points of interest detected by your EA</Text>
        </View>

        {isLoading ? (
          <View className="space-y-4">
            <LoadingSkeleton height={180} />
            <LoadingSkeleton height={180} />
          </View>
        ) : error && !data ? (
          <ErrorState message="Couldn't load POIs." onRetry={refetch} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No POIs yet"
            subtitle="Points of interest detected by your EA will show up here."
          />
        ) : (
          data.items.map((poi) => (
            <POICard key={poi.id} poi={poi} onPress={() => router.push(`/(tabs)/pois/${poi.id}` as any)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
