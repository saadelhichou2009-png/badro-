//+------------------------------------------------------------------+
//|                                       TradingAnalyticsEA.mq4      |
//|  يقرأ بيانات الحساب والصفقات ويرسلها إلى REST API الخاص بالمنصة   |
//|  Copyright: Trading Analytics Platform                            |
//+------------------------------------------------------------------+
#property copyright "Trading Analytics Platform"
#property version   "1.00"
#property strict

//--- إعدادات المستخدم
input string InpApiBaseUrl        = "https://api.yourdomain.com/api/v1"; // رابط الـ API الأساسي
input string InpApiKey            = "";                                   // مفتاح الـ API الخاص بحسابك
input int    InpSyncIntervalSec   = 60;    // كل كم ثانية يتم إرسال لقطة كاملة للحساب والصفقات
input int    InpHttpTimeoutMs     = 5000;  // مهلة الاتصال بالمللي ثانية
input bool   InpEnableLogging     = true;  // تفعيل تسجيل السجلات في ملف

//--- متغيرات داخلية
datetime g_lastSyncTime = 0;
int      g_lastKnownOrdersTotal = 0;
string   g_logFileName = "TradingAnalyticsEA_log.txt";
int      g_failedAttempts = 0;

//+------------------------------------------------------------------+
//| دالة تسجيل السجلات (Logs) - منخفضة استهلاك الموارد               |
//+------------------------------------------------------------------+
void LogMessage(string msg)
{
   if(!InpEnableLogging) return;
   int handle = FileOpen(g_logFileName, FILE_READ|FILE_WRITE|FILE_TXT);
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
//| تحويل نوع الأمر في MT4 إلى نوع نصي موحّد يفهمه الـ Backend        |
//+------------------------------------------------------------------+
string OrderTypeToString(int type)
{
   switch(type)
   {
      case OP_BUY:       return "BUY";
      case OP_SELL:      return "SELL";
      case OP_BUYLIMIT:  return "BUY_LIMIT";
      case OP_SELLLIMIT: return "SELL_LIMIT";
      case OP_BUYSTOP:   return "BUY_STOP";
      case OP_SELLSTOP:  return "SELL_STOP";
      default:           return "BUY";
   }
}

//+------------------------------------------------------------------+
//| تحويل الوقت إلى صيغة ISO 8601                                     |
//+------------------------------------------------------------------+
string TimeToIso(datetime t)
{
   if(t <= 0) return "";
   return TimeToString(t, TIME_DATE) + "T" + TimeToString(t, TIME_SECONDS) + "Z";
}

//+------------------------------------------------------------------+
//| إرسال طلب HTTP POST مع إعادة محاولة عند الفشل                     |
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
   string json = "{";
   json += "\"accountNumber\":\"" + IntegerToString(AccountNumber()) + "\",";
   json += "\"broker\":\"" + JsonEscape(AccountCompany()) + "\",";
   json += "\"server\":\"" + JsonEscape(AccountServer()) + "\",";
   json += "\"platform\":\"MT4\",";
   json += "\"currency\":\"" + AccountCurrency() + "\",";
   json += "\"leverage\":" + IntegerToString(AccountLeverage()) + ",";
   json += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
   json += "\"equity\":" + DoubleToString(AccountEquity(), 2) + ",";
   json += "\"margin\":" + DoubleToString(AccountMargin(), 2) + ",";
   json += "\"freeMargin\":" + DoubleToString(AccountFreeMargin(), 2) + ",";
   json += "\"marginLevel\":" + DoubleToString(AccountMargin() > 0 ? (AccountEquity()/AccountMargin()*100) : 0, 2);
   json += "}";
   return json;
}

