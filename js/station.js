(function () {
  const curatedStations = typeof STATIONS !== 'undefined' ? STATIONS : [];
  const OPERATOR_LOGOS = {
    db: 'db.svg',
    sbb: 'sbb.svg',
    eurostar: 'eurostar.svg',
    iryo: 'iryo.svg',
    sncf: 'sncf.svg',
    obb: 'snobbcf.svg',
    ouigo: 'ouigo.svg',
    'ouigo-es': 'ouigo.svg',
  };
  const OPERATOR_LABELS = {
    db: 'Deutsche Bahn',
    sbb: 'SBB',
    eurostar: 'Eurostar',
    iryo: 'iryo',
    sncf: 'SNCF',
    obb: 'ÖBB',
    ouigo: 'OUIGO',
    'ouigo-es': 'OUIGO España',
  };
  const defaultStation = curatedStations.find(s => s.id === 'london-euston') || curatedStations[0] || {
    id: 'london-euston',
    name: 'London Euston',
    city: 'London',
    country: 'United Kingdom',
    timezone: 'Europe/London',
    operators: [],
  };

  const searchInput = document.querySelector('#search-wrap input');
  const searchResults = document.getElementById('search-results');
  const departuresBody = document.getElementById('departures-body');
  const localTimeEl = document.getElementById('local-time');
  const stationNameEl = document.querySelector('.station-name');
  const placeEl = document.querySelector('.hero-place');
  const operatorsRow = document.querySelector('.hero-operators-row');
  const heroPlaceRow = document.querySelector('.hero-place-row');
  const heroTimeRow = document.querySelector('.hero-time-row');
  const heroInfo = document.querySelector('.hero-info');

  let activeStation = defaultStation;
  let userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  let departuresLoaded = false;
  let searchSeq = 0;

  function getFlag(country) {
    const flags = {
      "United Kingdom":  "🇬🇧",
      "France":          "🇫🇷",
      "Germany":         "🇩🇪",
      "Spain":           "🇪🇸",
      "Italy":           "🇮🇹",
      "Netherlands":     "🇳🇱",
      "Belgium":         "🇧🇪",
      "Switzerland":     "🇨🇭",
      "Austria":         "🇦🇹",
      "Czech Republic":  "🇨🇿",
      "Poland":          "🇵🇱",
      "Sweden":          "🇸🇪",
      "Japan":           "🇯🇵",
      "India":           "🇮🇳",
      "China":           "🇨🇳",
      "United States":   "🇺🇸",
      "Canada":          "🇨🇦",
      "Australia":       "🇦🇺",
      "South Africa":    "🇿🇦",
      "Brazil":          "🇧🇷",
      "UAE":             "🇦🇪",
      "Singapore":       "🇸🇬",
    };
    return flags[country] || "🏳️";
  }

  function getTimeZoneOffsetMinutes(timeZone, date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value])
    );

    const asUTC = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );

    return (asUTC - date.getTime()) / 60000;
  }

  function formatOffset(minutes) {
    const abs = Math.abs(minutes);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    const sign = minutes > 0 ? '+' : '-';
    const prefix = minutes > 0 ? 'GMT' : 'UTC';

    if (!minutes) return 'GMT+0';
    if (!mins) return `${prefix}${sign}${hours}`;
    return `${prefix}${sign}${hours}:${String(mins).padStart(2, '0')}`;
  }

  function timeZoneForStation(station) {
    if (station?.timezone) return station.timezone;
    if (station?.country === 'Switzerland') return 'Europe/Zurich';
    return 'UTC';
  }

  function updateClock() {
    if (!localTimeEl) return;
    const stationTz = localTimeEl.dataset.timezone || timeZoneForStation(activeStation);

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', {
        timeZone: stationTz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const stationOffset = getTimeZoneOffsetMinutes(stationTz, now);
      const userOffset = getTimeZoneOffsetMinutes(userTimeZone, now);
      const diffMinutes = stationOffset - userOffset;
      const diffText = formatOffset(diffMinutes);

      const timeEl = localTimeEl.querySelector('.time-hm');
      const diffEl = localTimeEl.querySelector('.time-diff');
      if (timeEl) timeEl.textContent = timeStr;
      if (diffEl) diffEl.textContent = diffText;
    } catch (e) {
      const timeEl = localTimeEl.querySelector('.time-hm');
      const diffEl = localTimeEl.querySelector('.time-diff');
      if (timeEl) timeEl.textContent = '--:--';
      if (diffEl) diffEl.textContent = '';
    }
  }

  async function resolveUserTimeZone() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Timezone lookup failed');
      const data = await response.json();
      if (data && data.timezone) {
        userTimeZone = data.timezone;
      }
    } catch (e) {
      userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    updateClock();
  }

function operatorToKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function setOperators(operators) {
  const container = document.querySelector('.operators-row');
  if (!container) return;

  const chips = operators
    .filter(Boolean)
    .map(op => {
      const name = typeof op === 'string' ? op : (op.name || op.id || '');
      const key = operatorToKey(name);
      const logoFile = `assets/operators/${key}.svg`;

      return `
        <span class="operator-chip operator-chip--logo" title="${name}" aria-label="${name}">
          <img class="operator-logo" src="${logoFile}" alt="${name}"
               onerror="this.parentElement.style.display='none'">
        </span>
      `;
    })
    .filter(Boolean);

  if (!chips.length) {
    container.parentElement.style.display = 'none';
    return;
  }

  container.parentElement.style.display = '';
  container.innerHTML = chips.join('');
}

  function setStationHeader(station) {
    activeStation = station;
    const title = `${station.name} — Railmap`;
    document.title = title;
    if (stationNameEl) stationNameEl.textContent = station.name;
    // AFTER
  if (placeEl) {
  const placeBits = [];
  if (station.city) placeBits.push(station.city);
  if (station.country) placeBits.push(station.country);
  placeEl.textContent = placeBits.join(', ') || '';
  } 
    if (localTimeEl) {
      localTimeEl.dataset.timezone = timeZoneForStation(station);
    }
    setOperators(station.operators || []);
    updateClock();
    if (searchInput) searchInput.value = station.name;
  }

  function renderDepartureRows(events) {
    if (!departuresBody) return;

    const boardTimeZone = activeStation.timezone || timeZoneForStation(activeStation);

    if (!events.length) {
      departuresBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">
            <div class="empty-state">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="10" y="4" width="12" height="20" rx="4" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 24l4-4h8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="10" y1="11" x2="22" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <div>No departures found for this station</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    departuresBody.innerHTML = events.map(event => {
      const rawScheduled = event.timetabledDeparture || event.time || '';
      const rawEstimated = event.estimatedDeparture || '';
      const baseDelay = rawScheduled && rawEstimated
        ? Math.round((new Date(rawEstimated).getTime() - new Date(rawScheduled).getTime()) / 60000)
        : 0;
      const delayed = Number.isFinite(baseDelay) && baseDelay > 0 ? baseDelay : 0;

      const fmtTime = (raw) => raw
        ? new Date(raw).toLocaleTimeString('en-GB', {
            timeZone: boardTimeZone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '--:--';

      const scheduledTime = fmtTime(rawScheduled || rawEstimated);
      const delayedTime   = delayed > 0 ? fmtTime(rawEstimated) : '';

      const timeCell = delayed > 0
        ? `<span class="cell-time"><span class="time-original--delayed">${scheduledTime}</span><span class="time-new-delayed">${delayedTime}</span></span>`
        : `<span class="cell-time">${scheduledTime}</span>`;

      const train = event.line || 'Train';
      const destination = event.destination || activeStation.name;
      const operator = event.operator || '';
      const platform = event.platform || '—';

      const opKey = operator.toLowerCase();
      const opLogoFile = OPERATOR_LOGOS[opKey];
      const opLabel = OPERATOR_LABELS[opKey] || operator || 'SBB';
      const opIcon = opLogoFile
        ? `<img class="op-icon" src="assets/operators/${opLogoFile}" alt="${opLabel}">`
        : `<span class="op-icon-placeholder">${opLabel.slice(0, 2).toUpperCase()}</span>`;

      return `
        <tr>
          <td>${timeCell}</td>
          <td class="cell-train">${train}</td>
          <td><span class="cell-destination">${destination}</span></td>
          <td>
            <span class="cell-operator">
              ${opIcon}
              <span class="op-name">${opLabel}</span>
            </span>
          </td>
          <td class="cell-platform-value">${platform}</td>
        </tr>
      `;
    }).join('');
  }

  function renderSwissTokenNotice() {
    if (!departuresBody) return;
    departuresBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">
          <div class="empty-state">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="10" y="4" width="12" height="20" rx="4" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 24l4-4h8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="10" y1="11" x2="22" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <div>Add your SBB API token in <code>localStorage.railmap_sbb_token</code> to load live departures</div>
          </div>
        </td>
      </tr>
    `;
  }

  async function loadDepartures() {
    if (departuresLoaded || !departuresBody) return;
    departuresLoaded = true;

    if (activeStation.country !== 'Switzerland' && activeStation.source !== 'sbb' && !activeStation.stopRef) {
      return;
    }

    // After the Swiss block
if (activeStation.country === 'Germany' && window.RAILMAP_DB?.hasCredentials()) {
  // Resolve evaNumber if missing
  if (!activeStation.evaNumber && window.RAILMAP_DB?.searchGermanStations) {
    const matches = await window.RAILMAP_DB.searchGermanStations(activeStation.name, 3);
    const match = matches.find(s => s.name.toLowerCase() === activeStation.name.toLowerCase()) || matches[0];
    if (match?.evaNumber) activeStation = { ...activeStation, ...match };
  }
  if (activeStation.evaNumber) {
    const events = await window.RAILMAP_DB.fetchGermanDepartures(activeStation, 20);
    renderDepartureRows(events);
    const uniqueOps = [...new Set(events.map(e => e.operator).filter(Boolean))];
    if (uniqueOps.length) setOperators(uniqueOps);
    return;
  }
}

    const stopRef = activeStation.stopRef;
    if (!stopRef) {
      if (window.RAILMAP_SBB?.getSbbToken?.()) {
        const swissMatches = await window.RAILMAP_SBB.searchSwissStations(activeStation.name, 4);
        const matched = swissMatches.find(s => s.name.toLowerCase() === activeStation.name.toLowerCase()) || swissMatches[0];
        if (matched?.stopRef) {
          activeStation = { ...activeStation, ...matched };
          setStationHeader(activeStation);
        }
      }
    }

    if (!activeStation.stopRef) {
      renderSwissTokenNotice();
      return;
    }

    try {
      departuresBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">
            <div class="empty-state">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="10" y="4" width="12" height="20" rx="4" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 24l4-4h8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="10" y1="11" x2="22" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <div>Loading departures...</div>
            </div>
          </td>
        </tr>
      `;
const events = await window.RAILMAP_SBB.fetchSwissDepartures(activeStation, 20);
renderDepartureRows(events);

const uniqueOps = [...new Set(events.map(e => e.operator).filter(Boolean))];
if (uniqueOps.length) setOperators(uniqueOps);

    } catch (error) {
      renderSwissTokenNotice();
    }
  }

  async function searchStations(query) {
    const q = query.trim();
    if (q.length < 2) return [];

    const localMatches = curatedStations.filter(station =>
      station.name.toLowerCase().includes(q.toLowerCase()) ||
      station.city.toLowerCase().includes(q.toLowerCase()) ||
      station.country.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);

    let swissMatches = [];
    if (window.RAILMAP_SBB?.searchSwissStations) {
      try {
        swissMatches = await window.RAILMAP_SBB.searchSwissStations(q, 8);
      } catch (error) {
        swissMatches = [];
      }
    }

    return [...localMatches, ...swissMatches]
      .filter((station, index, arr) => index === arr.findIndex(other => {
        const sameId = station.id && other.id && station.id === other.id;
        const sameName = station.name === other.name && station.country === other.country;
        return sameId || sameName;
      }))
      .slice(0, 8);
  }

  async function renderSearchResults() {
    const q = searchInput.value.trim();
    const seq = ++searchSeq;

    if (!q || q.length < 2) {
      searchResults.classList.remove('open');
      searchResults.innerHTML = '';
      return;
    }

    const localMatches = curatedStations.filter(station =>
      station.name.toLowerCase().includes(q.toLowerCase()) ||
      station.city.toLowerCase().includes(q.toLowerCase()) ||
      station.country.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);

    function renderMatches(stations) {
      if (!stations.length) {
        searchResults.classList.remove('open');
        searchResults.innerHTML = '';
        return;
      }

      searchResults.innerHTML = stations.map(station => {
        const flag = getFlag(station.country);
        const sub = station.city ? `${station.city}, ${station.country}` : station.country;
        return `
          <div class="search-result-item" data-id="${station.id}" role="option" tabindex="0">
            <span class="sr-flag">${flag}</span>
            <span class="sr-text">
              <span class="sr-name">${station.name}</span>
              <span class="sr-sub">${sub}</span>
            </span>
          </div>
        `;
      }).join('');

      searchResults.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          const station = stations.find(s => s.id === el.dataset.id);
          if (station) {
            searchResults.classList.remove('open');
            searchInput.value = station.name;
            window.location.href = window.RAILMAP_SBB?.routeToStation
              ? window.RAILMAP_SBB.routeToStation(station)
              : `station.html?station=${encodeURIComponent(station.id)}`;
          }
        });
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') el.click();
        });
      });

      searchResults.classList.add('open');
    }

    renderMatches(localMatches);

    if (!window.RAILMAP_SBB?.searchSwissStations) return;

    try {
      const swissMatches = await window.RAILMAP_SBB.searchSwissStations(q, 8);
      if (seq !== searchSeq) return;

      const combined = [...localMatches, ...swissMatches]
        .filter((station, index, arr) => index === arr.findIndex(other => {
          const sameId = station.id && other.id && station.id === other.id;
          const sameName = station.name === other.name && station.country === other.country;
          return sameId || sameName;
        }))
        .slice(0, 8);

      renderMatches(combined);
    } catch (error) {
      if (seq !== searchSeq) return;
      renderMatches(localMatches);
    }
  }

  function initSearch() {
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', () => {
      renderSearchResults();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-wrap')) {
        searchResults.classList.remove('open');
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchResults.classList.remove('open');
        searchInput.blur();
      }
    });
  }

  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === target));
        tabPanels.forEach(p => p.classList.toggle('active', p.dataset.tab === target));

        if (target === 'departures') {
          loadDepartures();
        }
      });
    });
  }

  function initStationFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const parsed = window.RAILMAP_SBB?.parseStationQuery
      ? window.RAILMAP_SBB.parseStationQuery(params, curatedStations)
      : null;

    if (parsed) {
      activeStation = parsed;
    }

    if (!activeStation.timezone) {
      activeStation.timezone = timeZoneForStation(activeStation);
    }

    setStationHeader(activeStation);

  if (!activeStation.city && activeStation.lat != null) {
  window.RAILMAP_SBB.cityFromCoords(activeStation.lat, activeStation.lng)
    .then(city => {
      if (city) {
        activeStation.city = city;
        setStationHeader(activeStation);
      }
    });
  }
}

  initStationFromUrl();
  initSearch();
  initTabs();
  updateClock();
  setInterval(updateClock, 30000);
  resolveUserTimeZone();

  if (activeStation.country === 'Switzerland' || activeStation.source === 'sbb') {
    loadDepartures();
  }
}


)();