//+------------------------------------------------------------------+
//|                                                MT5_Adapter.mqh   |
//|                    MT5 Trade Monitor — Core Adapter Library      |
//+------------------------------------------------------------------+
#ifndef MT5_ADAPTER_MQH
#define MT5_ADAPTER_MQH

//+------------------------------------------------------------------+
//| CMT5Adapter — Main adapter class                                  |
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

   // Track reported positions to detect opens/closes
   struct TrackPosition {
      long     ticket;
      string   poi_id;
      bool     reported_open;
      double   last_price;
   };
   TrackPosition m_positions[100];
   int m_position_count;

   //--- HTTP helpers --------------------------------------------------------
   string BuildAuthHeader() {
      return "X-API-Key: " + m_api_key;
   }

   bool SendHTTPPost(const string endpoint, const string json_body, string &response) {
      string url    = m_backend_url + endpoint;
      string headers = "Content-Type: application/json\r\n" + BuildAuthHeader() + "\r\n";
      char   body[], result[];
      StringToCharArray(json_body, body, 0, StringLen(json_body));

      int res = WebRequest("POST", url, headers, 5000, body, result, response);
      if(res < 0) {
         if(m_debug) PrintFormat("[MT5Adapter] HTTP error: %d for %s", GetLastError(), url);
         return false;
      }
      if(m_debug) PrintFormat("[MT5Adapter] POST %s → %d", endpoint, res);
      return (res >= 200 && res < 300);
   }

   bool SendHTTPGet(const string endpoint, string &response) {
      string url     = m_backend_url + endpoint;
      string headers = BuildAuthHeader() + "\r\n";
      char   body[], result[];
      int res = WebRequest("GET", url, headers, 5000, body, result, response);
      return (res >= 200 && res < 300);
   }

   // Minimal JSON escape for string values
   string JsonEscape(const string s) {
      string out = s;
      StringReplace(out, "\\", "\\\\");
      StringReplace(out, "\"", "\\\"");
      StringReplace(out, "\n", "\\n");
      StringReplace(out, "\r", "\\r");
      return out;
   }

   // Unique idempotency key
   string MakeIdemKey(const string prefix, const long id) {
      return prefix + "_" + IntegerToString(id) + "_" + IntegerToString(TimeCurrent());
   }

   //--- Internal report functions ------------------------------------------
   void SendHeartbeatInternal() {
      double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
      double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
      int    positions = PositionsTotal();

      string json = StringFormat(
         "{\"timestamp\":\"%s\",\"version\":\"1.0\",\"account_balance\":%.2f,\"account_equity\":%.2f,\"open_positions\":%d}",
         TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES|TIME_SECONDS),
         balance, equity, positions
      );

      string response;
      if(!SendHTTPPost("/api/mt5/heartbeat", json, response)) {
         if(m_debug) Print("[MT5Adapter] Heartbeat failed");
      } else {
         if(m_debug) Print("[MT5Adapter] ♥ Heartbeat OK");
      }
   }

   void CheckPositionUpdates() {
      datetime now = TimeCurrent();
      if(now - m_last_position_update < m_update_interval_secs) return;
      m_last_position_update = now;

      // Check all open positions
      for(int i = 0; i < PositionsTotal(); i++) {
         ulong ticket = PositionGetTicket(i);
         if(ticket == 0) continue;

         double current = PositionGetDouble(POSITION_PRICE_CURRENT);
         double profit  = PositionGetDouble(POSITION_PROFIT);

         string json = StringFormat(
            "{\"ticket\":%llu,\"current_price\":%.5f,\"unrealized_profit\":%.2f,\"timestamp\":\"%s\"}",
            ticket, current, profit,
            TimeToString(now, TIME_DATE|TIME_MINUTES|TIME_SECONDS)
         );

         string response;
         SendHTTPPost("/api/mt5/position/update", json, response);
      }
   }

