export interface MarketTicker {
  symbol: string;
  displaySymbol: string;
  name: string;
  price: number;
  formattedPrice: string;
  changePercent: number;
  isPositive: boolean;
  sparkline: number[]; // Array of normalized values for SVG sparkline (0 to 100)
  category: 'Gold' | 'Crypto' | 'Forex' | 'Indices' | 'Equities';
}

export interface RawHeadline {
  id: string;
  source: string;
  sourceColor?: string;
  title: string;
  description?: string;
  url?: string;
  timeAgo: string;
  timestamp: number;
  tags?: string[];
}

export interface MarketIntelligenceCard {
  id: string;
  heat: number; // e.g. 82, 79, 71, 78, 75
  isTopStory?: boolean;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeBadge: 'NOW' | 'TODAY' | 'WEEK';
  title: string;
  description: string;
  watchCallout?: string;
  highlightTags?: string[];
  affectedSymbols: string[];
  relatedAsset?: {
    symbol: string;
    changeText: string;
    isPositive: boolean;
    price?: string;
    sparkline?: number[];
  };
  isUserMarket?: boolean; // True if matches user's traded symbols
}

export interface GlobalSessionStatus {
  code: 'SYD' | 'TOK' | 'LON' | 'NY';
  name: string;
  isOpen: boolean;
}

/**
 * Calculates active market sessions based on UTC hour
 */
export function getActiveMarketSessions(utcHour: number): GlobalSessionStatus[] {
  // Sydney: 22:00 - 07:00 UTC
  const sydOpen = utcHour >= 22 || utcHour < 7;
  // Tokyo: 00:00 - 09:00 UTC
  const tokOpen = utcHour >= 0 && utcHour < 9;
  // London: 08:00 - 16:00 UTC
  const lonOpen = utcHour >= 8 && utcHour < 16;
  // New York: 13:00 - 22:00 UTC
  const nyOpen = utcHour >= 13 && utcHour < 22;

  return [
    { code: 'SYD', name: 'Sydney', isOpen: sydOpen },
    { code: 'TOK', name: 'Tokyo', isOpen: tokOpen },
    { code: 'LON', name: 'London', isOpen: lonOpen },
    { code: 'NY', name: 'New York', isOpen: nyOpen },
  ];
}

/**
 * Generates an SVG path string from sparkline points for mini charts
 */
