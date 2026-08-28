export interface MT5Account {
  id: string; user_id: string; name: string; broker: string;
  account_number: string; currency: string;
  balance: number; equity: number; margin: number; free_margin: number;
  open_pl: number; daily_pl: number; drawdown_pct: number;
  is_active: boolean; is_demo: boolean;
  ea_registrations: EARegistration[];
  created_at: string;
}
export interface EARegistration {
  id: string; account_id: string; name: string; version: string;
  status: 'ONLINE' | 'OFFLINE'; last_heartbeat: string;
  connected_since: string; is_active: boolean;
}
