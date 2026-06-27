// Map rendering using Leaflet + OSM

(function () {

  // ── Country → emoji flag map ────────────────────────────────────
  const COUNTRY_FLAGS = {
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

  function getFlag(country) {
    return COUNTRY_FLAGS[country] || "🏳️";
  }

  // ── Leaflet map init ────────────────────────────────────────────
  // Use a more colorful OSM-derived style, with labels kept to places and roads
  const map = L.map('map', {
    center: [30, 15],
    zoom: 3,
    zoomControl: false,
    attributionControl: true,
    minZoom: 2,
    maxZoom: 16,
    worldCopyJump: true,
  });

  // Colorful base layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(map);

  // Labels-only overlay: cities, regions, countries, roads
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    pane: 'shadowPane',
  }).addTo(map);

  // ── Station markers ─────────────────────────────────────────────
  const tooltip = document.getElementById('map-tooltip');

  function markerSize(tier) {
    if (tier === 'major')    return 11;
    if (tier === 'regional') return 8;
    return 6;
  }

  STATIONS.forEach(station => {
    const size = markerSize(station.tier);

    const icon = L.divIcon({
      className: 'station-marker',
      html: `<div class="station-marker-inner tier-${station.tier}"></div>`,
      iconSize:   [size, size],
      iconAnchor: [size/2, size/2],
    });

    const marker = L.marker([station.lat, station.lng], {
      icon,
      title: station.name,
    }).addTo(map);

    marker.on('mouseover', (e) => {
      const flag = getFlag(station.country);
      tooltip.innerHTML = `
        <div class="tooltip-name">${flag} ${station.name}</div>
        <div class="tooltip-meta">${station.city}, ${station.country}</div>
      `;
      positionTooltip(e.originalEvent);
      tooltip.classList.add('visible');
    });

    marker.on('mousemove', (e) => {
      positionTooltip(e.originalEvent);
    });

    marker.on('mouseout', () => {
      tooltip.classList.remove('visible');
    });

    marker.on('click', () => {
      window.location.href = `station.html?station=${encodeURIComponent(station.id)}`;
    });
  });

  function positionTooltip(e) {
    const tw = tooltip.offsetWidth  || 200;
    const th = tooltip.offsetHeight || 60;
    let x = e.clientX + 16;
    let y = e.clientY - 16;
    if (x + tw > window.innerWidth  - 12) x = e.clientX - tw - 16;
    if (y + th > window.innerHeight - 12) y = e.clientY - th;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  // ── Search ──────────────────────────────────────────────────────
  const searchInput   = document.getElementById('station-search');
  const searchResults = document.getElementById('search-results');
  let searchSeq = 0;

  function renderSearchResultsList(stations) {
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
        const station = combined.find(s => s.id === el.dataset.id);
        if (station) {
          searchResults.classList.remove('open');
          searchInput.value = station.name;
          if (station.lat != null && station.lng != null) {
            map.flyTo([station.lat, station.lng], 13, { duration: 1.2 });
          }
          setTimeout(() => {
            window.location.href = window.RAILMAP_SBB?.routeToStation
              ? window.RAILMAP_SBB.routeToStation(station)
              : `station.html?station=${encodeURIComponent(station.id)}`;
          }, station.lat != null && station.lng != null ? 1200 : 0);
        }
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') el.click();
      });
    });

    searchResults.classList.add('open');
  }

  async function renderSearch() {
    const q = searchInput.value.trim();
    const seq = ++searchSeq;

    if (!q || q.length < 2) {
      searchResults.classList.remove('open');
      searchResults.innerHTML = '';
      return;
    }

    const localMatches = STATIONS.filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.city.toLowerCase().includes(q.toLowerCase()) ||
      s.country.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);

    renderSearchResultsList(localMatches);

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

      renderSearchResultsList(combined);
    } catch (error) {
      if (seq !== searchSeq) return;
      renderSearchResultsList(localMatches);
    }
  }

  searchInput.addEventListener('input', () => {
    renderSearch();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrap')) {
      searchResults.classList.remove('open');
    }
  });

  // Close on Escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchResults.classList.remove('open');
      searchInput.blur();
    }
  });

})();