export function generateSparklineSvgPath(points: number[], width = 60, height = 20): string {
  if (!points || points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

// In-memory persistent cache for live tickers across tick updates
let cachedTickers: MarketTicker[] = [
  {
    symbol: 'XAUUSD',
    displaySymbol: 'XAUUSD',
    name: 'Gold Spot / USD',
    price: 4361.20,
    formattedPrice: '4,361.20',
    changePercent: 0.34,
    isPositive: true,
    sparkline: [40, 42, 50, 55, 62, 60, 68, 74, 82, 85],
    category: 'Gold',
  },
  {
    symbol: 'BTCUSD',
    displaySymbol: 'BTCUSD',
    name: 'Bitcoin',
    price: 76592.50,
    formattedPrice: '$76,592',
    changePercent: 1.13,
    isPositive: true,
    sparkline: [35, 40, 45, 52, 60, 68, 75, 80, 85, 92],
    category: 'Crypto',
  },
  {
    symbol: 'ETHUSD',
    displaySymbol: 'ETHUSD',
    name: 'Ethereum',
    price: 2459.75,
    formattedPrice: '$2,459.75',
    changePercent: 2.86,
    isPositive: true,
    sparkline: [40, 45, 48, 52, 58, 65, 70, 78, 82],
    category: 'Crypto',
  },
  {
    symbol: 'SOLUSD',
    displaySymbol: 'SOLUSD',
    name: 'Solana',
    price: 100.87,
    formattedPrice: '$100.87',
    changePercent: 3.75,
    isPositive: true,
    sparkline: [30, 38, 45, 50, 60, 70, 78, 85, 90],
    category: 'Crypto',
  },
  {
    symbol: 'XRPUSD',
    displaySymbol: 'XRPUSD',
    name: 'XRP / Ripple',
    price: 1.30,
    formattedPrice: '$1.300',
    changePercent: 2.57,
    isPositive: true,
    sparkline: [45, 48, 52, 55, 62, 68, 72, 75],
    category: 'Crypto',
  },
  {
    symbol: 'BNBUSD',
    displaySymbol: 'BNBUSD',
    name: 'BNB Coin',
    price: 727.16,
    formattedPrice: '$727.16',
    changePercent: 1.94,
    isPositive: true,
    sparkline: [50, 52, 55, 58, 65, 70, 72, 76],
    category: 'Crypto',
  },
  {
    symbol: 'DOGEUSD',
    displaySymbol: 'DOGEUSD',
    name: 'Dogecoin',
    price: 0.0817,
    formattedPrice: '$0.0817',
    changePercent: 3.03,
    isPositive: true,
    sparkline: [40, 42, 46, 50, 55, 62, 65, 70],
    category: 'Crypto',
  },
  {
    symbol: 'WTIUSD',
    displaySymbol: 'WTIUSD',
    name: 'Crude Oil',
    price: 91.75,
    formattedPrice: '91.75',
    changePercent: 0.49,
    isPositive: true,
    sparkline: [50, 48, 52, 55, 53, 58, 60, 59, 62, 65],
    category: 'Indices',
  },
];

/**
 * Fetches real-time market prices from Delta Exchange India
 */
export async function fetchLiveMarketTickers(): Promise<MarketTicker[]> {
  const updated = [...cachedTickers];

  // Fetch live Delta Exchange India tickers (BTCUSD, XAUTUSD, ETHUSD, SOLUSD, XRPUSD, BNBUSD, DOGEUSD)
  try {
    const deltaRes = await fetch('https://api.india.delta.exchange/v2/tickers', {
      signal: AbortSignal.timeout(6000),
    });
    if (deltaRes.ok) {
      const deltaData = await deltaRes.json();
      if (deltaData?.success && Array.isArray(deltaData.result)) {
        deltaData.result.forEach((item: any) => {
          const sym = item.symbol;
          const price = parseFloat(item.close || item.mark_price);
          const rawChange = parseFloat(item.mark_change_24h || item.ltp_change_24h || '0');
          if (isNaN(price)) return;

          if (sym === 'BTCUSD') {
            const idx = updated.findIndex(t => t.symbol === 'BTCUSD');
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                price,
                formattedPrice: `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                changePercent: !isNaN(rawChange) ? rawChange : updated[idx].changePercent,
                isPositive: rawChange >= 0,
              };
            }
          } else if (sym === 'XAUTUSD') {
            const idx = updated.findIndex(t => t.symbol === 'XAUUSD');
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                price,
                formattedPrice: price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                changePercent: !isNaN(rawChange) ? rawChange : updated[idx].changePercent,
                isPositive: rawChange >= 0,
              };
            }
          } else if (sym === 'ETHUSD') {
            const idx = updated.findIndex(t => t.symbol === 'ETHUSD');
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                price,
                formattedPrice: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                changePercent: !isNaN(rawChange) ? rawChange : updated[idx].changePercent,
                isPositive: rawChange >= 0,
              };
            }
          } else if (sym === 'SOLUSD') {
            const idx = updated.findIndex(t => t.symbol === 'SOLUSD');
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                price,
                formattedPrice: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                changePercent: !isNaN(rawChange) ? rawChange : updated[idx].changePercent,
                isPositive: rawChange >= 0,
              };
            }
          } else if (sym === 'XRPUSD') {
            const idx = updated.findIndex(t => t.symbol === 'XRPUSD');
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                price,
                formattedPrice: `$${price.toFixed(4)}`,
                changePercent: !isNaN(rawChange) ? rawChange : updated[idx].changePercent,
                isPositive: rawChange >= 0,
              };
            }
          } else if (sym === 'BNBUSD') {
            const idx = updated.findIndex(t => t.symbol === 'BNBUSD');
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                price,
                formattedPrice: `$${price.toFixed(2)}`,
                changePercent: !isNaN(rawChange) ? rawChange : updated[idx].changePercent,
                isPositive: rawChange >= 0,
              };
            }
          } else if (sym === 'DOGEUSD') {
            const idx = updated.findIndex(t => t.symbol === 'DOGEUSD');
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                price,
                formattedPrice: `$${price.toFixed(4)}`,
                changePercent: !isNaN(rawChange) ? rawChange : updated[idx].changePercent,
                isPositive: rawChange >= 0,
              };
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Delta India live ticker fetch failed, attempting backup', err);
  }

  cachedTickers = updated;
  return updated;
}

/**
 * Applies a live sub-second micro-tick jitter so prices tick naturally like an institutional terminal
 */
export function applyLiveMicroTick(tickers: MarketTicker[]): MarketTicker[] {
  // Randomly select 1 to 3 tickers to jitter slightly (within ±0.02%)
  const pickCount = Math.floor(Math.random() * 2) + 1;
  const clone = [...tickers];

  for (let i = 0; i < pickCount; i++) {
    const targetIdx = Math.floor(Math.random() * clone.length);
    const item = { ...clone[targetIdx] };
    const pctChange = (Math.random() - 0.49) * 0.04; // small delta
    const multiplier = 1 + pctChange / 100;
    const newPrice = item.price * multiplier;
    const newChange = +(item.changePercent + pctChange * 0.5).toFixed(2);

    item.price = newPrice;
    item.changePercent = newChange;
    item.isPositive = newChange >= 0;

    // Re-format price
    if (item.symbol.includes('BTC')) {
      item.formattedPrice = `$${Math.round(newPrice).toLocaleString('en-US')}`;
    } else if (item.symbol.includes('USDJPY') || item.symbol.includes('WTI') || item.symbol.includes('COIN') || item.symbol.includes('HOOD')) {
      item.formattedPrice = newPrice.toFixed(2);
    } else if (item.symbol.includes('EUR') || item.symbol.includes('GBP')) {
      item.formattedPrice = newPrice.toFixed(4);
    } else if (item.symbol.includes('XAU')) {
      item.formattedPrice = newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    clone[targetIdx] = item;
  }

  cachedTickers = clone;
  return clone;
}

/**
 * Returns immediate initial market tickers so the escalator tape starts moving with full width on frame 0
 */
export function getInitialMarketTickers(): MarketTicker[] {
  return [...cachedTickers];
}

/**
 * Returns immediate initial headlines so news feeds render instantly on frame 0
 */
export function getInitialHeadlines(): RawHeadline[] {
  return [...FALLBACK_HEADLINES];
}

function decodeHtml(html: string): string {
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&amp;#038;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function parseRssDate(raw: string | undefined): number {
  if (!raw) return Date.now();
  if (raw.includes('Z') || raw.includes('+') || raw.includes('GMT') || raw.includes('UTC')) {
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  // Standard "YYYY-MM-DD HH:mm:ss" from rss2json is in UTC
  const normalized = raw.trim().replace(' ', 'T') + 'Z';
  const parsed = new Date(normalized).getTime();
  return !isNaN(parsed) ? parsed : Date.now();
}

/**
 * Curated fallback headlines if internet RSS is temporarily unreachable
 */
export const FALLBACK_HEADLINES: RawHeadline[] = [
  {
    id: 'h1',
    source: 'COINTELEGRAPH',
    sourceColor: 'text-orange-400',
    title: 'Bitcoin coils near $76.5K as US stocks rebound from Fed rate hike',
    timeAgo: '14m ago',
    timestamp: Date.now() - 14 * 60000,
    tags: ['BTCUSD', 'Fed', 'Macro'],
  },
  {
    id: 'h2',
    source: 'DECRYPT',
    sourceColor: 'text-emerald-400',
    title: 'Financial Data Giant S&P Global Moves Deeper Into Crypto With OpenZeppelin Deal',
    timeAgo: '22m ago',
    timestamp: Date.now() - 22 * 60000,
    tags: ['Institutional', 'Web3'],
  },
  {
    id: 'h3',
    source: 'CNBC',
    sourceColor: 'text-blue-400',
    title: 'Bank of England defies Fed rate lead, holding benchmark borrowing rates steady',
    timeAgo: '35m ago',
    timestamp: Date.now() - 35 * 60000,
    tags: ['Rates', 'CentralBanks', 'Macro'],
  },
  {
    id: 'h4',
    source: 'COINDESK',
    sourceColor: 'text-amber-400',
    title: 'Institutional inflows into spot Bitcoin and Ethereum ETFs reach weekly high',
    timeAgo: '48m ago',
    timestamp: Date.now() - 48 * 60000,
    tags: ['BTCUSD', 'ETHUSD', 'ETF'],
  },
  {
    id: 'h5',
    source: 'BLOOMBERG',
    sourceColor: 'text-cyan-400',
    title: 'Gold advances near record peak as safe-haven bid accelerates and yields compress',
    timeAgo: '1h ago',
    timestamp: Date.now() - 65 * 60000,
    tags: ['Gold', 'XAUUSD', 'Yields'],
  },
  {
    id: 'h6',
    source: 'YAHOO FINANCE',
    sourceColor: 'text-purple-400',
    title: 'Mysterious macro trader repositions $120 million ahead of FOMC policy guidance',
    timeAgo: '1h ago',
    timestamp: Date.now() - 75 * 60000,
    tags: ['Fed', 'Rates', 'Macro'],
  },
  {
    id: 'h7',
    source: 'OILPRICE',
    sourceColor: 'text-rose-400',
    title: 'Crude oil consolidates near $91 as geopolitical tensions and Middle East supply dynamics hold focus',
    timeAgo: '2h ago',
    timestamp: Date.now() - 110 * 60000,
    tags: ['WTIUSD', 'Energy'],
  },
  {
    id: 'h8',
    source: 'DECRYPT',
    sourceColor: 'text-emerald-400',
    title: 'SEC clears a path for tokenized stock futures as 24/7 institutional trading expands',
    timeAgo: '2h ago',
    timestamp: Date.now() - 130 * 60000,
    tags: ['Regulation', 'Markets'],
  }
];

/**
 * Fetches real live news articles from curated RSS feeds (Cointelegraph, Decrypt, CNBC, CoinDesk, Yahoo Finance)
 */
export async function fetchLiveNewsHeadlines(): Promise<RawHeadline[]> {
  const feedDefs = [
    { source: 'COINTELEGRAPH', url: 'https://cointelegraph.com/rss', color: 'text-orange-400' },
    { source: 'DECRYPT', url: 'https://decrypt.co/feed', color: 'text-emerald-400' },
    { source: 'CNBC', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', color: 'text-blue-400' },
    { source: 'COINDESK', url: 'https://feeds.feedburner.com/CoinDesk', color: 'text-amber-400' },
    { source: 'YAHOO FINANCE', url: 'https://finance.yahoo.com/news/rssindex', color: 'text-purple-400' },
  ];

  const results: RawHeadline[] = [];
  const cacheBuster = Math.floor(Date.now() / 60000); // 1-minute cache buster

  const promises = feedDefs.map(async (feed) => {
    try {
      const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&_t=${cacheBuster}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8500) });
      if (res.ok) {
        const data = await res.json();
        if (data?.items && Array.isArray(data.items)) {
          data.items.slice(0, 8).forEach((item: any, idx: number) => {
            const title = decodeHtml(item.title || '');
            const desc = decodeHtml(item.description || item.content || '');
            if (!title) return;

            // Skip irrelevant lifestyle/personal finance articles
            const lower = title.toLowerCase();
            if (
              lower.includes('buy a house') ||
              lower.includes('rental property') ||
              lower.includes('heloc') ||
              lower.includes('holiday travel') ||
              lower.includes('flying home') ||
              lower.includes('renters are gaining') ||
              lower.includes('personal finance')
            ) {
              return;
            }

            const pubDate = parseRssDate(item.pubDate);
            const diffMins = Math.max(1, Math.floor((Date.now() - pubDate) / 60000));
            const timeAgo = diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;

            results.push({
              id: `rss-${feed.source}-${idx}-${pubDate}`,
              source: feed.source,
              sourceColor: feed.color,
              title,
              description: desc,
              url: item.link,
              timeAgo,
              timestamp: pubDate,
              tags: item.categories || [],
            });
          });
        }
      }
    } catch {
      // Feed fetch failed, ignore gracefully
    }
  });

  await Promise.allSettled(promises);

  if (results.length > 0) {
    // Sort descending by timestamp (latest first)
    results.sort((a, b) => b.timestamp - a.timestamp);
    return results.slice(0, 30);
  }

  return FALLBACK_HEADLINES;
}

/**
 * Dynamically synthesizes the Top Story Hero Card and 2x2 Grid Cards from live headlines and live tickers!
 */
export function generateDynamicCardsFromLiveNews(
  headlines: RawHeadline[],
  liveTickers: MarketTicker[],
  userTradedSymbols: string[] = []
): {
  topStory: MarketIntelligenceCard;
  gridCards: MarketIntelligenceCard[];
} {
  const normalizedUserSymbols = userTradedSymbols.map(s => s.toUpperCase());

  const isUserMatch = (symbols: string[]) => {
    return symbols.some(sym => {
      const clean = sym.toUpperCase();
      return normalizedUserSymbols.some(u => u.includes(clean) || clean.includes(u));
    });
  };

  // Helper to find ticker by symbol
  const getTicker = (sym: string): MarketTicker | undefined => {
    return liveTickers.find(t => t.symbol.toUpperCase() === sym.toUpperCase());
  };

  // 1. Process headlines to identify major macroeconomic / market stories
  const parsedStories: MarketIntelligenceCard[] = [];

  headlines.forEach((h, index) => {
    const text = `${h.title} ${h.description || ''}`.toLowerCase();

    let affectedSymbols: string[] = [];
    let primarySymbol = 'BTCUSD';
    let sentiment: 'BULLISH' | 'BEARISH' = 'BULLISH';
    let highlightTags: string[] = [];
    let watchCallout = '';

    // Classify symbol
    if (text.includes('gold') || text.includes('bullion') || text.includes('xau') || text.includes('metal')) {
      affectedSymbols = ['XAUUSD'];
      primarySymbol = 'XAUUSD';
      highlightTags = ['Gold ATH Zone', 'Safe Haven Bid'];
      watchCallout = 'Watch Treasury yields and real interest rate expectations; monitor gold resistance break above $4,380.';
    } else if (text.includes('solana') || text.includes('sol')) {
      affectedSymbols = ['SOLUSD', 'BTCUSD'];
      primarySymbol = 'SOLUSD';
      highlightTags = ['Solana Network Activity', 'DeFi Momentum'];
      watchCallout = 'Track Solana breakout velocity and network fee accumulation.';
    } else if (text.includes('xrp') || text.includes('ripple') || text.includes('sec') || text.includes('regulation') || text.includes('etf')) {
      affectedSymbols = ['XRPUSD', 'BTCUSD'];
      primarySymbol = 'XRPUSD';
      highlightTags = ['Regulatory Clarity', 'Institutional Volume'];
      watchCallout = 'Monitor regulatory rulings and institutional ETF adoption trends.';
    } else if (text.includes('bitcoin') || text.includes('btc') || text.includes('crypto')) {
      affectedSymbols = ['BTCUSD', 'ETHUSD'];
      primarySymbol = 'BTCUSD';
      highlightTags = ['BTCUSD Key Resistance', 'ETF Net Inflows'];
      watchCallout = 'Watch for sustained liquidity expansion and institutional buying depth; test of next key high.';
    } else if (text.includes('fed') || text.includes('powell') || text.includes('rates') || text.includes('inflation') || text.includes('pmi') || text.includes('jobs') || text.includes('nfp') || text.includes('boe') || text.includes('bank')) {
      affectedSymbols = ['XAUUSD', 'BTCUSD'];
      primarySymbol = 'XAUUSD';
      highlightTags = ['Fed Policy Vigilance', 'Global Rate Trajectory'];
      watchCallout = 'Monitor sovereign bond yields and rate expectations as central banks pivot monetary policy.';
    } else if (text.includes('oil') || text.includes('crude') || text.includes('energy') || text.includes('opec') || text.includes('wti')) {
      affectedSymbols = ['WTIUSD'];
      primarySymbol = 'WTIUSD';
      highlightTags = ['WTI Supply Buffer', 'Energy Sector'];
      watchCallout = 'Watch Middle East geopolitical developments and weekly EIA crude inventory data.';
    } else {
      // General markets
      affectedSymbols = ['BTCUSD', 'XAUUSD'];
      primarySymbol = 'BTCUSD';
      highlightTags = ['Market Momentum', 'Risk Appetite'];
      watchCallout = 'Track broader macro liquidity breadth and cross-asset risk sentiment indicators.';
    }

    // Classify sentiment
    const bullishWords = ['surge', 'rally', 'soar', 'beat', 'jump', 'gain', 'high', 'record', 'bull', 'inflow', 'advance', 'rebound', 'boost', 'all-time'];
    const bearishWords = ['fall', 'drop', 'slump', 'miss', 'down', 'decline', 'crash', 'cut', 'hike', 'unwind', 'loss', 'sink', 'retreat', 'war', 'probe'];

    const bullCount = bullishWords.filter(w => text.includes(w)).length;
    const bearCount = bearishWords.filter(w => text.includes(w)).length;
    sentiment = bearCount > bullCount ? 'BEARISH' : 'BULLISH';

    // Calculate dynamic heat score (65 to 95)
    let heat = 72;
    const diffHours = (Date.now() - h.timestamp) / 3600000;
    if (diffHours < 1) heat += 12;
    else if (diffHours < 6) heat += 6;
    if (bullCount + bearCount >= 2) heat += 6;
    if (text.includes('fed') || text.includes('rate') || text.includes('billion') || text.includes('record')) heat += 5;
    heat = Math.min(95, Math.max(65, heat));

    const ticker = getTicker(primarySymbol);
    const relatedAsset = ticker ? {
      symbol: ticker.symbol,
      changeText: `${ticker.symbol} ${ticker.isPositive ? '+' : ''}${ticker.changePercent.toFixed(2)}%`,
      isPositive: ticker.isPositive,
      price: ticker.formattedPrice,
      sparkline: ticker.sparkline,
    } : undefined;

    parsedStories.push({
      id: `dynamic-${h.id}`,
      heat,
      impactLevel: heat >= 78 ? 'HIGH' : 'MEDIUM',
      sentiment,
      timeBadge: diffHours < 2 ? 'NOW' : diffHours < 24 ? 'TODAY' : 'WEEK',
      title: h.title,
      description: h.description || `${h.title} has entered active focus as institutional market participants digest cross-asset implications for risk and currency markets.`,
      watchCallout,
      highlightTags,
      affectedSymbols,
      relatedAsset,
      isUserMarket: isUserMatch(affectedSymbols),
    });
  });

  // If we have parsed stories, select Top Story and 4 Grid Cards
  if (parsedStories.length >= 5) {
    // Sort by heat descending
    parsedStories.sort((a, b) => b.heat - a.heat);

    // Top Story is #1
    const top = { ...parsedStories[0], isTopStory: true };

    // Select 4 diverse grid cards
    const grid = parsedStories.slice(1, 5);

    return { topStory: top, gridCards: grid };
  }

  // Otherwise, use fallback reference stories with LIVE real prices bound!
  const btcTicker = getTicker('BTCUSD') || { symbol: 'BTCUSD', formattedPrice: '$76,420', changePercent: 1.06, isPositive: true };
  const us500Ticker = getTicker('US500') || { symbol: 'US500', formattedPrice: '7,747.7', changePercent: 1.06, isPositive: true };
  const jpyTicker = getTicker('USDJPY') || { symbol: 'USDJPY', formattedPrice: '155.94', changePercent: -1.72, isPositive: false };

  const topStory: MarketIntelligenceCard = {
    id: 'top-story-ism',
    heat: 82,
    isTopStory: true,
    impactLevel: 'HIGH',
    sentiment: 'BEARISH',
    timeBadge: 'TODAY',
    title: headlines[0]?.title || 'ISM Non-Manufacturing PMI beats expectations at 55.4',
    description: headlines[0]?.description || 'August ISM non-manufacturing PMI printed 55.4 vs 54.2 forecast, signaling stronger US service sector activity. Stronger data may temper Fed rate-cut expectations and support the dollar near-term.',
    watchCallout: 'Monitor bond yields and rate-cut expectations as jobs report looms Friday; track dollar strength reaction.',
    affectedSymbols: ['US500', 'EURUSD'],
    relatedAsset: {
      symbol: 'US500',
      changeText: `${us500Ticker.isPositive ? '+' : ''}${us500Ticker.changePercent.toFixed(2)}%`,
      isPositive: us500Ticker.isPositive,
      price: us500Ticker.formattedPrice,
      sparkline: [40, 45, 48, 55, 62, 58, 70, 76, 82, 88],
    },
    isUserMarket: isUserMatch(['US500', 'EURUSD', 'DXY']),
  };

  const gridCards: MarketIntelligenceCard[] = [
    {
      id: 'card-btc-surge',
      heat: 79,
      impactLevel: 'HIGH',
      sentiment: 'BULLISH',
      timeBadge: 'NOW',
      title: headlines[1]?.title || 'Bitcoin surges above $81k as rates fall, dollar weakens',
      description: headlines[1]?.description || 'Bitcoin jumped as falling bond yields and weakening dollar supported risk appetite. Yen strength is also helping crypto bid, with positions recovering toward key resistance levels.',
      highlightTags: ['BTCUSD $81,000 breakout', 'BTCUSD $78,000 support'],
      watchCallout: 'Watch for sustained break above key levels and correlation with USDJPY weakness.',
      affectedSymbols: ['BTCUSD', 'USDJPY'],
      relatedAsset: {
        symbol: 'BTCUSD',
        changeText: `BTCUSD ${btcTicker.isPositive ? '+' : ''}${btcTicker.changePercent.toFixed(2)}%`,
        isPositive: btcTicker.isPositive,
      },
      isUserMarket: isUserMatch(['BTCUSD', 'BTC', 'CRYPTO', 'USDJPY']),
    },
    {
      id: 'card-crypto-institutional',
      heat: 71,
      impactLevel: 'MEDIUM',
      sentiment: 'BULLISH',
      timeBadge: 'WEEK',
      title: headlines[2]?.title || 'Crypto institutional onramp surge: Bitget, SoFi, Standard Chartered move',
      description: headlines[2]?.description || 'Major institutions are racing into crypto distribution. Retail sentiment shows trending volumes as retail chases institutional adoption.',
      watchCallout: 'Monitor further announcements on institutional partnerships and exchange fee generator momentum.',
      affectedSymbols: ['BTCUSD', 'COIN', 'HOOD'],
      relatedAsset: {
        symbol: 'BTCUSD',
        changeText: `BTCUSD ${btcTicker.isPositive ? '+' : ''}${btcTicker.changePercent.toFixed(2)}%`,
        isPositive: btcTicker.isPositive,
      },
      isUserMarket: isUserMatch(['BTCUSD', 'BTC', 'COIN', 'HOOD']),
    },
    {
      id: 'card-fed-waller',
      heat: 78,
      impactLevel: 'HIGH',
      sentiment: 'BULLISH',
      timeBadge: 'WEEK',
      title: headlines[3]?.title || 'Waller tempers Fed rate-hike bets; focus shifts to NFP',
      description: headlines[3]?.description || 'Fed official pushes back on rate-hike narrative, taking pressure off rates and boosting risk sentiment. Market now laser-focused on upcoming non-farm payrolls print.',
      watchCallout: "Watch Friday's non-farm payrolls print versus expectations; any disappointment could trigger fresh rate rally.",
      affectedSymbols: ['EURUSD', 'GBPUSD'],
      isUserMarket: isUserMatch(['EURUSD', 'GBPUSD', 'DXY', 'XAUUSD']),
    },
    {
      id: 'card-jpy-surge',
      heat: 75,
      impactLevel: 'HIGH',
      sentiment: 'BEARISH',
      timeBadge: 'TODAY',
      title: headlines[4]?.title || 'Japanese yen surges second day in a row',
      description: headlines[4]?.description || 'JPY has surged for consecutive sessions, reflecting broad risk-off sentiment and potential carry unwind. Strength pressures USDJPY lower.',
      watchCallout: 'Track USDJPY break below key support levels; monitor if yen strength persists.',
      affectedSymbols: ['USDJPY', 'EURUSD'],
      relatedAsset: {
        symbol: 'USDJPY',
        changeText: `USDJPY ${jpyTicker.isPositive ? '+' : ''}${jpyTicker.changePercent.toFixed(2)}%`,
        isPositive: jpyTicker.isPositive,
      },
      isUserMarket: isUserMatch(['USDJPY', 'EURUSD', 'JPY']),
    },
  ];

  return { topStory, gridCards };
}
