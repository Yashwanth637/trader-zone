/**
 * MT5 Broker Service
 * Direct client synchronization for MetaTrader 5 brokers:
 * Elefin, XM, Vantage, Exness, WinPro
 */

import { Trade, AssetClass, Direction, TradingSession } from '../types/trade';

export interface MT5BrokerConfig {
  id: 'Elefin' | 'XM' | 'Vantage' | 'Exness' | 'WinPro';
  name: string;
  servers: string[];
  defaultServer: string;
  description: string;
}

export const SUPPORTED_MT5_BROKERS: MT5BrokerConfig[] = [
  {
    id: 'Elefin',
    name: 'Elefin',
    servers: ['ElefinTrade-Server', 'ElefinTrade-Demo', 'ElefinTrade-Live', 'ElefinMarkets-Live', 'ElefinCapital-Live'],
    defaultServer: 'ElefinTrade-Server',
    description: 'Elefin Markets / Elefin Capital MT5'
  },
  {
    id: 'XM',
    name: 'XM',
    servers: ['XMGlobal-MT5', 'XMGlobal-MT5 2', 'XMGlobal-MT5 3', 'XMGlobal-MT5 4', 'XMGlobal-MT5 5', 'XMGlobal-Demo', 'XMGlobal-Demo 2'],
    defaultServer: 'XMGlobal-MT5',
    description: 'XM Global MetaTrader 5'
  },
  {
    id: 'Vantage',
    name: 'Vantage',
    servers: ['VantageFX-Live', 'VantageFX-Live 2', 'VantageInternational-Live', 'VantageInternational-Demo', 'Vantage-Demo'],
    defaultServer: 'VantageFX-Live',
    description: 'Vantage International MT5'
  },
  {
    id: 'Exness',
    name: 'Exness',
    servers: ['Exness-MT5Real', 'Exness-MT5Real2', 'Exness-MT5Real3', 'Exness-MT5Real4', 'Exness-MT5Real5', 'Exness-MT5Trial', 'Exness-MT5Trial2'],
    defaultServer: 'Exness-MT5Real',
    description: 'Exness MetaTrader 5 Live & Pro'
  },
  {
    id: 'WinPro',
    name: 'WinPro',
    servers: ['WinProFX-Real', 'WinProFX-Server', 'WinProMarkets-Live', 'WinPro-Demo'],
    defaultServer: 'WinProFX-Real',
    description: 'WinProFX / WinPro Markets MT5'
  }
];

export interface MT5Credentials {
  broker: 'Elefin' | 'XM' | 'Vantage' | 'Exness' | 'WinPro';
  server: string;
  login: string;
  password: string;
  accountId?: string;
  lastSynced?: string;
}

const MT5_CREDS_PREFIX = 'tz_mt5_creds_';
const MT5_ACCOUNTS_KEY = 'tz_mt5_accounts_list';
const MT5_CLOUD_TOKEN_KEY = 'tz_mt5_cloud_token';

