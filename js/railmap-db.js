// Shared Deutsche Bahn helpers for search and departures.
// API: DB Fahrplan API (JSON) — https://apis.deutschebahn.com/db-api-marketplace/apis/fahrplan/v1/
// Auth: DB-Client-Id + DB-Api-Key headers (set window.RAILMAP_DB_CLIENT_ID and window.RAILMAP_DB_API_KEY)

(function () {
  'use strict';

  const FAHRPLAN_URL = 'https://reiseauskunft.bahn.de/bin/rest.exe';
  const DB_TZ          = 'Europe/Berlin';
  const CLIENT_ID_KEY  = 'railmap_db_client_id';
  const API_KEY_KEY    = 'railmap_db_api_key';
  const SEARCH_CACHE_KEY = 'railmap_db_search_cache_v1';

  // ── Credentials ────────────────────────────────────────────────────────────
  function getDbClientId() {
    return window.RAILMAP_DB_CLIENT_ID || localStorage.getItem(CLIENT_ID_KEY) || '';
  }

  function getDbApiKey() {
    return window.RAILMAP_DB_API_KEY || localStorage.getItem(API_KEY_KEY) || '';
  }

  function setDbCredentials(clientId, apiKey) {
    const cid = (clientId || '').trim();
    const key = (apiKey || '').trim();
    if (cid) { localStorage.setItem(CLIENT_ID_KEY, cid); window.RAILMAP_DB_CLIENT_ID = cid; }
    if (key) { localStorage.setItem(API_KEY_KEY,  key); window.RAILMAP_DB_API_KEY  = key; }
  }

  function hasCredentials() {
    return !!(getDbClientId() && getDbApiKey());
  }

  // ── Auth headers ───────────────────────────────────────────────────────────
  function authHeaders() {
    return {
      'DB-Client-Id': getDbClientId(),
      'DB-Api-Key':   getDbApiKey(),
      'Accept':       'application/json',
    };
  }

  // ── German EVA number check ────────────────────────────────────────────────
  // German stations start with 80, Austrian with 81, Swiss with 85.
  // We only want German stations from DB.
  function isGermanEva(evaNumber) {
    if (!evaNumber) return false;
    return /^80/.test(String(evaNumber));
  }

  // ── Station URL builder ────────────────────────────────────────────────────
  function buildStationUrl(station) {
    const params = new URLSearchParams();
    if (station.id)      params.set('station',  station.id);
    if (station.name)    params.set('name',      station.name);
    if (station.city)    params.set('city',      station.city);
    if (station.country) params.set('country',   station.country);
    if (station.evaNumber) params.set('evaNumber', String(station.evaNumber));
    if (station.timezone)  params.set('tz',     station.timezone);
    if (station.lat != null) params.set('lat',  String(station.lat));
    if (station.lng != null) params.set('lng',  String(station.lng));
    return `station.html?${params.toString()}`;
  }

  // ── URL query parser ───────────────────────────────────────────────────────
  function parseStationQuery(params, curatedStations) {
    const stationId  = params.get('station')   || '';
    const evaNumber  = params.get('evaNumber') || '';
    const name       = params.get('name')      || '';
    const country    = params.get('country')   || '';
    const city       = params.get('city')      || '';
    const tz         = params.get('tz')        || '';

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

  // ── Location search ────────────────────────────────────────────────────────
  // GET /location.name?input=<query>
  // Returns array of stop objects with { id, name, lon, lat, products }
async function dbRequest(path, apiKey) {
  const res = await fetch(`${FAHRPLAN_URL}${path}&authKey=${apiKey}&format=json`);
  if (!res.ok) throw new Error(`DB API ${res.status}`);
  return res.json();
}

  function parseLocationResult(item) {
    // item.id is the EVA number as a string like "8011160"
    const evaNumber = Number(item.id);
    if (!isGermanEva(evaNumber)) return null;

    // Extract city from name — DB names are often "City Hbf" or "City, District"
    const name = (item.name || '').trim();
    let city = '';
    const parenMatch = name.match(/^(.+?)\s*\(/);
    const commaMatch = name.match(/^([^,]+),/);
    if (parenMatch) city = parenMatch[1].trim();
    else if (commaMatch) city = commaMatch[1].trim();
    else city = name.replace(/\s+(Hbf|Bf|Bahnhof|hbf|bf)$/i, '').trim();

    return {
      id:        String(evaNumber),
      evaNumber,
      name,
      city,
      country:   'Germany',
      timezone:  DB_TZ,
      lat:  item.lat  != null ? Number(item.lat)  : null,
      lng:  item.lon  != null ? Number(item.lon)  : null,
      source: 'db',
    };
  }

  async function searchGermanStations(query, limit = 8) {
    const q = query.trim();
    if (q.length < 2) return [];

    if (!hasCredentials()) return [];

    const cacheKey = `${SEARCH_CACHE_KEY}:${q.toLowerCase()}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    try {
const data = await dbRequest(`/location.name?input=${encodeURIComponent(q)}`, getDbApiKey());
const items = data.LocationList?.StopLocation || [];
const stops = Array.isArray(items) ? items : [items];

      const results = stops
        .map(item => {
          // The API wraps results differently depending on version
          const stop = item.StopLocation || item.stop || item;
          return parseLocationResult(stop);
        })
        .filter(Boolean)
        .slice(0, limit);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(results));
      } catch (_) {}

      return results;
    } catch (err) {
      console.warn('[DB] Station search failed:', err.message);
      return [];
    }
  }

  // ── Departures ─────────────────────────────────────────────────────────────
  // GET /departureBoard/<evaNumber>?date=YYYY-MM-DD
  // Returns array of departures with { name, type, stopName, direction, dateTime, track, ... }
  function formatDbDate(date = new Date()) {
    // DB API expects YYYY-MM-DD
    return date.toLocaleDateString('sv-SE', { timeZone: DB_TZ }); // sv-SE gives ISO format
  }

  function parseDbDeparture(item) {
    // item.dateTime: "2024-06-15T14:23:00" (local Berlin time)
    const rawTime    = item.dateTime || '';
    const line       = (item.name   || '').trim();           // e.g. "ICE 123", "RE 12345"
    const destination = (item.direction || item.finalStop || '').trim();
    const platform   = (item.track  || '').trim();
    const operator   = (item.operator?.name || item.operator || '').trim();
    const type       = (item.type   || '').trim();           // IC, ICE, RE, RB, S, etc.

    // Timetabled vs estimated — the basic Fahrplan API only gives timetabled time.
    // The Timetables v1 API gives real-time but requires separate parsing (XML).
    return {
      time:                 rawTime,
      timetabledDeparture:  rawTime,
      estimatedDeparture:   '',
      timetabledArrival:    '',
      estimatedArrival:     '',
      line,
      destination,
      operator:  operator || type || 'DB',
      platform,
      stopName:  item.stopName || '',
    };
  }

async function fetchGermanDepartures(station, limit = 20) {
  if (!station?.evaNumber) throw new Error('Missing DB EVA number');
  if (!hasCredentials())   throw new Error('Missing DB API credentials');

  const date = formatDbDate();
  const data = await dbRequest(`/departureBoard?id=${station.evaNumber}&date=${date}`, getDbApiKey());
  const raw = data.DepartureBoard?.Departure || [];
  const arr = Array.isArray(raw) ? raw : [raw];

  return arr
    .map(parseDbDeparture)
    .filter(d => d.time || d.destination || d.line)
    .slice(0, limit);
}

  // ── Exports ────────────────────────────────────────────────────────────────
  function routeToStation(station) {
    return buildStationUrl(station);
  }

  function germanTimezone() {
    return DB_TZ;
  }

  window.RAILMAP_DB = {
    getDbClientId,
    getDbApiKey,
    setDbCredentials,
    hasCredentials,
    searchGermanStations,
    fetchGermanDepartures,
    routeToStation,
    parseStationQuery,
    germanTimezone,
    isGermanEva,
  };

})();
