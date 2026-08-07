//+------------------------------------------------------------------+
//|                                       TradingAnalyticsEA.mq5      |
//|  يقرأ بيانات الحساب والصفقات ويرسلها إلى REST API الخاص بالمنصة   |
//|  Copyright: Trading Analytics Platform                            |
//+------------------------------------------------------------------+
#property copyright "Trading Analytics Platform"
#property version   "1.00"

//--- إعدادات المستخدم
input string InpApiBaseUrl      = "https://api.yourdomain.com/api/v1"; // رابط الـ API الأساسي
input string InpApiKey          = "";                                   // مفتاح الـ API الخاص بحسابك
input int    InpSyncIntervalSec = 60;    // كل كم ثانية يتم إرسال لقطة كاملة للحساب والصفقات
input int    InpHttpTimeoutMs   = 5000;  // مهلة الاتصال بالمللي ثانية
input bool   InpEnableLogging   = true;  // تفعيل تسجيل السجلات في ملف
input int    InpHistoryDays     = 90;    // عدد أيام السجل التاريخي المرسلة في كل مزامنة كاملة

//--- متغيرات داخلية
string g_logFileName = "TradingAnalyticsEA_log.txt";
int    g_failedAttempts = 0;

//+------------------------------------------------------------------+
//| دالة تسجيل السجلات (Logs)                                         |
//+------------------------------------------------------------------+
void LogMessage(string msg)
{
   if(!InpEnableLogging) return;
   int handle = FileOpen(g_logFileName, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(handle != INVALID_HANDLE)
   {
      FileSeek(handle, 0, SEEK_END);
      FileWrite(handle, TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + " | " + msg);
      FileClose(handle);
   }
   Print("[TradingAnalyticsEA] ", msg);
}

//+------------------------------------------------------------------+
//| تهريب النصوص لتكون صالحة داخل JSON                                |
//+------------------------------------------------------------------+
string JsonEscape(string s)
{
   string r = s;
   StringReplace(r, "\\", "\\\\");
   StringReplace(r, "\"", "\\\"");
   StringReplace(r, "\n", "\\n");
   StringReplace(r, "\r", "");
   return r;
}

//+------------------------------------------------------------------+
//| تحويل نوع الصفقة في MT5 إلى نوع نصي موحّد                          |
//+------------------------------------------------------------------+
string PositionTypeToString(ENUM_POSITION_TYPE type)
{
   return (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
}

string DealEntryTypeToOrderType(long dealType)
{
   switch((int)dealType)
   {
      case DEAL_TYPE_BUY:  return "BUY";
      case DEAL_TYPE_SELL: return "SELL";
      default:             return "BUY";
   }
}

string TimeToIso(datetime t)
{
   if(t <= 0) return "";
   return TimeToString(t, TIME_DATE) + "T" + TimeToString(t, TIME_SECONDS) + "Z";
}

//+------------------------------------------------------------------+
//| إرسال طلب HTTP POST                                               |
//+------------------------------------------------------------------+
bool SendHttpPost(string endpoint, string jsonBody, string &responseOut)
{
   string url = InpApiBaseUrl + endpoint;
   string headers = "Content-Type: application/json\r\nX-API-Key: " + InpApiKey + "\r\n";

   char postData[];
   int len = StringToCharArray(jsonBody, postData, 0, WHOLE_ARRAY, CP_UTF8) - 1;
   ArrayResize(postData, len);

   char result[];
   string resultHeaders;

   ResetLastError();
   int status = WebRequest("POST", url, headers, InpHttpTimeoutMs, postData, result, resultHeaders);

   if(status == -1)
   {
      int err = GetLastError();
      LogMessage(StringFormat("فشل الاتصال بـ %s | خطأ: %d (تأكد من إضافة الرابط في Tools->Options->Expert Advisors->Allow WebRequest)", endpoint, err));
      g_failedAttempts++;
      return false;
   }

   responseOut = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);

   if(status >= 200 && status < 300)
   {
      g_failedAttempts = 0;
      return true;
   }

   LogMessage(StringFormat("رد غير ناجح من %s | الحالة: %d | الرد: %s", endpoint, status, responseOut));
   g_failedAttempts++;
   return false;
}

//+------------------------------------------------------------------+
//| بناء JSON للقطة الحساب الحالية                                    |
//+------------------------------------------------------------------+
string BuildAccountInfoJson()
{
   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin      = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin   = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double marginLevel  = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);

   string json = "{";
   json += "\"accountNumber\":\"" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
   json += "\"broker\":\"" + JsonEscape(AccountInfoString(ACCOUNT_COMPANY)) + "\",";
   json += "\"server\":\"" + JsonEscape(AccountInfoString(ACCOUNT_SERVER)) + "\",";
   json += "\"platform\":\"MT5\",";
   json += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\",";
   json += "\"leverage\":" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LEVERAGE)) + ",";
   json += "\"balance\":" + DoubleToString(balance, 2) + ",";
   json += "\"equity\":" + DoubleToString(equity, 2) + ",";
   json += "\"margin\":" + DoubleToString(margin, 2) + ",";
   json += "\"freeMargin\":" + DoubleToString(freeMargin, 2) + ",";
   json += "\"marginLevel\":" + DoubleToString(marginLevel, 2);
   json += "}";
   return json;
}

