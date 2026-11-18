import { Datafeed, SymbolInfo, Period, DatafeedSubscribeCallback } from '@simahfud/klinecharts-pro';
import { KLineData } from 'klinecharts';

interface BinanceSymbolFilter {
  filterType: string;
  tickSize?: string;
  stepSize?: string;
  [key: string]: any;
}

interface BinanceSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  filters: BinanceSymbolFilter[];
}

interface BinanceExchangeInfo {
  symbols: BinanceSymbol[];
}

/**
 * Maps KlineCharts Period to Binance kline interval string
 */
export function periodToBinanceInterval(period: Period): string {
  const { multiplier, timespan } = period;
  const ts = (timespan || '').toLowerCase();

  if (ts.startsWith('min')) {
    // 1m, 3m, 5m, 15m, 30m
    return `${multiplier}m`;
  }
  if (ts.startsWith('hour')) {
    // 1h, 2h, 4h, 6h, 8h, 12h
    return `${multiplier}h`;
  }
  if (ts.startsWith('day')) {
    // 1d, 3d
    return `${multiplier}d`;
  }
  if (ts.startsWith('week')) {
    // 1w
    return `${multiplier}w`;
  }
  if (ts.startsWith('month')) {
    // 1M
    return `${multiplier}M`;
  }
  return '1h';
}

/**
 * Curated list of popular USDT trading pairs shown by default
 */
const POPULAR_USDT_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'SUIUSDT',
  'NEARUSDT',
  'DOTUSDT',
  'LTCUSDT',
  'PEPEUSDT',
  'SHIBUSDT'
];

/**
 * Production-ready Binance Spot Datafeed for KlineCharts Pro
 */
export class BinanceDatafeed implements Datafeed {
  private _cachedExchangeInfo: BinanceExchangeInfo | null = null;
  private _lastCacheTime = 0;
  private _cacheDurationMs = 10 * 60 * 1000; // 10 minutes cache

  private _activeWs: WebSocket | null = null;
  private _activeSymbol: SymbolInfo | null = null;
  private _activePeriod: Period | null = null;
  private _activeCallback: DatafeedSubscribeCallback | null = null;
  private _reconnectTimer: any = null;
  private _isUnsubscribed = false;

  /**
   * Search available trading symbols from Binance Exchange Info
   */
  async searchSymbols(search?: string): Promise<SymbolInfo[]> {
    try {
      const now = Date.now();
      if (!this._cachedExchangeInfo || now - this._lastCacheTime > this._cacheDurationMs) {
        const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        if (!res.ok) {
          throw new Error(`Failed to fetch exchangeInfo: ${res.statusText}`);
        }
        this._cachedExchangeInfo = await res.json();
        this._lastCacheTime = now;
      }

      if (!this._cachedExchangeInfo || !Array.isArray(this._cachedExchangeInfo.symbols)) {
        return [];
      }

      // Filter only USDT pairs currently actively trading
      const usdtSymbols = this._cachedExchangeInfo.symbols.filter(
        (s) => s.quoteAsset === 'USDT' && s.status === 'TRADING'
      );

      const query = (search || '').trim().toLowerCase();

      let matched = usdtSymbols;
      if (query) {
        matched = usdtSymbols.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query) ||
            s.baseAsset.toLowerCase().includes(query)
        );
      } else {
        // Sort popular symbols first
        matched = [...usdtSymbols].sort((a, b) => {
          const aIndex = POPULAR_USDT_SYMBOLS.indexOf(a.symbol);
          const bIndex = POPULAR_USDT_SYMBOLS.indexOf(b.symbol);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.symbol.localeCompare(b.symbol);
        });
      }

