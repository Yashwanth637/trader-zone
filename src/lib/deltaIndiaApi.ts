import { Trade, AssetClass } from '../types/trade';
import { formatDDMMYYYY } from './deltaIndiaParser';
import { detectTradingSession, calculatePips } from './calculations';

export type ProxyMode = 'cors-bridge' | 'dev-proxy' | 'direct' | 'custom';

export interface DeltaCredentials {
  apiKey: string;
  apiSecret: string;
  proxyMode: ProxyMode;
  customProxyUrl?: string;
}

const STORAGE_KEYS = {
  API_KEY: 'trader_zone_delta_india_api_key',
  API_SECRET: 'trader_zone_delta_india_api_secret',
  PROXY_MODE: 'trader_zone_delta_india_proxy_mode',
  CUSTOM_PROXY: 'trader_zone_delta_india_custom_proxy',
  LAST_SYNCED: 'trader_zone_delta_india_last_synced'
};

export const DeltaStorage = {
  getCredentials(): DeltaCredentials {
    return {
      apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
      apiSecret: localStorage.getItem(STORAGE_KEYS.API_SECRET) || '',
      proxyMode: (localStorage.getItem(STORAGE_KEYS.PROXY_MODE) as ProxyMode) || 'cors-bridge',
      customProxyUrl: localStorage.getItem(STORAGE_KEYS.CUSTOM_PROXY) || ''
    };
  },

  saveCredentials(creds: DeltaCredentials): void {
    localStorage.setItem(STORAGE_KEYS.API_KEY, creds.apiKey.trim());
    localStorage.setItem(STORAGE_KEYS.API_SECRET, creds.apiSecret.trim());
    localStorage.setItem(STORAGE_KEYS.PROXY_MODE, creds.proxyMode);
    if (creds.customProxyUrl) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PROXY, creds.customProxyUrl.trim());
    }
  },

  clearCredentials(): void {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.API_SECRET);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_PROXY);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNCED);
  },

  getLastSynced(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNCED);
  },

  setLastSynced(isoString: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNCED, isoString);
  }
};

/**
 * Generate HMAC-SHA256 signature using native browser Web Crypto API.
 * prehash string = METHOD + TIMESTAMP + PATH + QUERY_STRING + BODY
 */
