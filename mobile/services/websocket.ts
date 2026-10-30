import { WSEventType, WSMessage } from '../types/websocket';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 10;
  private handlers: Map<WSEventType, Set<Function>> = new Map();
  private isIntentionalDisconnect = false;
  private pingInterval: any = null;

  connect(userId: string, token: string): void {
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://192.168.0.102:8080/ws';
    this.isIntentionalDisconnect = false;
    
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(`${wsUrl}/${userId}?token=${token}`);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyHandlers('CONNECTED', { type: 'CONNECTED', data: {}, timestamp: new Date().toISOString() });
        
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      this.ws.onclose = () => {
        clearInterval(this.pingInterval);
        if (!this.isIntentionalDisconnect) {
          this.scheduleReconnect(userId, token);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WS Error:', err);
      };
    } catch (e) {
      console.error('WS Connection error:', e);
      this.scheduleReconnect(userId, token);
    }
  }

  disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    clearInterval(this.pingInterval);
  }

  on(event: WSEventType, handler: Function): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);
    
    return () => this.off(event, handler);
  }

  off(event: WSEventType, handler: Function): void {
    this.handlers.get(event)?.delete(handler);
  }

  private handleMessage(message: WSMessage): void {
    if (message.type === 'PING') {
      this.ws?.send(JSON.stringify({ type: 'PONG' }));
      return;
    }
    this.notifyHandlers(message.type, message);
  }

  private notifyHandlers(event: WSEventType, message: WSMessage): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try { handler(message); } catch (e) { console.error('Error in WS handler', e); }
      });
    }
  }

  private scheduleReconnect(userId: string, token: string): void {
    if (this.reconnectAttempts >= this.maxReconnects) {
      console.error('Max WS reconnects reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      if (!this.isIntentionalDisconnect) {
        this.connect(userId, token);
      }
    }, delay);
  }
}

export const wsService = new WebSocketService();