//+------------------------------------------------------------------+
//| بناء JSON لكل الصفقات المفتوحة حالياً (Positions)                  |
//+------------------------------------------------------------------+
string BuildOpenPositionsJson()
{
   string json = "[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;

      if(i > 0) json += ",";
      json += "{";
      json += "\"ticket\":\"" + IntegerToString((long)ticket) + "\",";
      json += "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\",";
      json += "\"type\":\"" + PositionTypeToString((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE)) + "\",";
      json += "\"status\":\"OPEN\",";
      json += "\"lotSize\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
      json += "\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5) + ",";
      json += "\"closePrice\":null,";
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      json += "\"stopLoss\":" + (sl > 0 ? DoubleToString(sl, 5) : "null") + ",";
      json += "\"takeProfit\":" + (tp > 0 ? DoubleToString(tp, 5) : "null") + ",";
      json += "\"openTime\":\"" + TimeToIso((datetime)PositionGetInteger(POSITION_TIME)) + "\",";
      json += "\"closeTime\":null,";
      json += "\"commission\":0,"; // العمولة على الصفقات المفتوحة غير متاحة مباشرة في MT5
      json += "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 2) + ",";
      json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ",";
      json += "\"comment\":\"" + JsonEscape(PositionGetString(POSITION_COMMENT)) + "\",";
      json += "\"magicNumber\":" + IntegerToString((long)PositionGetInteger(POSITION_MAGIC));
      json += "}";
   }
   json += "]";
   return json;
}

//+------------------------------------------------------------------+
//| بناء JSON للصفقات المغلقة (Deals) خلال آخر InpHistoryDays يوم       |
//+------------------------------------------------------------------+
string BuildClosedDealsJson()
{
   datetime fromDate = TimeCurrent() - InpHistoryDays * 86400;
   HistorySelect(fromDate, TimeCurrent());

   int totalDeals = HistoryDealsTotal();
   string json = "[";
   bool first = true;

   for(int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      // نهتم فقط بصفقات الدخول/الخروج التجارية (وليس إيداع/سحب)
      long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(dealEntry != DEAL_ENTRY_OUT) continue; // نأخذ صفقات الإغلاق فقط لتفادي التكرار

      long positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      string symbol   = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double volume   = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double price    = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit   = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      double swap     = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      long dealType   = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      if(!first) json += ",";
      json += "{";
      json += "\"ticket\":\"" + IntegerToString(positionId) + "\",";
      json += "\"symbol\":\"" + symbol + "\",";
      // نوع الصفقة الأصلي هو عكس صفقة الإغلاق (إذا أغلقت بـ SELL فالصفقة كانت BUY)
      json += "\"type\":\"" + (dealType == DEAL_TYPE_SELL ? "BUY" : "SELL") + "\",";
      json += "\"status\":\"CLOSED\",";
      json += "\"lotSize\":" + DoubleToString(volume, 2) + ",";
      json += "\"openPrice\":" + DoubleToString(price, 5) + ","; // تقريبي - MT5 لا يعطي سعر الفتح الأصلي من الصفقة نفسها بسهولة
      json += "\"closePrice\":" + DoubleToString(price, 5) + ",";
      json += "\"stopLoss\":null,";
      json += "\"takeProfit\":null,";
      json += "\"openTime\":\"" + TimeToIso(dealTime) + "\",";
      json += "\"closeTime\":\"" + TimeToIso(dealTime) + "\",";
      json += "\"commission\":" + DoubleToString(commission, 2) + ",";
      json += "\"swap\":" + DoubleToString(swap, 2) + ",";
      json += "\"profit\":" + DoubleToString(profit, 2) + ",";
      json += "\"comment\":\"" + JsonEscape(HistoryDealGetString(dealTicket, DEAL_COMMENT)) + "\",";
      json += "\"magicNumber\":" + IntegerToString(HistoryDealGetInteger(dealTicket, DEAL_MAGIC));
      json += "}";
      first = false;
   }
   json += "]";
   return json;
}

