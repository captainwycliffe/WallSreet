import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Card } from './Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

const C = {
  white: '#FFFFFF',
  green: '#00C896',
  red: '#FF4757',
  textSecondary: '#8888A8',
};

interface MetricCardProps {
  label: string;
  value: string | number;
  changePct?: number;
  prefix?: string;
  suffix?: string;
  color?: 'default' | 'green' | 'red';
  style?: StyleProp<ViewStyle>;
}

export function MetricCard({ label, value, changePct, prefix = '', suffix = '', color = 'default', style }: MetricCardProps) {
  const valueColor =
    color === 'green' ? C.green :
    color === 'red'   ? C.red   :
    C.white;

  const changeColor =
    changePct !== undefined && changePct > 0 ? C.green :
    changePct !== undefined && changePct < 0 ? C.red   :
    C.textSecondary;

  return (
    <Card style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {prefix}{value}{suffix}
      </Text>

      {changePct !== undefined && (
        <View style={styles.changeRow}>
          {changePct > 0 ? (
            <TrendingUp size={12} color={C.green} />
          ) : changePct < 0 ? (
            <TrendingDown size={12} color={C.red} />
          ) : (
            <Minus size={12} color={C.textSecondary} />
          )}
          <Text style={[styles.changeText, { color: changeColor }]}>
            {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 120,
  },
  label: {
    color: C.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});
