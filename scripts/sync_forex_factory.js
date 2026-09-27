/**
 * Synchronizes the Forex Factory Economic Calendar feed from FairEconomy CDN
 * with multi-format fallback (JSON -> CSV -> XML) and saves it into public/data/forex_factory_calendar.json.
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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: HEADERS }, (res) => {
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

    // Convert dateStr (MM-DD-YYYY) and timeStr (e.g. 12:30pm, All Day) to UTC ISO string
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

    // Actual is ONLY included if explicitly published (non-empty)
    // For pending/future releases, actual MUST be omitted.
    events.push(event);
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

  // 1. Try Primary JSON feed
  try {
    console.log('[Forex Factory Sync] Attempting JSON feed: https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    const jsonRaw = await fetchUrl('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    const parsed = JSON.parse(jsonRaw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure pending events do not have false actual values
      const sanitized = parsed.map(evt => {
        const clone = { ...evt };
        if (clone.actual !== undefined && (clone.actual === null || String(clone.actual).trim() === '' || clone.actual === '-')) {
          delete clone.actual;
        }
        return clone;
      });
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
      console.log(`[Forex Factory Sync] SUCCESS: Synced ${sanitized.length} events via JSON feed.`);
      return;
    }
  } catch (err) {
    console.warn(`[Forex Factory Sync] JSON feed unavailable (${err.message}). Trying CSV fallback...`);
  }

  // 2. Try Secondary CSV feed
  try {
    console.log('[Forex Factory Sync] Attempting CSV feed: https://nfs.faireconomy.media/ff_calendar_thisweek.csv');
    const csvRaw = await fetchUrl('https://nfs.faireconomy.media/ff_calendar_thisweek.csv');
    const parsed = parseCsv(csvRaw);
    if (parsed.length > 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log(`[Forex Factory Sync] SUCCESS: Synced ${parsed.length} events via CSV feed.`);
      return;
    }
  } catch (err) {
    console.warn(`[Forex Factory Sync] CSV feed unavailable (${err.message}). Trying XML fallback...`);
  }

  // 3. Try XML feed
  try {
    console.log('[Forex Factory Sync] Attempting XML feed: https://nfs.faireconomy.media/ff_calendar_thisweek.xml');
    const xmlRaw = await fetchUrl('https://nfs.faireconomy.media/ff_calendar_thisweek.xml');
    const parsed = parseXml(xmlRaw);
    if (parsed.length > 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log(`[Forex Factory Sync] SUCCESS: Synced ${parsed.length} events via XML feed.`);
      return;
    }
  } catch (err) {
    console.warn(`[Forex Factory Sync] XML feed unavailable (${err.message}).`);
  }

  // 4. Try local raw CSV cache if present
  const localCsv = path.join(OUTPUT_DIR, 'ff_calendar_thisweek_raw.csv');
  if (fs.existsSync(localCsv)) {
    console.log('[Forex Factory Sync] Parsing local cached raw CSV...');
    const csvRaw = fs.readFileSync(localCsv, 'utf8');
    const parsed = parseCsv(csvRaw);
    if (parsed.length > 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log(`[Forex Factory Sync] SUCCESS: Generated ${parsed.length} events from local cache.`);
      return;
    }
  }

  if (fs.existsSync(OUTPUT_FILE)) {
    console.log('[Forex Factory Sync] Retaining existing calendar dataset.');
  } else {
    console.error('[Forex Factory Sync] Failed to populate calendar dataset.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Forex Factory Sync] Fatal error:', err);
  process.exit(1);
});
