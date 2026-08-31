import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { useAuthStore } from '../../../../store/authStore';

export default function ProfileScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title="Profile" />
      <ScrollView className="flex-1 px-4">
        <View className="items-center mt-8 mb-6">
          <View className="w-20 h-20 bg-surface2 rounded-full items-center justify-center mb-3">
            <User size={36} color="#00C896" />
          </View>
          <Text className="text-white text-xl font-interBold">{user?.username || '—'}</Text>
          <Text className="text-textSecondary mt-1">{user?.email || '—'}</Text>
        </View>

        <Card padding={false}>
          <View className="flex-row justify-between items-center px-4 py-4 border-b border-border">
            <Text className="text-textSecondary">Username</Text>
            <Text className="text-white font-interMedium">{user?.username || '—'}</Text>
          </View>
          <View className="flex-row justify-between items-center px-4 py-4 border-b border-border">
            <Text className="text-textSecondary">Email</Text>
            <Text className="text-white font-interMedium">{user?.email || '—'}</Text>
          </View>
          <View className="flex-row justify-between items-center px-4 py-4">
            <Text className="text-textSecondary">Status</Text>
            <Text className={`font-interMedium ${user?.is_active ? 'text-green' : 'text-red'}`}>
              {user?.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
