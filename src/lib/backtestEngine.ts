import {
  BacktestCandle,
  BacktestOrder,
  BacktestPosition,
  BacktestTrade,
  BacktestStats,
  TradeSide,
  OrderType
} from '../types/backtest';
import { SUPPORTED_ASSETS } from './backtestDataService';

export class BacktestEngine {
  public initialBalance: number;
  public balance: number;
  public equity: number;
  public openPosition: BacktestPosition | null = null;
  public pendingOrders: BacktestOrder[] = [];
  public closedTrades: BacktestTrade[] = [];
  public currentCandle: BacktestCandle | null = null;
  public symbol: string;
  public timeframe: string;
  public strategyName: string;

  constructor(
    initialBalance: number = 10000,
    symbol: string = 'BTCUSDT',
    timeframe: string = '15m',
    strategyName: string = 'Default Strategy'
  ) {
    this.initialBalance = initialBalance;
    this.balance = initialBalance;
    this.equity = initialBalance;
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.strategyName = strategyName;
  }

  private getMultiplier(): number {
    const asset = SUPPORTED_ASSETS.find(a => a.id === this.symbol);
    return asset ? asset.lotMultiplier : 1;
  }

  /**
   * Process a newly stepped or revealed candle against open positions and pending orders
   */
  public processCandle(candle: BacktestCandle): {
    triggeredTrade?: BacktestTrade;
    filledOrder?: BacktestOrder;
  } {
    this.currentCandle = candle;
    let triggeredTrade: BacktestTrade | undefined;
    let filledOrder: BacktestOrder | undefined;

    const mult = this.getMultiplier();

    // 1. Process Pending Limit Orders
    for (let i = this.pendingOrders.length - 1; i >= 0; i--) {
      const order = this.pendingOrders[i];
      let filled = false;

      if (order.side === 'BUY') {
        if (candle.low <= order.price) {
          filled = true;
        }
      } else {
        if (candle.high >= order.price) {
          filled = true;
        }
      }

      if (filled) {
        // Remove pending order and open position
        this.pendingOrders.splice(i, 1);
        this.openPosition = {
          id: 'pos_' + Date.now(),
          side: order.side,
          entryPrice: order.price,
          entryTime: candle.time,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          quantity: order.quantity,
          riskAmount: order.riskAmount,
          currentPnl: 0,
          currentR: 0,
          isBreakEven: false
        };
        filledOrder = order;
      }
    }

    // 2. Process Open Position SL / TP
    if (this.openPosition) {
      const pos = this.openPosition;
      let exitPrice: number | null = null;
      let exitReason: 'TP' | 'SL' | null = null;

      if (pos.side === 'BUY') {
        if (pos.stopLoss !== undefined && candle.low <= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = 'SL';
        } else if (pos.takeProfit !== undefined && candle.high >= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = 'TP';
        }
      } else {
        // SHORT
        if (pos.stopLoss !== undefined && candle.high >= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = 'SL';
        } else if (pos.takeProfit !== undefined && candle.low <= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = 'TP';
        }
      }

      if (exitPrice !== null && exitReason !== null) {
        // Trade closed by SL or TP
        const diff = pos.side === 'BUY' ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
        const pnl = diff * pos.quantity * mult;
        const rMultiple = pos.riskAmount > 0 ? pnl / pos.riskAmount : (pnl >= 0 ? 1 : -1);

        const trade: BacktestTrade = {
          id: 'trade_' + Date.now(),
          strategyName: this.strategyName,
          symbol: this.symbol,
          timeframe: this.timeframe,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice,
          entryTime: pos.entryTime,
          exitTime: candle.time,
          quantity: pos.quantity,
          netPnl: parseFloat(pnl.toFixed(2)),
          rMultiple: parseFloat(rMultiple.toFixed(2)),
          exitReason
        };

        this.closedTrades.unshift(trade);
        this.balance += trade.netPnl;
        this.equity = this.balance;
        this.openPosition = null;
        triggeredTrade = trade;
      } else {
        // Update unrealized PnL based on candle close
        const diff = pos.side === 'BUY' ? (candle.close - pos.entryPrice) : (pos.entryPrice - candle.close);
        pos.currentPnl = parseFloat((diff * pos.quantity * mult).toFixed(2));
        pos.currentR = pos.riskAmount > 0 ? parseFloat((pos.currentPnl / pos.riskAmount).toFixed(2)) : 0;
        this.equity = parseFloat((this.balance + pos.currentPnl).toFixed(2));
      }
    } else {
      this.equity = this.balance;
    }

    return { triggeredTrade, filledOrder };
  }

  /**
   * Enter a Market order immediately at the current candle close price
   */
  public enterMarketOrder(
    side: TradeSide,
    quantity: number,
    stopLoss?: number,
    takeProfit?: number,
    riskAmount: number = 100
  ): BacktestPosition {
    if (!this.currentCandle) {
      throw new Error('Cannot place order: No active candle available.');
    }

    // If already in a position, close it first
    if (this.openPosition) {
      this.closePositionAtMarket();
    }

    const entryPrice = this.currentCandle.close;
    this.openPosition = {
      id: 'pos_' + Date.now(),
      side,
      entryPrice,
      entryTime: this.currentCandle.time,
      stopLoss,
      takeProfit,
      quantity,
      riskAmount,
      currentPnl: 0,
      currentR: 0,
      isBreakEven: false
    };

    return this.openPosition;
  }

