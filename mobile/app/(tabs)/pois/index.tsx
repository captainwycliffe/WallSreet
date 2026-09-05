import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import { POICard } from '../../../components/poi/POICard';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { usePOIs } from '../../../hooks/usePOIs';

const C = {
  bg: '#0A0A0F',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  green: '#00C896',
};

export default function POIsScreen() {
  const { data, isLoading, isFetching, error, refetch } = usePOIs();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>POIs</Text>
          <Text style={styles.pageSubtitle}>Points of interest detected by your EA</Text>
        </View>

        {isLoading ? (
          <View>
            <View style={styles.skeletonItem}>
              <LoadingSkeleton height={180} />
            </View>
            <View style={styles.skeletonItem}>
              <LoadingSkeleton height={180} />
            </View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  pageTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  pageSubtitle: {
    color: C.textSecondary,
    marginTop: 4,
  },
  skeletonItem: {
    marginBottom: 16,
  },
});
