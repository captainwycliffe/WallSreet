export interface AnalyticsMetrics {
  win_rate: number; total_trades: number; winning_trades: number; losing_trades: number;
  average_win: number; average_loss: number; average_r: number;
  profit_factor: number; expectancy: number;
  total_pl: number; total_net_pl: number; max_drawdown: number;
}
export interface EquityPoint { date: string; equity: number; balance: number; }
export interface DailyPLPoint { date: string; pl: number; cumulative: number; }
export interface AnalyticsFilter {
  date_from?: string; date_to?: string; account_id?: string;
  symbol?: string; direction?: string; timeframe?: string;
}