      // Format to SymbolInfo with dynamic precision calculation
      return matched.slice(0, 50).map((s) => {
        // Calculate pricePrecision from PRICE_FILTER tickSize
        const priceFilter = s.filters?.find((f) => f.filterType === 'PRICE_FILTER');
        const tickSize = priceFilter?.tickSize || '0.01';
        let pricePrecision = 2;
        if (tickSize.includes('.')) {
          pricePrecision = tickSize.split('.')[1].replace(/0+$/, '').length;
        }

        // Calculate volumePrecision from LOT_SIZE stepSize
        const lotSizeFilter = s.filters?.find((f) => f.filterType === 'LOT_SIZE');
        const stepSize = lotSizeFilter?.stepSize || '0.0001';
        let volumePrecision = 4;
        if (stepSize.includes('.')) {
          volumePrecision = stepSize.split('.')[1].replace(/0+$/, '').length;
        }

        return {
          ticker: s.symbol,
          name: `${s.baseAsset}/${s.quoteAsset}`,
          shortName: s.baseAsset,
          exchange: 'Binance',
          market: 'crypto',
          pricePrecision,
          volumePrecision,
          priceCurrency: s.quoteAsset,
          type: 'crypto'
        };
      });
    } catch (err) {
      console.error('[BinanceDatafeed] Error in searchSymbols:', err);
      // Fallback default symbols
      return [
        {
          ticker: 'BTCUSDT',
          name: 'BTC/USDT',
          shortName: 'BTC',
          exchange: 'Binance',
          market: 'crypto',
          pricePrecision: 2,
          volumePrecision: 4,
          priceCurrency: 'USDT',
          type: 'crypto'
        },
        {
          ticker: 'ETHUSDT',
          name: 'ETH/USDT',
          shortName: 'ETH',
          exchange: 'Binance',
          market: 'crypto',
          pricePrecision: 2,
          volumePrecision: 4,
          priceCurrency: 'USDT',
          type: 'crypto'
        },
        {
          ticker: 'SOLUSDT',
          name: 'SOL/USDT',
          shortName: 'SOL',
          exchange: 'Binance',
          market: 'crypto',
          pricePrecision: 2,
          volumePrecision: 3,
          priceCurrency: 'USDT',
          type: 'crypto'
        }
      ];
    }
  }

  /**
   * Fetch historical klines from Binance REST API
   */
  async getHistoryKLineData(
    symbol: SymbolInfo,
    period: Period,
    from: number,
    to: number
  ): Promise<KLineData[]> {
    try {
      const interval = periodToBinanceInterval(period);
      let url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(
        symbol.ticker
      )}&interval=${interval}&limit=1000`;

      if (from && from > 0) {
        url += `&startTime=${Math.floor(from)}`;
      }
      if (to && to > 0) {
        url += `&endTime=${Math.floor(to)}`;
      }

      let res = await fetch(url);
      let rawData = res.ok ? await res.json() : [];

      // If bounded query returned empty (e.g. system date drift or holiday gap), fetch the most recent 1000 klines
      if (!Array.isArray(rawData) || rawData.length === 0) {
        const fallbackUrl = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(
          symbol.ticker
        )}&interval=${interval}&limit=1000`;
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (Array.isArray(fbData) && fbData.length > 0) {
            rawData = fbData;
          }
        }
      }

      if (!Array.isArray(rawData) || rawData.length === 0) {
        return [];
      }

      // Map raw Binance 12-element array into KLineData
      return rawData.map((d: any[]) => ({
        timestamp: Number(d[0]),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
        turnover: parseFloat(d[7])
      }));
    } catch (err) {
      console.error('[BinanceDatafeed] Error in getHistoryKLineData:', err);
      return [];
    }
  }

  /**
   * Subscribe to real-time live klines via Binance WebSocket
   */
  subscribe(
    symbol: SymbolInfo,
    period: Period,
    callback: DatafeedSubscribeCallback
  ): void {
    this._isUnsubscribed = false;
    this._activeSymbol = symbol;
    this._activePeriod = period;
    this._activeCallback = callback;

    this._connectWs();
  }

  /**
   * Internal WebSocket connection with resilience and automatic reconnect
   */
  private _connectWs(): void {
    this._cleanupWs();

    if (this._isUnsubscribed || !this._activeSymbol || !this._activePeriod) {
      return;
    }

    const interval = periodToBinanceInterval(this._activePeriod);
    const streamName = `${this._activeSymbol.ticker.toLowerCase()}@kline_${interval}`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      const ws = new WebSocket(wsUrl);
      this._activeWs = ws;

      ws.onopen = () => {
        // Connected successfully
      };

      ws.onmessage = (event: MessageEvent) => {
        if (this._isUnsubscribed || !this._activeCallback) return;
        try {
          const data = JSON.parse(event.data);
          if (data && data.k) {
            const k = data.k;
            this._activeCallback({
              timestamp: Number(k.t),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              turnover: parseFloat(k.q)
            });
          }
        } catch (err) {
          console.error('[BinanceDatafeed] Failed to parse WebSocket kline data:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[BinanceDatafeed] WebSocket encountered an error:', err);
      };

      ws.onclose = () => {
        // If not intentionally unsubscribed, auto-reconnect after 3 seconds
        if (!this._isUnsubscribed) {
          if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
          this._reconnectTimer = setTimeout(() => {
            if (!this._isUnsubscribed) {
              this._connectWs();
            }
          }, 3000);
        }
      };
    } catch (err) {
      console.error('[BinanceDatafeed] Failed to initiate WebSocket connection:', err);
      if (!this._isUnsubscribed) {
        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(() => {
          if (!this._isUnsubscribed) {
            this._connectWs();
          }
        }, 3000);
      }
    }
  }

  /**
   * Clean up active WebSocket instance
   */
  private _cleanupWs(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (this._activeWs) {
      // Remove event handlers to prevent reconnect loops on manual close
      this._activeWs.onopen = null;
      this._activeWs.onmessage = null;
      this._activeWs.onerror = null;
      this._activeWs.onclose = null;

      try {
        if (
          this._activeWs.readyState === WebSocket.OPEN ||
          this._activeWs.readyState === WebSocket.CONNECTING
        ) {
          this._activeWs.close();
        }
      } catch (e) {
        // ignore
      }
      this._activeWs = null;
    }
  }

  /**
   * Unsubscribe and teardown WebSocket connection cleanly
   */
  unsubscribe(symbol: SymbolInfo, period: Period): void {
    this._isUnsubscribed = true;
    this._cleanupWs();
    this._activeCallback = null;
    this._activeSymbol = null;
    this._activePeriod = null;
  }

  /**
   * Destroy the entire datafeed instance
   */
  destroy(): void {
    this.unsubscribe({ ticker: '' }, { multiplier: 1, timespan: 'hour', text: '1h' });
    this._cachedExchangeInfo = null;
  }
}

export const binanceDatafeed = new BinanceDatafeed();
