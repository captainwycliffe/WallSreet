import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { MetricCard } from '../ui/MetricCard';
import { MT5Account } from '../../types/account';

interface AccountSummaryProps {
  account: MT5Account;
}

export function AccountSummary({ account }: AccountSummaryProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.row}>
        <MetricCard
          label="Balance"
          value={account.balance.toFixed(2)}
          prefix="$"
        />
        <MetricCard
          label="Equity"
          value={account.equity.toFixed(2)}
          prefix="$"
        />
        <MetricCard
          label="Open P/L"
          value={account.open_pl.toFixed(2)}
          prefix="$"
          color={account.open_pl >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Today P/L"
          value={account.daily_pl.toFixed(2)}
          prefix="$"
          color={account.daily_pl >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Drawdown"
          value={account.drawdown_pct.toFixed(2)}
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
