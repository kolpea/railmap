// Station data — to be replaced with real API data
// Each station: { id, name, city, country, lat, lng, tier, timezone, operators[] }
// tier: "major" | "regional" | "local"
// operators: array of operator IDs (matching filenames in /assets/operators/)

const STATIONS = [
  // ── United Kingdom ──────────────────────────────────────────────
  {
    id: "london-euston",
    name: "London Euston",
    city: "London",
    country: "United Kingdom",
    lat: 51.5282,
    lng: -0.1337,
    tier: "major",
    timezone: "Europe/London",
    operators: ["avanti", "lnwr", "thameslink"]
  },
  {
    id: "london-kings-cross",
    name: "London King's Cross",
    city: "London",
    country: "United Kingdom",
    lat: 51.5308,
    lng: -0.1238,
    tier: "major",
    timezone: "Europe/London",
    operators: ["lner", "thameslink", "gtr"]
  },
  {
    id: "london-paddington",
    name: "London Paddington",
    city: "London",
    country: "United Kingdom",
    lat: 51.5154,
    lng: -0.1755,
    tier: "major",
    timezone: "Europe/London",
    operators: ["gwr", "heathrow-express", "elizabethline"]
  },
  {
    id: "london-victoria",
    name: "London Victoria",
    city: "London",
    country: "United Kingdom",
    lat: 51.4952,
    lng: -0.1441,
    tier: "major",
    timezone: "Europe/London",
    operators: ["southern", "gtr", "gatwick-express"]
  },
  {
    id: "manchester-piccadilly",
    name: "Manchester Piccadilly",
    city: "Manchester",
    country: "United Kingdom",
    lat: 53.4773,
    lng: -2.2309,
    tier: "major",
    timezone: "Europe/London",
    operators: ["avanti", "tpe", "northern", "lnwr"]
  },
  {
    id: "edinburgh-waverley",
    name: "Edinburgh Waverley",
    city: "Edinburgh",
    country: "United Kingdom",
    lat: 55.9521,
    lng: -3.1887,
    tier: "major",
    timezone: "Europe/London",
    operators: ["lner", "scotrail", "avanti", "caledonian-sleeper"]
  },
  {
    id: "birmingham-new-street",
    name: "Birmingham New Street",
    city: "Birmingham",
    country: "United Kingdom",
    lat: 52.4778,
    lng: -1.9000,
    tier: "major",
    timezone: "Europe/London",
    operators: ["avanti", "lnwr", "wm-trains", "crosscountry"]
  },
  {
    id: "bristol-temple-meads",
    name: "Bristol Temple Meads",
    city: "Bristol",
    country: "United Kingdom",
    lat: 51.4491,
    lng: -2.5810,
    tier: "regional",
    timezone: "Europe/London",
    operators: ["gwr", "crosscountry"]
  },
  {
    id: "glasgow-central",
    name: "Glasgow Central",
    city: "Glasgow",
    country: "United Kingdom",
    lat: 55.8580,
    lng: -4.2570,
    tier: "major",
    timezone: "Europe/London",
    operators: ["scotrail", "avanti", "caledonian-sleeper"]
  },
  {
    id: "leeds",
    name: "Leeds",
    city: "Leeds",
    country: "United Kingdom",
    lat: 53.7954,
    lng: -1.5491,
    tier: "regional",
    timezone: "Europe/London",
    operators: ["lner", "tpe", "northern"]
  },

  // ── France ──────────────────────────────────────────────────────
  {
    id: "paris-gare-du-nord",
    name: "Paris Gare du Nord",
    city: "Paris",
    country: "France",
    lat: 48.8809,
    lng: 2.3553,
    tier: "major",
    timezone: "Europe/Paris",
    operators: ["sncf", "eurostar", "thalys"]
  },
  {
    id: "paris-gare-de-lyon",
    name: "Paris Gare de Lyon",
    city: "Paris",
    country: "France",
    lat: 48.8445,
    lng: 2.3737,
    tier: "major",
    timezone: "Europe/Paris",
    operators: ["sncf", "trenitalia"]
  },
  {
    id: "paris-montparnasse",
    name: "Paris Montparnasse",
    city: "Paris",
    country: "France",
    lat: 48.8407,
    lng: 2.3207,
    tier: "major",
    timezone: "Europe/Paris",
    operators: ["sncf"]
  },
  {
    id: "lyon-part-dieu",
    name: "Lyon Part-Dieu",
    city: "Lyon",
    country: "France",
    lat: 45.7606,
    lng: 4.8592,
    tier: "regional",
    timezone: "Europe/Paris",
    operators: ["sncf", "trenitalia"]
  },
  {
    id: "marseille-saint-charles",
    name: "Marseille Saint-Charles",
    city: "Marseille",
    country: "France",
    lat: 43.3026,
    lng: 5.3806,
    tier: "regional",
    timezone: "Europe/Paris",
    operators: ["sncf"]
  },
  {
    id: "bordeaux-saint-jean",
    name: "Bordeaux Saint-Jean",
    city: "Bordeaux",
    country: "France",
    lat: 44.8259,
    lng: -0.5560,
    tier: "regional",
    timezone: "Europe/Paris",
    operators: ["sncf"]
  },

  // ── Germany ─────────────────────────────────────────────────────
  {
    id: "berlin-hauptbahnhof",
    name: "Berlin Hauptbahnhof",
    city: "Berlin",
    country: "Germany",
    lat: 52.5251,
    lng: 13.3694,
    tier: "major",
    timezone: "Europe/Berlin",
    operators: ["db", "eurostar", "flixbus"]
  },
  {
    id: "munich-hauptbahnhof",
    name: "München Hauptbahnhof",
    city: "Munich",
    country: "Germany",
    lat: 48.1403,
    lng: 11.5584,
    tier: "major",
    timezone: "Europe/Berlin",
    operators: ["db", "obb", "trenitalia"]
  },
  {
    id: "frankfurt-hauptbahnhof",
    name: "Frankfurt Hauptbahnhof",
    city: "Frankfurt",
    country: "Germany",
    lat: 50.1071,
    lng: 8.6635,
    tier: "major",
    timezone: "Europe/Berlin",
    operators: ["db", "eurostar", "thalys"]
  },
  {
    id: "hamburg-hauptbahnhof",
    name: "Hamburg Hauptbahnhof",
    city: "Hamburg",
    country: "Germany",
    lat: 53.5530,
    lng: 10.0068,
    tier: "major",
    timezone: "Europe/Berlin",
    operators: ["db"]
  },
  {
    id: "cologne-hauptbahnhof",
    name: "Köln Hauptbahnhof",
    city: "Cologne",
    country: "Germany",
    lat: 50.9430,
    lng: 6.9589,
    tier: "regional",
    timezone: "Europe/Berlin",
    operators: ["db", "thalys", "eurostar"]
  },

  // ── Spain ───────────────────────────────────────────────────────
  {
    id: "madrid-atocha",
    name: "Madrid Atocha",
    city: "Madrid",
    country: "Spain",
    lat: 40.4068,
    lng: -3.6895,
    tier: "major",
    timezone: "Europe/Madrid",
    operators: ["renfe", "ouigo-es"]
  },
  {
    id: "barcelona-sants",
    name: "Barcelona Sants",
    city: "Barcelona",
    country: "Spain",
    lat: 41.3793,
    lng: 2.1403,
    tier: "major",
    timezone: "Europe/Madrid",
    operators: ["renfe", "ouigo-es"]
  },
  {
    id: "seville-santa-justa",
    name: "Sevilla Santa Justa",
    city: "Seville",
    country: "Spain",
    lat: 37.3920,
    lng: -5.9762,
    tier: "regional",
    timezone: "Europe/Madrid",
    operators: ["renfe"]
  },
  {
    id: "valencia-joaquin-sorolla",
    name: "Valencia Joaquín Sorolla",
    city: "Valencia",
    country: "Spain",
    lat: 39.4620,
    lng: -0.3789,
    tier: "regional",
    timezone: "Europe/Madrid",
    operators: ["renfe", "ouigo-es"]
  },

  // ── Italy ───────────────────────────────────────────────────────
  {
    id: "roma-termini",
    name: "Roma Termini",
    city: "Rome",
    country: "Italy",
    lat: 41.9009,
    lng: 12.5011,
    tier: "major",
    timezone: "Europe/Rome",
    operators: ["trenitalia", "italo"]
  },
  {
    id: "milano-centrale",
    name: "Milano Centrale",
    city: "Milan",
    country: "Italy",
    lat: 45.4862,
    lng: 9.2045,
    tier: "major",
    timezone: "Europe/Rome",
    operators: ["trenitalia", "italo", "db"]
  },
  {
    id: "venezia-santa-lucia",
    name: "Venezia Santa Lucia",
    city: "Venice",
    country: "Italy",
    lat: 45.4411,
    lng: 12.3213,
    tier: "regional",
    timezone: "Europe/Rome",
    operators: ["trenitalia", "italo"]
  },
  {
    id: "firenze-santa-maria-novella",
    name: "Firenze S.M.N.",
    city: "Florence",
    country: "Italy",
    lat: 43.7761,
    lng: 11.2484,
    tier: "regional",
    timezone: "Europe/Rome",
    operators: ["trenitalia", "italo"]
  },

  // ── Netherlands ─────────────────────────────────────────────────
  {
    id: "amsterdam-centraal",
    name: "Amsterdam Centraal",
    city: "Amsterdam",
    country: "Netherlands",
    lat: 52.3791,
    lng: 4.9003,
    tier: "major",
    timezone: "Europe/Amsterdam",
    operators: ["ns", "eurostar", "thalys", "db"]
  },
  {
    id: "rotterdam-centraal",
    name: "Rotterdam Centraal",
    city: "Rotterdam",
    country: "Netherlands",
    lat: 51.9243,
    lng: 4.4694,
    tier: "regional",
    timezone: "Europe/Amsterdam",
    operators: ["ns", "eurostar", "thalys"]
  },

  // ── Belgium ─────────────────────────────────────────────────────
  {
    id: "brussels-midi",
    name: "Brussels-Midi",
    city: "Brussels",
    country: "Belgium",
    lat: 50.8357,
    lng: 4.3360,
    tier: "major",
    timezone: "Europe/Brussels",
    operators: ["sncb", "eurostar", "thalys", "db"]
  },

  // ── Switzerland ─────────────────────────────────────────────────
  {
    id: "zurich-hauptbahnhof",
    name: "Zürich Hauptbahnhof",
    city: "Zürich",
    country: "Switzerland",
    lat: 47.3783,
    lng: 8.5398,
    tier: "major",
    timezone: "Europe/Zurich",
    operators: ["sbb", "db", "obb"]
  },
  {
    id: "geneva-cornavin",
    name: "Genève Cornavin",
    city: "Geneva",
    country: "Switzerland",
    lat: 46.2101,
    lng: 6.1422,
    tier: "regional",
    timezone: "Europe/Zurich",
    operators: ["sbb", "sncf"]
  },

  // ── Austria ─────────────────────────────────────────────────────
  {
    id: "vienna-hauptbahnhof",
    name: "Wien Hauptbahnhof",
    city: "Vienna",
    country: "Austria",
    lat: 48.1851,
    lng: 16.3759,
    tier: "major",
    timezone: "Europe/Vienna",
    operators: ["obb", "db", "regiojet"]
  },

  // ── Czech Republic ──────────────────────────────────────────────
  {
    id: "prague-hlavni-nadrazi",
    name: "Praha Hlavní nádraží",
    city: "Prague",
    country: "Czech Republic",
    lat: 50.0826,
    lng: 14.4348,
    tier: "major",
    timezone: "Europe/Prague",
    operators: ["cd", "regiojet", "leo-express"]
  },

  // ── Poland ──────────────────────────────────────────────────────
  {
    id: "warsaw-centralna",
    name: "Warszawa Centralna",
    city: "Warsaw",
    country: "Poland",
    lat: 52.2291,
    lng: 21.0034,
    tier: "major",
    timezone: "Europe/Warsaw",
    operators: ["pkp-ic", "pkp"]
  },

  // ── Sweden ──────────────────────────────────────────────────────
  {
    id: "stockholm-central",
    name: "Stockholm Central",
    city: "Stockholm",
    country: "Sweden",
    lat: 59.3306,
    lng: 18.0580,
    tier: "major",
    timezone: "Europe/Stockholm",
    operators: ["sj", "mtr-nordic"]
  },

  // ── Japan ───────────────────────────────────────────────────────
  {
    id: "tokyo-station",
    name: "Tokyo Station",
    city: "Tokyo",
    country: "Japan",
    lat: 35.6812,
    lng: 139.7671,
    tier: "major",
    timezone: "Asia/Tokyo",
    operators: ["jreast", "jrcentral"]
  },
  {
    id: "osaka-station",
    name: "Osaka Station",
    city: "Osaka",
    country: "Japan",
    lat: 34.7024,
    lng: 135.4959,
    tier: "major",
    timezone: "Asia/Tokyo",
    operators: ["jrwest"]
  },
  {
    id: "kyoto-station",
    name: "Kyoto Station",
    city: "Kyoto",
    country: "Japan",
    lat: 34.9858,
    lng: 135.7588,
    tier: "regional",
    timezone: "Asia/Tokyo",
    operators: ["jrwest", "kintetsu"]
  },
  {
    id: "shinjuku-station",
    name: "Shinjuku Station",
    city: "Tokyo",
    country: "Japan",
    lat: 35.6905,
    lng: 139.7003,
    tier: "major",
    timezone: "Asia/Tokyo",
    operators: ["jreast", "odakyu", "keio"]
  },

  // ── India ───────────────────────────────────────────────────────
  {
    id: "mumbai-chhatrapati-shivaji",
    name: "Mumbai CSMT",
    city: "Mumbai",
    country: "India",
    lat: 18.9401,
    lng: 72.8356,
    tier: "major",
    timezone: "Asia/Kolkata",
    operators: ["irctc"]
  },
  {
    id: "new-delhi",
    name: "New Delhi",
    city: "New Delhi",
    country: "India",
    lat: 28.6441,
    lng: 77.2192,
    tier: "major",
    timezone: "Asia/Kolkata",
    operators: ["irctc"]
  },

  // ── China ───────────────────────────────────────────────────────
  {
    id: "beijing-south",
    name: "Beijing South",
    city: "Beijing",
    country: "China",
    lat: 39.8651,
    lng: 116.3787,
    tier: "major",
    timezone: "Asia/Shanghai",
    operators: ["cr"]
  },
  {
    id: "shanghai-hongqiao",
    name: "Shanghai Hongqiao",
    city: "Shanghai",
    country: "China",
    lat: 31.1963,
    lng: 121.3219,
    tier: "major",
    timezone: "Asia/Shanghai",
    operators: ["cr"]
  },
  {
    id: "guangzhou-south",
    name: "Guangzhou South",
    city: "Guangzhou",
    country: "China",
    lat: 22.8090,
    lng: 113.2671,
    tier: "major",
    timezone: "Asia/Shanghai",
    operators: ["cr"]
  },

  // ── USA ─────────────────────────────────────────────────────────
  {
    id: "new-york-penn",
    name: "New York Penn Station",
    city: "New York",
    country: "United States",
    lat: 40.7506,
    lng: -73.9971,
    tier: "major",
    timezone: "America/New_York",
    operators: ["amtrak", "njt", "lirr"]
  },
  {
    id: "washington-union",
    name: "Washington Union Station",
    city: "Washington DC",
    country: "United States",
    lat: 38.8977,
    lng: -77.0063,
    tier: "major",
    timezone: "America/New_York",
    operators: ["amtrak", "marc", "vre"]
  },
  {
    id: "chicago-union",
    name: "Chicago Union Station",
    city: "Chicago",
    country: "United States",
    lat: 41.8786,
    lng: -87.6397,
    tier: "major",
    timezone: "America/Chicago",
    operators: ["amtrak", "metra"]
  },
  {
    id: "los-angeles-union",
    name: "Los Angeles Union Station",
    city: "Los Angeles",
    country: "United States",
    lat: 34.0560,
    lng: -118.2356,
    tier: "major",
    timezone: "America/Los_Angeles",
    operators: ["amtrak", "metrolink"]
  },

  // ── Canada ──────────────────────────────────────────────────────
  {
    id: "toronto-union",
    name: "Toronto Union Station",
    city: "Toronto",
    country: "Canada",
    lat: 43.6452,
    lng: -79.3806,
    tier: "major",
    timezone: "America/Toronto",
    operators: ["via-rail", "go-transit"]
  },
  {
    id: "montreal-central",
    name: "Montréal Central Station",
    city: "Montréal",
    country: "Canada",
    lat: 45.4997,
    lng: -73.5673,
    tier: "regional",
    timezone: "America/Toronto",
    operators: ["via-rail", "exo"]
  },

  // ── Australia ───────────────────────────────────────────────────
  {
    id: "sydney-central",
    name: "Sydney Central",
    city: "Sydney",
    country: "Australia",
    lat: -33.8831,
    lng: 151.2057,
    tier: "major",
    timezone: "Australia/Sydney",
    operators: ["nsw-trains", "nsw-intercity"]
  },
  {
    id: "melbourne-southern-cross",
    name: "Melbourne Southern Cross",
    city: "Melbourne",
    country: "Australia",
    lat: -37.8183,
    lng: 144.9525,
    tier: "major",
    timezone: "Australia/Melbourne",
    operators: ["vline", "metro-trains"]
  },

  // ── South Africa ─────────────────────────────────────────────────
  {
    id: "johannesburg-park",
    name: "Johannesburg Park Station",
    city: "Johannesburg",
    country: "South Africa",
    lat: -26.2002,
    lng: 28.0437,
    tier: "major",
    timezone: "Africa/Johannesburg",
    operators: ["prasa"]
  },

  // ── Brazil ──────────────────────────────────────────────────────
  {
    id: "sao-paulo-luz",
    name: "Estação da Luz",
    city: "São Paulo",
    country: "Brazil",
    lat: -23.5360,
    lng: -46.6345,
    tier: "major",
    timezone: "America/Sao_Paulo",
    operators: ["cptm"]
  },

  // ── UAE ─────────────────────────────────────────────────────────
  {
    id: "dubai-union",
    name: "Union Metro Station",
    city: "Dubai",
    country: "UAE",
    lat: 25.2683,
    lng: 55.3107,
    tier: "regional",
    timezone: "Asia/Dubai",
    operators: ["rta-dubai"]
  },

  // ── Singapore ───────────────────────────────────────────────────
  {
    id: "singapore-woodlands",
    name: "Woodlands Train Checkpoint",
    city: "Singapore",
    country: "Singapore",
    lat: 1.4470,
    lng: 103.7765,
    tier: "regional",
    timezone: "Asia/Singapore",
    operators: ["ktm"]
  }
];