export async function generateDeltaSignature(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Resolve target URL based on selected proxy mode
 */
function buildTargetUrl(path: string, queryString: string, mode: ProxyMode, customProxyUrl?: string): string {
  const targetPath = `${path}${queryString}`;
  const deltaBase = 'https://api.india.delta.exchange';
  const fullTarget = `${deltaBase}${targetPath}`;

  switch (mode) {
    case 'dev-proxy':
      return `/delta-api${targetPath}`;
    case 'direct':
      return fullTarget;
    case 'custom':
      if (customProxyUrl) {
        if (customProxyUrl.includes('{url}')) {
          return customProxyUrl.replace('{url}', encodeURIComponent(fullTarget));
        }
        const separator = customProxyUrl.includes('?') ? '&' : '?';
        return `${customProxyUrl}${separator}url=${encodeURIComponent(fullTarget)}`;
      }
      return fullTarget;
    case 'cors-bridge':
    default:
      // High-performance CORS bridge preserving custom auth headers
      return `https://corsproxy.io/?url=${encodeURIComponent(fullTarget)}`;
  }
}

/**
 * Authenticated request to Delta Exchange India REST API
 */
async function deltaRequest<T>(
  path: string,
  queryParams: Record<string, string | number>,
  credentials: DeltaCredentials
): Promise<T> {
  const { apiKey, apiSecret, proxyMode, customProxyUrl } = credentials;
  if (!apiKey || !apiSecret) {
    throw new Error('API Key and Secret are required.');
  }

  // Construct query string
  const entries = Object.entries(queryParams).filter(([_, v]) => v !== undefined && v !== '');
  const searchParams = new URLSearchParams();
  entries.forEach(([k, v]) => searchParams.append(k, String(v)));
  const queryString = entries.length > 0 ? `?${searchParams.toString()}` : '';

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const body = '';

  // Signature prehash format: method + timestamp + path + query_string + body
  const signatureData = `${method}${timestamp}${path}${queryString}${body}`;
  const signature = await generateDeltaSignature(apiSecret, signatureData);

  const fetchUrl = buildTargetUrl(path, queryString, proxyMode, customProxyUrl);

  const headers: Record<string, string> = {
    'api-key': apiKey,
    'signature': signature,
    'timestamp': timestamp,
    'User-Agent': 'trader-zone-web',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const response = await fetch(fetchUrl, {
    method,
    headers
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorMsg = errJson.error.message;
      } else if (errJson.error?.code) {
        errorMsg = `Delta API: ${errJson.error.code}`;
      } else if (errJson.message) {
        errorMsg = errJson.message;
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return (await response.json()) as T;
}

export interface DeltaOrder {
  id: number | string;
  size: number;
  unfilled_size: number;
  side: 'buy' | 'sell';
  order_type: string;
  limit_price?: string;
  stop_price?: string;
  average_fill_price?: string;
  paid_commission?: string;
  commission?: string;
  state: string;
  created_at: string; // epoch in microseconds or ISO
  updated_at: string;
  product_symbol: string;
  client_order_id?: string;
  realized_pnl?: string;
}

export interface DeltaOrdersResponse {
  success: boolean;
  result: DeltaOrder[];
  meta?: {
    after?: string;
    before?: string;
  };
  error?: {
    code: string;
    message?: string;
  };
}

/**
 * Test connectivity and authentication against Delta Exchange India
 */
export async function testDeltaConnection(credentials: DeltaCredentials): Promise<{ success: boolean; message: string }> {
  try {
    const res = await deltaRequest<DeltaOrdersResponse>(
      '/v2/orders/history',
      { page_size: 1, state: 'closed' },
      credentials
    );

    if (res.success) {
      return {
        success: true,
        message: 'Successfully authenticated with Delta Exchange India API!'
      };
    } else {
      return {
        success: false,
        message: res.error?.message || res.error?.code || 'Authentication failed. Please verify credentials.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Connection failed. Please check network or proxy settings.'
    };
  }
}

/**
 * Fetch all closed orders from Delta India with pagination
 */
export async function fetchClosedOrders(
  credentials: DeltaCredentials,
  limitTotal: number = 100
): Promise<DeltaOrder[]> {
  const allOrders: DeltaOrder[] = [];
  let afterCursor: string | undefined = undefined;
  const pageSize = 50;

  while (allOrders.length < limitTotal) {
    const params: Record<string, string | number> = {
      page_size: pageSize,
      state: 'closed'
    };
    if (afterCursor) {
      params.after = afterCursor;
    }

    const res = await deltaRequest<DeltaOrdersResponse>('/v2/orders/history', params, credentials);
    if (!res.success || !Array.isArray(res.result) || res.result.length === 0) {
      break;
    }

    allOrders.push(...res.result);

    if (res.meta?.after && res.result.length === pageSize) {
      afterCursor = res.meta.after;
    } else {
      break;
    }
  }

  return allOrders;
}

/**
 * Normalize raw Delta API orders into journal Trade objects
 */
export function normalizeDeltaOrders(
  orders: DeltaOrder[],
  accountId: string,
  existingTrades: Trade[] = []
): { trades: Trade[]; newCount: number; duplicatesCount: number } {
  // Discard cancelled or zero-filled orders
  const filledOrders = orders.filter(o => {
    const filled = o.size - (o.unfilled_size || 0);
    const price = parseFloat(o.average_fill_price || o.limit_price || '0');
    return filled > 0 && price > 0;
  });

  interface ParsedOrder {
    orderId: string;
    dateObj: Date;
    isoTime: string;
    displayDate: string;
    symbol: string;
    rawQty: number;
    lotSize: number; // rawQty / 100
    side: 'buy' | 'sell';
    execPrice: number;
    stopPrice?: number;
    fee: number;
  }

  const parsedList: ParsedOrder[] = filledOrders.map(o => {
    let dateObj: Date;
    if (typeof o.created_at === 'string' && /^\d{13,16}$/.test(o.created_at)) {
      const ms = parseInt(o.created_at.slice(0, 13), 10);
      dateObj = new Date(ms);
    } else {
      dateObj = new Date(o.created_at);
    }

    const rawQty = o.size - (o.unfilled_size || 0);
    const execPrice = parseFloat(o.average_fill_price || o.limit_price || '0');
    const fee = parseFloat(o.paid_commission || o.commission || '0');
    const stopPrice = o.stop_price ? parseFloat(o.stop_price) : undefined;

    return {
      orderId: String(o.id),
      dateObj,
      isoTime: dateObj.toISOString(),
      displayDate: formatDDMMYYYY(dateObj),
      symbol: (o.product_symbol || 'CRYPTO').toUpperCase(),
      rawQty,
      lotSize: parseFloat((rawQty / 100).toFixed(4)),
      side: o.side.toLowerCase() === 'sell' ? 'sell' : 'buy',
      execPrice,
      stopPrice,
      fee
    };
  });

  // Sort chronologically (oldest first)
  parsedList.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Existing tickets / IDs set for deduplication
  const existingTickets = new Set(
    existingTrades.map(t => t.ticket).filter(Boolean).concat(
      existingTrades.map(t => t.id)
    )
  );

  const openLongs: Record<string, ParsedOrder[]> = {};
  const openShorts: Record<string, ParsedOrder[]> = {};
  const reconstructedTrades: Trade[] = [];
  let duplicatesCount = 0;

  for (const order of parsedList) {
    const sym = order.symbol;
    if (!openLongs[sym]) openLongs[sym] = [];
    if (!openShorts[sym]) openShorts[sym] = [];

    // Determine asset class
    let assetClass: AssetClass = 'Crypto';
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('OIL') || sym.includes('SILVER')) {
      assetClass = 'Commodities';
    } else if (sym.includes('NIFTY') || sym.includes('BANKNIFTY') || sym.includes('SPX') || sym.includes('US30')) {
      assetClass = 'Indices';
    }

    if (order.side === 'buy') {
      // Check if there is an open short to close
      if (openShorts[sym].length > 0) {
        // Closing order is BUY -> Original trade direction was SELL (Short)
        let matchIdx = openShorts[sym].findIndex(o => Math.abs(o.rawQty - order.rawQty) < 0.001);
        if (matchIdx === -1) matchIdx = 0;
        const openOrder = openShorts[sym].splice(matchIdx, 1)[0];

        const ticket = `DELTA-${order.orderId}`;
        if (existingTickets.has(ticket)) {
          duplicatesCount++;
          continue;
        }

        const entryPrice = openOrder.execPrice;
        const exitPrice = order.execPrice;
        const openTime = openOrder.isoTime;
        const closeTime = order.isoTime;
        const commission = openOrder.fee + order.fee;
        const stopLoss = order.stopPrice || openOrder.stopPrice;

        // PnL for short position: (entry - exit) * contracts
        const grossPnl = (entryPrice - exitPrice) * order.lotSize;
        const netPnl = grossPnl - commission;

        const durationMinutes = Math.max(
          1,
          Math.round((new Date(closeTime).getTime() - new Date(openTime).getTime()) / (1000 * 60))
        );

        reconstructedTrades.push({
          id: `delta-api-${order.orderId}-${Date.now()}`,
          ticket,
          accountId,
          symbol: sym,
          assetClass,
          direction: 'SELL',
          status: 'CLOSED',
          lotSize: order.lotSize,
          entryPrice,
          exitPrice,
          stopLoss,
          openTime,
          closeTime,
          grossPnl: parseFloat(grossPnl.toFixed(4)),
          commission: parseFloat(commission.toFixed(4)),
          swap: 0,
          netPnl: parseFloat(netPnl.toFixed(4)),
          pips: calculatePips(sym, 'SELL', entryPrice, exitPrice),
          durationMinutes,
          session: detectTradingSession(openTime),
          setupTags: ['Delta Exchange India', 'API Sync'],
          mistakeTags: [],
          notes: `Delta India API | Order #${order.orderId} | Date: ${order.displayDate} | Lots: ${order.lotSize} | Entry: ${entryPrice} | Exit: ${exitPrice}`,
          executionRating: netPnl > 0 ? 5 : 3
        });
      } else {
        // Opening long order
        openLongs[sym].push(order);
      }
    } else {
      // order.side === 'sell'
      // Check if there is an open long to close
      if (openLongs[sym].length > 0) {
        // Closing order is SELL -> Original trade direction was BUY (Long)
        let matchIdx = openLongs[sym].findIndex(o => Math.abs(o.rawQty - order.rawQty) < 0.001);
        if (matchIdx === -1) matchIdx = 0;
        const openOrder = openLongs[sym].splice(matchIdx, 1)[0];

        const ticket = `DELTA-${order.orderId}`;
        if (existingTickets.has(ticket)) {
          duplicatesCount++;
          continue;
        }

        const entryPrice = openOrder.execPrice;
        const exitPrice = order.execPrice;
        const openTime = openOrder.isoTime;
        const closeTime = order.isoTime;
        const commission = openOrder.fee + order.fee;
        const stopLoss = order.stopPrice || openOrder.stopPrice;

        // PnL for long position: (exit - entry) * contracts
        const grossPnl = (exitPrice - entryPrice) * order.lotSize;
        const netPnl = grossPnl - commission;

        const durationMinutes = Math.max(
          1,
          Math.round((new Date(closeTime).getTime() - new Date(openTime).getTime()) / (1000 * 60))
        );

        reconstructedTrades.push({
          id: `delta-api-${order.orderId}-${Date.now()}`,
          ticket,
          accountId,
          symbol: sym,
          assetClass,
          direction: 'BUY',
          status: 'CLOSED',
          lotSize: order.lotSize,
          entryPrice,
          exitPrice,
          stopLoss,
          openTime,
          closeTime,
          grossPnl: parseFloat(grossPnl.toFixed(4)),
          commission: parseFloat(commission.toFixed(4)),
          swap: 0,
          netPnl: parseFloat(netPnl.toFixed(4)),
          pips: calculatePips(sym, 'BUY', entryPrice, exitPrice),
          durationMinutes,
          session: detectTradingSession(openTime),
          setupTags: ['Delta Exchange India', 'API Sync'],
          mistakeTags: [],
          notes: `Delta India API | Order #${order.orderId} | Date: ${order.displayDate} | Lots: ${order.lotSize} | Entry: ${entryPrice} | Exit: ${exitPrice}`,
          executionRating: netPnl > 0 ? 5 : 3
        });
      } else {
        // Opening short order
        openShorts[sym].push(order);
      }
    }
  }

  return {
    trades: reconstructedTrades,
    newCount: reconstructedTrades.length,
    duplicatesCount
  };
}
