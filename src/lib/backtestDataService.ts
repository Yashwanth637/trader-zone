import { BacktestCandle } from '../types/backtest';

export interface AssetOption {
  id: string;
  name: string;
  category: 'Crypto' | 'Forex' | 'Commodities';
  binancePair: string;
  bitfinexPair?: string;
  pipSize: number;
  lotMultiplier: number;
}

export const SUPPORTED_ASSETS: AssetOption[] = [
  {
    id: 'BTCUSDT',
    name: 'BTC/USDT (Bitcoin)',
    category: 'Crypto',
    binancePair: 'BTCUSDT',
    bitfinexPair: 'tBTCUSD',
    pipSize: 1,
    lotMultiplier: 1
  },
  {
    id: 'ETHUSDT',
    name: 'ETH/USDT (Ethereum)',
    category: 'Crypto',
    binancePair: 'ETHUSDT',
    bitfinexPair: 'tETHUSD',
    pipSize: 0.1,
    lotMultiplier: 1
  },
  {
    id: 'XAUUSD',
    name: 'XAU/USD (Gold - PAXG)',
    category: 'Commodities',
    binancePair: 'PAXGUSDT',
    bitfinexPair: 'tXAUT:USD',
    pipSize: 0.01,
    lotMultiplier: 1
  },
  {
    id: 'SOLUSDT',
    name: 'SOL/USDT (Solana)',
    category: 'Crypto',
    binancePair: 'SOLUSDT',
    bitfinexPair: 'tSOLUSD',
    pipSize: 0.01,
    lotMultiplier: 1
  },
  {
    id: 'EURUSDT',
    name: 'EUR/USDT (Euro / Dollar)',
    category: 'Forex',
    binancePair: 'EURUSDT',
    bitfinexPair: 'tEURUSD',
    pipSize: 0.0001,
    lotMultiplier: 100000
  },
  {
    id: 'XRPUSDT',
    name: 'XRP/USDT (Ripple)',
    category: 'Crypto',
    binancePair: 'XRPUSDT',
    bitfinexPair: 'tXRPUSD',
    pipSize: 0.0001,
    lotMultiplier: 1000
  },
  {
    id: 'BNBUSDT',
    name: 'BNB/USDT (Binance Coin)',
    category: 'Crypto',
    binancePair: 'BNBUSDT',
    pipSize: 0.1,
    lotMultiplier: 1
  }
];

export const TIMEFRAMES = [
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
  { label: '15m', value: '15m', seconds: 900 },
  { label: '1h', value: '1h', seconds: 3600 },
  { label: '4h', value: '4h', seconds: 14400 },
  { label: '1D', value: '1d', seconds: 86400 }
];

const memoryCache = new Map<string, BacktestCandle[]>();

/**
 * Fetch a single page of klines from Binance
 */
