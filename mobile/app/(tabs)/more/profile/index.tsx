import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { useAuthStore } from '../../../../store/authStore';

const C = {
  bg: '#0A0A0F',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  red: '#FF4757',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
};

export default function ProfileScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Profile" />
      <ScrollView style={styles.scroll}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <User size={36} color={C.green} />
          </View>
          <Text style={styles.username}>{user?.username || '—'}</Text>
          <Text style={styles.email}>{user?.email || '—'}</Text>
        </View>

        <Card padding={false}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{user?.username || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: user?.is_active ? C.green : C.red }]}>
              {user?.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </Card>
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
  avatarSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    backgroundColor: C.surface2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  username: {
    color: C.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  email: {
    color: C.textSecondary,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: C.textSecondary,
  },
  infoValue: {
    color: C.white,
    fontWeight: '500',
  },
});
