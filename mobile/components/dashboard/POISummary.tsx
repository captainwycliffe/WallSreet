import React from 'react';
import { View } from 'react-native';
import { MetricCard } from '../ui/MetricCard';

interface POISummaryProps {
  pending: number;
  active: number;
  tpHits: number;
  slHits: number;
}

export function POISummary({ pending, active, tpHits, slHits }: POISummaryProps) {
  return (
    <View className="flex-row flex-wrap gap-3 mb-6">
      <MetricCard 
        className="min-w-[45%]"
        label="Pending POIs" 
        value={pending} 
        color="default"
      />
      <MetricCard 
        className="min-w-[45%]"
        label="Active Trades" 
        value={active} 
        color="default"
      />
      <MetricCard 
        className="min-w-[45%]"
        label="TP Hits (Today)" 
        value={tpHits} 
        color="green"
      />
      <MetricCard 
        className="min-w-[45%]"
        label="SL Hits (Today)" 
        value={slHits} 
        color="red"
      />
    </View>
  );
}
