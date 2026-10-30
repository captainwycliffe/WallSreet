import { MT5Account } from '../types/account';

export const mockUser = {
  id: 'usr_123',
  email: 'demo@mt5app.com',
  username: 'demo_user',
  is_active: true
};

export const mockAccount: MT5Account = {
  id: 'acc_123',
  user_id: 'usr_123',
  name: 'Demo Main',
  broker: 'MetaQuotes-Demo',
  account_number: '100200300',
  currency: 'USD',
  balance: 10000.00,
  equity: 10250.50,
  margin: 500.00,
  free_margin: 9750.50,
  open_pl: 250.50,
  daily_pl: 150.00,
  drawdown_pct: 1.2,
  is_active: true,
  is_demo: true,
  created_at: new Date().toISOString(),
  ea_registrations: [{
    id: 'ea_123',
    account_id: 'acc_123',
    name: 'MT5 Monitor Pro',
    version: '1.0.0',
    status: 'ONLINE' as const,
    last_heartbeat: new Date().toISOString(),
    connected_since: new Date(Date.now() - 86400000).toISOString(),
    is_active: true
  }]
};

export const mockPOIs: any[] = [];

export const mockTrades: any[] = [];

