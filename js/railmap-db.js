// Shared Deutsche Bahn helpers for search and departures.
// Talks to the local proxy (proxy.js) which forwards to the official DB API.
// No API key needed in the browser — credentials live in proxy.js only.
//
// Proxy must be running: node proxy.js
// Proxy listens at http://localhost:3000

(function () {
  'use strict';

  const PROXY_URL        = 'http://localhost:3000';
  const DB_TZ            = 'Europe/Berlin';
  const SEARCH_CACHE_KEY = 'railmap_db_search_cache_v1';

  // ── German EVA number check ────────────────────────────────────────────────
  // German stations: EVA starts with 80. Austrian = 81, Swiss = 85.
  function isGermanEva(id) {
    if (!id) return false;
    return /^80/.test(String(id));
  }

  // ── Station URL builder ────────────────────────────────────────────────────
  function buildStationUrl(station) {
    const params = new URLSearchParams();
    if (station.id)          params.set('station',   station.id);
    if (station.name)        params.set('name',       station.name);
    if (station.city)        params.set('city',       station.city);
    if (station.country)     params.set('country',    station.country);
    if (station.evaNumber)   params.set('evaNumber',  String(station.evaNumber));
    if (station.timezone)    params.set('tz',         station.timezone);
    if (station.lat != null) params.set('lat',        String(station.lat));
    if (station.lng != null) params.set('lng',        String(station.lng));
    return `station.html?${params.toString()}`;
  }

  // ── URL query parser ───────────────────────────────────────────────────────
  function parseStationQuery(params, curatedStations) {
    const stationId = params.get('station')   || '';
    const evaNumber = params.get('evaNumber') || '';
    const name      = params.get('name')      || '';
    const country   = params.get('country')   || '';
    const city      = params.get('city')      || '';
    const tz        = params.get('tz')        || '';

    const curated = curatedStations.find(s => s.id === stationId);
    if (curated) return { ...curated, source: 'curated' };

    if (evaNumber || country === 'Germany' || country === 'DE') {
      return {
        id:        evaNumber || stationId || name,
        evaNumber: evaNumber ? Number(evaNumber) : null,
        name:      name || stationId || 'German station',
        city:      city || '',
        country:   'Germany',
        timezone:  tz || DB_TZ,
        lat:  params.get('lat') ? Number(params.get('lat')) : null,
        lng:  params.get('lng') ? Number(params.get('lng')) : null,
        source: 'db',
      };
    }

    return null;
  }

  // ── Parse a location result ────────────────────────────────────────────────
  // DB Fahrplan /location.name returns { LocationList: { StopLocation: [...] } }
  function parseLocationResult(item) {
    const evaNumber = Number(item.id || item.extId || 0);
    if (!isGermanEva(evaNumber)) return null;

    const name = (item.name || '').trim();
    if (!name) return null;

    // Derive city heuristically
    let city = name
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
      lat:  item.lat != null ? Number(item.lat) : null,
      lng:  item.lon != null ? Number(item.lon) : null,
      source: 'db',
    };
  }

  // ── Station search ─────────────────────────────────────────────────────────
  async function searchGermanStations(query, limit = 8) {
    const q = query.trim();
    if (q.length < 2) return [];

    const cacheKey = `${SEARCH_CACHE_KEY}:${q.toLowerCase()}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    try {
      const res = await fetch(
        `${PROXY_URL}/locations?input=${encodeURIComponent(q)}&format=json`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) throw new Error(`DB search ${res.status}`);
      const data = await res.json();

      // DB API returns { LocationList: { StopLocation: [...] } }
      const raw   = data.LocationList?.StopLocation || [];
      const items = Array.isArray(raw) ? raw : [raw];

      const results = items
        .map(parseLocationResult)
        .filter(Boolean)
        .slice(0, limit);

      try { sessionStorage.setItem(cacheKey, JSON.stringify(results)); } catch (_) {}
      return results;
    } catch (err) {
      console.warn('[DB] Station search failed:', err.message);
      return [];
    }
  }

  // ── Parse a departure ──────────────────────────────────────────────────────
  // DB Fahrplan /departureBoard returns { DepartureBoard: { Departure: [...] } }
  function parseDbDeparture(item) {
    // dateTime format: "2024-06-15T14:23" or "2024-06-15 14:23"
    const rawTime    = item.dateTime || '';
    const line       = (item.name      || '').trim(); // e.g. "ICE 123"
    const dest       = (item.direction || '').trim();
    const platform   = (item.track     || '').trim();
    const operator   = (item.operator?.name || item.operator || item.type || 'DB').trim();

    return {
      time:                rawTime,
      timetabledDeparture: rawTime,
      estimatedDeparture:  '',
      timetabledArrival:   '',
      estimatedArrival:    '',
      line,
      destination: dest,
      operator,
      platform,
      stopName: item.stopName || '',
    };
  }

  // ── Departures ─────────────────────────────────────────────────────────────
  async function fetchGermanDepartures(station, limit = 20) {
    if (!station?.evaNumber) throw new Error('Missing DB EVA number');

    const date = new Date().toLocaleDateString('sv-SE', { timeZone: DB_TZ });
    const res = await fetch(
      `${PROXY_URL}/departures?evaId=${station.evaNumber}&date=${date}&format=json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error(`DB departures ${res.status}`);
    const data = await res.json();

    const raw  = data.DepartureBoard?.Departure || [];
    const deps = Array.isArray(raw) ? raw : [raw];

    return deps
      .map(parseDbDeparture)
      .filter(d => d.time || d.destination || d.line)
      .slice(0, limit);
  }

  // ── Exports ────────────────────────────────────────────────────────────────
  window.RAILMAP_DB = {
    isGermanEva,
    searchGermanStations,
    fetchGermanDepartures,
    routeToStation: buildStationUrl,
    parseStationQuery,
    germanTimezone: () => DB_TZ,
  };

})();
