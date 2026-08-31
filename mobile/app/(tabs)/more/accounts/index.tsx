import { View, Text, ScrollView, RefreshControl, TextInput, Switch, Alert } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-background">
      <Header
        title="Accounts"
        subtitle="Your connected MT5 accounts"
        right={
          <Button title={showForm ? 'Cancel' : 'Add'} size="sm" variant="secondary" onPress={() => setShowForm(v => !v)} />
        }
      />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        {showForm && (
          <Card className="mt-4 mb-2">
            <Text className="text-white font-interSemiBold mb-3">New account</Text>
            <TextInput
              className="bg-surface2 text-white px-4 py-3 rounded-xl border border-border mb-3"
              placeholder="Account name"
              placeholderTextColor="#8888A8"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="bg-surface2 text-white px-4 py-3 rounded-xl border border-border mb-3"
              placeholder="Broker"
              placeholderTextColor="#8888A8"
              value={broker}
              onChangeText={setBroker}
            />
            <TextInput
              className="bg-surface2 text-white px-4 py-3 rounded-xl border border-border mb-3"
              placeholder="Account number"
              placeholderTextColor="#8888A8"
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={setAccountNumber}
            />
            <TextInput
              className="bg-surface2 text-white px-4 py-3 rounded-xl border border-border mb-3"
              placeholder="Currency (e.g. USD)"
              placeholderTextColor="#8888A8"
              autoCapitalize="characters"
              value={currency}
              onChangeText={setCurrency}
            />
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white">Demo account</Text>
              <Switch value={isDemo} onValueChange={setIsDemo} trackColor={{ true: '#00C896' }} />
            </View>
            <Button title="Create Account" onPress={handleCreate} loading={creating} />
          </Card>
        )}

        <View className="mt-4">
          {isLoading ? (
            <View className="space-y-3">
              <LoadingSkeleton height={120} />
              <LoadingSkeleton height={120} />
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
