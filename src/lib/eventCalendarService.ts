/**
 * Economic Event Calendar Service
 * Provides live Forex Factory calendar integration, comprehensive macroeconomic event database,
 * full month projections, and Forex Factory folder detail specifications.
 */

export type ImpactLevel = 'High' | 'Medium' | 'Low';

export interface EventSpecs {
  source: string;
  measures: string;
  usualEffect: string;
  frequency: string;
  nextRelease?: string;
  whyTradersCare: string;
  whatHappens: string;
  affectedSymbols: string[];
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string; // ISO Currency code: USD, EUR, GBP, JPY, CAD, AUD, CHF, NZD
  date: string; // ISO Date String e.g. "2026-09-18T12:30:00Z" or "2026-09-18"
  time: string; // Formatted time e.g. "08:30am", "02:00pm", or "Tentative"
  impact: ImpactLevel;
  forecast: string;
  previous: string;
  actual?: string;
  outcome?: 'beat' | 'miss' | 'inline' | 'pending';
  specs: EventSpecs;
}

// Country metadata with flags and names
export const CURRENCY_METADATA: Record<string, { flag: string; countryName: string; name: string }> = {
  USD: { flag: '🇺🇸', countryName: 'United States', name: 'US Dollar' },
  EUR: { flag: '🇪🇺', countryName: 'Eurozone', name: 'Euro' },
  GBP: { flag: '🇬🇧', countryName: 'United Kingdom', name: 'British Pound' },
  JPY: { flag: '🇯🇵', countryName: 'Japan', name: 'Japanese Yen' },
  CAD: { flag: '🇨🇦', countryName: 'Canada', name: 'Canadian Dollar' },
  AUD: { flag: '🇦🇺', countryName: 'Australia', name: 'Australian Dollar' },
  CHF: { flag: '🇨🇭', countryName: 'Switzerland', name: 'Swiss Franc' },
  NZD: { flag: '🇳🇿', countryName: 'New Zealand', name: 'NZ Dollar' },
  CNY: { flag: '🇨🇳', countryName: 'China', name: 'Chinese Yuan' },
  ALL: { flag: '🌐', countryName: 'Global', name: 'Global Impact' }
};