//+------------------------------------------------------------------+
//| بناء JSON لصفقة واحدة (سواء مفتوحة من OrderSelect بالفعل)          |
//+------------------------------------------------------------------+
string BuildSingleTradeJson()
{
   bool isClosed = (OrderCloseTime() > 0);
   string json = "{";
   json += "\"ticket\":\"" + IntegerToString(OrderTicket()) + "\",";
   json += "\"symbol\":\"" + OrderSymbol() + "\",";
   json += "\"type\":\"" + OrderTypeToString(OrderType()) + "\",";
   json += "\"status\":\"" + (isClosed ? "CLOSED" : "OPEN") + "\",";
   json += "\"lotSize\":" + DoubleToString(OrderLots(), 2) + ",";
   json += "\"openPrice\":" + DoubleToString(OrderOpenPrice(), 5) + ",";
   json += "\"closePrice\":" + (isClosed ? DoubleToString(OrderClosePrice(), 5) : "null") + ",";
   json += "\"stopLoss\":" + (OrderStopLoss() > 0 ? DoubleToString(OrderStopLoss(), 5) : "null") + ",";
   json += "\"takeProfit\":" + (OrderTakeProfit() > 0 ? DoubleToString(OrderTakeProfit(), 5) : "null") + ",";
   json += "\"openTime\":\"" + TimeToIso(OrderOpenTime()) + "\",";
   json += "\"closeTime\":" + (isClosed ? ("\"" + TimeToIso(OrderCloseTime()) + "\"") : "null") + ",";
   json += "\"commission\":" + DoubleToString(OrderCommission(), 2) + ",";
   json += "\"swap\":" + DoubleToString(OrderSwap(), 2) + ",";
   json += "\"profit\":" + DoubleToString(OrderProfit(), 2) + ",";
   json += "\"comment\":\"" + JsonEscape(OrderComment()) + "\",";
   json += "\"magicNumber\":" + IntegerToString(OrderMagicNumber());
   json += "}";
   return json;
}

//+------------------------------------------------------------------+
//| إرسال لقطة الحساب ثم دفعة كاملة من الصفقات المفتوحة والمغلقة       |
//| (endpoint-ان منفصلان يطابقان الـ Backend: /ingest/account-info    |
//| و /ingest/trades - الحساب مُحدَّد ضمنياً عبر مفتاح X-API-Key)      |
//+------------------------------------------------------------------+
void SendAllTradesBatch()
{
   // 1) لقطة الحساب
   string accountResponse;
   SendHttpPost("/ingest/account-info", BuildAccountInfoJson(), accountResponse);

   // 2) دفعة الصفقات (المفتوحة + آخر 500 من السجل التاريخي)
   string trades = "[";
   bool first = true;

   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(!first) trades += ",";
         trades += BuildSingleTradeJson();
         first = false;
      }
   }

   int historyLimit = MathMin(OrdersHistoryTotal(), 500);
   for(int i = OrdersHistoryTotal() - 1; i >= OrdersHistoryTotal() - historyLimit && i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
      {
         if(OrderType() > OP_SELL) continue; // تجاهل عمليات الإيداع/السحب غير التجارية
         if(!first) trades += ",";
         trades += BuildSingleTradeJson();
         first = false;
      }
   }
   trades += "]";

   if(trades == "[]") return; // لا صفقات بعد - لا داعي لطلب فارغ

   string body = "{\"trades\":" + trades + "}";
   string response;
   if(SendHttpPost("/ingest/trades", body, response))
   {
      LogMessage("تمت المزامنة الكاملة بنجاح (" + IntegerToString(StringLen(trades)) + " bytes)");
   }
}

//+------------------------------------------------------------------+
//| إرسال صفقة واحدة فوراً عند حدوث تغيير (فتح/إغلاق)                  |
//+------------------------------------------------------------------+
void SendSingleTradeInstant()
{
   string body = "{\"trade\":" + BuildSingleTradeJson() + "}";
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

   g_lastKnownOrdersTotal = OrdersTotal();
   EventSetTimer(InpSyncIntervalSec);
   LogMessage("تم تشغيل الـ EA بنجاح - المزامنة كل " + IntegerToString(InpSyncIntervalSec) + " ثانية");

   // إرسال أول مزامنة فور التشغيل
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
//| Timer function - المزامنة الدورية الكاملة كل دقيقة                 |
//+------------------------------------------------------------------+
void OnTimer()
{
   SendAllTradesBatch();
}

//+------------------------------------------------------------------+
//| Tick function - نستخدمه فقط لاكتشاف صفقة جديدة فوراً بأقل تكلفة    |
//+------------------------------------------------------------------+
void OnTick()
{
   int currentTotal = OrdersTotal();
   if(currentTotal != g_lastKnownOrdersTotal)
   {
      // تغيّر عدد الصفقات المفتوحة => صفقة جديدة أو إغلاق صفقة
      for(int i = 0; i < currentTotal; i++)
      {
         if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         {
            SendSingleTradeInstant();
         }
      }
      g_lastKnownOrdersTotal = currentTotal;
   }
}
//+------------------------------------------------------------------+
