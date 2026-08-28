import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/authStore';

export default function MoreScreen() {
  const { logout } = useAuthStore();
  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center">
      <Text className="text-white text-xl font-interBold mb-6">More</Text>
      <TouchableOpacity onPress={logout} className="bg-red py-3 px-6 rounded-xl">
        <Text className="text-white font-interMedium">Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
