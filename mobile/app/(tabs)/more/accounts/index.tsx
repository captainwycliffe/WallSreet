import { View, Text, ScrollView, RefreshControl, TextInput, Switch, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react-native';
import { Header } from '../../../../components/ui/Header';
import { AccountCard } from '../../../../components/ui/AccountCard';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { useAccounts } from '../../../../hooks/useAccount';
import { useAccountStore } from '../../../../store/accountStore';
import { accountsService } from '../../../../services/api';

const C = {
  bg: '#0A0A0F',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  green: '#00C896',
};

export default function AccountsScreen() {
  const { data: accounts, isLoading, isFetching, error, refetch } = useAccounts();
  const { activeAccountId, setActiveAccount } = useAccountStore();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [broker, setBroker] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isDemo, setIsDemo] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name || !broker || !accountNumber) {
      Alert.alert('Error', 'Please fill in account name, broker, and account number');
      return;
    }
    setCreating(true);
    try {
      await accountsService.createAccount({ name, broker, account_number: accountNumber, currency, is_demo: isDemo });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowForm(false);
      setName(''); setBroker(''); setAccountNumber('');
    } catch (e) {
      Alert.alert('Error', 'Could not create account. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header
        title="Accounts"
        subtitle="Your connected MT5 accounts"
        right={
          <Button title={showForm ? 'Cancel' : 'Add'} size="sm" variant="secondary" onPress={() => setShowForm(v => !v)} />
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.green} />}
      >
        {showForm && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>New account</Text>
            <TextInput
              style={styles.input}
              placeholder="Account name"
              placeholderTextColor={C.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Broker"
              placeholderTextColor={C.textSecondary}
              value={broker}
              onChangeText={setBroker}
            />
            <TextInput
              style={styles.input}
              placeholder="Account number"
              placeholderTextColor={C.textSecondary}
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={setAccountNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Currency (e.g. USD)"
              placeholderTextColor={C.textSecondary}
              autoCapitalize="characters"
              value={currency}
              onChangeText={setCurrency}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Demo account</Text>
              <Switch value={isDemo} onValueChange={setIsDemo} trackColor={{ true: C.green, false: undefined }} />
            </View>
            <Button title="Create Account" onPress={handleCreate} loading={creating} />
          </Card>
        )}

        <View style={styles.listContent}>
          {isLoading ? (
            <View>
              <View style={styles.skeletonItem}>
                <LoadingSkeleton height={120} />
              </View>
              <View style={styles.skeletonItem}>
                <LoadingSkeleton height={120} />
              </View>
            </View>
          ) : error && !accounts ? (
            <ErrorState message="Couldn't load accounts." onRetry={refetch} />
          ) : !accounts || accounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No accounts yet"
              subtitle="Add your first MT5 account to start tracking trades and POIs."
              actionLabel="Add account"
              onAction={() => setShowForm(true)}
            />
          ) : (
            accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                isActive={account.id === activeAccountId}
                onPress={() => setActiveAccount(account.id)}
              />
            ))
          )}
        </View>
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  formCard: {
    marginTop: 16,
    marginBottom: 8,
  },
  formTitle: {
    color: C.white,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: C.surface2,
    color: C.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    color: C.white,
  },
  listContent: {
    marginTop: 16,
  },
  skeletonItem: {
    marginBottom: 12,
  },
});
