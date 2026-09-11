export interface ChartVisionAnalysis {
  id: string;
  date: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  marketStructure: 'Bullish BOS' | 'Bearish BOS' | 'Order Block Retest' | 'Liquidity Sweep' | 'Consolidation' | 'Fair Value Gap';
  confidenceScore: number; // 0-100
  keyLevels: {
    support: number[];
    resistance: number[];
    invalidation: number;
    target1: number;
    target2: number;
  };
  tradePlan: {
    recommendedEntry: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
    summary: string;
    action: 'CONFIRMED SETUP' | 'HIGH RISK' | 'STAND DOWN';
  };
  chartImageUrl: string;
}

export interface AICoachMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  tag?: 'Psychology' | 'Risk' | 'Strategy' | 'Performance';
}

export interface BehavioralAlert {
  id: string;
  type: 'REVENGE_SIZING' | 'OVERTRADING' | 'EXTENDED_DRAWDOWN' | 'EARLY_EXIT' | 'OFF_HOURS';
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  recommendedAction: string;
  detectedAt: string;
}