  /**
   * Place a pending Limit Order
   */
  public placeLimitOrder(
    side: TradeSide,
    price: number,
    quantity: number,
    stopLoss?: number,
    takeProfit?: number,
    riskAmount: number = 100
  ): BacktestOrder {
    const order: BacktestOrder = {
      id: 'ord_' + Date.now(),
      type: 'LIMIT',
      side,
      price,
      stopLoss,
      takeProfit,
      quantity,
      riskAmount,
      status: 'PENDING',
      createdAtTime: this.currentCandle ? this.currentCandle.time : Math.floor(Date.now() / 1000)
    };

    this.pendingOrders.push(order);
    return order;
  }

  /**
   * Manually close open position at current candle market price
   */
  public closePositionAtMarket(): BacktestTrade | null {
    if (!this.openPosition || !this.currentCandle) return null;

    const pos = this.openPosition;
    const exitPrice = this.currentCandle.close;
    const mult = this.getMultiplier();
    const diff = pos.side === 'BUY' ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
    const pnl = diff * pos.quantity * mult;
    const rMultiple = pos.riskAmount > 0 ? pnl / pos.riskAmount : (pnl >= 0 ? 1 : -1);

    const trade: BacktestTrade = {
      id: 'trade_' + Date.now(),
      strategyName: this.strategyName,
      symbol: this.symbol,
      timeframe: this.timeframe,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      entryTime: pos.entryTime,
      exitTime: this.currentCandle.time,
      quantity: pos.quantity,
      netPnl: parseFloat(pnl.toFixed(2)),
      rMultiple: parseFloat(rMultiple.toFixed(2)),
      exitReason: 'MANUAL'
    };

    this.closedTrades.unshift(trade);
    this.balance += trade.netPnl;
    this.equity = this.balance;
    this.openPosition = null;

    return trade;
  }

  /**
   * Move stop loss to Breakeven (entry price)
   */
  public moveStopLossToBreakEven(): boolean {
    if (!this.openPosition) return false;
    this.openPosition.stopLoss = this.openPosition.entryPrice;
    this.openPosition.isBreakEven = true;
    return true;
  }

  /**
   * Cancel pending order
   */
  public cancelOrder(orderId: string): void {
    this.pendingOrders = this.pendingOrders.filter(o => o.id !== orderId);
  }

  /**
   * Update Stop Loss and/or Take Profit on active position (e.g. via on-chart drag)
   */
  public updatePositionSlTp(stopLoss?: number, takeProfit?: number): void {
    if (!this.openPosition) return;
    if (stopLoss !== undefined) {
      this.openPosition.stopLoss = parseFloat(stopLoss.toFixed(4));
    }
    if (takeProfit !== undefined) {
      this.openPosition.takeProfit = parseFloat(takeProfit.toFixed(4));
    }
  }

  /**
   * Update Limit Order price (e.g. via on-chart drag)
   */
  public updateLimitOrderPrice(orderId: string, price: number): void {
    const order = this.pendingOrders.find(o => o.id === orderId);
    if (order) {
      order.price = parseFloat(price.toFixed(4));
    }
  }

  /**
   * Reset session with new or existing starting balance
   */
  public resetSession(initialBalance?: number): void {
    if (initialBalance !== undefined) {
      this.initialBalance = initialBalance;
    }
    this.balance = this.initialBalance;
    this.equity = this.initialBalance;
    this.openPosition = null;
    this.pendingOrders = [];
    this.closedTrades = [];
  }

  /**
   * Compute comprehensive TradeZella performance statistics
   */
  public getStats(): BacktestStats {
    const total = this.closedTrades.length;
    if (total === 0) {
      return {
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        breakevenCount: 0,
        winRate: 0,
        netPnl: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdown: 0,
        avgRR: 0
      };
    }

    let wins = 0;
    let losses = 0;
    let bes = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalRR = 0;

    let peakEquity = this.initialBalance;
    let currentEq = this.initialBalance;
    let maxDrawdown = 0;

    // Evaluate in chronological order for equity curve & drawdown
    const chronTrades = [...this.closedTrades].reverse();

    for (const t of chronTrades) {
      currentEq += t.netPnl;
      if (currentEq > peakEquity) {
        peakEquity = currentEq;
      }
      const dd = peakEquity > 0 ? ((peakEquity - currentEq) / peakEquity) * 100 : 0;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      if (t.netPnl > 0.01) {
        wins++;
        grossProfit += t.netPnl;
      } else if (t.netPnl < -0.01) {
        losses++;
        grossLoss += Math.abs(t.netPnl);
      } else {
        bes++;
      }

      totalRR += t.rMultiple;
    }

    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? grossProfit : 0);
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;
    const netPnl = this.balance - this.initialBalance;
    const avgRR = total > 0 ? totalRR / total : 0;

    return {
      totalTrades: total,
      winCount: wins,
      lossCount: losses,
      breakevenCount: bes,
      winRate: parseFloat(winRate.toFixed(1)),
      netPnl: parseFloat(netPnl.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      avgRR: parseFloat(avgRR.toFixed(2))
    };
  }
}
