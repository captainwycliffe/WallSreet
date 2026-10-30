import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BookOpen, ShieldAlert, Wallet, Cpu, Bell, Settings, User, LogOut, ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
          {user && (
            <Text style={styles.headerSubtitle}>{user.username} · {user.email}</Text>
          )}
        </View>

        {/* Menu Card */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={[
                styles.menuRow,
                i < menuItems.length - 1 && styles.menuRowBorder,
              ]}
            >
              <View style={styles.iconBox}>
                <item.icon size={18} color="#00C896" />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={18} color="#555577" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <LogOut size={16} color="#FF4757" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  red: '#FF4757',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  textMuted: '#555577',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    marginTop: 24,
    marginBottom: 24,
  },
  headerTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: C.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBox: {
    width: 36,
    height: 36,
    backgroundColor: C.surface2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuLabel: {
    color: C.white,
    fontSize: 15,
    fontWeight: '500',
  },
  menuSubtitle: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 32,
  },
  logoutText: {
    color: C.red,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
