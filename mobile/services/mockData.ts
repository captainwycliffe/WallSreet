export const mockUser = {
  id: 'usr_123',
  email: 'demo@mt5app.com',
  username: 'demo_user',
  is_active: true
};

export const mockAccount = {
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
    status: 'ONLINE',
    last_heartbeat: new Date().toISOString(),
    connected_since: new Date(Date.now() - 86400000).toISOString(),
    is_active: true
  }]
};

export const mockPOIs = [
  {
    id: 'poi_1',
    account_id: 'acc_123',
    ea_id: 'ea_123',
    symbol: 'EURUSD',
    timeframe: 'M15',
    direction: 'BUY',
    poi_type: 'ORDER_BLOCK',
    entry_price: 1.08500,
    stop_loss: 1.08300,
    take_profit: 1.08900,
    zone_high: 1.08550,
    zone_low: 1.08450,
    risk_reward: 2.0,
    status: 'PENDING',
    created_at: new Date().toISOString()
  }
];

export const mockTrades = [
  {
    id: 'trd_1',
    poi_id: 'poi_2',
    account_id: 'acc_123',
    mt5_ticket: 1234567,
    symbol: 'GBPUSD',
    direction: 'SELL',
    volume: 1.0,
    entry_price: 1.26500,
    current_price: 1.26300,
    stop_loss: 1.26800,
    take_profit: 1.25500,
    profit: 200.00,
    commission: -5.00,
    swap: -1.00,
    net_profit: 194.00,
    risk_amount: 300,
    reward_amount: 1000,
    r_multiple: 0.64,
    status: 'OPEN',
    opened_at: new Date().toISOString()
  }
];
