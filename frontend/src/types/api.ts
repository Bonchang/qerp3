export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface PortfolioSummary {
  baseCurrency: string;
  cashBalance: number;
  positionsMarketValue: number;
  totalPortfolioValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  returnRate: number;
  asOf: string;
}

export interface PositionItem {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlRate: number;
}

export interface PortfolioPositionsResponse {
  items: PositionItem[];
  asOf: string;
}

export interface InstrumentSearchItem {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  currency: string;
}

export interface InstrumentSearchResponse {
  items: InstrumentSearchItem[];
}

export interface MarketQuote {
  symbol: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  asOf: string;
}

export interface MarketCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketCandleSeries {
  symbol: string;
  interval: string;
  items: MarketCandle[];
}

export interface Order {
  orderId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  limitPrice: number | null;
  avgFillPrice: number | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  items: Order[];
  nextCursor: string | null;
}

export interface CreateOrderInput {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  limitPrice?: number;
}

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      field?: string;
      reason?: string;
    }>;
    traceId?: string;
  };
  timestamp?: string;
  path?: string;
}
