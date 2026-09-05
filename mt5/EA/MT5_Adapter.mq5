//+------------------------------------------------------------------+
//|                                                   MT5_Adapter.mq5 |
//|                         MT5 Trade Monitor Integration Adapter     |
//|                                                                    |
//| Connects MetaTrader 5 to your Mobile Trading Command Center.      |
//| Sends heartbeats, balance, equity, and detects open/closed trades.|
//+------------------------------------------------------------------+
#property copyright "MT5 Trade Monitor"
#property link      "https://github.com/captainwycliffe/WallSreet"
#property version   "1.42"
#property strict

// ─── Input Parameters ──────────────────────────────────────────────────────────
input group "=== Backend Connection Settings ==="
input string   EA_API_KEY        = "mt5ea_demo_key_12345";       // Backend EA API Key
input string   BACKEND_URL       = "http://127.0.0.1:8080";       // Backend Server URL (127.0.0.1 for local PC)
input int      HEARTBEAT_SECONDS = 15;                           // Heartbeat Interval (secs)
input bool     ENABLE_REPORTING  = true;                         // Enable Event Reporting
input bool     DEBUG_MODE        = true;                         // Show Debug Logs in Experts Tab

//+------------------------------------------------------------------+
//| Core Adapter Implementation                                       |
//+------------------------------------------------------------------+
class CMT5Adapter
{
private:
   string   m_api_key;
   string   m_backend_url;
   int      m_heartbeat_secs;
   bool     m_debug;
   datetime m_last_heartbeat;
   datetime m_last_position_update;
   int      m_update_interval_secs;

   string BuildAuthHeader()
   {
      return "X-API-Key: " + m_api_key;
   }

   bool SendHTTPPost(const string endpoint, const string json_body, string &response)
   {
      string url     = m_backend_url + endpoint;
      string headers = "Content-Type: application/json\r\n" + BuildAuthHeader() + "\r\n";
      char   body[], result[];
      StringToCharArray(json_body, body, 0, StringLen(json_body));

      int res = WebRequest("POST", url, headers, 5000, body, result, response);
      if(res < 0)
      {
         int err = GetLastError();
         if(m_debug)
         {
            if(err == 4014)
               PrintFormat("[MT5Adapter] WebRequest NOT allowed! Add '%s' in MT5 Tools -> Options -> Expert Advisors", m_backend_url);
            else
               PrintFormat("[MT5Adapter] WebRequest failed. Error: %d for %s", err, url);
         }
         return false;
      }
      if(m_debug) PrintFormat("[MT5Adapter] POST %s -> %d", endpoint, res);
      if(res == 1001)
      {
         PrintFormat("[MT5Adapter] Error 1001 (No Connection to %s). Check if backend is running on port 8080 or use http://127.0.0.1:8080", m_backend_url);
         return false;
      }
      return (res >= 200 && res < 300);
   }

   string JsonEscape(const string s)
   {
      string out = s;
      StringReplace(out, "\\", "\\\\");
      StringReplace(out, "\"", "\\\"");
      StringReplace(out, "\n", "\\n");
      StringReplace(out, "\r", "\\r");
      return out;
   }

   string MakeIdemKey(const string prefix, const long id)
   {
      return prefix + "_" + IntegerToString(id) + "_" + IntegerToString(TimeCurrent());
   }

   void SendHeartbeatInternal()
   {
      double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
      double equity    = AccountInfoDouble(ACCOUNT_EQUITY);
      double margin    = AccountInfoDouble(ACCOUNT_MARGIN);
      double free_m    = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      double open_pl   = equity - balance;
      int    positions = PositionsTotal();

      string json = StringFormat(
         "{\"timestamp\":\"%s\",\"version\":\"1.4.2\",\"account_balance\":%.2f,\"account_equity\":%.2f,\"margin\":%.2f,\"free_margin\":%.2f,\"open_pl\":%.2f,\"open_positions\":%d}",
         TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES|TIME_SECONDS),
         balance, equity, margin, free_m, open_pl, positions
      );

