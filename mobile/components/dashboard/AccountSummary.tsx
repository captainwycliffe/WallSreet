import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { MetricCard } from '../ui/MetricCard';
import { MT5Account } from '../../types/account';

interface AccountSummaryProps {
  account: MT5Account;
}

export function AccountSummary({ account }: AccountSummaryProps) {
  const balance = account?.balance ?? 0;
  const equity = account?.equity ?? 0;
  const openPl = account?.open_pl ?? 0;
  const dailyPl = account?.daily_pl ?? 0;
  const drawdown = account?.drawdown_pct ?? 0;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.row}>
        <MetricCard
          label="Balance"
          value={balance.toFixed(2)}
          prefix="$"
        />
        <MetricCard
          label="Equity"
          value={equity.toFixed(2)}
          prefix="$"
        />
        <MetricCard
          label="Open P/L"
          value={openPl.toFixed(2)}
          prefix="$"
          color={openPl >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Today P/L"
          value={dailyPl.toFixed(2)}
          prefix="$"
          color={dailyPl >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Drawdown"
          value={drawdown.toFixed(2)}
          suffix="%"
          color="red"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    paddingRight: 16,
    gap: 12,
  },
});
