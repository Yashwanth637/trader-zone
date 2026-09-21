export interface BacktestCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type DrawingType = 
  | 'cursor'
  | 'trendline'
  | 'horizontal_ray'
  | 'rectangle'
  | 'long_position'
  | 'short_position'
  | 'measure';

export interface ChartPoint {
  time: number; // Unix timestamp in seconds
  price: number;
}

export interface BacktestDrawing {
  id: string;
  type: DrawingType;
  points: ChartPoint[];
  color: string;
  label?: string;
  // For position tools:
  entryPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskRewardRatio?: number;
  // For rectangle / zones:
  fillColor?: string;
}

export type OrderType = 'MARKET' | 'LIMIT';
export type TradeSide = 'BUY' | 'SELL';

export interface BacktestOrder {
  id: string;
  type: OrderType;
  side: TradeSide;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  riskAmount: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  createdAtTime: number;
}

export interface BacktestPosition {
  id: string;
  side: TradeSide;
  entryPrice: number;
  entryTime: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  riskAmount: number;
  currentPnl: number;
  currentR: number;
  isBreakEven: boolean;
}

export interface BacktestTrade {
  id: string;
  strategyId?: string;
  strategyName?: string;
  symbol: string;
  timeframe: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  quantity: number;
  netPnl: number;
  rMultiple: number;
  exitReason: 'TP' | 'SL' | 'MANUAL';
  notes?: string;
}

export interface BacktestSession {
  id: string;
  strategyName: string;
  symbol: string;
  timeframe: string;
  initialBalance: number;
  currentBalance: number;
  trades: BacktestTrade[];
  createdAt: string;
}

export interface BacktestStats {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  avgRR: number;
}