      string response;
      if(!SendHTTPPost("/api/mt5/heartbeat", json, response))
      {
         if(m_debug) Print("[MT5Adapter] Heartbeat failed. Ensure server is running & URL is in WebRequest whitelist.");
      }
      else
      {
         if(m_debug) Print("[MT5Adapter] Heartbeat OK (ONLINE)");
      }
   }

   void CheckPositionUpdates()
   {
      datetime now = TimeCurrent();
      if(now - m_last_position_update < m_update_interval_secs) return;
      m_last_position_update = now;

      int total = PositionsTotal();
      for(int i = 0; i < total; i++)
      {
         ulong ticket = PositionGetTicket(i);
         if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;

         double current = PositionGetDouble(POSITION_PRICE_CURRENT);
         double profit  = PositionGetDouble(POSITION_PROFIT);
         double sl      = PositionGetDouble(POSITION_SL);
         double tp      = PositionGetDouble(POSITION_TP);

         string json = StringFormat(
            "{\"ticket\":%llu,\"current_price\":%.5f,\"profit\":%.2f,\"unrealized_profit\":%.2f,\"stop_loss\":%.5f,\"take_profit\":%.5f,\"timestamp\":\"%s\"}",
            ticket, current, profit, profit, sl, tp,
            TimeToString(now, TIME_DATE|TIME_MINUTES|TIME_SECONDS)
         );

         string response;
         SendHTTPPost("/api/mt5/position/update?ticket=" + IntegerToString(ticket), json, response);
         Sleep(100);
      }
   }

   void SyncExistingPositions()
   {
      int total = PositionsTotal();
      if(m_debug && total > 0) PrintFormat("[MT5Adapter] Syncing %d open positions with real prices...", total);
      for(int i = 0; i < total; i++)
      {
         ulong ticket = PositionGetTicket(i);
         if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;

         string dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         ReportPositionOpen(
            (long)ticket, "",
            PositionGetString(POSITION_SYMBOL),
            dir,
            PositionGetDouble(POSITION_VOLUME),
            PositionGetDouble(POSITION_PRICE_OPEN),
            PositionGetDouble(POSITION_SL),
            PositionGetDouble(POSITION_TP)
         );
         Sleep(150);
      }
   }

public:
   CMT5Adapter(const string api_key, const string backend_url, const int heartbeat_secs=15, const bool debug=true)
   {
      m_api_key              = api_key;
      m_backend_url          = backend_url;
      m_heartbeat_secs       = heartbeat_secs;
      m_debug                = debug;
      m_last_heartbeat       = 0;
      m_last_position_update = 0;
      m_update_interval_secs = 3;
   }

   bool Initialize()
   {
      Print("[MT5Adapter] Initializing Connection...");
      SendHeartbeatInternal();
      m_last_heartbeat = TimeCurrent();
      SyncExistingPositions();
      Print("[MT5Adapter] Adapter connected to: " + m_backend_url);
      return true;
   }

   void OnTick()
   {
      datetime now = TimeCurrent();
      if(now - m_last_heartbeat >= m_heartbeat_secs)
      {
         SendHeartbeatInternal();
         m_last_heartbeat = now;
      }
      CheckPositionUpdates();
   }

   void OnDeinit()
   {
      Print("[MT5Adapter] Deinitialized.");
   }

   string ReportPOI(
      const string symbol,
      const string timeframe,
      const string direction,
      const double entry_price,
      const double stop_loss,
      const double take_profit,
      const string poi_type  = "ORDER_BLOCK",
      const double zone_high = 0,
      const double zone_low  = 0
   )
   {
      double risk   = MathAbs(entry_price - stop_loss);
      double reward = MathAbs(entry_price - take_profit);
      double rr     = (risk > 0) ? reward / risk : 0;
      double zh     = (zone_high > 0) ? zone_high : entry_price + risk;
      double zl     = (zone_low  > 0) ? zone_low  : entry_price - risk;

      string idem_key = MakeIdemKey("poi", TimeCurrent());

      string json = StringFormat(
         "{"
         "\"idempotency_key\":\"%s\","
         "\"symbol\":\"%s\","
         "\"timeframe\":\"%s\","
         "\"direction\":\"%s\","
         "\"poi_type\":\"%s\","
         "\"entry_price\":%.5f,"
         "\"stop_loss\":%.5f,"
         "\"take_profit\":%.5f,"
         "\"zone_high\":%.5f,"
         "\"zone_low\":%.5f,"
         "\"risk_reward\":%.2f,"
         "\"metadata\":{\"ea\":\"MT5_Adapter\",\"mt5_time\":\"%s\"}"
         "}",
         idem_key,
         JsonEscape(symbol),
         JsonEscape(timeframe),
         JsonEscape(direction),
         JsonEscape(poi_type),
         entry_price, stop_loss, take_profit, zh, zl, rr,
         TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES|TIME_SECONDS)
      );

      string response;
      if(SendHTTPPost("/api/mt5/poi", json, response))
      {
         int id_pos = StringFind(response, "\"id\":\"");
         if(id_pos >= 0)
         {
            int start = id_pos + 6;
            int end   = StringFind(response, "\"", start);
            if(end > start)
            {
               string poi_id = StringSubstr(response, start, end - start);
               if(m_debug) PrintFormat("[MT5Adapter] POI Reported: %s %s @ %.5f (ID: %s)", symbol, direction, entry_price, poi_id);
               return poi_id;
            }
         }
      }
      return "";
   }

   bool ReportPositionOpen(
      const long   ticket,
      const string poi_id,
      const string symbol,
      const string direction,
      const double volume,
      const double entry_price,
      const double stop_loss,
      const double take_profit
   )
   {
      string json = StringFormat(
         "{"
         "\"idempotency_key\":\"pos_open_%lld\","
         "\"poi_id\":\"%s\","
         "\"mt5_ticket\":%lld,"
         "\"symbol\":\"%s\","
         "\"direction\":\"%s\","
         "\"volume\":%.2f,"
         "\"entry_price\":%.5f,"
         "\"stop_loss\":%.5f,"
         "\"take_profit\":%.5f,"
         "\"opened_at\":\"%s\""
         "}",
         ticket,
         JsonEscape(poi_id),
         ticket,
         JsonEscape(symbol),
         JsonEscape(direction),
         volume,
         entry_price, stop_loss, take_profit,
         TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES|TIME_SECONDS)
      );

      string response;
      if(SendHTTPPost("/api/mt5/position/open", json, response))
      {
         if(m_debug) PrintFormat("[MT5Adapter] Position Open Reported: %s %s Ticket:%lld", symbol, direction, ticket);
         return true;
      }
      return false;
   }

   bool ReportPositionClose(
      const long   ticket,
      const double exit_price,
      const double profit,
      const double commission  = 0,
      const double swap        = 0,
      const string close_reason = ""
   )
   {
      string json = StringFormat(
         "{"
         "\"idempotency_key\":\"pos_close_%lld\","
         "\"ticket\":%lld,"
         "\"exit_price\":%.5f,"
         "\"profit\":%.2f,"
         "\"commission\":%.2f,"
         "\"swap\":%.2f,"
         "\"closed_at\":\"%s\","
         "\"close_reason\":\"%s\""
         "}",
         ticket, ticket,
         exit_price, profit, commission, swap,
         TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES|TIME_SECONDS),
         JsonEscape(close_reason)
      );

      string response;
      if(SendHTTPPost("/api/mt5/position/close?ticket=" + IntegerToString(ticket), json, response))
      {
         if(m_debug) PrintFormat("[MT5Adapter] Position Close Reported: Ticket:%lld P/L:%.2f", ticket, profit);
         return true;
      }
      return false;
   }

   void OnTradeTransaction(
      const MqlTradeTransaction &trans,
      const MqlTradeRequest     &request,
      const MqlTradeResult      &result
   )
   {
      if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
      {
         if(trans.deal_type == DEAL_TYPE_BUY || trans.deal_type == DEAL_TYPE_SELL)
         {
            long ticket = (long)trans.position;
            if(ticket > 0 && PositionSelectByTicket(ticket))
            {
               string dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
               ReportPositionOpen(
                  ticket, "",
                  PositionGetString(POSITION_SYMBOL),
                  dir,
                  PositionGetDouble(POSITION_VOLUME),
                  PositionGetDouble(POSITION_PRICE_OPEN),
                  PositionGetDouble(POSITION_SL),
                  PositionGetDouble(POSITION_TP)
               );
            }
         }

         if(HistorySelect(TimeCurrent() - 60, TimeCurrent()))
         {
            ENUM_DEAL_ENTRY entry_type = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
            if(entry_type == DEAL_ENTRY_OUT || entry_type == DEAL_ENTRY_INOUT)
            {
               long ticket = (long)trans.position;
               double profit     = HistoryDealGetDouble(trans.deal, DEAL_PROFIT);
               double commission = HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);
               double swap       = HistoryDealGetDouble(trans.deal, DEAL_SWAP);
               double exit_price = HistoryDealGetDouble(trans.deal, DEAL_PRICE);

               string reason = "MANUAL";
               if(MathAbs(exit_price - HistoryDealGetDouble(trans.deal, DEAL_SL)) < 0.0001) reason = "SL_HIT";
               if(MathAbs(exit_price - HistoryDealGetDouble(trans.deal, DEAL_TP)) < 0.0001) reason = "TP_HIT";

               ReportPositionClose(ticket, exit_price, profit, commission, swap, reason);
            }
         }
      }
   }
};

