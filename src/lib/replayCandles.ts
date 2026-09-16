import { Trade } from '../types/trade';
import {
  ReplayCandle,
  getTimeframeSeconds,
  fetchHistoricalCandlesForTrade,
  FetchCandlesResult
} from './marketDataService';

export { getTimeframeSeconds };
export type { ReplayCandle };

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
  source: 'Binance' | 'Binance Vision' | 'Bitfinex' | 'Fallback';
  isRealMarketData: boolean;
}

/**
 * Fetch authentic real historical market candles from public internet APIs for a specific trade.
 * Falls back to anchored realistic generation only if network is offline or symbol is unsupported.
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

  // 1. ATTEMPT REAL MARKET DATA FETCH FROM INTERNET
  try {
    const marketResult = await fetchHistoricalCandlesForTrade(trade, timeframe);

    if (marketResult.isRealMarketData && marketResult.candles.length >= 3) {
      const candles = marketResult.candles;

      // Locate entryIndex: closest candle to openSec
      let entryIndex = 0;
      let minEntryDiff = Infinity;

      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const diff = Math.abs(c.time - openSec);
        if (diff < minEntryDiff) {
          minEntryDiff = diff;
          entryIndex = i;
        }
      }

      // Locate exitIndex: closest candle to closeSec (must be >= entryIndex)
      let exitIndex = entryIndex;
      let minExitDiff = Infinity;

      for (let i = entryIndex; i < candles.length; i++) {
        const c = candles[i];
        const diff = Math.abs(c.time - closeSec);
        if (diff < minExitDiff) {
          minExitDiff = diff;
          exitIndex = i;
        }
      }

      // If exit happened within same candle, advance exitIndex if possible
      if (exitIndex === entryIndex && entryIndex < candles.length - 1) {
        exitIndex = entryIndex + 1;
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
        timeframe,
        source: marketResult.source,
        isRealMarketData: true
      };
    }
  } catch (err) {
    console.warn('Real market candle fetch failed, falling back to anchored generator', err);
  }

  // 2. FALLBACK SIMULATED GENERATOR (Offline or unknown assets only)
  const durationSec = Math.max(closeSec - openSec, stepSec * 4);
  const inTradeCandlesCount = Math.max(Math.round(durationSec / stepSec), 6);
  const preCandlesCount = 15;
  const postCandlesCount = 10;

  const candles: ReplayCandle[] = [];
  const decimals = entryPrice < 10 ? 4 : entryPrice < 100 ? 3 : 2;
  const priceRange = Math.abs(exitPrice - entryPrice) || (entryPrice * 0.003);
  const volatility = priceRange * 0.25;

  let currentPrice = trade.direction === 'BUY'
    ? entryPrice + priceRange * 0.8
    : entryPrice - priceRange * 0.8;

  let currentTimestamp = openSec - (preCandlesCount * stepSec);

  // Pre-entry candles
  for (let i = 0; i < preCandlesCount; i++) {
    const progress = i / preCandlesCount;
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

  const entryIndex = candles.length;

  // Entry candle
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

  // In-trade candles
  for (let i = 1; i < inTradeCandlesCount; i++) {
    const isFinalInTrade = i === inTradeCandlesCount - 1;
    const progress = i / (inTradeCandlesCount - 1);
    
    const targetPrice = entryPrice + (exitPrice - entryPrice) * progress;
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

  const exitIndex = candles.length - 1;

  // Post-exit candles
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
    timeframe,
    source: 'Fallback',
    isRealMarketData: false
  };
}
