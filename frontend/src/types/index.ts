export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
}

export interface TradingAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  broker: string;
  server: string;
  platform: 'MT4' | 'MT5';
  currency: string;
  leverage: number;
  status: 'PENDING' | 'ACTIVE' | 'DISCONNECTED' | 'SUSPENDED';
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  lastSyncAt: string | null;
}

export interface Statistics {
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  averageProfit: number;
  averageLoss: number;
  averageRR: number;
  largestProfit: number;
  largestLoss: number;
  averageTradeDurationMin: number;
  openTradesCount: number;
  currentDrawdown: number;
  maxDrawdown: number;
  accountGrowthPercent: number;
}

export interface Trade {
  id: string;
  ticket: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  lotSize: number;
  openPrice: number;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openTime: string;
  closeTime: string | null;
  commission: number;
  swap: number;
  profit: number;
  comment: string | null;
  durationMinutes: number | null;
}

export interface EquityPoint {
  balance: number;
  equity: number;
  drawdown: number;
  recordedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
