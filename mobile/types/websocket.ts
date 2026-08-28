export type WSEventType =
  | 'POI_CREATED' | 'POI_UPDATED' | 'POI_EXPIRED'
  | 'POSITION_OPENED' | 'POSITION_UPDATED' | 'POSITION_CLOSED'
  | 'SL_HIT' | 'TP_HIT'
  | 'EA_ONLINE' | 'EA_OFFLINE'
  | 'ACCOUNT_UPDATED' | 'RISK_WARNING'
  | 'CONNECTED' | 'PING' | 'PONG';

export interface WSMessage {
  type: WSEventType; data: any; timestamp: string; account_id?: string;
}
