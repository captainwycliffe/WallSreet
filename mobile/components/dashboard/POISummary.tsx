import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MetricCard } from '../ui/MetricCard';

interface POISummaryProps {
  pending: number;
  active: number;
  tpHits: number;
  slHits: number;
}

export function POISummary({ pending, active, tpHits, slHits }: POISummaryProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.cell}>
        <MetricCard
          label="Pending POIs"
          value={pending}
          color="default"
        />
      </View>
      <View style={styles.cell}>
        <MetricCard
          label="Active Trades"
          value={active}
          color="default"
        />
      </View>
      <View style={styles.cell}>
        <MetricCard
          label="TP Hits (Today)"
          value={tpHits}
          color="green"
        />
      </View>
      <View style={styles.cell}>
        <MetricCard
          label="SL Hits (Today)"
          value={slHits}
          color="red"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  cell: {
    minWidth: '45%',
    flex: 1,
  },
});
