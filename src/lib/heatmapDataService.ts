import { DEFAULT_HEATMAP_COINS } from './defaultHeatmapCoins';

export interface HeatmapItem {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  logoUrl?: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  change1h?: number;
  change7d?: number;
  high24h?: number;
  low24h?: number;
  rank: number;
  category: 'Layer 1' | 'DeFi' | 'Stablecoin' | 'Meme' | 'Gold & Metals' | 'Infrastructure' | 'Other';
  marketType: 'crypto' | 'gold';
}

const CACHE_KEY = 'tz_heatmap_cache_v2';
const CACHE_EXPIRY = 60 * 1000; // 1 minute fresh cache

// Curated 124+ real assets with authentic logos to guarantee 0ms instant startup & complete reliability
const BASE_MARKET_ASSETS: HeatmapItem[] = DEFAULT_HEATMAP_COINS;

export class HeatmapDataService {
  private static instance: HeatmapDataService;
  private items: HeatmapItem[] = [...BASE_MARKET_ASSETS];
  private lastFetchTime = 0;
  private listeners: Set<(items: HeatmapItem[]) => void> = new Set();
  private pollIntervalId: any = null;

  private constructor() {
    this.loadFromCache();
  }

  public static getInstance(): HeatmapDataService {
    if (!HeatmapDataService.instance) {
      HeatmapDataService.instance = new HeatmapDataService();
    }
    return HeatmapDataService.instance;
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          this.items = parsed.items;
          this.lastFetchTime = parsed.timestamp || 0;
        }
      }
    } catch (e) {
      console.warn('[HeatmapDataService] Cache load error:', e);
    }
  }

  private saveToCache(): void {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          items: this.items,
          timestamp: Date.now()
        })
      );
    } catch (e) {
      console.warn('[HeatmapDataService] Cache save error:', e);
    }
  }

  public subscribe(listener: (items: HeatmapItem[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.items);

    if (this.listeners.size === 1) {
      this.startLiveUpdates();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopLiveUpdates();
      }
    };
  }

  private notify(): void {
    const list = [...this.items];
    this.listeners.forEach(fn => fn(list));
  }

  public getItems(): HeatmapItem[] {
    return [...this.items];
  }

  /**
   * Fetches real live market data from CoinGecko + Binance Live Ticker
   */
  public async refreshMarketData(): Promise<HeatmapItem[]> {
    try {
      // 1. Fetch top 250 cryptocurrencies from CoinGecko public API
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h,24h,7d'
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const fetchedItems: HeatmapItem[] = data.map((c: any, idx: number) => {
            let category: HeatmapItem['category'] = 'Other';
            const sym = (c.symbol || '').toUpperCase();
            const id = (c.id || '').toLowerCase();

            if (['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'AVAX', 'DOT', 'TRX', 'NEAR', 'SUI', 'APT', 'FTM', 'KAS'].includes(sym)) {
              category = 'Layer 1';
            } else if (['USDT', 'USDC', 'DAI', 'FDUSD', 'USDE', 'TUSD'].includes(sym)) {
              category = 'Stablecoin';
            } else if (['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI', 'BRETT', 'POPCAT'].includes(sym)) {
              category = 'Meme';
            } else if (['UNI', 'AAVE', 'MKR', 'CRV', 'LDO', 'PENDLE', 'RAY', 'JUP', 'SNX'].includes(sym)) {
              category = 'DeFi';
            } else if (['LINK', 'TIA', 'GRT', 'PYTH', 'RNDR', 'TAO', 'FIL', 'AR'].includes(sym)) {
              category = 'Infrastructure';
            } else if (id.includes('gold') || sym.includes('PAXG') || sym.includes('XAUT')) {
              category = 'Gold & Metals';
            }

            return {
              id: c.id,
              symbol: sym,
              displaySymbol: `${sym}USD`,
              name: c.name,
              logoUrl: c.image,
              price: c.current_price,
              marketCap: c.market_cap || c.fully_diluted_valuation || 1000000,
              volume24h: c.total_volume || 0,
              change24h: parseFloat((c.price_change_percentage_24h || 0).toFixed(2)),
              change1h: c.price_change_percentage_1h_in_currency !== undefined ? parseFloat(c.price_change_percentage_1h_in_currency.toFixed(2)) : undefined,
              change7d: c.price_change_percentage_7d_in_currency !== undefined ? parseFloat(c.price_change_percentage_7d_in_currency.toFixed(2)) : undefined,
              high24h: c.high_24h,
              low24h: c.low_24h,
              rank: c.market_cap_rank || idx + 1,
              category,
              marketType: category === 'Gold & Metals' ? 'gold' : 'crypto'
            };
          });

          // Ensure Gold and Precious Metals are always integrated
          const goldAssets = BASE_MARKET_ASSETS.filter(a => a.marketType === 'gold');
          const combined = [...fetchedItems];

          goldAssets.forEach(ga => {
            if (!combined.some(c => c.symbol === ga.symbol)) {
              combined.push(ga);
            }
          });

          this.items = combined;
          this.lastFetchTime = Date.now();
          this.saveToCache();
          this.notify();
        }
      }
    } catch (e) {
      console.warn('[HeatmapDataService] Live CoinGecko fetch failed, checking Binance live stream:', e);
    }

    // 2. Fetch live real-time Binance tickers for sub-second precision (BTC, ETH, SOL, PAXG, etc.)
    await this.syncBinanceLivePrices();
    return this.items;
  }

  /**
   * Synchronizes instant real-time prices & 24h change from Binance API
   */
  private async syncBinanceLivePrices(): Promise<void> {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!res.ok) return;

      const tickers = await res.json();
      if (!Array.isArray(tickers)) return;

      const tickerMap = new Map<string, any>();
      tickers.forEach(t => {
        if (t.symbol && t.symbol.endsWith('USDT')) {
          const base = t.symbol.replace('USDT', '');
          tickerMap.set(base, t);
        }
      });

      let updated = false;
      this.items = this.items.map(item => {
        const binanceTick = tickerMap.get(item.symbol);
        if (binanceTick) {
          updated = true;
          const livePrice = parseFloat(binanceTick.lastPrice);
          const liveChange = parseFloat(parseFloat(binanceTick.priceChangePercent).toFixed(2));
          const liveVol = parseFloat(binanceTick.quoteVolume);
          const liveHigh = parseFloat(binanceTick.highPrice);
          const liveLow = parseFloat(binanceTick.lowPrice);

          // Update market cap proportionally with live price change
          const priceRatio = item.price > 0 ? livePrice / item.price : 1;
          const liveCap = item.marketCap * priceRatio;

          return {
            ...item,
            price: livePrice,
            change24h: liveChange,
            marketCap: Math.round(liveCap),
            volume24h: Math.round(liveVol),
            high24h: liveHigh,
            low24h: liveLow
          };
        }

        // Special handling for Spot Gold XAU (synced from PAXG token spot price)
        if (item.symbol === 'XAU') {
          const paxg = tickerMap.get('PAXG');
          if (paxg) {
            updated = true;
            return {
              ...item,
              price: parseFloat(paxg.lastPrice),
              change24h: parseFloat(parseFloat(paxg.priceChangePercent).toFixed(2)),
              high24h: parseFloat(paxg.highPrice),
              low24h: parseFloat(paxg.lowPrice)
            };
          }
        }

        return item;
      });

      if (updated) {
        this.saveToCache();
        this.notify();
      }
    } catch (err) {
      console.warn('[HeatmapDataService] Binance live sync error:', err);
    }
  }

  public startLiveUpdates(): void {
    if (this.pollIntervalId) return;

    // Refresh immediately
    this.refreshMarketData();

    // Poll Binance every 12 seconds for live changes
    this.pollIntervalId = setInterval(() => {
      this.syncBinanceLivePrices();
    }, 12000);
  }

  public stopLiveUpdates(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }
}

export const heatmapDataService = HeatmapDataService.getInstance();
