import React from 'react';
import { View, Text } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { Card } from './Card';
import { MT5Account } from '../../types/account';

interface AccountCardProps {
  account: MT5Account;
  isActive?: boolean;
  onPress?: () => void;
}

export function AccountCard({ account, isActive, onPress }: AccountCardProps) {
  return (
    <Card onPress={onPress} className={`mb-3 ${isActive ? 'border-green' : ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-9 h-9 bg-surface2 rounded-full items-center justify-center mr-3">
            <Wallet size={18} color="#00C896" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-interSemiBold">{account.name}</Text>
            <Text className="text-textSecondary text-xs mt-0.5">
              {account.broker} · {account.account_number} · {account.currency}
              {account.is_demo ? ' · Demo' : ''}
            </Text>
          </View>
        </View>
        {isActive && (
          <View className="bg-[#00C89620] px-2 py-1 rounded-md">
            <Text className="text-green text-xs font-interSemiBold">Active</Text>
          </View>
        )}
      </View>
      <View className="flex-row justify-between mt-3 pt-3 border-t border-border">
        <View>
          <Text className="text-textSecondary text-xs">Balance</Text>
          <Text className="text-white text-sm font-interMedium mt-0.5">${account.balance.toFixed(2)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs">Equity</Text>
          <Text className="text-white text-sm font-interMedium mt-0.5">${account.equity.toFixed(2)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs">EAs</Text>
          <Text className="text-white text-sm font-interMedium mt-0.5">{account.ea_registrations.length}</Text>
        </View>
      </View>
    </Card>
  );
}
