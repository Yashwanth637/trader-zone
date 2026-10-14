/**
 * Synchronizes the Forex Factory Economic Calendar feed from FairEconomy CDN
 * and enriches past/released events with live actual values from TradingView Economic Calendar.
 * Output is saved into public/data/forex_factory_calendar.json with 0 CORS issues.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'forex_factory_calendar.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8'
};

const TV_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://www.tradingview.com',
  'Accept': 'application/json'
};

function fetchUrl(url, headers = HEADERS) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => resolve(rawData));
    }).on('error', reject);
  });
}

/**
 * Fetch live TradingView economic calendar events for the target date window.
 * Returns events that contain authentic PIT (Point-In-Time) actual values.
 */
async function fetchTradingViewEvents(fromIso, toIso) {
  try {
    const countries = 'US,GB,EU,DE,FR,IT,ES,JP,CA,AU,CH,NZ,CN';
    const url = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&countries=${countries}`;
    console.log(`[TradingView Sync] Fetching live actuals from: ${fromIso.split('T')[0]} to ${toIso.split('T')[0]}`);
    const raw = await fetchUrl(url, TV_HEADERS);
    const data = JSON.parse(raw);
    const results = data.result || [];
    const withActual = results.filter(e => e.actual !== null && e.actual !== undefined);
    console.log(`[TradingView Sync] Retrieved ${results.length} total events (${withActual.length} published actuals).`);
    return withActual;
  } catch (err) {
    console.warn(`[TradingView Sync] Failed to fetch live actuals: ${err.message}`);
    return [];
  }
}

function isNonNumericEvent(title) {
  const s = (title || '').toLowerCase();
  return (
    s.includes('speaks') ||
    s.includes('speech') ||
    s.includes('testifies') ||
    s.includes('holiday') ||
    s.includes('meeting minutes') ||
    s.includes('press conference') ||
    s.includes('statement') ||
    s.includes('report')
  );
}

/**
 * High-precision matcher between Forex Factory calendar events and TradingView releases
 */
function matchTradingViewRelease(ff, tvList) {
  if (!ff.date) return null;
  const ffTime = new Date(ff.date).getTime();
  if (isNaN(ffTime) || ffTime > Date.now()) return null; // Pending future events have no actual yet

  const ffTitle = (ff.title || '').toLowerCase();
  const ffCountry = (ff.country || '').toUpperCase();

  if (isNonNumericEvent(ffTitle)) return null;

  // Filter TV candidates within +/- 3.5 hours with matching currency/country
  const candidates = tvList.filter(tv => {
    const tvTime = new Date(tv.date).getTime();
    if (Math.abs(tvTime - ffTime) > 3.5 * 3600 * 1000) return false;

    const tvTitle = (tv.title || '').toLowerCase();
    if (isNonNumericEvent(tvTitle)) return false;

    const tvCurr = (tv.currency || '').toUpperCase();
    const tvCountry = (tv.country || '').toUpperCase();
    const matchCurr = tvCurr === ffCountry || tvCountry === ffCountry;
    const matchEur = ffCountry === 'EUR' && ['EU', 'DE', 'FR', 'IT', 'ES'].includes(tvCountry);
    return matchCurr || matchEur;
  });

  if (candidates.length === 0) return null;

  let best = null;
  let bestScore = 0;

  for (const tv of candidates) {
    const tvTitle = (tv.title || '').toLowerCase();
    let score = 0;

    const timeDiffMins = Math.abs(new Date(tv.date).getTime() - ffTime) / 60000;
    if (timeDiffMins <= 5) score += 50;
    else if (timeDiffMins <= 30) score += 35;
    else if (timeDiffMins <= 90) score += 20;

    // Timeframe matching (MoM, YoY, QoQ)
    const ffMoM = ffTitle.includes('m/m');
    const ffYoY = ffTitle.includes('y/y');
    const ffQoQ = ffTitle.includes('q/q');
    const tvMoM = tvTitle.includes('mom') || tvTitle.includes('m/m');
    const tvYoY = tvTitle.includes('yoy') || tvTitle.includes('y/y');
    const tvQoQ = tvTitle.includes('qoq') || tvTitle.includes('q/q');

    if (ffMoM && tvMoM) score += 40;
    if (ffYoY && tvYoY) score += 40;
    if (ffQoQ && tvQoQ) score += 40;
    if (ffMoM && !tvMoM && (tvYoY || tvQoQ)) score -= 60;
    if (ffYoY && !tvYoY && (tvMoM || tvQoQ)) score -= 60;

    // Core matching (Core CPI, Core PPI, Core Retail Sales)
    const ffCore = ffTitle.includes('core');
    const tvCore = tvTitle.includes('core');
    if (ffCore && tvCore) score += 40;
    else if (!ffCore && !tvCore) score += 20;
    else score -= 50;

    // Domain mismatch guards
    if (ffTitle.includes('lending') && !tvTitle.includes('lending')) continue;
    if (ffTitle.includes('ppi') && !tvTitle.includes('ppi') && !tvTitle.includes('producer')) continue;
    if ((ffTitle.includes('cpi') || ffTitle.includes('inflation')) && (!tvTitle.includes('cpi') && !tvTitle.includes('inflation'))) continue;
    if (ffTitle.includes('trade balance') && !tvTitle.includes('trade balance')) continue;
    if (ffTitle.includes('auction') && !tvTitle.includes('auction')) continue;
    if (!ffTitle.includes('auction') && tvTitle.includes('auction')) continue;

    // Domain keywords
    if ((ffTitle.includes('cpi') || ffTitle.includes('inflation')) && (tvTitle.includes('cpi') || tvTitle.includes('inflation'))) {
      score += 50;
    }
    if (ffTitle.includes('ppi') && (tvTitle.includes('ppi') || tvTitle.includes('producer'))) score += 50;
    if (ffTitle.includes('retail') && tvTitle.includes('retail')) score += 50;
    if ((ffTitle.includes('unemployment') || ffTitle.includes('jobless') || ffTitle.includes('claims')) &&
        (tvTitle.includes('unemployment') || tvTitle.includes('jobless') || tvTitle.includes('claims'))) {
      score += 50;
    }
    if (ffTitle.includes('pmi') && tvTitle.includes('pmi')) score += 50;
    if (ffTitle.includes('auction') && tvTitle.includes('auction')) score += 50;
    if (ffTitle.includes('building permits') && tvTitle.includes('building permits')) score += 50;
    if (ffTitle.includes('confidence') && tvTitle.includes('confidence')) score += 50;
    if (ffTitle.includes('index') && tvTitle.includes('index')) score += 20;

    if (score > bestScore && score >= 75) {
      bestScore = score;
      best = tv;
    }
  }

  return best;
}

/**
 * Enriches Forex Factory events with live actual values from TradingView
 */
async function enrichEventsWithActuals(events) {
  if (!Array.isArray(events) || events.length === 0) return events;

  // Compute date range for TradingView query
  let minDate = new Date();
  let maxDate = new Date();
  events.forEach(e => {
    if (e.date) {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) {
        if (d < minDate) minDate = d;
        if (d > maxDate) maxDate = d;
      }
    }
  });

  const fromIso = new Date(minDate.getTime() - 24 * 3600 * 1000).toISOString();
  const toIso = new Date(maxDate.getTime() + 24 * 3600 * 1000).toISOString();

  const tvReleases = await fetchTradingViewEvents(fromIso, toIso);
  if (tvReleases.length === 0) {
    console.log('[Forex Factory Sync] No external actuals retrieved; retaining existing actuals.');
    return events;
  }

  let enrichedCount = 0;
  for (const evt of events) {
    // If event already has an authentic actual value, keep it unless new data is available
    const match = matchTradingViewRelease(evt, tvReleases);
    if (match) {
      let val = String(match.actual);
      if (match.unit === '%' && !val.includes('%')) val += '%';
      else if (match.unit && !val.includes(match.unit)) val += match.unit;
      evt.actual = val;
      enrichedCount++;
    }
  }

  console.log(`[Forex Factory Sync] Successfully matched and updated ${enrichedCount} actual values.`);
  return events;
}

/**
 * Parse FairEconomy CSV format into standardized event records
 * Header: Title,Country,Date,Time,Impact,Forecast,Previous,URL
 */
function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const events = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    const [rawTitle, rawCountry, dateStr, timeStr, rawImpact, rawForecast, rawPrevious] = fields;
    if (!rawTitle || !rawCountry || !dateStr) continue;

    const title = rawTitle.replace(/^"|"$/g, '').trim();
    const country = rawCountry.replace(/^"|"$/g, '').trim().toUpperCase();
    const impact = rawImpact ? rawImpact.replace(/^"|"$/g, '').trim() : 'Low';
    const forecast = rawForecast ? rawForecast.replace(/^"|"$/g, '').trim() : '';
    const previous = rawPrevious ? rawPrevious.replace(/^"|"$/g, '').trim() : '';

    let isoDate = '';
    const dateParts = dateStr.split('-');
    if (dateParts.length === 3) {
      const [m, d, y] = dateParts;
      const cleanMonth = m.padStart(2, '0');
      const cleanDay = d.padStart(2, '0');

      if (timeStr && timeStr.includes(':')) {
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2];
          const ampm = timeMatch[3].toLowerCase();
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
          const cleanHours = String(hours).padStart(2, '0');
          isoDate = `${y}-${cleanMonth}-${cleanDay}T${cleanHours}:${minutes}:00Z`;
        } else {
          isoDate = `${y}-${cleanMonth}-${cleanDay}T00:00:00Z`;
        }
      } else {
        isoDate = `${y}-${cleanMonth}-${cleanDay}T00:00:00Z`;
      }
    }

    events.push({
      title,
      country,
      date: isoDate,
      impact,
      forecast,
      previous
    });
  }

  return events;
}

/**
 * Parse FairEconomy XML format
 */
function parseXml(xmlText) {
  const blocks = xmlText.split('<event>').slice(1);
  const events = [];

  for (const block of blocks) {
    const getTag = tag => {
      const m = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };

    const title = getTag('title');
    const country = getTag('country').toUpperCase();
    const dateStr = getTag('date');
    const timeStr = getTag('time');
    const impact = getTag('impact') || 'Low';
    const forecast = getTag('forecast');
    const previous = getTag('previous');
    const actual = getTag('actual');

    if (!title || !country || !dateStr) continue;

    let isoDate = '';
    const dateParts = dateStr.split('-');
    if (dateParts.length === 3) {
      const [m, d, y] = dateParts;
      const cleanMonth = m.padStart(2, '0');
      const cleanDay = d.padStart(2, '0');

      if (timeStr && timeStr.includes(':')) {
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2];
          const ampm = timeMatch[3].toLowerCase();
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
          const cleanHours = String(hours).padStart(2, '0');
          isoDate = `${y}-${cleanMonth}-${cleanDay}T${cleanHours}:${minutes}:00Z`;
        } else {
          isoDate = `${y}-${cleanMonth}-${cleanDay}T00:00:00Z`;
        }
      } else {
        isoDate = `${y}-${cleanMonth}-${cleanDay}T00:00:00Z`;
      }
    }

    const event = {
      title,
      country,
      date: isoDate,
      impact,
      forecast,
      previous
    };

    if (actual && actual.trim() !== '') {
      event.actual = actual.trim();
    }

    events.push(event);
  }

  return events;
}

async function main() {
  console.log('[Forex Factory Sync] Starting multi-endpoint calendar synchronization...');
  let events = [];

  // 1. Try Primary JSON feed
  try {
    console.log('[Forex Factory Sync] Attempting JSON feed: https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    const jsonRaw = await fetchUrl('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    const parsed = JSON.parse(jsonRaw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      events = parsed.map(evt => {
        const clone = { ...evt };
        if (clone.actual !== undefined && (clone.actual === null || String(clone.actual).trim() === '' || clone.actual === '-')) {
          delete clone.actual;
        }
        return clone;
      });
      console.log(`[Forex Factory Sync] SUCCESS: Synced ${events.length} events via JSON feed.`);
    }
  } catch (err) {
    console.warn(`[Forex Factory Sync] JSON feed unavailable (${err.message}). Trying CSV fallback...`);
  }

  // 2. Try Secondary CSV feed
  if (events.length === 0) {
    try {
      console.log('[Forex Factory Sync] Attempting CSV feed: https://nfs.faireconomy.media/ff_calendar_thisweek.csv');
      const csvRaw = await fetchUrl('https://nfs.faireconomy.media/ff_calendar_thisweek.csv');
      events = parseCsv(csvRaw);
      if (events.length > 0) {
        console.log(`[Forex Factory Sync] SUCCESS: Synced ${events.length} events via CSV feed.`);
      }
    } catch (err) {
      console.warn(`[Forex Factory Sync] CSV feed unavailable (${err.message}). Trying XML fallback...`);
    }
  }

  // 3. Try XML feed
  if (events.length === 0) {
    try {
      console.log('[Forex Factory Sync] Attempting XML feed: https://nfs.faireconomy.media/ff_calendar_thisweek.xml');
      const xmlRaw = await fetchUrl('https://nfs.faireconomy.media/ff_calendar_thisweek.xml');
      events = parseXml(xmlRaw);
      if (events.length > 0) {
        console.log(`[Forex Factory Sync] SUCCESS: Synced ${events.length} events via XML feed.`);
      }
    } catch (err) {
      console.warn(`[Forex Factory Sync] XML feed unavailable (${err.message}).`);
    }
  }

  // 4. Try local raw CSV cache or existing output file if present
  if (events.length === 0) {
    const localCsv = path.join(OUTPUT_DIR, 'ff_calendar_thisweek_raw.csv');
    if (fs.existsSync(localCsv)) {
      console.log('[Forex Factory Sync] Parsing local cached raw CSV...');
      events = parseCsv(fs.readFileSync(localCsv, 'utf8'));
    } else if (fs.existsSync(OUTPUT_FILE)) {
      console.log('[Forex Factory Sync] Reading existing dataset to enrich with actuals...');
      events = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }
  }

  if (!events || events.length === 0) {
    console.error('[Forex Factory Sync] Failed to obtain calendar dataset.');
    process.exit(1);
  }

  // ENRICH WITH LIVE TRADINGVIEW ACTUAL VALUES
  console.log('[Forex Factory Sync] Enriching past events with live actual values from TradingView...');
  const enriched = await enrichEventsWithActuals(events);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2), 'utf-8');
  console.log(`[Forex Factory Sync] SUCCESS: Successfully saved ${enriched.length} events to ${OUTPUT_FILE}.`);
}

main().catch(err => {
  console.error('[Forex Factory Sync] Fatal error:', err);
  process.exit(1);
});