export const MT5Storage = {
  saveCredentials: (creds: MT5Credentials, accountId?: string) => {
    try {
      const key = `${MT5_CREDS_PREFIX}${accountId || creds.login}`;
      localStorage.setItem(key, JSON.stringify({
        broker: creds.broker,
        server: creds.server,
        login: creds.login,
        password: btoa(creds.password), // simple client-side obfuscation
        accountId: accountId || creds.accountId,
        lastSynced: new Date().toISOString()
      }));

      // Update registry
      const existing = MT5Storage.getRegisteredAccounts();
      const lookup = `${creds.broker}::${creds.login}`;
      if (!existing.includes(lookup)) {
        localStorage.setItem(MT5_ACCOUNTS_KEY, JSON.stringify([...existing, lookup]));
      }
    } catch (e) {
      console.error('Failed to save MT5 credentials', e);
    }
  },

  getCredentials: (accountIdOrLogin: string): MT5Credentials | null => {
    try {
      const raw = localStorage.getItem(`${MT5_CREDS_PREFIX}${accountIdOrLogin}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        password: parsed.password ? atob(parsed.password) : ''
      };
    } catch {
      return null;
    }
  },

  getRegisteredAccounts: (): string[] => {
    try {
      const raw = localStorage.getItem(MT5_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  deleteCredentials: (accountIdOrLogin: string) => {
    try {
      localStorage.removeItem(`${MT5_CREDS_PREFIX}${accountIdOrLogin}`);
    } catch (e) {
      console.error('Failed to delete MT5 credentials', e);
    }
  },

  saveCloudToken: (token: string) => {
    try {
      localStorage.setItem(MT5_CLOUD_TOKEN_KEY, token.trim());
    } catch (e) {
      console.error('Failed to save cloud token', e);
    }
  },

  getCloudToken: (): string => {
    try {
      return localStorage.getItem(MT5_CLOUD_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }
};

function inferAssetClass(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  if (s.includes('BTC') || s.includes('ETH') || s.includes('SOL') || s.includes('USDT')) return 'Crypto';
  if (s.includes('XAU') || s.includes('GOLD') || s.includes('XAG') || s.includes('OIL') || s.includes('WTI') || s.includes('BRENT')) return 'Commodities';
  if (s.includes('US30') || s.includes('NAS') || s.includes('SPX') || s.includes('GER') || s.includes('DAX') || s.includes('DJI') || s.includes('NDX')) return 'Indices';
  return 'Forex';
}

function inferSession(date: Date): TradingSession {
  const utcHour = date.getUTCHours();
  if (utcHour >= 0 && utcHour < 7) return 'Asian';
  if (utcHour >= 7 && utcHour < 12) return 'London';
  if (utcHour >= 12 && utcHour < 17) return 'Overlap';
  if (utcHour >= 17 && utcHour < 21) return 'New York';
  return 'Off-Hours';
}

export interface MT5SyncResult {
  trades: Trade[];
  initialBalance: number;
  currentBalance: number;
  currency: string;
  server: string;
  broker: string;
  login: string;
}

/**
 * Connects to the MT5 broker and synchronizes closed trades and live balance
 * using the MetaApi Cloud Forex Gateway.
 */
export async function connectAndSyncMT5(params: {
  broker: 'Elefin' | 'XM' | 'Vantage' | 'Exness' | 'WinPro';
  server: string;
  login: string;
  password: string;
  targetAccountId?: string;
  metaApiToken?: string;
}): Promise<MT5SyncResult> {
  const { broker, server, login, password } = params;

  if (!login.trim()) {
    throw new Error(`Please enter your ${broker} MT5 Login ID / Account number.`);
  }
  if (!password.trim()) {
    throw new Error('Please enter your MT5 Password (Investor or Master).');
  }

  const token = params.metaApiToken?.trim() || MT5Storage.getCloudToken();

  if (!token) {
    throw new Error(
      `To connect directly to ${broker} in the cloud without running local scripts, enter your free MetaApi Cloud Token below, or use the "Drop MT5 Statement" tab for instant 1-click import.`
    );
  }

  const authHeader = {
    'auth-token': token,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Provision / Register account with MetaApi Cloud Gateway
    const provRes = await fetch('https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        name: `${broker} MT5 (${login})`,
        login: login.trim(),
        password: password.trim(),
        server: server.trim(),
        platform: 'mt5',
        magic: 0
      })
    });

    const provData = await provRes.json();
    const accountId = provData.id || provData._id;

    if (!accountId) {
      const errMsg = provData.message || provData.error || 'Failed to authenticate with MT5 cloud gateway.';
      throw new Error(errMsg);
    }

    // 2. Fetch Account Information (Balance, Equity, Currency)
    const infoRes = await fetch(
      `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/account-information`,
      { headers: { 'auth-token': token } }
    );
    const infoData = await infoRes.json();

    // 3. Fetch History Deals (Past 90 days)
    const now = new Date();
    const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const dealsRes = await fetch(
      `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/history-deals/time/${past.toISOString()}/${now.toISOString()}`,
      { headers: { 'auth-token': token } }
    );
    const dealsData = await dealsRes.json();

    if (Array.isArray(dealsData)) {
      return parseMetaApiDeals({
        deals: dealsData,
        accountInfo: infoData,
        broker,
        server,
        login,
        targetAccountId: params.targetAccountId
      });
    }

    // If deals array wasn't returned, return clean account with balance
    return {
      trades: [],
      initialBalance: Number(infoData.balance) || 10000,
      currentBalance: Number(infoData.balance) || 10000,
      currency: infoData.currency || 'USD',
      server,
      broker,
      login
    };
  } catch (err: any) {
    throw new Error(
      `Failed to connect to ${broker} (${server}): ${err.message || 'Please check your login, password, and server name.'}`
    );
  }
}

/**
 * Normalizes MetaApi raw deals into Trade objects and calculates balances
 */
function parseMetaApiDeals(params: {
  deals: any[];
  accountInfo: any;
  broker: string;
  server: string;
  login: string;
  targetAccountId?: string;
}): MT5SyncResult {
  const { deals, accountInfo, broker, server, login, targetAccountId } = params;
  const accId = targetAccountId || `acc-mt5-${broker.toLowerCase()}-${login}`;

  let initialBalance = Number(accountInfo.balance) || 10000;
  let totalNetPnl = 0;
  const trades: Trade[] = [];

  for (const d of deals) {
    if (d.type === 'DEAL_TYPE_BALANCE') {
      if (d.profit > 0 && initialBalance === 10000) {
        initialBalance = d.profit;
      }
      continue;
    }

    if (d.entryType === 'DEAL_ENTRY_OUT' || d.type === 'DEAL_TYPE_SELL' || d.type === 'DEAL_TYPE_BUY') {
      const openDate = d.time ? new Date(d.time) : new Date();
      const closeDate = d.time ? new Date(d.time) : new Date();
      const profit = Number(d.profit) || 0;
      const commission = Number(d.commission) || 0;
      const swap = Number(d.swap) || 0;
      const net = profit + commission + swap;
      totalNetPnl += net;

      const symbol = (d.symbol || 'XAUUSD').toUpperCase();
      const dir: Direction = d.type === 'DEAL_TYPE_BUY' || d.type === 0 ? 'BUY' : 'SELL';

      trades.push({
        id: `mt5-${login}-${d.id || d.ticket || Math.random().toString(36).substring(7)}`,
        ticket: String(d.id || d.ticket || Date.now()),
        accountId: accId,
        symbol,
        assetClass: inferAssetClass(symbol),
        direction: dir,
        status: 'CLOSED',
        lotSize: Number(d.volume) || 0.1,
        entryPrice: Number(d.price) || 0,
        exitPrice: Number(d.price) || 0,
        openTime: openDate.toISOString(),
        closeTime: closeDate.toISOString(),
        durationMinutes: 45,
        grossPnl: profit,
        commission: Math.abs(commission),
        swap,
        netPnl: net,
        session: inferSession(openDate),
        setupTags: [`MT5:${broker}`],
        mistakeTags: []
      });
    }
  }

  const currentBalance = Number(accountInfo.balance) || (initialBalance + totalNetPnl);

  return {
    trades,
    initialBalance,
    currentBalance,
    currency: accountInfo.currency || 'USD',
    server,
    broker,
    login
  };
}

/**
 * Parses MT5 Statement File (HTML or CSV report directly exported from MT5)
 * Allows instant, 100% free import of real trades & balance with zero tokens or setup.
 */
export function parseMt5ReportFile(params: {
  fileContent: string;
  accountId: string;
  broker: string;
  server: string;
  login: string;
}): MT5SyncResult {
  const { fileContent, accountId, broker, server, login } = params;

  let initialBalance = 10000;
  let currentBalance = 10000;
  const trades: Trade[] = [];

  // Check if content is HTML report from MT5
  if (fileContent.includes('<table') || fileContent.includes('ReportHistory')) {
    // Parse HTML report using DOMParser
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'text/html');
      const rows = Array.from(doc.querySelectorAll('tr'));

      let inClosedTrades = false;

      for (const row of rows) {
        const text = row.textContent || '';

        // Detect balance / deposit
        if (text.includes('Deposit') || text.includes('Balance:')) {
          const match = text.match(/([0-9\s,]+\.\d{2})/);
          if (match) {
            const val = parseFloat(match[1].replace(/[\s,]/g, ''));
            if (!isNaN(val) && val > 0) {
              initialBalance = val;
              currentBalance = val;
            }
          }
        }

        if (text.includes('Closed Deals') || text.includes('Orders') || text.includes('Positions')) {
          inClosedTrades = true;
          continue;
        }

        const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '');
        if (cells.length >= 9 && inClosedTrades) {
          // MT5 Closed Deal format:
          // [Time, Ticket, Symbol, Type, Direction, Volume, Price, Order, Commission, Fee, Swap, Profit]
          const timeStr = cells[0];
          const ticketStr = cells[1];
          const sym = cells[2];
          const typeStr = cells[3]?.toLowerCase();
          const volStr = cells[5] || cells[4];
          const priceStr = cells[6] || cells[5];
          const pnlStr = cells[cells.length - 1];

          if (ticketStr && !isNaN(Number(ticketStr)) && sym && (typeStr.includes('buy') || typeStr.includes('sell'))) {
            const pnl = parseFloat(pnlStr.replace(/[\s,]/g, '')) || 0;
            const volume = parseFloat(volStr.replace(/[\s,]/g, '')) || 0.1;
            const price = parseFloat(priceStr.replace(/[\s,]/g, '')) || 0;
            const date = new Date(timeStr.replace(/\./g, '-'));
            const validDate = isNaN(date.getTime()) ? new Date() : date;

            trades.push({
              id: `mt5-${login}-${ticketStr}`,
              ticket: ticketStr,
              accountId,
              symbol: sym.toUpperCase(),
              assetClass: inferAssetClass(sym),
              direction: typeStr.includes('buy') ? 'BUY' : 'SELL',
              status: 'CLOSED',
              lotSize: volume,
              entryPrice: price,
              exitPrice: price,
              openTime: validDate.toISOString(),
              closeTime: validDate.toISOString(),
              durationMinutes: 30,
              grossPnl: pnl,
              commission: 0,
              swap: 0,
              netPnl: pnl,
              session: inferSession(validDate),
              setupTags: [`MT5:${broker}`],
              mistakeTags: []
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing MT5 HTML report', e);
    }
  } else {
    // CSV / TSV fallback parsing
    const lines = fileContent.split(/\r?\n/);
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 8) {
        const ticket = parts[1] || parts[0];
        const sym = parts[2] || parts[1];
        const dir = parts[3]?.toUpperCase();
        if (ticket && !isNaN(Number(ticket)) && (dir === 'BUY' || dir === 'SELL')) {
          const vol = parseFloat(parts[4]) || 0.1;
          const price = parseFloat(parts[5]) || 0;
          const pnl = parseFloat(parts[parts.length - 1]) || 0;
          const openDate = new Date(parts[0]);
          const validDate = isNaN(openDate.getTime()) ? new Date() : openDate;

          trades.push({
            id: `mt5-${login}-${ticket}`,
            ticket,
            accountId,
            symbol: sym.toUpperCase(),
            assetClass: inferAssetClass(sym),
            direction: dir === 'BUY' ? 'BUY' : 'SELL',
            status: 'CLOSED',
            lotSize: vol,
            entryPrice: price,
            exitPrice: price,
            openTime: validDate.toISOString(),
            closeTime: validDate.toISOString(),
            durationMinutes: 30,
            grossPnl: pnl,
            commission: 0,
            swap: 0,
            netPnl: pnl,
            session: inferSession(validDate),
            setupTags: [`MT5:${broker}`],
            mistakeTags: []
          });
        }
      }
    }
  }

  const totalPnl = trades.reduce((sum, t) => sum + t.netPnl, 0);
  currentBalance = initialBalance + totalPnl;

  return {
    trades,
    initialBalance,
    currentBalance,
    currency: 'USD',
    server,
    broker,
    login
  };
}
