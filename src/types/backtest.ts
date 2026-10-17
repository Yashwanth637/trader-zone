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
  | 'crosshair'
  | 'trendline'
  | 'ray'
  | 'info_line'
  | 'horizontal_line'
  | 'horizontal_ray'
  | 'vertical_line'
  | 'fib_retracement'
  | 'rectangle'
  | 'circle'
  | 'brush'
  | 'text'
  | 'callout'
  | 'price_label'
  | 'long_position'
  | 'short_position'
  | 'measure';

export interface ChartPoint {
  time: number; // Unix timestamp in seconds
  price: number;
  logicalIndex?: number;
}

export interface BacktestDrawing {
  id: string;
  type: DrawingType;
  points: ChartPoint[];
  color: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  label?: string;
  text?: string;
  fontSize?: number;
  // For position tools:
  entryPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskRewardRatio?: number;
  isLocked?: boolean;
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
