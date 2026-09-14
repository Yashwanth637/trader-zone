/**
 * Currency & Exchange Rate Service
 * Fetches today's live exchange rates relative to USD from free open exchange rate APIs,
 * with caching in localStorage and fallback rates for offline reliability.
 */

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' }
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$'
};

// Default fallback exchange rates relative to 1 USD (updated 2026)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 95.61,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.20,
  AUD: 1.55,
  CAD: 1.39
};

const STORAGE_KEY = 'trader_zone_exchange_rates';

export interface CachedRatesData {
  rates: Record<string, number>;
  lastUpdated: string; // ISO string or human-readable
  date: string; // YYYY-MM-DD
  source: string;
}

/**
 * Get stored exchange rates from localStorage
 */
export function getStoredExchangeRates(): CachedRatesData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse cached exchange rates', err);
    return null;
  }
}

/**
 * Save exchange rates to localStorage
 */
export function saveStoredExchangeRates(data: CachedRatesData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save exchange rates cache', err);
  }
}

/**
 * Fetch today's live exchange rates from internet relative to USD.
 * Tries primary endpoint: https://open.er-api.com/v6/latest/USD
 * Falls back to: https://api.exchangerate-api.com/v4/latest/USD
 * Falls back to cached or default rates if network fails.
 */
export async function fetchLiveExchangeRates(force: boolean = false): Promise<CachedRatesData> {
  const cached = getStoredExchangeRates();
  const today = new Date().toISOString().split('T')[0];

  // If not forcing and cache is from today, use cached rates
  if (!force && cached && cached.date === today && cached.rates && Object.keys(cached.rates).length > 0) {
    return cached;
  }

  // Attempt 1: Primary open endpoint
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.rates && typeof json.rates === 'object') {
        const rates: Record<string, number> = {
          ...DEFAULT_EXCHANGE_RATES,
          ...json.rates
        };
        const result: CachedRatesData = {
          rates,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: today,
          source: 'ExchangeRate-API (Live)'
        };
        saveStoredExchangeRates(result);
        return result;
      }
    }
  } catch (e1) {
    console.warn('Primary exchange rate fetch failed, trying secondary fallback...', e1);
  }

  // Attempt 2: Secondary open endpoint
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.rates && typeof json.rates === 'object') {
        const rates: Record<string, number> = {
          ...DEFAULT_EXCHANGE_RATES,
          ...json.rates
        };
        const result: CachedRatesData = {
          rates,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: today,
          source: 'ExchangeRate-API V4 (Live)'
        };
        saveStoredExchangeRates(result);
        return result;
      }
    }
  } catch (e2) {
    console.warn('Secondary exchange rate fetch failed', e2);
  }

  // Attempt 3: Cached data (even if older)
  if (cached && cached.rates) {
    return {
      ...cached,
      source: 'Cached Rates (Offline)'
    };
  }

  // Final fallback: Built-in default rates
  const fallbackResult: CachedRatesData = {
    rates: DEFAULT_EXCHANGE_RATES,
    lastUpdated: 'Default Reference Rate',
    date: today,
    source: 'Built-in Reference'
  };
  saveStoredExchangeRates(fallbackResult);
  return fallbackResult;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: string = 'USD'): string {
  const upper = currency.toUpperCase();
  return CURRENCY_SYMBOLS[upper] || SUPPORTED_CURRENCIES[upper as SupportedCurrency]?.symbol || '$';
}

/**
 * Get exchange rate for target currency relative to USD (1 USD = rate targetCurrency)
 */
export function getExchangeRateForCurrency(
  currency: string = 'USD',
  rates?: Record<string, number>
): number {
  if (currency.toUpperCase() === 'USD') return 1.0;
  const currentRates = rates || getStoredExchangeRates()?.rates || DEFAULT_EXCHANGE_RATES;
  return currentRates[currency.toUpperCase()] || DEFAULT_EXCHANGE_RATES[currency.toUpperCase()] || 1.0;
}

/**
 * Convert USD amount to target currency
 */
export function convertUsdToCurrency(
  usdAmount: number,
  targetCurrency: string = 'USD',
  rate?: number
): number {
  const finalRate = rate !== undefined ? rate : getExchangeRateForCurrency(targetCurrency);
  return usdAmount * finalRate;
}