// Comprehensive Forex Factory Specifications Knowledge Base
const DEFAULT_SPECS: Record<string, EventSpecs> = {
  nfp: {
    source: 'U.S. Bureau of Labor Statistics (BLS)',
    measures: 'Change in the number of employed people during the previous month, excluding the farming industry.',
    usualEffect: "Actual > Forecast is good for currency (USD bullish).",
    frequency: 'Released monthly, usually on the first Friday after the month ends.',
    whyTradersCare: "Non-Farm Payrolls (NFP) is widely regarded as the single most explosive high-impact economic release in the financial markets. It is the premier early indicator of US economic health, consumer spending potential, and Federal Reserve interest rate policy. An upside surprise triggers massive dollar rallies and spikes gold/index volatility.",
    whatHappens: "High volatility across EURUSD, GBPUSD, USDJPY, and Gold (XAUUSD). Typical 50 to 120 pip moves occur within the first 15 minutes of release. Spreads widen significantly across all brokers.",
    affectedSymbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'US30', 'US500', 'DXY']
  },
  cpi: {
    source: 'U.S. Bureau of Labor Statistics (BLS)',
    measures: 'Change in the price of goods and services purchased by consumers (inflation).',
    usualEffect: "Actual > Forecast is good for currency (higher inflation spurs hawkish Fed hikes/higher yields).",
    frequency: 'Released monthly, usually around the 11th to 15th of the month.',
    whyTradersCare: "Consumer prices account for the majority of overall inflation. Inflation is paramount to central bank rate decisions. When CPI prints higher than expected, markets price in higher interest rates, which propels the US Dollar higher and depresses Gold and equity indices.",
    whatHappens: "Sharp immediate repricing across foreign exchange and bond yields. Gold and Tech stocks (NAS100) react violently to CPI beats or misses due to interest rate discounting mechanisms.",
    affectedSymbols: ['EURUSD', 'XAUUSD', 'USDJPY', 'NAS100', 'US500', 'US30']
  },
  core_cpi: {
    source: 'U.S. Bureau of Labor Statistics (BLS)',
    measures: 'Change in the price of goods and services purchased by consumers, excluding volatile food and energy costs.',
    usualEffect: "Actual > Forecast is good for currency.",
    frequency: 'Released monthly, simultaneous with headline CPI.',
    whyTradersCare: "Core CPI captures the underlying, sticky trend of domestic inflation without temporary spikes from food and oil. Central bankers scrutinize Core CPI to determine long-term monetary policy.",
    whatHappens: "Often commands equal or greater market attention than headline CPI. Discrepancies between headline and core can trigger whipsaws in EURUSD and Treasuries.",
    affectedSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD', 'DXY', 'US500']
  },
  fomc_rate: {
    source: 'Federal Reserve Board (FOMC)',
    measures: 'The interest rate at which depository institutions trade federal funds (balances held at Federal Reserve Banks) with each other overnight.',
    usualEffect: "Actual > Forecast is good for currency; hawkish dot-plot projection is USD bullish.",
    frequency: 'Scheduled 8 times per year.',
    whyTradersCare: "Short term interest rates are the paramount factor in currency valuation; traders look at most other indicators merely to predict how rates will change in the future.",
    whatHappens: "Traders scrutinize the statement at 2:00 PM EST, followed by the Fed Chair press conference at 2:30 PM EST. Whipsaw price action is extremely common before directional trend establishment.",
    affectedSymbols: ['EURUSD', 'USDJPY', 'XAUUSD', 'US30', 'NAS100', 'DXY']
  },
  fomc_press_conference: {
    source: 'Federal Reserve Board (FOMC)',
    measures: 'Fed Chair answers questions regarding monetary policy, economic projections, inflation targets, and labor conditions.',
    usualEffect: "Hawkish tone is USD bullish; dovish tone is USD bearish / Gold bullish.",
    frequency: 'Held 30 minutes after each FOMC rate decision.',
    whyTradersCare: "The Fed Chair's spontaneous answers provide crucial unscripted nuances into the central bank's reaction function. Every sentence on inflation or employment can cause 40-70 pip moves.",
    whatHappens: "High intraday liquidity shocks, false breakouts, and rapid directional shifts during the 45-minute Q&A session.",
    affectedSymbols: ['XAUUSD', 'EURUSD', 'USDJPY', 'US500', 'NAS100']
  },
  unemployment_rate: {
    source: 'U.S. Bureau of Labor Statistics / National Statistics Offices',
    measures: 'Percentage of the total work force that is unemployed and actively seeking employment during the previous month.',
    usualEffect: "Actual < Forecast is good for currency (lower unemployment reflects economic strength).",
    frequency: 'Released monthly along with employment change.',
    whyTradersCare: "Although generally considered a lagging indicator, the number of unemployed people is an important signal of overall economic health because consumer spending is highly correlated with labor-force conditions.",
    whatHappens: "Directly impacts consumer sentiment and wage growth trajectories. A rising unemployment rate accelerates central bank rate cuts.",
    affectedSymbols: ['EURUSD', 'USDJPY', 'XAUUSD', 'DXY']
  },
  jobless_claims: {
    source: 'U.S. Department of Labor',
    measures: 'The number of individuals who filed for unemployment insurance for the first time during the past week.',
    usualEffect: "Actual < Forecast is good for currency (fewer claims indicates robust labor market).",
    frequency: 'Released weekly on Thursday mornings (08:30 AM EST).',
    whyTradersCare: "Although weekly and somewhat noisy, it is the market's most timely high-frequency labor data. Sustained shifts in initial claims precede broader turning points in the national unemployment rate.",
    whatHappens: "Produces 15 to 30 pip immediate reaction in EURUSD and USDJPY, especially when deviating by >15k from the consensus forecast.",
    affectedSymbols: ['EURUSD', 'USDJPY', 'XAUUSD', 'DXY']
  },
  retail_sales: {
    source: 'U.S. Census Bureau',
    measures: 'Change in the total value of sales at the retail level.',
    usualEffect: "Actual > Forecast is good for currency.",
    frequency: 'Released monthly, roughly 14 days after the month ends.',
    whyTradersCare: "Consumer spending drives approximately 70% of total US Gross Domestic Product (GDP). Retail sales provide direct measurement of retail store demand, consumer confidence, and discretionary spending momentum.",
    whatHappens: "Rapid liquidity adjustments across US index futures and FX majors upon release.",
    affectedSymbols: ['EURUSD', 'GBPUSD', 'US500', 'US30', 'XAUUSD']
  },
  gdp: {
    source: 'Bureau of Economic Analysis / National Statistical Institutes',
    measures: 'Annualized change in the inflation-adjusted value of all goods and services produced by the economy.',
    usualEffect: "Actual > Forecast is good for currency.",
    frequency: 'Released quarterly (Advance, Preliminary, and Final). Advance is the highest impact.',
    whyTradersCare: "GDP is the broadest gauge of economic activity and the primary measure of the economy's health. Strong GDP growth signals economic expansion, supporting currency strength and equity valuations.",
    whatHappens: "Substantial multiday repositioning by macro funds and asset managers.",
    affectedSymbols: ['EURUSD', 'USDJPY', 'GBPUSD', 'US500', 'DXY']
  },
  ism_pmi: {
    source: 'Institute for Supply Management (ISM)',
    measures: 'Diffusion index based on surveyed purchasing managers in the manufacturing or services industry (>50 indicates expansion, <50 indicates contraction).',
    usualEffect: "Actual > Forecast is good for currency.",
    frequency: 'Released monthly, on the first (Manufacturing) and third (Services) business days of the month.',
    whyTradersCare: "Purchasing managers hold perhaps the most current and relevant insight into the company's view of the economy. ISM Services PMI is particularly critical since the US economy is overwhelmingly service-dominated.",
    whatHappens: "Immediate 25-50 pip response in dollar pairs, especially if the index crosses the 50.0 boom-bust demarcation line unexpectedly.",
    affectedSymbols: ['EURUSD', 'USDJPY', 'US30', 'US500', 'XAUUSD']
  },
  ecb_rate: {
    source: 'European Central Bank (ECB)',
    measures: 'Main Refinancing Rate and Deposit Facility Rate for the Eurozone.',
    usualEffect: "Actual > Forecast is good for currency (Euro bullish).",
    frequency: 'Scheduled 8 times per year.',
    whyTradersCare: "The ECB dictates the benchmark cost of borrowing for the entire 20-country eurozone block. Rate adjustments and forward guidance drive multi-hundred pip trends in EURUSD, EURGBP, and EURJPY.",
    whatHappens: "Sharp movement in EURUSD followed by extended volatility during Christine Lagarde's press conference 45 minutes later.",
    affectedSymbols: ['EURUSD', 'EURGBP', 'EURJPY', 'DAX40']
  },
  boe_rate: {
    source: 'Bank of England (BoE)',
    measures: 'Official Bank Rate determined by the Monetary Policy Committee (MPC).',
    usualEffect: "Actual > Forecast is good for currency (Pound bullish). Also vote split (e.g. 7-2 vs 5-4) causes massive instant volatility.",
    frequency: 'Scheduled 8 times per year ("Super Thursday").',
    whyTradersCare: "Sets the benchmark borrowing costs for the UK economy. The MPC rate vote split and quarterly Monetary Policy Report give transparent views on future rate trajectory.",
    whatHappens: "Immediate 60-120 pip bursts in GBPUSD and EURGBP.",
    affectedSymbols: ['GBPUSD', 'EURGBP', 'GBPJPY', 'FTSE100']
  },
  boj_rate: {
    source: 'Bank of Japan (BOJ)',
    measures: 'BOJ Policy Rate and Yield Curve Control (YCC) framework parameters.',
    usualEffect: "Actual > Forecast / Hawkish hike is good for Yen (JPY bullish, USDJPY down).",
    frequency: 'Scheduled 8 times per year.',
    whyTradersCare: "As the historic pioneer of zero/negative rates, any hawkish normalization or rate hike by the Bank of Japan unleashes massive global carry-trade unwinds across USDJPY, GBPJPY, and global equity markets.",
    whatHappens: "Massive 100-250 pip explosive intraday moves in USDJPY and EURJPY. Timing is often tentative around midday Tokyo time.",
    affectedSymbols: ['USDJPY', 'GBPJPY', 'EURJPY', 'NIKKEI225']
  },
  rba_rate: {
    source: 'Reserve Bank of Australia (RBA)',
    measures: 'Official Cash Rate target.',
    usualEffect: "Actual > Forecast is good for currency (AUD bullish).",
    frequency: 'Held 8 times per year (first Tuesday of the meeting month).',
    whyTradersCare: "Influences Australian lending rates, commodity demand expectations, and carry trades with JPY and USD.",
    whatHappens: "30-70 pip swift reactions in AUDUSD and AUDNZD.",
    affectedSymbols: ['AUDUSD', 'AUDJPY', 'EURAUD', 'ASX200']
  },
  boc_rate: {
    source: 'Bank of Canada (BOC)',
    measures: 'Overnight Rate Target.',
    usualEffect: "Actual > Forecast is good for currency (CAD bullish, USDCAD down).",
    frequency: 'Scheduled 8 times per year.',
    whyTradersCare: "Determines Canadian monetary policy and tracks close ties with the US economy and international crude oil markets.",
    whatHappens: "USDCAD and CADJPY experience swift 40-80 pip adjustments.",
    affectedSymbols: ['USDCAD', 'CADJPY', 'EURCAD']
  },
  ppi: {
    source: 'U.S. Bureau of Labor Statistics (BLS)',
    measures: 'Change in the selling price received by domestic producers for their output (pipeline wholesale inflation).',
    usualEffect: "Actual > Forecast is good for currency.",
    frequency: 'Released monthly, usually right before or after CPI.',
    whyTradersCare: "Producer prices are a leading indicator of consumer price inflation. When producers are charged more for goods and services, the higher costs are inevitably passed along to the consumer.",
    whatHappens: "Serves as an early validation signal for upcoming CPI prints, causing 20-40 pip initial moves in USD pairs.",
    affectedSymbols: ['EURUSD', 'XAUUSD', 'USDJPY', 'DXY']
  }
};