// ─── Global Adapter Instance ───────────────────────────────────────────────────
CMT5Adapter *g_adapter = NULL;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   if(!ENABLE_REPORTING)
   {
      Print("[MT5Adapter] Reporting disabled.");
      return(INIT_SUCCEEDED);
   }

   g_adapter = new CMT5Adapter(EA_API_KEY, BACKEND_URL, HEARTBEAT_SECONDS, DEBUG_MODE);
   g_adapter.Initialize();
   EventSetTimer(2);

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   if(g_adapter != NULL)
   {
      g_adapter.OnDeinit();
      delete g_adapter;
      g_adapter = NULL;
   }
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   if(g_adapter != NULL && ENABLE_REPORTING)
   {
      g_adapter.OnTick();
   }
}

//+------------------------------------------------------------------+
//| Expert timer function                                             |
//+------------------------------------------------------------------+
void OnTimer()
{
   if(g_adapter != NULL && ENABLE_REPORTING)
   {
      g_adapter.OnTick();
   }
}

//+------------------------------------------------------------------+
//| Trade event handler                                               |
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction &trans,
   const MqlTradeRequest     &request,
   const MqlTradeResult      &result)
{
   if(g_adapter != NULL && ENABLE_REPORTING)
   {
      g_adapter.OnTradeTransaction(trans, request, result);
   }
}
