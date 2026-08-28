import { Direction, POI } from './poi';

export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface Trade {
  id: string; poi_id?: string; account_id: string;
  mt5_ticket: number; symbol: string; direction: Direction;
  volume: number; entry_price: number; stop_loss: number;
  take_profit: number; current_price?: number; exit_price?: number;
  profit?: number; commission?: number; swap?: number; net_profit?: number;
  risk_amount?: number; reward_amount?: number;
  r_multiple?: number; pips?: number;
  status: TradeStatus; opened_at: string; closed_at?: string;
  poi?: POI; journal?: TradeJournal;
}

export interface TradeJournal {
  id: string; trade_id: string; user_id: string;
  notes?: string; tags?: string[]; rating?: number;
  lessons?: string; setup_quality?: number;
  created_at: string; updated_at: string;
}