//+------------------------------------------------------------------+
//| إرسال لقطة الحساب، ثم دمج الصفقات المفتوحة والمغلقة وإرسالها       |
//| (endpoint-ان منفصلان يطابقان الـ Backend: /ingest/account-info    |
//| و /ingest/trades - الحساب مُحدَّد ضمنياً عبر مفتاح X-API-Key)      |
//+------------------------------------------------------------------+
void SendAllTradesBatch()
{
   // 1) لقطة الحساب
   string accountResponse;
   SendHttpPost("/ingest/account-info", BuildAccountInfoJson(), accountResponse);

   // 2) الصفقات: دمج المفتوحة والمغلقة في مصفوفة واحدة
   string openJson = BuildOpenPositionsJson();
   string closedJson = BuildClosedDealsJson();

   string merged;
   if(openJson == "[]")
      merged = closedJson;
   else if(closedJson == "[]")
      merged = openJson;
   else
      merged = StringSubstr(openJson, 0, StringLen(openJson) - 1) + "," + StringSubstr(closedJson, 1);

   if(merged == "[]") return; // لا صفقات بعد

   string body = "{\"trades\":" + merged + "}";
   string response;
   if(SendHttpPost("/ingest/trades", body, response))
   {
      LogMessage("تمت المزامنة الكاملة بنجاح");
   }
}

//+------------------------------------------------------------------+
//| إرسال تحديث فوري لصفقة واحدة عند حدوث معاملة (فتح/تعديل/إغلاق)     |
//+------------------------------------------------------------------+
void SendPositionInstant(ulong ticket)
{
   if(!PositionSelectByTicket(ticket)) return;

   string json = "{";
   json += "\"ticket\":\"" + IntegerToString((long)ticket) + "\",";
   json += "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\",";
   json += "\"type\":\"" + PositionTypeToString((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE)) + "\",";
   json += "\"status\":\"OPEN\",";
   json += "\"lotSize\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
   json += "\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5) + ",";
   json += "\"closePrice\":null,";
   double sl = PositionGetDouble(POSITION_SL);
   double tp = PositionGetDouble(POSITION_TP);
   json += "\"stopLoss\":" + (sl > 0 ? DoubleToString(sl, 5) : "null") + ",";
   json += "\"takeProfit\":" + (tp > 0 ? DoubleToString(tp, 5) : "null") + ",";
   json += "\"openTime\":\"" + TimeToIso((datetime)PositionGetInteger(POSITION_TIME)) + "\",";
   json += "\"closeTime\":null,";
   json += "\"commission\":0,";
   json += "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 2) + ",";
   json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ",";
   json += "\"comment\":\"" + JsonEscape(PositionGetString(POSITION_COMMENT)) + "\",";
   json += "\"magicNumber\":" + IntegerToString((long)PositionGetInteger(POSITION_MAGIC));
   json += "}";

   string body = "{\"trade\":" + json + "}";
   string response;
   SendHttpPost("/ingest/trade", body, response);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(InpApiKey) == 0)
   {
      LogMessage("خطأ: مفتاح الـ API فارغ. الرجاء إدخاله من إعدادات الـ EA");
      return INIT_PARAMETERS_INCORRECT;
   }

   EventSetTimer(InpSyncIntervalSec);
   LogMessage("تم تشغيل الـ EA بنجاح - المزامنة كل " + IntegerToString(InpSyncIntervalSec) + " ثانية");

   SendAllTradesBatch();

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   LogMessage("تم إيقاف الـ EA");
}

//+------------------------------------------------------------------+
//| Timer function - المزامنة الدورية الكاملة                          |
//+------------------------------------------------------------------+
void OnTimer()
{
   SendAllTradesBatch();
}

//+------------------------------------------------------------------+
//| يُستدعى تلقائياً عند أي معاملة تداول (فتح/تعديل/إغلاق) - فوري       |
//| هذا أكفأ بكثير من فحص OrdersTotal في كل Tick كما في MT4            |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                         const MqlTradeRequest &request,
                         const MqlTradeResult &result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      // صفقة جديدة أو إغلاق صفقة - أرسل مزامنة كاملة فورية لضمان دقة البيانات
      SendAllTradesBatch();
   }
   else if(trans.type == TRADE_TRANSACTION_POSITION)
   {
      // تعديل SL/TP على صفقة مفتوحة
      SendPositionInstant(trans.position);
   }
}
//+------------------------------------------------------------------+