// Map of operator metadata — to be populated with real data + icon assets
const OPERATORS = {
  "avanti":             { name: "Avanti West Coast",   country: "GB" },
  "lnwr":               { name: "London Northwestern", country: "GB" },
  "thameslink":         { name: "Thameslink",          country: "GB" },
  "lner":               { name: "LNER",                country: "GB" },
  "gtr":                { name: "GTR",                 country: "GB" },
  "gwr":                { name: "Great Western",       country: "GB" },
  "heathrow-express":   { name: "Heathrow Express",    country: "GB" },
  "elizabethline":      { name: "Elizabeth Line",      country: "GB" },
  "southern":           { name: "Southern",            country: "GB" },
  "gatwick-express":    { name: "Gatwick Express",     country: "GB" },
  "tpe":                { name: "TransPennine Express",country: "GB" },
  "northern":           { name: "Northern",            country: "GB" },
  "scotrail":           { name: "ScotRail",            country: "GB" },
  "caledonian-sleeper": { name: "Caledonian Sleeper",  country: "GB" },
  "wm-trains":          { name: "West Midlands Trains",country: "GB" },
  "crosscountry":       { name: "CrossCountry",        country: "GB" },
  "sncf":               { name: "SNCF",                country: "FR" },
  "eurostar":           { name: "Eurostar",            country: "EU" },
  "thalys":             { name: "Thalys",              country: "EU" },
  "db":                 { name: "Deutsche Bahn",       country: "DE" },
  "obb":                { name: "ÖBB",                 country: "AT" },
  "sbb":                { name: "SBB",                 country: "CH" },
  "sncb":               { name: "SNCB",                country: "BE" },
  "ns":                 { name: "NS",                  country: "NL" },
  "renfe":              { name: "Renfe",               country: "ES" },
  "ouigo-es":           { name: "Ouigo España",        country: "ES" },
  "trenitalia":         { name: "Trenitalia",          country: "IT" },
  "italo":              { name: "Italo NTV",           country: "IT" },
  "cd":                 { name: "České dráhy",         country: "CZ" },
  "regiojet":           { name: "RegioJet",            country: "CZ" },
  "leo-express":        { name: "Leo Express",         country: "CZ" },
  "pkp-ic":             { name: "PKP Intercity",       country: "PL" },
  "pkp":                { name: "PKP",                 country: "PL" },
  "sj":                 { name: "SJ",                  country: "SE" },
  "mtr-nordic":         { name: "MTR Nordic",          country: "SE" },
  "jreast":             { name: "JR East",             country: "JP" },
  "jrcentral":          { name: "JR Central",          country: "JP" },
  "jrwest":             { name: "JR West",             country: "JP" },
  "kintetsu":           { name: "Kintetsu",            country: "JP" },
  "odakyu":             { name: "Odakyu",              country: "JP" },
  "keio":               { name: "Keio",                country: "JP" },
  "irctc":              { name: "Indian Railways",     country: "IN" },
  "cr":                 { name: "China Railway",       country: "CN" },
  "amtrak":             { name: "Amtrak",              country: "US" },
  "njt":                { name: "NJ Transit",          country: "US" },
  "lirr":               { name: "Long Island Rail",    country: "US" },
  "marc":               { name: "MARC Train",          country: "US" },
  "vre":                { name: "VRE",                 country: "US" },
  "metra":              { name: "Metra",               country: "US" },
  "metrolink":          { name: "Metrolink",           country: "US" },
  "via-rail":           { name: "VIA Rail",            country: "CA" },
  "go-transit":         { name: "GO Transit",          country: "CA" },
  "exo":                { name: "exo",                 country: "CA" },
  "nsw-trains":         { name: "NSW TrainLink",       country: "AU" },
  "nsw-intercity":      { name: "NSW Intercity",       country: "AU" },
  "vline":              { name: "V/Line",              country: "AU" },
  "metro-trains":       { name: "Metro Trains",        country: "AU" },
  "prasa":              { name: "PRASA",               country: "ZA" },
  "cptm":               { name: "CPTM",                country: "BR" },
  "rta-dubai":          { name: "RTA Dubai Metro",     country: "AE" },
  "ktm":                { name: "KTM Berhad",          country: "SG" },
  "flixbus":            { name: "FlixTrain",           country: "EU" },
};
