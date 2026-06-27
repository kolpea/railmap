// DB Bootstrap — fetches a representative German station index on page load.
//
// SETUP: Include AFTER railmap-db.js and stations-data.js,
//        BEFORE map-render.js and station.js:
//
//   <script>
//     window.RAILMAP_DB_CLIENT_ID = 'your-client-id';
//     window.RAILMAP_DB_API_KEY   = 'your-api-key';
//   </script>
//   <script src="js/stations-data.js"></script>
//   <script src="js/railmap-db.js"></script>
//   <script src="js/railmap-db-bootstrap.js"></script>
//   <script src="js/map-render.js"></script>
//   <script src="js/station.js"></script>
//
// HOW IT WORKS:
//   1. Queries the DB Fahrplan location.name endpoint with seed city names.
//   2. Results are merged, deduplicated, and cached in sessionStorage (1 hour).
//   3. German stations are injected into the global STATIONS array.
//   4. If credentials are missing or the API fails, bootstrap silently skips.
//   5. window.RAILMAP_DB_BOOTSTRAP.ready is a Promise you can await.

(function () {
  'use strict';

  const CACHE_KEY    = 'railmap_db_station_index_v1';
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  const DB_TZ        = 'Europe/Berlin';
  const FAHRPLAN_URL = 'https://reiseauskunft.bahn.de/bin/rest.exe';

  // ── Seed queries ───────────────────────────────────────────────────────────
  // Each query returns up to ~10 stops. Covers major hubs + regional centres.
  const SEED_QUERIES = [
    // Major intercity hubs
    'Berlin', 'Hamburg', 'München', 'Frankfurt', 'Köln', 'Stuttgart',
    'Düsseldorf', 'Leipzig', 'Hannover', 'Nürnberg', 'Bremen', 'Dresden',
    'Dortmund', 'Essen', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
    'Bonn', 'Mannheim', 'Karlsruhe', 'Wiesbaden', 'Augsburg', 'Münster',
    'Aachen', 'Kiel', 'Lübeck', 'Rostock', 'Erfurt', 'Magdeburg',
    'Braunschweig', 'Koblenz', 'Freiburg', 'Mainz', 'Saarbrücken',
    'Kassel', 'Halle', 'Osnabrück', 'Oldenburg', 'Würzburg',
    // Regional sweeps
    'Heidelberg', 'Darmstadt', 'Regensburg', 'Ingolstadt', 'Ulm',
    'Heilbronn', 'Pforzheim', 'Reutlingen', 'Paderborn', 'Siegen',
    'Hildesheim', 'Wolfsburg', 'Göttingen', 'Fulda', 'Gießen',
    'Marburg', 'Trier', 'Kaiserslautern', 'Ludwigshafen', 'Offenburg',
    'Konstanz', 'Ravensburg', 'Passau', 'Landshut', 'Rosenheim',
    'Bayreuth', 'Bamberg', 'Coburg', 'Schweinfurt', 'Aschaffenburg',
  ];

  // ── Auth headers ───────────────────────────────────────────────────────────
  function authHeaders() {
    const clientId = (window.RAILMAP_DB_CLIENT_ID || localStorage.getItem('railmap_db_client_id') || '').trim();
    const apiKey   = (window.RAILMAP_DB_API_KEY   || localStorage.getItem('railmap_db_api_key')   || '').trim();
    return {
      'DB-Client-Id': clientId,
      'DB-Api-Key':   apiKey,
      'Accept':       'application/json',
    };
  }

  function hasCredentials() {
    const h = authHeaders();
    return !!(h['DB-Client-Id'] && h['DB-Api-Key']);
  }

  // ── German EVA check (starts with 80) ─────────────────────────────────────
  function isGermanEva(evaNumber) {
    return /^80/.test(String(evaNumber));
  }

  // ── Parse a single location result ────────────────────────────────────────
  function parseStop(item) {
    const stop = item.StopLocation || item.stop || item;
    const evaNumber = Number(stop.id || stop.extId || 0);
    if (!evaNumber || !isGermanEva(evaNumber)) return null;

    const name = (stop.name || '').trim();
    if (!name) return null;

    // Derive city from station name heuristic
    let city = name
      .replace(/\s+(Hbf|Bf|Bahnhof|hbf|bf)$/i, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/,[^,]+$/, '')
      .trim();

    const lat = stop.lat  != null ? Number(stop.lat)  : null;
    const lng = stop.lon  != null ? Number(stop.lon)  : null;

    return {
      id:        String(evaNumber),
      evaNumber,
      name,
      city,
      country:   'Germany',
      timezone:  DB_TZ,
      tier:      'regional',
      operators: ['db'],
      lat,
      lng,
      source:    'db',
    };
  }

  // ── Tier assignment ────────────────────────────────────────────────────────
  const MAJOR_HUBS = new Set([
    'Berlin Hbf', 'Hamburg Hbf', 'München Hbf', 'Frankfurt(Main)Hbf',
    'Köln Hbf', 'Stuttgart Hbf', 'Düsseldorf Hbf', 'Leipzig Hbf',
    'Hannover Hbf', 'Nürnberg Hbf', 'Bremen Hbf', 'Dresden Hbf',
    'Dortmund Hbf', 'Essen Hbf', 'Duisburg Hbf', 'Mannheim Hbf',
    'Karlsruhe Hbf', 'Augsburg Hbf', 'Erfurt Hbf', 'Kassel-Wilhelmshöhe',
    'Berlin Ostbahnhof', 'Berlin Südkreuz', 'Hamburg-Altona',
    'München Flughafen', 'Frankfurt(Main) Flughafen Fernbf',
  ]);

  function assignTier(station) {
    if (MAJOR_HUBS.has(station.name)) return 'major';
    return 'regional';
  }

  // ── Deduplication ──────────────────────────────────────────────────────────
  function dedupe(stations) {
    const seen = new Map();
    for (const s of stations) {
      if (!seen.has(s.id)) seen.set(s.id, s);
    }
    return Array.from(seen.values());
  }

  // ── Cache helpers ──────────────────────────────────────────────────────────
  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, stations } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) return null;
      return stations;
    } catch (_) { return null; }
  }

  function saveCache(stations) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), stations }));
    } catch (_) {}
  }

  // ── Delay helper ───────────────────────────────────────────────────────────
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Fetch a single seed query ──────────────────────────────────────────────
async function fetchSeed(query) {
  const apiKey = (window.RAILMAP_DB_API_KEY || localStorage.getItem('railmap_db_api_key') || '').trim();
  const res = await fetch(
    `${FAHRPLAN_URL}/location.name?authKey=${apiKey}&input=${encodeURIComponent(query)}&format=json`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (!res.ok) throw new Error(`DB ${res.status}`);
  const data = await res.json();
  const items = data.LocationList?.StopLocation || [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.map(parseStop).filter(Boolean);
}

  // ── Merge into global STATIONS ─────────────────────────────────────────────
  function mergeIntoGlobal(germanStations) {
    if (typeof STATIONS === 'undefined') return;

    const existingIds   = new Set(STATIONS.map(s => s.id));
    const existingNames = new Set(
      STATIONS.filter(s => s.country === 'Germany').map(s => s.name.toLowerCase())
    );

    let added = 0;
    for (const s of germanStations) {
      if (existingIds.has(s.id))                  continue;
      if (existingNames.has(s.name.toLowerCase())) continue;
      if (s.lat == null || s.lng == null)          continue;
      if (!isGermanEva(s.evaNumber))               continue;

      s.tier = assignTier(s);
      STATIONS.push(s);
      existingIds.add(s.id);
      existingNames.add(s.name.toLowerCase());
      added++;
    }

    console.info(`[DB Bootstrap] Merged ${added} German stations into STATIONS (total: ${STATIONS.length})`);
  }

  function notifyReady(stations) {
    window.dispatchEvent(new CustomEvent('railmap:german-stations-ready', {
      detail: { stations },
    }));
  }

  // ── Main bootstrap ─────────────────────────────────────────────────────────
  async function bootstrap() {
    if (!hasCredentials()) {
      console.info('[DB Bootstrap] No credentials — skipping German station fetch.');
      return [];
    }

    // 1. Try cache
    const cached = loadCache();
    if (cached && cached.length > 0) {
      console.info(`[DB Bootstrap] Loaded ${cached.length} German stations from cache.`);
      mergeIntoGlobal(cached);
      notifyReady(cached);
      return cached;
    }

    // 2. Fetch seeds
    console.info(`[DB Bootstrap] Fetching German station index (${SEED_QUERIES.length} seed queries)…`);
    const all = [];
    for (let i = 0; i < SEED_QUERIES.length; i++) {
      try {
        const results = await fetchSeed(SEED_QUERIES[i]);
        all.push(...results);
      } catch (err) {
        console.warn(`[DB Bootstrap] Seed "${SEED_QUERIES[i]}" failed:`, err.message);
      }
      // ~60 req/min limit → 1100ms between calls keeps us safely under
      if (i < SEED_QUERIES.length - 1) await delay(1100);
    }

    // 3. Dedupe + cache
    const stations = dedupe(all);
    console.info(`[DB Bootstrap] Fetched ${stations.length} unique German stations.`);
    saveCache(stations);

    // 4. Merge + notify
    mergeIntoGlobal(stations);
    notifyReady(stations);

    return stations;
  }

  // ── Expose ready Promise ───────────────────────────────────────────────────
  const readyPromise = bootstrap().catch(err => {
    console.warn('[DB Bootstrap] Failed:', err);
    return [];
  });

  window.RAILMAP_DB_BOOTSTRAP = {
    ready: readyPromise,
    reload: () => {
      sessionStorage.removeItem(CACHE_KEY);
      return bootstrap();
    },
  };

})();