public:
   //+------------------------------------------------------------------+
   //| Constructor                                                       |
   //+------------------------------------------------------------------+
   CMT5Adapter(
      const string api_key,
      const string backend_url,
      const int    heartbeat_secs      = 30,
      const bool   debug               = false
   ) {
      m_api_key              = api_key;
      m_backend_url          = backend_url;
      m_heartbeat_secs       = heartbeat_secs;
      m_debug                = debug;
      m_last_heartbeat       = 0;
      m_last_position_update = 0;
      m_update_interval_secs = 5;
      m_position_count       = 0;
   }

   //+------------------------------------------------------------------+
   //| Initialize — call from EA's OnInit()                             |
   //+------------------------------------------------------------------+
   bool Initialize() {
      Print("[MT5Adapter] Initializing...");
      string response;
      // Send initial heartbeat to signal EA is online
      SendHeartbeatInternal();
      m_last_heartbeat = TimeCurrent();
      Print("[MT5Adapter] ✓ Connected to backend: " + m_backend_url);
      return true;
   }

   //+------------------------------------------------------------------+
   //| OnTick — call from EA's OnTick()                                 |
   //+------------------------------------------------------------------+
   void OnTick() {
      datetime now = TimeCurrent();

      // Heartbeat
      if(now - m_last_heartbeat >= m_heartbeat_secs) {
         SendHeartbeatInternal();
         m_last_heartbeat = now;
      }

      // Position updates
      CheckPositionUpdates();
   }

   //+------------------------------------------------------------------+
   //| OnDeinit — call from EA's OnDeinit()                             |
   //+------------------------------------------------------------------+
   void OnDeinit() {
      Print("[MT5Adapter] Deinitializing...");
      // Last heartbeat will timeout → backend detects EA_OFFLINE
   }

   //+------------------------------------------------------------------+
   //| Report a POI to the backend                                      |
   //| Call this when your EA identifies a new Point of Interest        |
   //| Returns the backend POI ID (store this to link to positions)     |
   //+------------------------------------------------------------------+
   string ReportPOI(
      const string symbol,
      const string timeframe,
      const string direction,    // "BUY" or "SELL"
      const double entry_price,
      const double stop_loss,
      const double take_profit,
      const string poi_type      = "ORDER_BLOCK",
      const double zone_high     = 0,
      const double zone_low      = 0
   ) {
      double risk   = MathAbs(entry_price - stop_loss);
      double reward = MathAbs(entry_price - take_profit);
      double rr     = (risk > 0) ? reward / risk : 0;

      double zh = (zone_high > 0) ? zone_high : entry_price + risk;
      double zl = (zone_low  > 0) ? zone_low  : entry_price - risk;

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
      if(SendHTTPPost("/api/mt5/poi", json, response)) {
         // Extract ID from response JSON (simple parse)
         int id_pos = StringFind(response, "\"id\":\"");
         if(id_pos >= 0) {
            int start = id_pos + 6;
            int end   = StringFind(response, "\"", start);
            if(end > start) {
               string poi_id = StringSubstr(response, start, end - start);
               if(m_debug) PrintFormat("[MT5Adapter] 📍 POI reported: %s %s @ %.5f (ID: %s)", symbol, direction, entry_price, poi_id);
               return poi_id;
            }
         }
      }
      return "";
   }

   //+------------------------------------------------------------------+
   //| Report position open                                             |
   //| Call this when your EA opens a trade                             |
   //+------------------------------------------------------------------+
   bool ReportPositionOpen(
      const long   ticket,
      const string poi_id,        // From ReportPOI(), or "" if not linked
      const string symbol,
      const string direction,
      const double volume,
      const double entry_price,
      const double stop_loss,
      const double take_profit
   ) {
      string json = StringFormat(
         "{"
         "\"idempotency_key\":\"pos_open_%lld\","
         "\"poi_id\":\"%s\","
         "\"ticket\":%lld,"
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
      if(SendHTTPPost("/api/mt5/position/open", json, response)) {
         if(m_debug) PrintFormat("[MT5Adapter] 📈 Position reported: %s %s Ticket:%lld", symbol, direction, ticket);
         return true;
      }
      return false;
   }

   //+------------------------------------------------------------------+
   //| Report position close                                            |
   //| Call this when your EA detects a position was closed             |
   //+------------------------------------------------------------------+
   bool ReportPositionClose(
      const long   ticket,
      const double exit_price,
      const double profit,
      const double commission  = 0,
      const double swap        = 0,
      const string close_reason = ""  // "TP_HIT", "SL_HIT", "MANUAL", "EA"
   ) {
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
      if(SendHTTPPost("/api/mt5/position/close", json, response)) {
         if(m_debug) PrintFormat("[MT5Adapter] 📉 Position close reported: Ticket:%lld P/L:%.2f", ticket, profit);
         return true;
      }
      return false;
   }

   //+------------------------------------------------------------------+
   //| Auto-detect trade events from OnTradeTransaction                 |
   //| Optional: call from EA's OnTradeTransaction() for auto-reporting |
   //+------------------------------------------------------------------+
   void OnTradeTransaction(
      const MqlTradeTransaction &trans,
      const MqlTradeRequest     &request,
      const MqlTradeResult      &result
   ) {
      // Position opened
      if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
         if(trans.deal_type == DEAL_TYPE_BUY || trans.deal_type == DEAL_TYPE_SELL) {
            long ticket = (long)trans.position;
            if(ticket > 0 && PositionSelectByTicket(ticket)) {
               string dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
               // Auto-report (without POI ID since we don't know it here)
               // For POI-linked reporting, call ReportPositionOpen() manually after ReportPOI()
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

         // Position closed (exit deal)
         if(trans.deal_entry == DEAL_ENTRY_OUT || trans.deal_entry == DEAL_ENTRY_INOUT) {
            long ticket = (long)trans.position;
            double profit     = HistoryDealGetDouble(trans.deal, DEAL_PROFIT);
            double commission = HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);
            double swap       = HistoryDealGetDouble(trans.deal, DEAL_SWAP);
            double exit_price = HistoryDealGetDouble(trans.deal, DEAL_PRICE);

            // Determine close reason
            string reason = "MANUAL";
            if(MathAbs(exit_price - HistoryDealGetDouble(trans.deal, DEAL_SL)) < 0.0001) reason = "SL_HIT";
            if(MathAbs(exit_price - HistoryDealGetDouble(trans.deal, DEAL_TP)) < 0.0001) reason = "TP_HIT";

            ReportPositionClose(ticket, exit_price, profit, commission, swap, reason);
         }
      }
   }
};

#endif // MT5_ADAPTER_MQH
