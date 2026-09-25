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

const CACHE_KEY = 'tz_heatmap_cache_v1';
const CACHE_EXPIRY = 60 * 1000; // 1 minute fresh cache

// Curated high-res base assets with categories to guarantee 0ms instant startup & complete reliability
const BASE_MARKET_ASSETS: HeatmapItem[] = [
  // Top Cryptocurrencies
  {
    id: 'bitcoin',
    symbol: 'BTC',
    displaySymbol: 'BTCUSD',
    name: 'Bitcoin',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    price: 83681.70,
    marketCap: 1684440561918,
    volume24h: 38017780368,
    change24h: -0.23,
    change1h: 0.05,
    change7d: 1.84,
    high24h: 85208,
    low24h: 83513,
    rank: 1,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    displaySymbol: 'ETHUSD',
    name: 'Ethereum',
    logoUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    price: 3412.50,
    marketCap: 412580000000,
    volume24h: 18450000000,
    change24h: 1.21,
    change1h: 0.12,
    change7d: 4.15,
    high24h: 3460,
    low24h: 3380,
    rank: 2,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'tether',
    symbol: 'USDT',
    displaySymbol: 'USDTUSD',
    name: 'Tether USDT',
    logoUrl: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    price: 1.00,
    marketCap: 118400000000,
    volume24h: 52100000000,
    change24h: 0.01,
    change1h: 0.00,
    change7d: 0.02,
    high24h: 1.002,
    low24h: 0.999,
    rank: 3,
    category: 'Stablecoin',
    marketType: 'crypto'
  },
  {
    id: 'binancecoin',
    symbol: 'BNB',
    displaySymbol: 'BNBUSD',
    name: 'BNB',
    logoUrl: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    price: 642.10,
    marketCap: 94100000000,
    volume24h: 1420000000,
    change24h: -0.14,
    change1h: -0.04,
    change7d: 2.10,
    high24h: 651,
    low24h: 638,
    rank: 4,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'solana',
    symbol: 'SOL',
    displaySymbol: 'SOLUSD',
    name: 'Solana',
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    price: 198.40,
    marketCap: 92400000000,
    volume24h: 4620000000,
    change24h: 4.16,
    change1h: 0.45,
    change7d: 11.20,
    high24h: 202,
    low24h: 189,
    rank: 5,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'usd-coin',
    symbol: 'USDC',
    displaySymbol: 'USDCUSD',
    name: 'USDC',
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    price: 1.00,
    marketCap: 35600000000,
    volume24h: 6100000000,
    change24h: -0.01,
    change1h: 0.00,
    change7d: 0.01,
    high24h: 1.001,
    low24h: 0.999,
    rank: 6,
    category: 'Stablecoin',
    marketType: 'crypto'
  },
  {
    id: 'ripple',
    symbol: 'XRP',
    displaySymbol: 'XRPUSD',
    name: 'XRP',
    logoUrl: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    price: 0.584,
    marketCap: 33100000000,
    volume24h: 1250000000,
    change24h: 1.17,
    change1h: 0.08,
    change7d: 3.40,
    high24h: 0.598,
    low24h: 0.575,
    rank: 7,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'dogecoin',
    symbol: 'DOGE',
    displaySymbol: 'DOGEUSD',
    name: 'Dogecoin',
    logoUrl: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    price: 0.142,
    marketCap: 20800000000,
    volume24h: 1150000000,
    change24h: 4.08,
    change1h: 0.32,
    change7d: 8.50,
    high24h: 0.148,
    low24h: 0.136,
    rank: 8,
    category: 'Meme',
    marketType: 'crypto'
  },
  {
    id: 'tron',
    symbol: 'TRX',
    displaySymbol: 'TRXUSD',
    name: 'TRON',
    logoUrl: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
    price: 0.158,
    marketCap: 13800000000,
    volume24h: 480000000,
    change24h: -0.81,
    change1h: -0.06,
    change7d: 1.20,
    high24h: 0.162,
    low24h: 0.156,
    rank: 9,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'cardano',
    symbol: 'ADA',
    displaySymbol: 'ADAUSD',
    name: 'Cardano',
    logoUrl: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    price: 0.362,
    marketCap: 13000000000,
    volume24h: 340000000,
    change24h: 0.80,
    change1h: 0.05,
    change7d: 2.10,
    high24h: 0.371,
    low24h: 0.355,
    rank: 10,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'avalanche-2',
    symbol: 'AVAX',
    displaySymbol: 'AVAXUSD',
    name: 'Avalanche',
    logoUrl: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
    price: 28.45,
    marketCap: 11450000000,
    volume24h: 390000000,
    change24h: 1.31,
    change1h: 0.14,
    change7d: 6.20,
    high24h: 29.20,
    low24h: 27.80,
    rank: 11,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'sui',
    symbol: 'SUI',
    displaySymbol: 'SUIUSD',
    name: 'Sui',
    logoUrl: 'https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png',
    price: 2.15,
    marketCap: 6150000000,
    volume24h: 620000000,
    change24h: 12.31,
    change1h: 0.85,
    change7d: 34.50,
    high24h: 2.22,
    low24h: 1.88,
    rank: 12,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'chainlink',
    symbol: 'LINK',
    displaySymbol: 'LINKUSD',
    name: 'Chainlink',
    logoUrl: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    price: 12.30,
    marketCap: 7480000000,
    volume24h: 280000000,
    change24h: 1.16,
    change1h: 0.10,
    change7d: 4.80,
    high24h: 12.60,
    low24h: 12.10,
    rank: 13,
    category: 'Infrastructure',
    marketType: 'crypto'
  },
  {
    id: 'shiba-inu',
    symbol: 'SHIB',
    displaySymbol: 'SHIBUSD',
    name: 'Shiba Inu',
    logoUrl: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
    price: 0.0000185,
    marketCap: 10900000000,
    volume24h: 420000000,
    change24h: 6.00,
    change1h: 0.22,
    change7d: 9.80,
    high24h: 0.0000192,
    low24h: 0.0000174,
    rank: 14,
    category: 'Meme',
    marketType: 'crypto'
  },
  {
    id: 'pepe',
    symbol: 'PEPE',
    displaySymbol: 'PEPEUSD',
    name: 'Pepe',
    logoUrl: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.png',
    price: 0.0000104,
    marketCap: 4370000000,
    volume24h: 890000000,
    change24h: 8.75,
    change1h: 0.55,
    change7d: 18.20,
    high24h: 0.0000109,
    low24h: 0.0000095,
    rank: 15,
    category: 'Meme',
    marketType: 'crypto'
  },
  {
    id: 'polkadot',
    symbol: 'DOT',
    displaySymbol: 'DOTUSD',
    name: 'Polkadot',
    logoUrl: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
    price: 4.25,
    marketCap: 6100000000,
    volume24h: 180000000,
    change24h: -0.63,
    change1h: -0.05,
    change7d: 1.10,
    high24h: 4.35,
    low24h: 4.18,
    rank: 16,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'uniswap',
    symbol: 'UNI',
    displaySymbol: 'UNIUSD',
    name: 'Uniswap',
    logoUrl: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
    price: 7.85,
    marketCap: 4720000000,
    volume24h: 195000000,
    change24h: 1.05,
    change1h: 0.12,
    change7d: 5.40,
    high24h: 8.05,
    low24h: 7.68,
    rank: 17,
    category: 'DeFi',
    marketType: 'crypto'
  },
  {
    id: 'near',
    symbol: 'NEAR',
    displaySymbol: 'NEARUSD',
    name: 'NEAR Protocol',
    logoUrl: 'https://assets.coingecko.com/coins/images/10365/large/near.png',
    price: 4.95,
    marketCap: 5980000000,
    volume24h: 310000000,
    change24h: 13.04,
    change1h: 0.70,
    change7d: 22.40,
    high24h: 5.10,
    low24h: 4.32,
    rank: 18,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'aptos',
    symbol: 'APT',
    displaySymbol: 'APTUSD',
    name: 'Aptos',
    logoUrl: 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png',
    price: 9.15,
    marketCap: 4580000000,
    volume24h: 220000000,
    change24h: 11.95,
    change1h: 0.60,
    change7d: 19.80,
    high24h: 9.40,
    low24h: 8.10,
    rank: 19,
    category: 'Layer 1',
    marketType: 'crypto'
  },
  {
    id: 'zcash',
    symbol: 'ZEC',
    displaySymbol: 'ZECUSD',
    name: 'Zcash',
    logoUrl: 'https://assets.coingecko.com/coins/images/486/large/circle-zcash-color.png',
    price: 38.60,
    marketCap: 620000000,
    volume24h: 68000000,
    change24h: 5.52,
    change1h: 0.35,
    change7d: 14.10,
    high24h: 39.40,
    low24h: 36.20,
    rank: 20,
    category: 'Layer 1',
    marketType: 'crypto'
  },

  // --- Real Gold & Precious Metals ---
  {
    id: 'spot-gold',
    symbol: 'XAU',
    displaySymbol: 'XAUUSD',
    name: 'Gold (Spot)',
    logoUrl: 'https://assets.coingecko.com/coins/images/9519/large/paxg.png',
    price: 2685.40,
    marketCap: 18250000000000, // Global above-ground gold reserves cap ~18.25 T
    volume24h: 145000000000,
    change24h: 0.42,
    change1h: 0.04,
    change7d: 1.15,
    high24h: 2698.20,
    low24h: 2672.10,
    rank: 1,
    category: 'Gold & Metals',
    marketType: 'gold'
  },
  {
    id: 'pax-gold',
    symbol: 'PAXG',
    displaySymbol: 'PAXGUSD',
    name: 'PAX Gold',
    logoUrl: 'https://assets.coingecko.com/coins/images/9519/large/paxg.png',
    price: 2684.80,
    marketCap: 495000000,
    volume24h: 18500000,
    change24h: 0.38,
    change1h: 0.03,
    change7d: 1.12,
    high24h: 2697.50,
    low24h: 2671.40,
    rank: 2,
    category: 'Gold & Metals',
    marketType: 'gold'
  },
  {
    id: 'tether-gold',
    symbol: 'XAUT',
    displaySymbol: 'XAUTUSD',
    name: 'Tether Gold',
    logoUrl: 'https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png',
    price: 2686.10,
    marketCap: 662000000,
    volume24h: 12400000,
    change24h: 0.45,
    change1h: 0.05,
    change7d: 1.18,
    high24h: 2699.00,
    low24h: 2673.00,
    rank: 3,
    category: 'Gold & Metals',
    marketType: 'gold'
  },
  {
    id: 'spot-silver',
    symbol: 'XAG',
    displaySymbol: 'XAGUSD',
    name: 'Silver (Spot)',
    logoUrl: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    price: 31.85,
    marketCap: 1750000000000, // Global silver reserves cap
    volume24h: 32000000000,
    change24h: 1.65,
    change1h: 0.18,
    change7d: 3.80,
    high24h: 32.40,
    low24h: 31.10,
    rank: 4,
    category: 'Gold & Metals',
    marketType: 'gold'
  },
  {
    id: 'spot-platinum',
    symbol: 'XPT',
    displaySymbol: 'XPTUSD',
    name: 'Platinum (Spot)',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    price: 998.50,
    marketCap: 260000000000,
    volume24h: 4200000000,
    change24h: -0.72,
    change1h: -0.05,
    change7d: -1.40,
    high24h: 1012,
    low24h: 992,
    rank: 5,
    category: 'Gold & Metals',
    marketType: 'gold'
  }
];

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
      // 1. Fetch top 100 cryptocurrencies from CoinGecko public API
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h,24h,7d'
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
