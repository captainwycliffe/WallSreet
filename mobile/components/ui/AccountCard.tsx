import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { Card } from './Card';
import { MT5Account } from '../../types/account';

const C = {
  white: '#FFFFFF',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  greenBg: '#00C89620',
  textSecondary: '#8888A8',
};

interface AccountCardProps {
  account: MT5Account;
  isActive?: boolean;
  onPress?: () => void;
}

export function AccountCard({ account, isActive, onPress }: AccountCardProps) {
  return (
    <Card
      onPress={onPress}
      style={[styles.card, isActive && styles.cardActive]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftRow}>
          <View style={styles.iconCircle}>
            <Wallet size={18} color={C.green} />
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{account.name}</Text>
            <Text style={styles.meta}>
              {account.broker} · {account.account_number} · {account.currency}
              {account.is_demo ? ' · Demo' : ''}
            </Text>
          </View>
        </View>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statLabel}>Balance</Text>
          <Text style={styles.statValue}>${account.balance.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Equity</Text>
          <Text style={styles.statValue}>${account.equity.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>EAs</Text>
          <Text style={styles.statValue}>{account.ea_registrations.length}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardActive: {
    borderColor: C.green,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    backgroundColor: C.surface2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    color: C.white,
    fontWeight: '600',
  },
  meta: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: C.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statLabel: {
    color: C.textSecondary,
    fontSize: 12,
  },
  statValue: {
    color: C.white,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
});
