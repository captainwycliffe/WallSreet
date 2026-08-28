import { Trade } from './trade';

export type POIStatus = 'DETECTED'|'PENDING'|'ACTIVE'|'TP_HIT'|'SL_HIT'|'CLOSED'|'EXPIRED'|'CANCELLED'|'INVALIDATED';
export type Direction = 'BUY' | 'SELL';

export interface POI {
  id: string; account_id: string; ea_id: string;
  symbol: string; timeframe: string; direction: Direction;
  poi_type: string; entry_price: number; stop_loss: number;
  take_profit: number; zone_high: number; zone_low: number;
  risk_reward: number; status: POIStatus;
  created_at: string; activated_at?: string; closed_at?: string; expires_at?: string;
  metadata?: Record<string, any>;
  trade?: Trade;
}
