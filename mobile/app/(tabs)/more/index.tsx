import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BookOpen, ShieldAlert, Wallet, Cpu, Bell, Settings, User, LogOut, ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';
import { Card } from '../../../components/ui/Card';

interface MenuItem {
  icon: typeof BookOpen;
  label: string;
  subtitle: string;
  href: string;
}

const menuItems: MenuItem[] = [
  { icon: BookOpen, label: 'Trade Journal', subtitle: 'Notes, tags, and lessons on your trades', href: '/(tabs)/more/journal' },
  { icon: ShieldAlert, label: 'Risk Dashboard', subtitle: 'Open risk, drawdown, and exposure', href: '/(tabs)/more/risk' },
  { icon: Wallet, label: 'Accounts', subtitle: 'Manage your MT5 accounts', href: '/(tabs)/more/accounts' },
  { icon: Cpu, label: 'EA Monitor', subtitle: 'Expert Advisor status and heartbeats', href: '/(tabs)/more/ea-monitor' },
  { icon: Bell, label: 'Notifications', subtitle: 'Push alerts and history', href: '/(tabs)/more/notifications' },
  { icon: Settings, label: 'Settings', subtitle: 'App preferences', href: '/(tabs)/more/settings' },
  { icon: User, label: 'Profile', subtitle: 'Your account details', href: '/(tabs)/more/profile' },
];

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="mt-6 mb-6">
          <Text className="text-white text-2xl font-interBold">More</Text>
          {user && <Text className="text-textSecondary mt-1">{user.username} · {user.email}</Text>}
        </View>

        <Card padding={false} className="mb-6">
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.href}
              onPress={() => router.push(item.href as any)}
              className={`flex-row items-center px-4 py-4 ${i < menuItems.length - 1 ? 'border-b border-border' : ''}`}
            >
              <View className="w-9 h-9 bg-surface2 rounded-full items-center justify-center mr-3">
                <item.icon size={18} color="#00C896" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-interMedium">{item.label}</Text>
                <Text className="text-textSecondary text-xs mt-0.5">{item.subtitle}</Text>
              </View>
              <ChevronRight size={18} color="#555577" />
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity
          onPress={logout}
          className="flex-row items-center justify-center bg-surface2 border border-border py-3.5 rounded-xl mb-8"
        >
          <LogOut size={16} color="#FF4757" />
          <Text className="text-red font-interSemiBold ml-2">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