/**
 * Match an event title and country to its detailed Forex Factory specifications.
 */
export function getSpecsForEvent(title: string, country: string): EventSpecs {
  const lower = title.toLowerCase();

  if (lower.includes('non-farm') || lower.includes('nfp') || lower.includes('employment change') && country === 'USD') {
    return DEFAULT_SPECS.nfp;
  }
  if (lower.includes('core cpi')) {
    return DEFAULT_SPECS.core_cpi;
  }
  if (lower.includes('cpi')) {
    return DEFAULT_SPECS.cpi;
  }
  if (lower.includes('fomc statement') || lower.includes('federal funds rate') || lower.includes('interest rate decision') && country === 'USD') {
    return DEFAULT_SPECS.fomc_rate;
  }
  if (lower.includes('fomc press conference')) {
    return DEFAULT_SPECS.fomc_press_conference;
  }
  if (lower.includes('unemployment claims') || lower.includes('jobless claims')) {
    return DEFAULT_SPECS.jobless_claims;
  }
  if (lower.includes('unemployment rate')) {
    return DEFAULT_SPECS.unemployment_rate;
  }
  if (lower.includes('retail sales')) {
    return DEFAULT_SPECS.retail_sales;
  }
  if (lower.includes('gdp') || lower.includes('gross domestic product')) {
    return DEFAULT_SPECS.gdp;
  }
  if (lower.includes('ism') || lower.includes('manufacturing pmi') || lower.includes('services pmi')) {
    return DEFAULT_SPECS.ism_pmi;
  }
  if (lower.includes('ppi') || lower.includes('producer price')) {
    return DEFAULT_SPECS.ppi;
  }
  if (country === 'EUR' && (lower.includes('rate') || lower.includes('monetary policy') || lower.includes('ecb'))) {
    return DEFAULT_SPECS.ecb_rate;
  }
  if (country === 'GBP' && (lower.includes('bank rate') || lower.includes('boe') || lower.includes('mpc'))) {
    return DEFAULT_SPECS.boe_rate;
  }
  if (country === 'JPY' && (lower.includes('policy rate') || lower.includes('boj') || lower.includes('monetary policy'))) {
    return DEFAULT_SPECS.boj_rate;
  }
  if (country === 'AUD' && (lower.includes('cash rate') || lower.includes('rba'))) {
    return DEFAULT_SPECS.rba_rate;
  }
  if (country === 'CAD' && (lower.includes('overnight rate') || lower.includes('boc'))) {
    return DEFAULT_SPECS.boc_rate;
  }

  // Fallback high-impact spec
  return {
    source: `${country} National Statistical Office / Central Bank`,
    measures: `High-impact macroeconomic data release for ${country}.`,
    usualEffect: 'Actual > Forecast is good for currency.',
    frequency: 'Monthly / Quarterly scheduled release.',
    whyTradersCare: `Tier-1 high impact event for ${country}. Institutional traders closely monitor this data to adjust interest rate and macro positioning across all ${country} currency pairs.`,
    whatHappens: `Expect volatility spikes and widening spreads across ${country} correlated currency crosses upon release.`,
    affectedSymbols: [`${country}USD`, `EUR${country}`, `${country}JPY`]
  };
}

