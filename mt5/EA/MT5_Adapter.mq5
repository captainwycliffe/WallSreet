//+------------------------------------------------------------------+
//|                                                   MT5_Adapter.mq5 |
//|                         MT5 Trade Monitor Integration Adapter     |
//|                                                                    |
//| PURPOSE: This adapter adds communication/reporting capabilities   |
//| to your existing EA WITHOUT modifying any trading logic.          |
//|                                                                    |
//| HOW TO USE:                                                        |
//| 1. Copy MT5_Adapter.mq5 and MT5_Adapter.mqh to your EA folder    |
//| 2. Include MT5_Adapter.mqh in your existing EA:                   |
//|    #include "MT5_Adapter.mqh"                                     |
//| 3. Create adapter instance in your OnInit():                       |
//|    g_adapter = new CMT5Adapter(EA_API_KEY, BACKEND_URL);         |
//| 4. Call g_adapter.OnInit(), OnTick(), OnDeinit() from your EA    |
//| 5. When you detect a POI, call:                                   |
//|    g_adapter.ReportPOI(symbol, tf, direction, entry, sl, tp)     |
//| 6. When position opens, call:                                     |
//|    g_adapter.ReportPositionOpen(ticket, poi_id, symbol, ...)     |
//+------------------------------------------------------------------+

#property copyright "MT5 Trade Monitor"
#property version   "1.0"
#property strict

#include "MT5_Adapter.mqh"

// ─── Input Parameters ──────────────────────────────────────────────────────────
input string   EA_API_KEY        = "mt5ea_your_api_key_here";  // Backend API Key
input string   BACKEND_URL       = "https://your-backend.com"; // Backend URL
input int      HEARTBEAT_SECONDS = 30;                          // Heartbeat interval
input bool     ENABLE_REPORTING  = true;                        // Enable reporting
input bool     DEBUG_MODE        = false;                       // Debug output

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

   if(!g_adapter.Initialize())
   {
      Print("[MT5Adapter] WARNING: Could not connect to backend. Trading continues normally.");
      // Do NOT return INIT_FAILED — trading must continue regardless
   }

   //---
   // YOUR EXISTING OnInit() CODE GOES HERE
   //---

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(g_adapter != NULL)
   {
      g_adapter.OnDeinit();
      delete g_adapter;
      g_adapter = NULL;
   }

   //---
   // YOUR EXISTING OnDeinit() CODE GOES HERE
   //---
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   if(g_adapter != NULL && ENABLE_REPORTING)
   {
      g_adapter.OnTick();   // Handles heartbeat + position updates
   }

   //---
   // YOUR EXISTING OnTick() CODE GOES HERE
   //---
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

   //---
   // YOUR EXISTING OnTradeTransaction() CODE GOES HERE
   //---
}