async function fetchBinanceBatch(
  pair: string,
  interval: string,
  startTime?: number,
  endTime?: number,
  limit: number = 1000,
  useVision: boolean = false
): Promise<BacktestCandle[] | null> {
  const host = useVision ? 'https://data-api.binance.vision' : 'https://api.binance.com';
  let url = `${host}/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
  if (startTime) url += `&startTime=${startTime}`;
  if (endTime) url += `&endTime=${endTime}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const candles: BacktestCandle[] = data.map((item: any) => ({
      time: Math.floor(Number(item[0]) / 1000),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    }));

    return candles;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch historical candles from Bitfinex
 */
async function fetchBitfinexBatch(
  pair: string,
  interval: string,
  startTime?: number,
  endTime?: number,
  limit: number = 1000
): Promise<BacktestCandle[] | null> {
  const bfxTf = interval === '1d' ? '1D' : interval;
  let url = `https://api-pub.bitfinex.com/v2/candles/trade:${bfxTf}:${pair}/hist?sort=1&limit=${limit}`;
  if (startTime) url += `&start=${startTime}`;
  if (endTime) url += `&end=${endTime}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // Bitfinex format: [MTS, OPEN, CLOSE, HIGH, LOW, VOLUME]
    const candles: BacktestCandle[] = data.map((item: any) => ({
      time: Math.floor(Number(item[0]) / 1000),
      open: Number(item[1]),
      high: Number(item[3]),
      low: Number(item[4]),
      close: Number(item[2]),
      volume: Number(item[5])
    }));

    return candles;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch real market data for a given asset, timeframe, and optional center/start date.
 * Fetches up to multiple pages of real market historical data (1,000 to 3,000+ real candles)
 * allowing users to backtest over 1+ year old authentic market history.
 */
export async function fetchRealHistoricalCandles(
  assetId: string,
  timeframe: string,
  startDate?: Date,
  totalCandlesGoal: number = 1500
): Promise<{ candles: BacktestCandle[]; source: string }> {
  const asset = SUPPORTED_ASSETS.find(a => a.id === assetId) || SUPPORTED_ASSETS[0];
  const cacheKey = `${asset.id}_${timeframe}_${startDate ? startDate.toISOString().split('T')[0] : 'latest'}`;

  if (memoryCache.has(cacheKey)) {
    return { candles: memoryCache.get(cacheKey)!, source: 'Cache (Real Data)' };
  }

  let candles: BacktestCandle[] = [];
  let source = 'Binance Real Market Feed';

  // Calculate start / end time window
  let startMs: number | undefined;
  let endMs: number | undefined;

  if (startDate) {
    startMs = startDate.getTime();
  } else {
    // Default to a 1-year lookback period
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    startMs = oneYearAgo.getTime();
  }

  // Paging loop to collect historical candles
  let currentStart = startMs;
  let attempts = 0;
  const maxPages = Math.ceil(totalCandlesGoal / 1000);

  while (candles.length < totalCandlesGoal && attempts < maxPages) {
    attempts++;
    let batch = await fetchBinanceBatch(asset.binancePair, timeframe, currentStart, undefined, 1000, false);
    
    if (!batch || batch.length === 0) {
      // Try Binance Vision mirror
      batch = await fetchBinanceBatch(asset.binancePair, timeframe, currentStart, undefined, 1000, true);
    }

    if (!batch || batch.length === 0) {
      // Try Bitfinex if available
      if (asset.bitfinexPair) {
        batch = await fetchBitfinexBatch(asset.bitfinexPair, timeframe, currentStart, undefined, 1000);
        if (batch) source = 'Bitfinex Real Market Feed';
      }
    }

    if (!batch || batch.length === 0) break;

    // Deduplicate and append
    for (const c of batch) {
      if (candles.length === 0 || c.time > candles[candles.length - 1].time) {
        candles.push(c);
      }
    }

    // Set next start time to after the last candle
    if (batch.length > 0) {
      const lastTimeSec = batch[batch.length - 1].time;
      currentStart = (lastTimeSec + 1) * 1000;
    } else {
      break;
    }

    // If batch received was small, we reached recent time
    if (batch.length < 500) break;
  }

  // If start was specified in the future or no candles found from startMs, fetch latest
  if (candles.length === 0) {
    const latestBatch = await fetchBinanceBatch(asset.binancePair, timeframe, undefined, undefined, 1000, false);
    if (latestBatch && latestBatch.length > 0) {
      candles = latestBatch;
    }
  }

  // Ensure strict chronological sort
  candles.sort((a, b) => a.time - b.time);

  // Remove any duplicate timestamps
  const uniqueCandles: BacktestCandle[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0 || candles[i].time !== candles[i - 1].time) {
      uniqueCandles.push(candles[i]);
    }
  }

  if (uniqueCandles.length > 0) {
    memoryCache.set(cacheKey, uniqueCandles);
  }

  return {
    candles: uniqueCandles,
    source
  };
}
