import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useAccounts } from '../../hooks/useAccount';
import { useState } from 'react';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { data: accounts, refetch, isFetching } = useAccounts();
  const account = accounts?.[0];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#00C896" />}
      >
        <View className="mt-6 mb-8">
          <Text className="text-textSecondary text-lg font-inter">Good morning,</Text>
          <Text className="text-white text-2xl font-interBold">{user?.username || 'Trader'}</Text>
        </View>

        {account && (
          <View className="bg-surface p-4 rounded-2xl mb-6 border border-border">
            <Text className="text-textSecondary text-sm mb-1">{account.name}</Text>
            <Text className="text-white text-3xl font-interBold">${account.balance.toFixed(2)}</Text>
            
            <View className="flex-row justify-between mt-6">
              <View>
                <Text className="text-textSecondary text-xs">Equity</Text>
                <Text className="text-white text-md font-interMedium">${account.equity.toFixed(2)}</Text>
              </View>
              <View>
                <Text className="text-textSecondary text-xs">Open P/L</Text>
                <Text className={`text-md font-interMedium ${account.open_pl >= 0 ? 'text-green' : 'text-red'}`}>
                  {account.open_pl >= 0 ? '+' : ''}{account.open_pl.toFixed(2)}
                </Text>
              </View>
              <View>
                <Text className="text-textSecondary text-xs">Daily P/L</Text>
                <Text className={`text-md font-interMedium ${account.daily_pl >= 0 ? 'text-green' : 'text-red'}`}>
                  {account.daily_pl >= 0 ? '+' : ''}{account.daily_pl.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text className="text-white font-interSemiBold text-lg mb-4">Market Overview</Text>
        <View className="bg-surface p-6 rounded-2xl border border-border items-center justify-center min-h-[200px]">
          <Text className="text-textSecondary text-center">Dashboard data loading...</Text>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}
