// Shared Swiss rail helpers for search and departures.

(function () {
  const OJP_URL = 'https://api.opentransportdata.swiss/ojp20';
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const SBB_TOKEN_STORAGE_KEY = 'railmap_sbb_token';
  const SWISS_TZ = 'Europe/Zurich';
  const SEARCH_CACHE_KEY = 'railmap_swiss_search_cache_v1';

  function getSbbToken() {
    return window.RAILMAP_SBB_TOKEN ||
      localStorage.getItem(SBB_TOKEN_STORAGE_KEY) ||
      '';
  }

  function setSbbToken(token) {
    const cleaned = (token || '').trim();
    if (cleaned) {
      localStorage.setItem(SBB_TOKEN_STORAGE_KEY, cleaned);
      window.RAILMAP_SBB_TOKEN = cleaned;
    }
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function firstChild(node, localName) {
    if (!node) return null;
    for (const child of Array.from(node.children || [])) {
      if (child.localName === localName) return child;
    }
    return null;
  }

  function firstDescendant(node, localName) {
    if (!node) return null;
    if (node.localName === localName) return node;
    for (const child of Array.from(node.children || [])) {
      const found = firstDescendant(child, localName);
      if (found) return found;
    }
    return null;
  }

  function descendantText(node, localName) {
    const found = firstDescendant(node, localName);
    return found ? found.textContent.trim() : '';
  }

  function descendantNumber(node, localName) {
    const value = descendantText(node, localName);
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function cleanPlaceName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function buildStationUrl(station) {
    const params = new URLSearchParams();
    if (station.id) params.set('station', station.id);
    if (station.name) params.set('name', station.name);
    if (station.city) params.set('city', station.city);
    if (station.country) params.set('country', station.country);
    if (station.stopRef) params.set('stopRef', station.stopRef);
    if (station.timezone) params.set('tz', station.timezone);
    if (station.lat != null) params.set('lat', String(station.lat));
    if (station.lng != null) params.set('lng', String(station.lng));
    return `station.html?${params.toString()}`;
  }

  function parseStationQuery(params, curatedStations) {
    const stationId = params.get('station') || '';
    const stopRef = params.get('stopRef') || '';
    const name = params.get('name') || '';
    const country = params.get('country') || '';
    const city = params.get('city') || '';
    const tz = params.get('tz') || '';
    const curated = curatedStations.find(s => s.id === stationId);

    if (curated) {
      return {
        ...curated,
        source: 'curated',
      };
    }

    if (stopRef || name || country === 'Switzerland' || country === 'CH') {
      return {
        id: stopRef || stationId || name,
        stopRef: stopRef || '',
        name: cleanPlaceName(name || stationId || 'Swiss station'),
        city: cleanPlaceName(city || ''),
        country: country === 'CH' ? 'Switzerland' : (country || 'Switzerland'),
        timezone: tz || SWISS_TZ,
        lat: params.get('lat') ? Number(params.get('lat')) : null,
        lng: params.get('lng') ? Number(params.get('lng')) : null,
        source: 'swiss',
      };
    }

    return null;
  }

// AFTER
function formatSwissCity(place) {
  return cleanPlaceName(descendantText(place, 'TopographicPlaceName') || '');
}

  function parseOjpLocationResponse(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) throw new Error('Invalid OJP location response');

    const results = Array.from(doc.getElementsByTagName('*')).filter(el => el.localName === 'PlaceResult');
    return results.map((result, index) => {
      const place = firstDescendant(result, 'Place');
      const stopPlace = firstDescendant(place, 'StopPlace');
      const stopPlaceRef = descendantText(stopPlace, 'StopPlaceRef') || descendantText(place, 'StopPlaceRef');
      const stopPlaceName = descendantText(stopPlace, 'StopPlaceName') || descendantText(place, 'Name') || descendantText(place, 'StopPlaceName');
      const city = cleanPlaceName(
        descendantText(stopPlace, 'TopographicPlaceName') ||
        descendantText(place, 'TopographicPlaceName') ||
      ''
    );
      const lat = descendantNumber(place, 'Latitude') ?? descendantNumber(place, 'lat');
      const lng = descendantNumber(place, 'Longitude') ?? descendantNumber(place, 'lng');

      return {
        id: stopPlaceRef || `sbb-${index}`,
        stopRef: stopPlaceRef || '',
        name: cleanPlaceName(stopPlaceName || city || 'Swiss station'),
        city: city || '',
        country: 'Switzerland',
        timezone: SWISS_TZ,
        lat,
        lng,
        source: 'sbb',
      };
}).filter(s => s.name && s.stopRef && !s._isNonSwiss);
  }

  const OPERATOR_NAMES = {
  '11': 'SBB', '33': 'SBB', '65': 'SBB', '86': 'RhB',
  '87_LEX': 'SNCF', '351': 'SBB', '802': 'TPC', '456': 'MOB',
};

  function parseOjpStopEventResponse(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) throw new Error('Invalid OJP stop event response');

    const results = Array.from(doc.getElementsByTagName('*')).filter(el => el.localName === 'StopEventResult');
    return results.map((result) => {
      const stopEvent = firstDescendant(result, 'StopEvent');
      const thisCall = firstDescendant(stopEvent, 'ThisCall') || firstDescendant(stopEvent, 'CallAtStop') || stopEvent;
      const callAtStop = firstDescendant(thisCall, 'CallAtStop') || thisCall;
      const service = firstDescendant(stopEvent, 'Service');

      const timetabledDeparture = descendantText(callAtStop, 'TimetabledTime');
      const estimatedDeparture = descendantText(callAtStop, 'EstimatedTime');
      const timetabledArrival = descendantText(firstDescendant(callAtStop, 'ServiceArrival') || callAtStop, 'TimetabledTime');
      const estimatedArrival = descendantText(firstDescendant(callAtStop, 'ServiceArrival') || callAtStop, 'EstimatedTime');
      const time = estimatedDeparture || timetabledDeparture || estimatedArrival || timetabledArrival || '';
      const destination = cleanPlaceName(descendantText(service, 'DestinationText') || descendantText(service, 'OriginText'));
      const quay = cleanPlaceName(descendantText(callAtStop, 'EstimatedQuay') || descendantText(callAtStop, 'PlannedQuay'));
      const stopName = cleanPlaceName(descendantText(callAtStop, 'StopPointName') || descendantText(callAtStop, 'Name'));

const publishedLine = descendantText(service, 'PublishedLineName');
const trainNumber = descendantText(service, 'TrainNumber');
const modeEl = firstDescendant(service, 'Mode');
const modeShort = descendantText(modeEl, 'ShortName') || '';

// Best display: "IC 728", falling back to published line name like "IR 13"
const line = cleanPlaceName(
  (modeShort && trainNumber ? `${modeShort} ${trainNumber}` : '') ||
  publishedLine ||
  'Train'
);
      const operatorRef = descendantText(service, 'OperatorRef').replace(/^.*:/, '').trim();
      const operator = OPERATOR_NAMES[operatorRef] || operatorRef || 'SBB';

      return {
        time,
        timetabledDeparture,
        estimatedDeparture,
        timetabledArrival,
        estimatedArrival,
        line,
        destination,
        operator,
        platform: quay,
        stopName,
        raw: result,
      };
    }).filter(event => event.time || event.destination || event.line);
  }

  function buildOjpLocationRequest(query, limit) {
    const ts = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<OJP xmlns="http://www.vdv.de/ojp" xmlns:siri="http://www.siri.org.uk/siri" version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <OJPRequest>
    <siri:ServiceRequest>
      <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
      <siri:RequestorRef>Railmap_web</siri:RequestorRef>
      <OJPLocationInformationRequest>
        <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
        <siri:MessageIdentifier>railmap-loc-${Date.now()}</siri:MessageIdentifier>
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

  function buildOjpStopEventRequest(stopRef, name, limit) {
    const ts = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<OJP xmlns="http://www.vdv.de/ojp" xmlns:siri="http://www.siri.org.uk/siri" version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <OJPRequest>
    <siri:ServiceRequest>
      <siri:ServiceRequestContext>
        <siri:Language>en</siri:Language>
      </siri:ServiceRequestContext>
      <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
      <siri:RequestorRef>Railmap_web</siri:RequestorRef>
      <OJPStopEventRequest>
        <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
        <Location>
          <PlaceRef>
            <StopPlaceRef>${escapeXml(stopRef)}</StopPlaceRef>
            <Name>
              <Text>${escapeXml(name || stopRef)}</Text>
            </Name>
          </PlaceRef>
        </Location>
        <Params>
          <NumberOfResults>${limit}</NumberOfResults>
          <StopEventType>departure</StopEventType>
          <IncludePreviousCalls>true</IncludePreviousCalls>
          <IncludeOnwardCalls>true</IncludeOnwardCalls>
          <UseRealtimeData>full</UseRealtimeData>
        </Params>
      </OJPStopEventRequest>
    </siri:ServiceRequest>
  </OJPRequest>
</OJP>`;
  }

  async function ojpRequest(xml) {
    const token = getSbbToken();
    if (!token) throw new Error('Missing SBB API token');

    const response = await fetch(OJP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${token}`,
      },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(`SBB API request failed (${response.status})`);
    }
    return response.text();
  }

async function cityFromCoords(lat, lng) {
  if (lat == null || lng == null) return '';
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    return data.address?.city
      || data.address?.town
      || data.address?.village
      || data.address?.municipality
      || '';
  } catch {
    return '';
  }
}

  async function searchSwissStations(query, limit = 8) {
    const q = query.trim();
    if (q.length < 2) return [];

    const token = getSbbToken();
    if (token) {
      try {
        const xml = buildOjpLocationRequest(q, limit);
        const responseText = await ojpRequest(xml);
        return parseOjpLocationResponse(responseText).slice(0, limit);
      } catch (error) {
        // Fall back to a public search so Swiss stations still appear if the key is missing/invalid.
      }
    }

    const cacheKey = `${SEARCH_CACHE_KEY}:${q.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {
        // ignore cache parse failures
      }
    }

    const overpassQuery = `
      [out:json][timeout:10];
      area["ISO3166-1"="CH"][admin_level=2]->.ch;
      (
        node["railway"~"station|halt"]["name"~"${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",i](area.ch);
        way["railway"~"station|halt"]["name"~"${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",i](area.ch);
        relation["railway"~"station|halt"]["name"~"${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",i](area.ch);
        node["public_transport"="station"]["name"~"${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",i](area.ch);
        way["public_transport"="station"]["name"~"${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",i](area.ch);
        relation["public_transport"="station"]["name"~"${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",i](area.ch);
      );
      out center tags;
    `;

    const overpassResponse = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!overpassResponse.ok) return [];
    const data = await overpassResponse.json();
    const results = (data.elements || []).map((el) => {
      const tags = el.tags || {};
      const lat = el.lat ?? el.center?.lat ?? null;
      const lng = el.lon ?? el.center?.lon ?? null;
      return {
        id: `osm-${el.type}-${el.id}`,
        name: cleanPlaceName(tags.name || ''),
        city: cleanPlaceName(tags['addr:city'] || tags.municipality || tags['addr:municipality'] || ''),
        country: 'Switzerland',
        timezone: SWISS_TZ,
        lat,
        lng,
        source: 'osm',
      };
    }).filter(item => item.name);

    sessionStorage.setItem(cacheKey, JSON.stringify(results.slice(0, limit)));
    return results.slice(0, limit);
  }

  async function fetchSwissDepartures(station, limit = 20) {
    if (!station || !station.stopRef) {
      throw new Error('Missing SBB stop reference');
    }
    const responseText = await ojpRequest(buildOjpStopEventRequest(station.stopRef, station.name, limit));
    return parseOjpStopEventResponse(responseText).slice(0, limit);
  }

  function routeToStation(station) {
    return buildStationUrl(station);
  }

  function swissTimezone() {
    return SWISS_TZ;
  }

  window.RAILMAP_SBB = {
    getSbbToken,
    setSbbToken,
    searchSwissStations,
    fetchSwissDepartures,
    routeToStation,
    parseStationQuery,
    swissTimezone,
    cityFromCoords,
  };
})();
