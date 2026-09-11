import { Trade } from '../types/trade';

export interface ReplayCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ReplayData {
  trade: Trade;
  candles: ReplayCandle[];
  entryIndex: number;
  exitIndex: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe: string;
}

export function getTimeframeSeconds(tf: string): number {
  switch (tf) {
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '1h': return 3600;
    case '4h': return 14400;
    default: return 900;
  }
}

/**
 * Fetch or generate realistic candles for a specific trade's exact entry and exit period
 */
export async function getCandlesForTrade(
  trade: Trade,
  timeframe: string = '15m'
): Promise<ReplayData> {
  const stepSec = getTimeframeSeconds(timeframe);
  const openSec = Math.floor(new Date(trade.openTime).getTime() / 1000);
  const closeSec = trade.closeTime
    ? Math.floor(new Date(trade.closeTime).getTime() / 1000)
    : openSec + stepSec * 15;

  const entryPrice = trade.entryPrice;
  const exitPrice = trade.exitPrice || (trade.direction === 'BUY' ? entryPrice + (entryPrice * 0.005) : entryPrice - (entryPrice * 0.005));
  
  // Stop loss and take profit
  const stopLoss = trade.stopLoss || (
    trade.direction === 'BUY'
      ? parseFloat((entryPrice - Math.abs(exitPrice - entryPrice) * 0.6).toFixed(entryPrice < 10 ? 4 : 2))
      : parseFloat((entryPrice + Math.abs(exitPrice - entryPrice) * 0.6).toFixed(entryPrice < 10 ? 4 : 2))
  );

  const takeProfit = trade.takeProfit || (
    trade.direction === 'BUY'
      ? parseFloat((entryPrice + Math.abs(exitPrice - entryPrice) * 1.2).toFixed(entryPrice < 10 ? 4 : 2))
      : parseFloat((entryPrice - Math.abs(exitPrice - entryPrice) * 1.2).toFixed(entryPrice < 10 ? 4 : 2))
  );

  // Determine how many candles inside the trade
  const durationSec = Math.max(closeSec - openSec, stepSec * 4);
  const inTradeCandlesCount = Math.max(Math.round(durationSec / stepSec), 6);

  // Pre-entry candles (before trade was taken)
  const preCandlesCount = 12;
  // Post-exit candles (after trade was closed)
  const postCandlesCount = 8;
  const totalCandles = preCandlesCount + inTradeCandlesCount + postCandlesCount;

  // Let's build a realistic price trajectory:
  // 1. Pre-entry: approaches entry level (approaching from above for BUY support or below for SELL resistance)
  // 2. Entry: touches entryPrice at preCandlesCount
  // 3. In-trade: fluctuates realistically between entry, tests near SL or TP, then closes at exitPrice
  // 4. Post-exit: continues or bounces
  
  const candles: ReplayCandle[] = [];
  const decimals = entryPrice < 10 ? 4 : entryPrice < 100 ? 3 : 2;
  const priceRange = Math.abs(exitPrice - entryPrice) || (entryPrice * 0.003);
  const volatility = priceRange * 0.25;

  let currentPrice = trade.direction === 'BUY'
    ? entryPrice + priceRange * 0.8 // was falling towards support
    : entryPrice - priceRange * 0.8; // was rising towards resistance

  // Start timestamp
  let currentTimestamp = openSec - (preCandlesCount * stepSec);

  // Generate pre-entry candles
  for (let i = 0; i < preCandlesCount; i++) {
    const progress = i / preCandlesCount;
    // target towards entryPrice
    const target = trade.direction === 'BUY'
      ? (entryPrice + priceRange * 0.8 * (1 - progress))
      : (entryPrice - priceRange * 0.8 * (1 - progress));

    const noise = (Math.sin(i * 1.7) * volatility * 0.7);
    const open = parseFloat(currentPrice.toFixed(decimals));
    const close = parseFloat((target + noise).toFixed(decimals));
    const high = parseFloat((Math.max(open, close) + Math.random() * volatility * 0.6).toFixed(decimals));
    const low = parseFloat((Math.min(open, close) - Math.random() * volatility * 0.6).toFixed(decimals));

    candles.push({
      time: currentTimestamp,
      open,
      high,
      low,
      close
    });

    currentPrice = close;
    currentTimestamp += stepSec;
  }

  const entryIndex = candles.length; // Next candle is entry!

  // Entry candle: must touch entryPrice
  {
    const open = currentPrice;
    const isBuy = trade.direction === 'BUY';
    const close = isBuy ? parseFloat((entryPrice + volatility * 0.4).toFixed(decimals)) : parseFloat((entryPrice - volatility * 0.4).toFixed(decimals));
    const low = isBuy ? parseFloat((Math.min(entryPrice, open) - volatility * 0.3).toFixed(decimals)) : parseFloat((Math.min(open, close) - volatility * 0.3).toFixed(decimals));
    const high = isBuy ? parseFloat((Math.max(open, close) + volatility * 0.4).toFixed(decimals)) : parseFloat((Math.max(entryPrice, open) + volatility * 0.3).toFixed(decimals));

    candles.push({
      time: currentTimestamp,
      open: parseFloat(open.toFixed(decimals)),
      high,
      low,
      close
    });
    currentPrice = close;
    currentTimestamp += stepSec;
  }

  // Generate In-Trade progression towards exitPrice
  for (let i = 1; i < inTradeCandlesCount; i++) {
    const isFinalInTrade = i === inTradeCandlesCount - 1;
    const progress = i / (inTradeCandlesCount - 1);
    
    // Smooth easing towards exitPrice
    const targetPrice = entryPrice + (exitPrice - entryPrice) * progress;
    // Add realistic intermediate swings (e.g. pullback then expansion)
    const pullback = Math.sin(progress * Math.PI) * (volatility * (trade.netPnl >= 0 ? 0.6 : 1.2));
    const noisyTarget = isFinalInTrade ? exitPrice : targetPrice + (trade.direction === 'BUY' ? -pullback : pullback);

    const open = currentPrice;
    const close = parseFloat(noisyTarget.toFixed(decimals));
    const candleVol = volatility * (0.8 + Math.random() * 0.5);
    const high = parseFloat((Math.max(open, close) + Math.random() * candleVol).toFixed(decimals));
    const low = parseFloat((Math.min(open, close) - Math.random() * candleVol).toFixed(decimals));

    candles.push({
      time: currentTimestamp,
      open: parseFloat(open.toFixed(decimals)),
      high,
      low,
      close
    });

    currentPrice = close;
    currentTimestamp += stepSec;
  }

  const exitIndex = candles.length - 1; // Last in-trade candle!

  // Generate Post-Exit candles
  for (let i = 0; i < postCandlesCount; i++) {
    const open = currentPrice;
    const delta = (Math.sin(i * 1.5) * volatility);
    const close = parseFloat((open + delta).toFixed(decimals));
    const high = parseFloat((Math.max(open, close) + Math.random() * volatility * 0.5).toFixed(decimals));
    const low = parseFloat((Math.min(open, close) - Math.random() * volatility * 0.5).toFixed(decimals));

    candles.push({
      time: currentTimestamp,
      open: parseFloat(open.toFixed(decimals)),
      high,
      low,
      close
    });

    currentPrice = close;
    currentTimestamp += stepSec;
  }

  return {
    trade,
    candles,
    entryIndex,
    exitIndex,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    timeframe
  };
}