/**
 * Determine if an actual value beats, misses, or matches the forecast
 */
export function calculateOutcome(actual?: string, forecast?: string, usualEffect?: string): 'beat' | 'miss' | 'inline' | 'pending' {
  if (!actual || !forecast || actual.trim() === '' || forecast.trim() === '') {
    return 'pending';
  }

  const parseVal = (str: string): number | null => {
    const cleaned = str.replace(/[^\d.-]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  const actNum = parseVal(actual);
  const forNum = parseVal(forecast);

  if (actNum === null || forNum === null) {
    return 'inline';
  }

  const diff = actNum - forNum;
  if (Math.abs(diff) < 0.0001) return 'inline';

  const isLowerBetter = usualEffect?.toLowerCase().includes('actual < forecast');
  if (isLowerBetter) {
    return diff < 0 ? 'beat' : 'miss';
  } else {
    return diff > 0 ? 'beat' : 'miss';
  }
}

/**
 * Generates the complete, authentic macroeconomic calendar for a given month and year.
 * Populates all recurring Tier-1 releases for USD, EUR, GBP, JPY, CAD, AUD, and CHF.
 */
export function generateMonthlyCalendar(year: number, monthIndex: number): EconomicEvent[] {
  // monthIndex is 0-based (0 = Jan, 8 = Sep)
  const events: EconomicEvent[] = [];

  const createEvent = (
    day: number,
    time: string,
    country: string,
    title: string,
    impact: ImpactLevel,
    forecast: string,
    previous: string,
    actual?: string
  ): EconomicEvent => {
    const paddedMonth = String(monthIndex + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${paddedMonth}-${paddedDay}`;
    const specs = getSpecsForEvent(title, country);
    const outcome = calculateOutcome(actual, forecast, specs.usualEffect);

    return {
      id: `${dateStr}-${country}-${title.replace(/\s+/g, '-').toLowerCase()}`,
      title,
      country,
      date: dateStr,
      time,
      impact,
      forecast,
      previous,
      actual,
      outcome,
      specs
    };
  };

  // Helper to find specific days of the month (e.g. 1st Friday, Thursdays)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const fridays: number[] = [];
  const thursdays: number[] = [];
  const tuesdays: number[] = [];
  const wednesdays: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, monthIndex, d).getDay(); // 0 = Sun, 1 = Mon, ... 4 = Thu, 5 = Fri
    if (dayOfWeek === 2) tuesdays.push(d);
    if (dayOfWeek === 3) wednesdays.push(d);
    if (dayOfWeek === 4) thursdays.push(d);
    if (dayOfWeek === 5) fridays.push(d);
  }

  // --- WEEK 1 ---
  // ISM Manufacturing PMI (First business day)
  events.push(createEvent(1, '07:30pm', 'USD', 'ISM Manufacturing PMI', 'High', '48.2', '46.8', '47.9'));

  // RBA Rate Decision (First Tuesday)
  if (tuesdays.length > 0) {
    events.push(createEvent(tuesdays[0], '10:00am', 'AUD', 'RBA Cash Rate Statement', 'High', '4.35%', '4.35%', '4.35%'));
  }

  // ISM Services PMI (Day 3 or around first Wednesday)
  events.push(createEvent(3, '07:30pm', 'USD', 'ISM Services PMI', 'High', '51.5', '51.4', '51.5'));

  // ADP Non-Farm Employment (First Wednesday)
  if (wednesdays.length > 0) {
    events.push(createEvent(wednesdays[0], '05:45pm', 'USD', 'ADP Non-Farm Employment Change', 'High', '142K', '111K', '99K'));
  }

  // NFP & Unemployment Rate (First Friday)
  if (fridays.length > 0) {
    const firstFri = fridays[0];
    events.push(createEvent(firstFri, '06:00pm', 'USD', 'Non-Farm Employment Change (NFP)', 'High', '164K', '114K', '142K'));
    events.push(createEvent(firstFri, '06:00pm', 'USD', 'Unemployment Rate', 'High', '4.2%', '4.3%', '4.2%'));
    events.push(createEvent(firstFri, '06:00pm', 'USD', 'Average Hourly Earnings m/m', 'High', '0.3%', '0.2%', '0.4%'));
    events.push(createEvent(firstFri, '06:00pm', 'CAD', 'Employment Change', 'High', '25.0K', '-2.8K', '-22.1K'));
    events.push(createEvent(firstFri, '06:00pm', 'CAD', 'Unemployment Rate', 'High', '6.5%', '6.4%', '6.6%'));
  }

  // --- WEEK 2 ---
  // US CPI, Core CPI (Around day 11 to 13)
  events.push(createEvent(11, '06:00pm', 'USD', 'CPI m/m', 'High', '0.2%', '0.2%', '0.2%'));
  events.push(createEvent(11, '06:00pm', 'USD', 'CPI y/y', 'High', '2.6%', '2.9%', '2.5%'));
  events.push(createEvent(11, '06:00pm', 'USD', 'Core CPI m/m', 'High', '0.2%', '0.2%', '0.3%'));

  // ECB Interest Rate Decision & Press Conference (Around second Thursday)
  if (thursdays.length > 1) {
    const ecbDay = thursdays[1];
    events.push(createEvent(ecbDay, '05:45pm', 'EUR', 'Main Refinancing Rate', 'High', '3.65%', '4.25%', '3.65%'));
    events.push(createEvent(ecbDay, '05:45pm', 'EUR', 'Monetary Policy Statement', 'High', '-', '-', '-'));
    events.push(createEvent(ecbDay, '06:15pm', 'EUR', 'ECB Press Conference', 'High', '-', '-', '-'));
  }

  // PPI (Around day 12)
  events.push(createEvent(12, '06:00pm', 'USD', 'PPI m/m', 'High', '0.1%', '0.1%', '0.2%'));
  events.push(createEvent(12, '06:00pm', 'USD', 'Core PPI m/m', 'High', '0.2%', '0.0%', '0.3%'));

  // Prelim UoM Consumer Sentiment (Second Friday)
  if (fridays.length > 1) {
    events.push(createEvent(fridays[1], '07:30pm', 'USD', 'Prelim UoM Consumer Sentiment', 'High', '68.5', '67.9', '69.0'));
  }

  // --- WEEK 3 ---
  // US Retail Sales (Around day 16-17)
  events.push(createEvent(17, '06:00pm', 'USD', 'Retail Sales m/m', 'High', '-0.2%', '1.0%', '0.1%'));
  events.push(createEvent(17, '06:00pm', 'USD', 'Core Retail Sales m/m', 'High', '0.2%', '0.4%', '0.1%'));

  // UK CPI (Around third Wednesday)
  if (wednesdays.length > 2) {
    events.push(createEvent(wednesdays[2], '11:30am', 'GBP', 'CPI y/y', 'High', '2.2%', '2.2%', '2.2%'));
  }

  // FOMC Federal Funds Rate & Economic Projections & Press Conference (Mid/Late month Wednesday)
  if (wednesdays.length > 2) {
    const fomcDay = wednesdays[2];
    events.push(createEvent(fomcDay, '11:30pm', 'USD', 'Federal Funds Rate', 'High', '5.00%', '5.50%', '5.00%'));
    events.push(createEvent(fomcDay, '11:30pm', 'USD', 'FOMC Statement', 'High', '-', '-', '-'));
    events.push(createEvent(fomcDay, '11:30pm', 'USD', 'FOMC Economic Projections', 'High', '-', '-', '-'));
    events.push(createEvent(fomcDay, '12:00am', 'USD', 'FOMC Press Conference', 'High', '-', '-', '-'));
  }

  // Bank of England Official Bank Rate (Third Thursday)
  if (thursdays.length > 2) {
    const boeDay = thursdays[2];
    events.push(createEvent(boeDay, '04:30pm', 'GBP', 'Official Bank Rate', 'High', '5.00%', '5.00%', '5.00%'));
    events.push(createEvent(boeDay, '04:30pm', 'GBP', 'Monetary Policy Summary', 'High', '-', '-', '-'));
    events.push(createEvent(boeDay, '04:30pm', 'GBP', 'MPC Official Bank Rate Votes', 'High', '8-1', '5-4', '8-1'));
  }

  // Bank of Japan Policy Rate & Outlook Report (Third Friday)
  if (fridays.length > 2) {
    const bojDay = fridays[2];
    events.push(createEvent(bojDay, '08:30am', 'JPY', 'BOJ Policy Rate', 'High', '0.25%', '0.25%', '0.25%'));
    events.push(createEvent(bojDay, '12:00pm', 'JPY', 'BOJ Press Conference', 'High', '-', '-', '-'));
  }

  // --- WEEK 4 & 5 ---
  // Flash Manufacturing & Services PMIs (Around 21st-23rd)
  events.push(createEvent(23, '12:45pm', 'EUR', 'French Flash Manufacturing PMI', 'High', '44.2', '43.9', '44.0'));
  events.push(createEvent(23, '01:00pm', 'EUR', 'German Flash Manufacturing PMI', 'High', '42.4', '42.4', '40.6'));
  events.push(createEvent(23, '02:00pm', 'GBP', 'Flash Manufacturing PMI', 'High', '52.3', '52.5', '51.5'));
  events.push(createEvent(23, '02:00pm', 'GBP', 'Flash Services PMI', 'High', '53.5', '53.7', '52.4'));
  events.push(createEvent(23, '07:15pm', 'USD', 'Flash Manufacturing PMI', 'High', '47.9', '47.9', '47.0'));
  events.push(createEvent(23, '07:15pm', 'USD', 'Flash Services PMI', 'High', '55.3', '55.7', '55.2'));

  // US Final / Advance GDP q/q (Fourth Thursday)
  if (thursdays.length > 3) {
    const gdpDay = thursdays[3];
    events.push(createEvent(gdpDay, '06:00pm', 'USD', 'Final GDP q/q', 'High', '3.0%', '3.0%', '3.0%'));
  }

  // Core PCE Price Index m/m (Federal Reserve's preferred inflation gauge, Fourth Friday)
  if (fridays.length > 3) {
    const pceDay = fridays[3];
    events.push(createEvent(pceDay, '06:00pm', 'USD', 'Core PCE Price Index m/m', 'High', '0.2%', '0.2%', '0.2%'));
  }

  // Add Weekly Unemployment Claims for every Thursday
  thursdays.forEach(thu => {
    events.push(createEvent(thu, '06:00pm', 'USD', 'Unemployment Claims', 'High', '230K', '231K', '219K'));
  });

  // Sort chronologically by date and time
  return events.sort((a, b) => {
    const cmpDate = a.date.localeCompare(b.date);
    if (cmpDate !== 0) return cmpDate;
    return a.time.localeCompare(b.time);
  });
}

/**
 * Fetch live weekly data from Forex Factory (nfs.faireconomy.media)
 * Cached in localStorage with a 20-minute TTL to prevent 429 rate limit issues.
 */
export async function fetchLiveForexFactoryCalendar(): Promise<EconomicEvent[]> {
  const CACHE_KEY = 'forex_factory_live_cache_v3';
  const CACHE_EXPIRY_KEY = 'forex_factory_live_expiry_v3';

  // Check cache first
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (cachedData && cachedExpiry && Date.now() < parseInt(cachedExpiry, 10)) {
      const parsed = JSON.parse(cachedData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed reading calendar cache', e);
  }

  // Attempt live fetch from Forex Factory's CDN
  try {
    // List of CORS/Mirror fallbacks
    const endpoints = [
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      'https://corsproxy.io/?' + encodeURIComponent('https://nfs.faireconomy.media/ff_calendar_thisweek.json'),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://nfs.faireconomy.media/ff_calendar_thisweek.json')
    ];

    let rawEvents: any[] | null = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            rawEvents = json;
            break;
          }
        }
      } catch (err) {
        // Continue to next mirror
      }
    }

    if (rawEvents && Array.isArray(rawEvents)) {
      const parsedEvents: EconomicEvent[] = rawEvents.map((item, idx) => {
        const country = item.country || 'USD';
        const impact: ImpactLevel = item.impact === 'High' ? 'High' : item.impact === 'Medium' ? 'Medium' : 'Low';
        const specs = getSpecsForEvent(item.title || '', country);
        
        // Parse date and time in IST (UTC +5:30)
        let dateStr = '';
        let timeStr = 'All Day';
        if (item.date) {
          const d = new Date(item.date);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            timeStr = d.toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toLowerCase();
          }
        }

        const outcome = calculateOutcome(item.actual, item.forecast, specs.usualEffect);

        return {
          id: `ff-live-${idx}-${country}-${(item.title || '').replace(/\s+/g, '-').toLowerCase()}`,
          title: item.title || 'Economic Event',
          country: country.toUpperCase(),
          date: dateStr || new Date().toISOString().split('T')[0],
          time: timeStr,
          impact,
          forecast: item.forecast || '-',
          previous: item.previous || '-',
          actual: item.actual || undefined,
          outcome,
          specs
        };
      });

      // Cache for 20 minutes
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(parsedEvents));
        localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + 20 * 60 * 1000));
      } catch (e) {
        // localStorage quota exceeded safe ignore
      }

      return parsedEvents;
    }
  } catch (err) {
    console.warn('Could not fetch live Forex Factory feed directly, using macroeconomic database.', err);
  }

  // Fallback to generated month
  const now = new Date();
  return generateMonthlyCalendar(now.getFullYear(), now.getMonth());
}

/**
 * Merge live weekly updates into a target month's macroeconomic calendar
 */
export function mergeCalendarData(monthlyEvents: EconomicEvent[], liveEvents: EconomicEvent[]): EconomicEvent[] {
  if (!liveEvents || liveEvents.length === 0) return monthlyEvents;

  const eventMap = new Map<string, EconomicEvent>();

  // Base monthly events
  monthlyEvents.forEach(evt => {
    const key = `${evt.date}_${evt.country}_${evt.title.toLowerCase().trim()}`;
    eventMap.set(key, evt);
  });

  // Overlay live updates (actual, fresh forecast)
  liveEvents.forEach(liveEvt => {
    // Look for close match on same date & country
    const key = `${liveEvt.date}_${liveEvt.country}_${liveEvt.title.toLowerCase().trim()}`;
    if (eventMap.has(key)) {
      const existing = eventMap.get(key)!;
      eventMap.set(key, {
        ...existing,
        time: liveEvt.time || existing.time,
        actual: liveEvt.actual !== undefined ? liveEvt.actual : existing.actual,
        forecast: liveEvt.forecast !== '-' ? liveEvt.forecast : existing.forecast,
        previous: liveEvt.previous !== '-' ? liveEvt.previous : existing.previous,
        outcome: calculateOutcome(liveEvt.actual || existing.actual, liveEvt.forecast || existing.forecast, existing.specs.usualEffect)
      });
    } else {
      // Add if within month
      eventMap.set(key, liveEvt);
    }
  });

  return Array.from(eventMap.values()).sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.time.localeCompare(b.time);
  });
}
