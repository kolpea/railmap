// SBB Bootstrap — fetches the full Swiss station index on page load.
//
// SETUP: Include this script AFTER railmap-sbb.js and AFTER stations-data.js
// but BEFORE map-render.js and station.js, e.g.:
//
//   <script src="stations-data.js"></script>
//   <script src="railmap-sbb.js"></script>
//   <script src="railmap-sbb-bootstrap.js"></script>   ← this file
//   <script src="map-render.js"></script>
//   <script src="station.js"></script>
//
// HOW IT WORKS:
//   1. On page load it fetches a representative set of Swiss stations from the
//      SBB OJP API (using a set of seed queries that cover the full network).
//   2. Results are merged, deduplicated, and stored in sessionStorage so the
//      fetch only happens once per browser session.
//   3. Swiss stations are injected into the global STATIONS array so map-render.js
//      and station.js see them automatically — no changes needed in those files.
//   4. If the token is missing or the API fails, the bootstrap silently skips
//      and the rest of the app continues with curated-only data.
//   5. After loading, window.RAILMAP_SBB_BOOTSTRAP.ready is a Promise you can
//      await anywhere if you need to wait for Swiss data before doing something.

(function () {
  'use strict';

  const CACHE_KEY      = 'railmap_sbb_station_index_v1';
  const CACHE_TTL_MS   = 60 * 60 * 1000; // 1 hour
  const SWISS_TZ       = 'Europe/Zurich';
  const OJP_URL        = 'https://api.opentransportdata.swiss/ojp20';

  // ── Seed queries ──────────────────────────────────────────────────────────
  // The OJP location endpoint is a search API, not a bulk-list endpoint.
  // We cover the Swiss network by querying each canton's main city plus a few
  // intercity prefixes. Each query returns up to 30 results. The combined
  // deduplicated set gives ~300–500 stations which covers all major and most
  // regional stops.
  const SEED_QUERIES = [
    // Major hubs
    'Zürich', 'Bern', 'Basel', 'Geneva', 'Lausanne', 'Luzern',
    'St. Gallen', 'Winterthur', 'Biel', 'Thun', 'Chur', 'Lugano',
    'Olten', 'Aarau', 'Sion', 'Bellinzona', 'Schaffhausen', 'Frauenfeld',
    'Liestal', 'Solothurn', 'Zug', 'Schwyz', 'Altdorf', 'Sarnen',
    'Stans', 'Glarus', 'Appenzell', 'Herisau', 'Delémont', 'Porrentruy',
    // Regional prefix sweeps to catch smaller stops
    'Baden', 'Brugg', 'Aarburg', 'Langenthal', 'Burgdorf', 'Lyss',
    'Bulle', 'Fribourg', 'Nyon', 'Morges', 'Yverdon', 'Vevey', 'Montreux',
    'Martigny', 'Brig', 'Visp', 'Locarno', 'Mendrisio', 'Arth',
    'Rapperswil', 'Romanshorn', 'Kreuzlingen', 'Rorschach', 'Buchs',
    'Sargans', 'Landquart', 'Davos', 'Arosa', 'Pontresina', 'St. Moritz',
  ];

  // ── XML helpers (mirrors railmap-sbb.js, kept self-contained) ─────────────
  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function buildLocationRequest(query, limit) {
    const ts = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<OJP xmlns="http://www.vdv.de/ojp" xmlns:siri="http://www.siri.org.uk/siri" version="2.0"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <OJPRequest>
    <siri:ServiceRequest>
      <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
      <siri:RequestorRef>Railmap_bootstrap</siri:RequestorRef>
      <OJPLocationInformationRequest>
        <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
        <siri:MessageIdentifier>boot-${Date.now()}-${Math.random().toString(36).slice(2)}</siri:MessageIdentifier>
        <InitialInput>
          <Name>${escapeXml(query)}</Name>
        </InitialInput>
        <Restrictions>
          <Type>stop</Type>
          <NumberOfResults>${limit}</NumberOfResults>
          <IncludePtModes>true</IncludePtModes>
        </Restrictions>
      </OJPLocationInformationRequest>
    </siri:ServiceRequest>
  </OJPRequest>
</OJP>`;
  }

  // ── XML response parser ───────────────────────────────────────────────────
  function parseLocationResponse(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) return [];

    const allEls = Array.from(doc.getElementsByTagName('*'));
    const results = allEls.filter(el => el.localName === 'PlaceResult');

    return results.map((result, i) => {
      function desc(node, name) {
        if (!node) return null;
        if (node.localName === name) return node;
        for (const child of node.children) {
          const found = desc(child, name);
          if (found) return found;
        }
        return null;
      }
      function text(node, name) {
        const el = desc(node, name);
        return el ? el.textContent.trim() : '';
      }
      function num(node, name) {
        const v = text(node, name);
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }

      const place     = desc(result, 'Place');
      const stopPlace = desc(place,  'StopPlace');
      const stopRef   = text(stopPlace, 'StopPlaceRef') || text(place, 'StopPlaceRef');
      const stopName  = text(stopPlace, 'StopPlaceName') || text(place, 'Name') || text(place, 'StopPlaceName');
      const city      = (text(stopPlace, 'TopographicPlaceName') || text(place, 'TopographicPlaceName') || '').replace(/\s+/g, ' ').trim();
      const lat       = num(place, 'Latitude');
      const lng       = num(place, 'Longitude');

      if (!stopRef || !stopName) return null;

      return {
        id:       stopRef,
        stopRef,
        name:     stopName.replace(/\s+/g, ' ').trim(),
        city:     city || '',
        country:  'Switzerland',
        timezone: SWISS_TZ,
        tier:     'regional',   // default; major hubs upgraded below
        operators: ['sbb'],
        lat,
        lng,
        source:   'sbb',
      };
    }).filter(Boolean);
  }

  function isSwissStopRef(stopRef) {
  if (!stopRef) return false;
  // Swiss stop refs start with 85 (UIC country code for Switzerland)
  return /^85/.test(stopRef.replace(/^[a-z]+:/i, ''));
}

  // ── Tier assignment ───────────────────────────────────────────────────────
  // Upgrades well-known major hubs so they render with a larger map dot.
  const MAJOR_HUBS = new Set([
    'Zürich HB', 'Bern', 'Basel SBB', 'Genève', 'Lausanne', 'Luzern',
    'St. Gallen', 'Winterthur', 'Lugano', 'Chur', 'Biel/Bienne',
    'Olten', 'Thun', 'Sion', 'Bellinzona', 'Schaffhausen',
    'Genf Flughafen', 'Zürich Flughafen',
  ]);

  function assignTier(station) {
    if (MAJOR_HUBS.has(station.name)) return 'major';
    return 'regional';
  }

  // ── Deduplication ─────────────────────────────────────────────────────────
  function dedupe(stations) {
    const seen = new Map();
    for (const s of stations) {
      if (!seen.has(s.stopRef)) {
        seen.set(s.stopRef, s);
      }
    }
    return Array.from(seen.values());
  }

  // ── Cache helpers ─────────────────────────────────────────────────────────
  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, stations } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) return null;
      return stations;
    } catch (_) {
      return null;
    }
  }

  function saveCache(stations) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), stations }));
    } catch (_) {
      // sessionStorage full — not fatal
    }
  }

  // ── API fetch with rate-limit courtesy delay ──────────────────────────────
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchSeed(query, token) {
    const xml = buildLocationRequest(query, 30);
    const res = await fetch(OJP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${token}`,
      },
      body: xml,
    });
    if (!res.ok) throw new Error(`OJP ${res.status}`);
    return parseLocationResponse(await res.text());
  }

  // ── Merge Swiss stations into global STATIONS array ───────────────────────
  // Keeps existing curated entries (non-Swiss or hand-crafted Swiss entries)
  // and appends SBB results that aren't already represented.
  function mergeIntoGlobal(swissStations) {
    if (typeof STATIONS === 'undefined') return;

    const existingIds   = new Set(STATIONS.map(s => s.id));
    const existingNames = new Set(
      STATIONS.filter(s => s.country === 'Switzerland').map(s => s.name.toLowerCase())
    );

    let added = 0;
    for (const s of swissStations) {
      if (existingIds.has(s.id)) continue;
      if (existingNames.has(s.name.toLowerCase())) continue;
      if (s.lat == null || s.lng == null) continue; // skip stations with no coords
      if (!isSwissStopRef(s.stopRef)) continue;  // ← skip non-Swiss

      s.tier = assignTier(s);
      STATIONS.push(s);
      existingIds.add(s.id);
      existingNames.add(s.name.toLowerCase());
      added++;
    }

    console.info(`[SBB Bootstrap] Merged ${added} Swiss stations into STATIONS (total: ${STATIONS.length})`);
  }

  // ── Map marker injection (map-render.js runs AFTER this script) ───────────
  // map-render.js iterates STATIONS at startup, so mergeIntoGlobal() is enough
  // for map nodes. But if the map is already initialised (e.g. on a page that
  // loads this script late), we fire a custom event so map-render can pick up
  // the new stations.
  function notifyMapReady(stations) {
    window.dispatchEvent(new CustomEvent('railmap:swiss-stations-ready', {
      detail: { stations },
    }));
  }

  // ── Main bootstrap ────────────────────────────────────────────────────────
  async function bootstrap() {
    const token = (window.RAILMAP_SBB_TOKEN || '').trim() ||
                  localStorage.getItem('railmap_sbb_token') || '';

    if (!token) {
      console.info('[SBB Bootstrap] No token — skipping Swiss station fetch.');
      return [];
    }

    // 1. Try cache first
    const cached = loadCache();
    if (cached && cached.length > 0) {
      console.info(`[SBB Bootstrap] Loaded ${cached.length} Swiss stations from cache.`);
      mergeIntoGlobal(cached);
      notifyMapReady(cached);
      return cached;
    }

    // 2. Fetch all seeds (with a small courtesy delay between requests)
    console.info(`[SBB Bootstrap] Fetching Swiss station index (${SEED_QUERIES.length} seed queries)…`);
    const all = [];
    for (let i = 0; i < SEED_QUERIES.length; i++) {
      try {
        const results = await fetchSeed(SEED_QUERIES[i], token);
        all.push(...results);
      } catch (err) {
        console.warn(`[SBB Bootstrap] Seed "${SEED_QUERIES[i]}" failed:`, err.message);
      }
      // 120 ms between requests — polite to the API, fast enough to finish in ~5 s
      if (i < SEED_QUERIES.length - 1) await delay(1300);
    }

    // 3. Dedupe and store
    const stations = dedupe(all);
    console.info(`[SBB Bootstrap] Fetched ${stations.length} unique Swiss stations.`);
    saveCache(stations);

    // 4. Merge into global STATIONS and notify
    mergeIntoGlobal(stations);
    notifyMapReady(stations);

    return stations;
  }

  // ── Expose a ready Promise so other scripts can await Swiss data ──────────
  //
  // Usage in map-render.js or station.js (optional — they work without this):
  //
  //   await window.RAILMAP_SBB_BOOTSTRAP.ready;
  //   // STATIONS now contains Swiss stations
  //
  const readyPromise = bootstrap().catch(err => {
    console.warn('[SBB Bootstrap] Failed:', err);
    return [];
  });

  window.RAILMAP_SBB_BOOTSTRAP = {
    ready: readyPromise,
    reload: () => {
      sessionStorage.removeItem(CACHE_KEY);
      return bootstrap();
    },
  };

})();
