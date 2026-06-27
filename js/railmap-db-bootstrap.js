// DB Bootstrap — fetches a representative German station index on page load.
// Talks to the local proxy (proxy.js) — run: node proxy.js
//
// SETUP in HTML (after stations-data.js):
//   <script src="js/railmap-db.js"></script>
//   <script src="js/railmap-db-bootstrap.js"></script>
//   <script src="js/map-render.js"></script>
//   <script src="js/station.js"></script>

(function () {
  'use strict';

  const CACHE_KEY    = 'railmap_db_station_index_v1';
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  const DB_TZ        = 'Europe/Berlin';
  const PROXY_URL    = 'http://localhost:3000';

  // ── Seed queries ───────────────────────────────────────────────────────────
  const SEED_QUERIES = [
    'Berlin', 'Hamburg', 'München', 'Frankfurt', 'Köln', 'Stuttgart',
    'Düsseldorf', 'Leipzig', 'Hannover', 'Nürnberg', 'Bremen', 'Dresden',
    'Dortmund', 'Essen', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
    'Bonn', 'Mannheim', 'Karlsruhe', 'Wiesbaden', 'Augsburg', 'Münster',
    'Aachen', 'Kiel', 'Lübeck', 'Rostock', 'Erfurt', 'Magdeburg',
    'Braunschweig', 'Koblenz', 'Freiburg', 'Mainz', 'Saarbrücken',
    'Kassel', 'Halle', 'Osnabrück', 'Oldenburg', 'Würzburg',
    'Heidelberg', 'Darmstadt', 'Regensburg', 'Ingolstadt', 'Ulm',
    'Heilbronn', 'Pforzheim', 'Reutlingen', 'Paderborn', 'Siegen',
    'Hildesheim', 'Wolfsburg', 'Göttingen', 'Fulda', 'Gießen',
    'Marburg', 'Trier', 'Kaiserslautern', 'Ludwigshafen', 'Offenburg',
    'Konstanz', 'Ravensburg', 'Passau', 'Landshut', 'Rosenheim',
    'Bayreuth', 'Bamberg', 'Coburg', 'Schweinfurt', 'Aschaffenburg',
  ];

  function isGermanEva(id) {
    return /^80/.test(String(id));
  }

  // ── Parse stop from DB Fahrplan location.name response ────────────────────
  function parseStop(item) {
    const evaNumber = Number(item.id || item.extId || 0);
    if (!evaNumber || !isGermanEva(evaNumber)) return null;

    const name = (item.name || '').trim();
    if (!name) return null;

    const city = name
      .replace(/\s+(Hbf|Bf|Bahnhof)$/i, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/,[^,]+$/, '')
      .trim();

    return {
      id:        String(evaNumber),
      evaNumber,
      name,
      city,
      country:   'Germany',
      timezone:  DB_TZ,
      tier:      'regional',
      operators: ['db'],
      lat:  item.lat != null ? Number(item.lat) : null,
      lng:  item.lon != null ? Number(item.lon) : null,
      source: 'db',
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

  function assignTier(s) {
    return MAJOR_HUBS.has(s.name) ? 'major' : 'regional';
  }

  function dedupe(stations) {
    const seen = new Map();
    for (const s of stations) {
      if (!seen.has(s.id)) seen.set(s.id, s);
    }
    return Array.from(seen.values());
  }

  // ── Cache ──────────────────────────────────────────────────────────────────
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

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Fetch one seed via proxy ───────────────────────────────────────────────
  async function fetchSeed(query) {
    const res = await fetch(
      `${PROXY_URL}/locations?input=${encodeURIComponent(query)}&format=json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error(`DB ${res.status}`);
    const data = await res.json();
    const raw   = data.LocationList?.StopLocation || [];
    const items = Array.isArray(raw) ? raw : [raw];
    return items.map(parseStop).filter(Boolean);
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

    console.info(`[DB Bootstrap] Merged ${added} German stations (total: ${STATIONS.length})`);
  }

  function notifyReady(stations) {
    window.dispatchEvent(new CustomEvent('railmap:german-stations-ready', { detail: { stations } }));
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  async function bootstrap() {
    // 1. Try cache
    const cached = loadCache();
    if (cached?.length > 0) {
      console.info(`[DB Bootstrap] Loaded ${cached.length} German stations from cache.`);
      mergeIntoGlobal(cached);
      notifyReady(cached);
      return cached;
    }

    // 2. Check proxy is reachable before hammering 60 seed queries
    try {
      const ping = await fetch(`${PROXY_URL}/locations?input=Berlin&format=json`);
      if (!ping.ok) throw new Error(`proxy ${ping.status}`);
    } catch (err) {
      console.warn('[DB Bootstrap] Proxy not reachable — skipping. Run: node proxy.js');
      return [];
    }

    // 3. Fetch all seeds
    console.info(`[DB Bootstrap] Fetching German stations (${SEED_QUERIES.length} queries)…`);
    const all = [];
    for (let i = 0; i < SEED_QUERIES.length; i++) {
      try {
        const results = await fetchSeed(SEED_QUERIES[i]);
        all.push(...results);
      } catch (err) {
        console.warn(`[DB Bootstrap] Seed "${SEED_QUERIES[i]}" failed:`, err.message);
      }
      // Stay well under DB's 60 req/min limit via the proxy
      if (i < SEED_QUERIES.length - 1) await delay(1100);
    }

    // 4. Dedupe + cache + merge
    const stations = dedupe(all);
    console.info(`[DB Bootstrap] Fetched ${stations.length} unique German stations.`);
    saveCache(stations);
    mergeIntoGlobal(stations);
    notifyReady(stations);
    return stations;
  }

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
