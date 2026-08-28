export interface RiskDashboard {
  open_risk_pct: number; daily_risk_pct: number;
  daily_pl: number; daily_drawdown_pct: number;
  max_drawdown_pct: number; total_exposure_pct: number;
  risk_per_trade_pct: number;
  warnings: RiskWarning[];
  limits: RiskLimits;
}
export interface RiskWarning { type: string; message: string; severity: 'LOW'|'MEDIUM'|'HIGH'; }
export interface RiskLimits { daily_risk_limit_pct: number; max_drawdown_pct: number; risk_per_trade_pct: number; }
