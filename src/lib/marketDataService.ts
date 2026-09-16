import { Trade } from '../types/trade';

export interface ReplayCandle {
  time: number; // Unix timestamp in seconds (for lightweight-charts)
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface FetchCandlesResult {
  candles: ReplayCandle[];
  source: 'Binance' | 'Binance Vision' | 'Bitfinex' | 'Fallback';
  isRealMarketData: boolean;
}

// In-memory cache to avoid duplicate network calls when toggling views
const candleCache = new Map<string, FetchCandlesResult>();

/**
 * Returns duration of one candle step in seconds
 */
export function getTimeframeSeconds(tf: string): number {
  switch (tf) {
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '1h': return 3600;
    case '4h': return 14400;
    case '1d': return 86400;
    default: return 900;
  }
}

/**
 * Normalizes user symbols to standard exchange trading pairs.
 * Delta Exchange India, MetaTrader, etc. commonly use XAUTUSD, BTCUSD, etc.
 */
export function resolveExchangeSymbols(rawSymbol: string): {
  binancePairs: string[];
  bitfinexPair: string | null;
} {
  const clean = rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Gold / Tether Gold
  if (clean.includes('XAUT') || clean.includes('GOLD') || clean.includes('XAU')) {
    return {
      binancePairs: ['XAUTUSDT', 'PAXGUSDT'],
      bitfinexPair: 'tXAUT:USD'
    };
  }

  // Major Cryptocurrencies
  if (clean.startsWith('BTC')) {
    return { binancePairs: ['BTCUSDT'], bitfinexPair: 'tBTCUSD' };
  }
  if (clean.startsWith('ETH')) {
    return { binancePairs: ['ETHUSDT'], bitfinexPair: 'tETHUSD' };
  }
  if (clean.startsWith('SOL')) {
    return { binancePairs: ['SOLUSDT'], bitfinexPair: 'tSOLUSD' };
  }
  if (clean.startsWith('XRP')) {
    return { binancePairs: ['XRPUSDT'], bitfinexPair: 'tXRPUSD' };
  }
  if (clean.startsWith('BNB')) {
    return { binancePairs: ['BNBUSDT'], bitfinexPair: null };
  }
  if (clean.startsWith('DOGE')) {
    return { binancePairs: ['DOGEUSDT'], bitfinexPair: 'tDOGE:USD' };
  }
  if (clean.startsWith('ADA')) {
    return { binancePairs: ['ADAUSDT'], bitfinexPair: 'tADAUSD' };
  }

  // Generic USD -> USDT mapping
  if (clean.endsWith('USD')) {
    const base = clean.slice(0, -3);
    return {
      binancePairs: [`${base}USDT`, clean],
      bitfinexPair: `t${base}USD`
    };
  }

  if (clean.endsWith('USDT')) {
    return {
      binancePairs: [clean],
      bitfinexPair: `t${clean.slice(0, -4)}USD`
    };
  }

  return {
    binancePairs: [`${clean}USDT`, clean],
    bitfinexPair: `t${clean}:USD`
  };
}

/**
 * Fetch historical candles directly from Binance Public API
 */
async function fetchFromBinance(
  pair: string,
  interval: string,
  startMs: number,
  endMs: number,
  mirror: boolean = false
): Promise<ReplayCandle[] | null> {
  const host = mirror ? 'https://data-api.binance.vision' : 'https://api.binance.com';
  const url = `${host}/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${startMs}&endTime=${endMs}&limit=1000`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const candles: ReplayCandle[] = raw.map(item => ({
      time: Math.floor(Number(item[0]) / 1000),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4])
    }));

    return candles.sort((a, b) => a.time - b.time);
  } catch (err) {
    return null;
  }
}

/**
 * Fetch historical candles from Bitfinex Public API
 */
async function fetchFromBitfinex(
  pair: string,
  interval: string,
  startMs: number,
  endMs: number
): Promise<ReplayCandle[] | null> {
  // Convert interval (Bitfinex: 1m, 5m, 15m, 1h, 4h, 1D)
  const bfxInterval = interval === '1d' ? '1D' : interval;
  const url = `https://api-pub.bitfinex.com/v2/candles/trade:${bfxInterval}:${pair}/hist?start=${startMs}&end=${endMs}&sort=1&limit=1000`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;

    // Bitfinex format: [MTS, OPEN, CLOSE, HIGH, LOW, VOLUME]
    const candles: ReplayCandle[] = raw.map(item => ({
      time: Math.floor(Number(item[0]) / 1000),
      open: Number(item[1]),
      high: Number(item[3]),
      low: Number(item[4]),
      close: Number(item[2])
    }));

    return candles.sort((a, b) => a.time - b.time);
  } catch (err) {
    return null;
  }
}

/**
 * Main function to retrieve real historical market candlestick data from the internet
 * for the exact period of a specific trade execution.
 */
export async function fetchHistoricalCandlesForTrade(
  trade: Trade,
  timeframe: string = '15m'
): Promise<FetchCandlesResult> {
  const cacheKey = `${trade.id}_${timeframe}_${trade.symbol}`;
  if (candleCache.has(cacheKey)) {
    return candleCache.get(cacheKey)!;
  }

  const stepSec = getTimeframeSeconds(timeframe);
  const openTimeMs = new Date(trade.openTime).getTime();
  const closeTimeMs = trade.closeTime ? new Date(trade.closeTime).getTime() : openTimeMs + stepSec * 15 * 1000;

  // Window: 35 candles before entry, 25 candles after exit
  const preDurationMs = 35 * stepSec * 1000;
  const postDurationMs = 25 * stepSec * 1000;

  const startMs = Math.max(0, openTimeMs - preDurationMs);
  const endMs = closeTimeMs + postDurationMs;

  const { binancePairs, bitfinexPair } = resolveExchangeSymbols(trade.symbol);

  // 1. Try Binance Primary
  for (const pair of binancePairs) {
    const candles = await fetchFromBinance(pair, timeframe, startMs, endMs, false);
    if (candles && candles.length >= 3) {
      const result: FetchCandlesResult = {
        candles,
        source: 'Binance',
        isRealMarketData: true
      };
      candleCache.set(cacheKey, result);
      return result;
    }
  }

  // 2. Try Binance Vision (Alternative mirror)
  for (const pair of binancePairs) {
    const candles = await fetchFromBinance(pair, timeframe, startMs, endMs, true);
    if (candles && candles.length >= 3) {
      const result: FetchCandlesResult = {
        candles,
        source: 'Binance Vision',
        isRealMarketData: true
      };
      candleCache.set(cacheKey, result);
      return result;
    }
  }

  // 3. Try Bitfinex (Particularly reliable for Tether Gold tXAUT:USD)
  if (bitfinexPair) {
    const candles = await fetchFromBitfinex(bitfinexPair, timeframe, startMs, endMs);
    if (candles && candles.length >= 3) {
      const result: FetchCandlesResult = {
        candles,
        source: 'Bitfinex',
        isRealMarketData: true
      };
      candleCache.set(cacheKey, result);
      return result;
    }
  }

  // Fallback: If network is completely offline or unknown asset, return empty result flag
  return {
    candles: [],
    source: 'Fallback',
    isRealMarketData: false
  };
}
