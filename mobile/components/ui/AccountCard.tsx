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
  const balanceStr = (account?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const equityStr = (account?.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eaCount = account?.ea_registrations?.length ?? 0;

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
            <Text style={styles.name} numberOfLines={1}>{account?.name || 'Account'}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {account?.broker || 'MT5'} · {account?.account_number || '—'} · {account?.currency || 'USD'}
              {account?.is_demo ? ' · Demo' : ''}
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
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Balance</Text>
          <Text style={styles.statValue} numberOfLines={1}>${balanceStr}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Equity</Text>
          <Text style={styles.statValue} numberOfLines={1}>${equityStr}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>EAs</Text>
          <Text style={styles.statValue}>{eaCount}</Text>
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
    marginLeft: 8,
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
  statCol: {
    flex: 1,
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
