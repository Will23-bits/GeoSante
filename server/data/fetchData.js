const axios = require("axios");
const fs = require("fs");
const path = require("path");
const SentiwebDataCollector = require("./dataCollector");

// Sample French department data with coordinates and health metrics
// In a real implementation, this would fetch from the government APIs
const sampleData = {
  departments: [
    {
      code: "75",
      name: "Paris",
      lat: 48.8566,
      lng: 2.3522,
      vaccinationCoverage: 0.65,
      emergencyVisits: 1200,
      sosMedecinsActs: 450,
      population: 2161000,
    },
    {
      code: "69",
      name: "Rhône",
      lat: 45.764,
      lng: 4.8357,
      vaccinationCoverage: 0.58,
      emergencyVisits: 980,
      sosMedecinsActs: 320,
      population: 1880000,
    },
    {
      code: "13",
      name: "Bouches-du-Rhône",
      lat: 43.2965,
      lng: 5.3698,
      vaccinationCoverage: 0.52,
      emergencyVisits: 1100,
      sosMedecinsActs: 380,
      population: 2030000,
    },
    {
      code: "31",
      name: "Haute-Garonne",
      lat: 43.6047,
      lng: 1.4442,
      vaccinationCoverage: 0.61,
      emergencyVisits: 750,
      sosMedecinsActs: 280,
      population: 1350000,
    },
    {
      code: "59",
      name: "Nord",
      lat: 50.6292,
      lng: 3.0573,
      vaccinationCoverage: 0.48,
      emergencyVisits: 1300,
      sosMedecinsActs: 420,
      population: 2600000,
    },
    {
      code: "06",
      name: "Alpes-Maritimes",
      lat: 43.7102,
      lng: 7.262,
      vaccinationCoverage: 0.55,
      emergencyVisits: 850,
      sosMedecinsActs: 310,
      population: 1090000,
    },
    {
      code: "44",
      name: "Loire-Atlantique",
      lat: 47.2184,
      lng: -1.5536,
      vaccinationCoverage: 0.63,
      emergencyVisits: 680,
      sosMedecinsActs: 250,
      population: 1400000,
    },
    {
      code: "67",
      name: "Bas-Rhin",
      lat: 48.5734,
      lng: 7.7521,
      vaccinationCoverage: 0.59,
      emergencyVisits: 720,
      sosMedecinsActs: 270,
      population: 1120000,
    },
  ],
};

// --- Sentiweb integration (5y flu intensity at regional level, applied to departments) ---
const SENTIWEB_BASE = "https://www.sentiweb.fr/api/v1/datasets/rest";
const DEPT_GEOJSON_URL =
  "https://france-geojson.gregoiredavid.fr/repo/departements.geojson";

async function fetchSentiwebVersion() {
  try {
    const { data } = await axios.get(`${SENTIWEB_BASE}/version`, {
      timeout: 10000,
    });
    return String(data).trim();
  } catch (e) {
    return null;
  }
}

async function fetchSentiwebRegionalIncidenceAll() {
  // Indicator 3 = Syndromes grippaux, RDD = regions (post-2016)
  // Use span=short by default to limit payload and rate
  const primary = `${SENTIWEB_BASE}/dataset?id=inc-3-RDD&span=short&$format=json`;
  const fallback = `${SENTIWEB_BASE}/dataset?id=inc-3-RDD-ds2&span=short&$format=json`;

  // Try primary endpoint with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { data } = await axios.get(primary, {
        timeout: 20000,
        headers: { Accept: "application/json" },
      });
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      if (e.response?.status === 429) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        console.log(
          `[Sentiweb] Rate limited, waiting ${delay / 1000}s before retry ${
            attempt + 1
          }/${MAX_RETRIES}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error("[Sentiweb] Primary fetch failed", e.message);
      break;
    }
  }

  // Try fallback endpoint
  try {
    const { data } = await axios.get(fallback, {
      timeout: 20000,
      headers: { Accept: "application/json" },
    });
    if (Array.isArray(data)) return data;
  } catch (e) {
    console.error("[Sentiweb] Fallback fetch failed", e.message);
  }
  return [];
}

function percentile(values, p) {
  if (!values.length) return 0;
  const idx = Math.floor(values.length * p);
  return values[Math.min(values.length - 1, Math.max(0, idx - 1))];
}

function computeRegionalIntensity5y(records) {
  // records: [{ week: 202410, inc100: 103, geo_insee: '11', ... }, ...]
  // Keep last ~260 weeks to approximate 5y (ISO week ~52/y)
  const byRegion = new Map();
  for (const r of records) {
    const reg = String(r.geo_insee || r.geo || "").trim();
    const week = Number(r.week || r.period || r.yrwk || 0);
    const inc100Raw =
      r.inc100 ?? r.incidence100 ?? r["incidence/100k"] ?? r.inc ?? r.rate;
    const inc100 = Number(inc100Raw);
    if (!reg || !week || !isFinite(inc100)) continue;
    if (!byRegion.has(reg)) byRegion.set(reg, []);
    byRegion.get(reg).push({ week, inc100 });
  }

  if (records && records.length) {
    console.log(
      "[Sentiweb] total records:",
      records.length,
      "sample:",
      records[0]
    );
  } else {
    console.warn("[Sentiweb] no records parsed");
  }

  const result = new Map();
  for (const [reg, series] of byRegion.entries()) {
    series.sort((a, b) => a.week - b.week);
    const last = series.slice(-260); // last ~5y
    if (last.length === 0) {
      result.set(reg, 0.0);
      continue;
    }
    const recent = last.slice(-6); // last ~6 weeks
    const recentAvg = recent.reduce((s, x) => s + x.inc100, 0) / recent.length;
    const values = last.map((x) => x.inc100).sort((a, b) => a - b);
    const p90 = percentile(values, 0.9) || 1;
    const p95 = percentile(values, 0.95) || 1;
    // Adaptive denominator: avoid flattening to 0 out of season
    const denom = Math.max(50, p90, Math.min(p95, 400));
    const intensity = Math.max(0, Math.min(1, recentAvg / denom));
    result.set(reg, +intensity.toFixed(2));
    if (reg === "11") {
      console.log(
        "[Sentiweb] IDF recentAvg=",
        recentAvg.toFixed(1),
        "p90=",
        p90.toFixed(1),
        "p95=",
        p95.toFixed(1),
        "intensity=",
        intensity.toFixed(2)
      );
    }
  }
  return result; // Map(regionCode -> intensity 0..1)
}

// --- Department centroids (computed once from GeoJSON, cached to JSON) ---
function computeFeatureBBoxCentroid(coords) {
  // coords can be Polygon: [ [ [lon,lat], ... ] ] or MultiPolygon: [ [ [ [lon,lat], ... ] ], ... ]
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  const visit = (arr) => {
    if (!Array.isArray(arr)) return;
    if (typeof arr[0] === "number" && typeof arr[1] === "number") {
      const lon = arr[0];
      const lat = arr[1];
      if (isFinite(lat) && isFinite(lon)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      }
      return;
    }
    for (const sub of arr) visit(sub);
  };
  visit(coords);
  if (minLat === Infinity) return null;
  return { lat: (minLat + maxLat) / 2, lng: (minLon + maxLon) / 2 };
}

async function getDeptCentroids() {
  const centroidsPath = path.join(__dirname, "deptCentroids.json");
  try {
    if (fs.existsSync(centroidsPath)) {
      const text = fs.readFileSync(centroidsPath, "utf-8");
      return JSON.parse(text);
    }
  } catch (_) {}
  // Build from remote GeoJSON and cache
  try {
    const { data } = await axios.get(DEPT_GEOJSON_URL, { timeout: 20000 });
    const result = {};
    for (const feat of data.features || []) {
      const props = feat.properties || {};
      const code = String(
        props.code || props.code_insee || props.code_dep || ""
      ).padStart(2, "0");
      const name = props.nom || props.nom_dep || "";
      const centroid = computeFeatureBBoxCentroid(
        feat.geometry && feat.geometry.coordinates
      );
      if (code && centroid) {
        result[code] = { name, lat: centroid.lat, lng: centroid.lng };
      }
    }
    fs.writeFileSync(centroidsPath, JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error("[Centroids] Failed to build centroids", e.message);
    return {};
  }
}

// Full metropolitan mapping of department -> region (INSEE 2016 region codes)
const deptToRegion = new Map([
  // Auvergne-Rhône-Alpes (84)
  ["01", "84"],
  ["03", "84"],
  ["07", "84"],
  ["15", "84"],
  ["26", "84"],
  ["38", "84"],
  ["42", "84"],
  ["43", "84"],
  ["63", "84"],
  ["69", "84"],
  ["73", "84"],
  ["74", "84"],
  // Bourgogne-Franche-Comté (27)
  ["21", "27"],
  ["25", "27"],
  ["39", "27"],
  ["58", "27"],
  ["70", "27"],
  ["71", "27"],
  ["89", "27"],
  ["90", "27"],
  // Bretagne (53)
  ["22", "53"],
  ["29", "53"],
  ["35", "53"],
  ["56", "53"],
  // Centre-Val de Loire (24)
  ["18", "24"],
  ["28", "24"],
  ["36", "24"],
  ["37", "24"],
  ["41", "24"],
  ["45", "24"],
  // Corse (94)
  ["2A", "94"],
  ["2B", "94"],
  // Grand Est (44)
  ["08", "44"],
  ["10", "44"],
  ["51", "44"],
  ["52", "44"],
  ["54", "44"],
  ["55", "44"],
  ["57", "44"],
  ["67", "44"],
  ["68", "44"],
  ["88", "44"],
  // Hauts-de-France (32)
  ["02", "32"],
  ["59", "32"],
  ["60", "32"],
  ["62", "32"],
  ["80", "32"],
  // Île-de-France (11)
  ["75", "11"],
  ["77", "11"],
  ["78", "11"],
  ["91", "11"],
  ["92", "11"],
  ["93", "11"],
  ["94", "11"],
  ["95", "11"],
  // Normandie (28)
  ["14", "28"],
  ["27", "28"],
  ["50", "28"],
  ["61", "28"],
  ["76", "28"],
  // Nouvelle-Aquitaine (75)
  ["16", "75"],
  ["17", "75"],
  ["19", "75"],
  ["23", "75"],
  ["24", "75"],
  ["33", "75"],
  ["40", "75"],
  ["47", "75"],
  ["64", "75"],
  ["79", "75"],
  ["86", "75"],
  ["87", "75"],
  // Occitanie (76)
  ["09", "76"],
  ["11", "76"],
  ["12", "76"],
  ["30", "76"],
  ["31", "76"],
  ["32", "76"],
  ["34", "76"],
  ["46", "76"],
  ["48", "76"],
  ["65", "76"],
  ["66", "76"],
  ["81", "76"],
  ["82", "76"],
  // Pays de la Loire (52)
  ["44", "52"],
  ["49", "52"],
  ["53", "52"],
  ["72", "52"],
  ["85", "52"],
  // Provence-Alpes-Côte d'Azur (93)
  ["04", "93"],
  ["05", "93"],
  ["06", "93"],
  ["13", "93"],
  ["83", "93"],
  ["84", "93"],
]);

// Basic rate limiting and caching to avoid spamming Sentiweb
// Initialize data collector - DISABLED FOR NOW
// const dataCollector = new SentiwebDataCollector();

// Basic rate limiting and caching to avoid spamming Sentiweb
let sentiwebCache = {
  version: null,
  regionalIntensity: null,
  lastAt: 0,
  cooldownUntil: 0,
  inflight: null,
};

const MIN_FETCH_INTERVAL_MS = 1000 * 60 * 60; // 1 hour between fetches (more conservative)
const COOLDOWN_MS_ON_429 = 1000 * 60 * 60 * 24; // 24h cooldown if rate-limited
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000 * 60 * 5; // 5 minutes between retries

async function getRegionalIntensity() {
  const now = Date.now();

  // First, try to use local CSV data if available
  try {
    const dataCollector = new SentiwebDataCollector();
    const localData = dataCollector.getLocalData();
    if (localData.length > 0) {
      console.log(
        `[Sentiweb] ✓ Using ${localData.length} local records from CSV`
      );
      const intensities = computeRegionalIntensity5y(localData);
      console.log(
        `[Sentiweb] ✓ Computed intensity for ${intensities.size} regions from CSV`
      );
      return intensities;
    } else {
      console.log("[Sentiweb] CSV file exists but is empty");
    }
  } catch (csvError) {
    console.log("[Sentiweb] CSV data not available:", csvError.message);
  }

  // Fallback to API if no local data
  console.log("[Sentiweb] Attempting API fetch...");

  // Respect cooldown
  if (sentiwebCache.cooldownUntil && now < sentiwebCache.cooldownUntil) {
    return sentiwebCache.regionalIntensity || new Map();
  }
  // Respect minimum interval
  if (
    sentiwebCache.lastAt &&
    now - sentiwebCache.lastAt < MIN_FETCH_INTERVAL_MS
  ) {
    return sentiwebCache.regionalIntensity || new Map();
  }
  // Single-flight: reuse inflight promise
  if (sentiwebCache.inflight) {
    try {
      return await sentiwebCache.inflight;
    } finally {
      sentiwebCache.inflight = null;
    }
  }

  sentiwebCache.inflight = (async () => {
    try {
      const version = await fetchSentiwebVersion();
      // If version unchanged and we have cache, skip network
      if (
        version &&
        version === sentiwebCache.version &&
        sentiwebCache.regionalIntensity
      ) {
        sentiwebCache.lastAt = now;
        return sentiwebCache.regionalIntensity;
      }
      // Fetch latest (short span)
      const records = await fetchSentiwebRegionalIncidenceAll();
      if (!records.length) {
        // If empty or blocked, set cooldown and keep old cache
        sentiwebCache.cooldownUntil = now + COOLDOWN_MS_ON_429;
        sentiwebCache.lastAt = now;
        return sentiwebCache.regionalIntensity || new Map();
      }
      const intensities = computeRegionalIntensity5y(records);
      sentiwebCache.version = version || sentiwebCache.version;
      sentiwebCache.regionalIntensity = intensities;
      sentiwebCache.lastAt = now;
      sentiwebCache.cooldownUntil = 0;
      return intensities;
    } catch (e) {
      // If explicit 429, set cooldown
      if (e?.response?.status === 429) {
        sentiwebCache.cooldownUntil = now + COOLDOWN_MS_ON_429;
      }
      sentiwebCache.lastAt = now;
      return sentiwebCache.regionalIntensity || new Map();
    } finally {
      sentiwebCache.inflight = null;
    }
  })();

  return await sentiwebCache.inflight;
}

function calculateRiskScoreFromSentiweb(department, regionalIntensity) {
  const regionCode = deptToRegion.get(String(department.code).padStart(2, "0"));
  const intensity = regionCode ? regionalIntensity.get(regionCode) ?? 0 : 0;
  return +Number(intensity).toFixed(2);
}

// Calculate risk score (legacy, if needed)
function calculateRiskScoreLegacy(department) {
  const vaccinationRisk = 1 - department.vaccinationCoverage;
  const emergencyRisk =
    (department.emergencyVisits / department.population) * 100000;
  const normalizedEmergencyRisk = Math.min(emergencyRisk / 100, 1);
  const riskScore = vaccinationRisk * 0.6 + normalizedEmergencyRisk * 0.4;
  return Math.round(riskScore * 100) / 100;
}

// Process data and add risk scores - NOW USING SENTIWEB DATA
async function processData() {
  try {
    console.log(
      "[ProcessData] ========== Starting Sentiweb Integration =========="
    );

    // Get regional intensity from Sentiweb
    const regionalIntensity = await getRegionalIntensity();
    console.log(
      `[ProcessData] ✓ Retrieved regional intensity for ${regionalIntensity.size} regions`
    );

    // Log regional intensity for debugging
    if (regionalIntensity.size > 0) {
      console.log("[ProcessData] Sample regional data:");
      let count = 0;
      for (const [region, intensity] of regionalIntensity.entries()) {
        console.log(`  Region ${region}: intensity ${intensity}`);
        if (++count >= 3) break;
      }
    } else {
      console.warn(
        "[ProcessData] WARNING: No regional intensity data retrieved!"
      );
    }

    // Get department centroids
    const centroids = await getDeptCentroids();
    console.log(
      `[ProcessData] ✓ Retrieved centroids for ${
        Object.keys(centroids).length
      } departments`
    );

    // Build department data with Sentiweb risk scores
    const departments = [];

    // Metropolitan departments + Corsica
    console.log(
      "[ProcessData] Building department data from regional intensity..."
    );
    for (const [deptCode, regionCode] of deptToRegion.entries()) {
      const centroid = centroids[deptCode];
      if (!centroid) {
        console.warn(
          `[ProcessData] No centroid found for department ${deptCode}`
        );
        continue;
      }

      const intensity = regionalIntensity.get(regionCode) ?? 0;
      const riskScore = +Number(intensity).toFixed(2);

      departments.push({
        code: deptCode,
        name: centroid.name,
        lat: centroid.lat,
        lng: centroid.lng,
        riskScore,
        riskLevel: getRiskLevel(riskScore),
        vaccinationCoverage: 0.55 + (Math.random() * 0.2 - 0.1), // Mock data
        emergencyVisits: Math.floor(Math.random() * 2000 + 500), // Mock data
        sosMedecinsActs: Math.floor(Math.random() * 500 + 100), // Mock data
        population: Math.floor(Math.random() * 2000000 + 200000), // Mock data
      });
    }

    console.log(
      `[ProcessData] ✓ Created ${departments.length} metropolitan departments`
    );

    // Add DOM-TOM with mock risk scores (Sentiweb doesn't have overseas data)
    const domTomMockData = [
      {
        code: "971",
        name: "Guadeloupe",
        lat: 16.265,
        lng: -61.551,
        riskScore: 0.4,
        riskLevel: "low",
        vaccinationCoverage: 0.45,
        emergencyVisits: 120,
        sosMedecinsActs: 45,
        population: 400000,
      },
      {
        code: "972",
        name: "Martinique",
        lat: 14.641,
        lng: -61.024,
        riskScore: 0.5,
        riskLevel: "medium",
        vaccinationCoverage: 0.48,
        emergencyVisits: 95,
        sosMedecinsActs: 38,
        population: 375000,
      },
      {
        code: "973",
        name: "Guyane",
        lat: 3.934,
        lng: -53.125,
        riskScore: 0.6,
        riskLevel: "medium",
        vaccinationCoverage: 0.42,
        emergencyVisits: 85,
        sosMedecinsActs: 32,
        population: 290000,
      },
      {
        code: "974",
        name: "La Réunion",
        lat: -21.115,
        lng: 55.536,
        riskScore: 0.3,
        riskLevel: "low",
        vaccinationCoverage: 0.52,
        emergencyVisits: 180,
        sosMedecinsActs: 65,
        population: 860000,
      },
      {
        code: "975",
        name: "Saint-Pierre-et-Miquelon",
        lat: 46.885,
        lng: -56.315,
        riskScore: 0.2,
        riskLevel: "very-low",
        vaccinationCoverage: 0.65,
        emergencyVisits: 8,
        sosMedecinsActs: 3,
        population: 6000,
      },
      {
        code: "976",
        name: "Mayotte",
        lat: -12.827,
        lng: 45.166,
        riskScore: 0.7,
        riskLevel: "high",
        vaccinationCoverage: 0.38,
        emergencyVisits: 45,
        sosMedecinsActs: 18,
        population: 280000,
      },
      {
        code: "977",
        name: "Saint-Barthélemy",
        lat: 17.9,
        lng: -62.833,
        riskScore: 0.3,
        riskLevel: "low",
        vaccinationCoverage: 0.58,
        emergencyVisits: 12,
        sosMedecinsActs: 5,
        population: 10000,
      },
      {
        code: "978",
        name: "Saint-Martin",
        lat: 18.07,
        lng: -63.05,
        riskScore: 0.4,
        riskLevel: "low",
        vaccinationCoverage: 0.5,
        emergencyVisits: 15,
        sosMedecinsActs: 6,
        population: 38000,
      },
      {
        code: "984",
        name: "Terres australes et antarctiques françaises",
        lat: -49.35,
        lng: 70.217,
        riskScore: 0.1,
        riskLevel: "very-low",
        vaccinationCoverage: 0.8,
        emergencyVisits: 2,
        sosMedecinsActs: 1,
        population: 200,
      },
      {
        code: "986",
        name: "Wallis-et-Futuna",
        lat: -13.768,
        lng: -177.156,
        riskScore: 0.3,
        riskLevel: "low",
        vaccinationCoverage: 0.55,
        emergencyVisits: 8,
        sosMedecinsActs: 3,
        population: 11000,
      },
      {
        code: "987",
        name: "Polynésie française",
        lat: -17.679,
        lng: -149.407,
        riskScore: 0.4,
        riskLevel: "low",
        vaccinationCoverage: 0.48,
        emergencyVisits: 25,
        sosMedecinsActs: 10,
        population: 280000,
      },
      {
        code: "988",
        name: "Nouvelle-Calédonie",
        lat: -20.904,
        lng: 165.618,
        riskScore: 0.5,
        riskLevel: "medium",
        vaccinationCoverage: 0.45,
        emergencyVisits: 35,
        sosMedecinsActs: 14,
        population: 270000,
      },
    ];

    departments.push(...domTomMockData);

    console.log(
      `[ProcessData] ✓ Added ${domTomMockData.length} DOM-TOM territories`
    );
    console.log(
      `[ProcessData] ========== SUCCESS: ${departments.length} total departments ==========`
    );

    // Log sample of final data
    const sample = departments.slice(0, 3);
    console.log(
      "[ProcessData] Sample output:",
      JSON.stringify(sample, null, 2)
    );

    return departments;
  } catch (error) {
    console.error(
      "[ProcessData] Error processing data, falling back to mock data:",
      error.message
    );

    // Fallback to mock data if Sentiweb fails
    const mockDepartments = [
      {
        code: "01",
        name: "Ain",
        lat: 46.064,
        lng: 5.449,
        riskScore: 0.3,
        riskLevel: "low",
      },
      {
        code: "75",
        name: "Paris",
        lat: 48.856,
        lng: 2.352,
        riskScore: 0.8,
        riskLevel: "high",
      },
      {
        code: "69",
        name: "Rhône",
        lat: 45.764,
        lng: 4.835,
        riskScore: 0.6,
        riskLevel: "medium",
      },
      {
        code: "13",
        name: "Bouches-du-Rhône",
        lat: 43.296,
        lng: 5.369,
        riskScore: 0.7,
        riskLevel: "high",
      },
      {
        code: "31",
        name: "Haute-Garonne",
        lat: 43.604,
        lng: 1.444,
        riskScore: 0.4,
        riskLevel: "low",
      },
      {
        code: "59",
        name: "Nord",
        lat: 50.629,
        lng: 3.057,
        riskScore: 0.5,
        riskLevel: "medium",
      },
      {
        code: "67",
        name: "Bas-Rhin",
        lat: 48.573,
        lng: 7.752,
        riskScore: 0.2,
        riskLevel: "very-low",
      },
      {
        code: "06",
        name: "Alpes-Maritimes",
        lat: 43.71,
        lng: 7.262,
        riskScore: 0.9,
        riskLevel: "high",
      },
    ];

    // Add DOM-TOM to fallback
    const domTomFallback = [
      {
        code: "971",
        name: "Guadeloupe",
        lat: 16.265,
        lng: -61.551,
        riskScore: 0.4,
        riskLevel: "low",
      },
      {
        code: "972",
        name: "Martinique",
        lat: 14.641,
        lng: -61.024,
        riskScore: 0.5,
        riskLevel: "medium",
      },
      {
        code: "973",
        name: "Guyane",
        lat: 3.934,
        lng: -53.125,
        riskScore: 0.6,
        riskLevel: "medium",
      },
      {
        code: "974",
        name: "La Réunion",
        lat: -21.115,
        lng: 55.536,
        riskScore: 0.3,
        riskLevel: "low",
      },
      {
        code: "976",
        name: "Mayotte",
        lat: -12.827,
        lng: 45.166,
        riskScore: 0.7,
        riskLevel: "high",
      },
      {
        code: "987",
        name: "Polynésie française",
        lat: -17.679,
        lng: -149.407,
        riskScore: 0.4,
        riskLevel: "low",
      },
      {
        code: "988",
        name: "Nouvelle-Calédonie",
        lat: -20.904,
        lng: 165.618,
        riskScore: 0.5,
        riskLevel: "medium",
      },
    ];

    mockDepartments.push(...domTomFallback);
    return mockDepartments;
  }
}

// Determine risk level based on score
function getRiskLevel(score) {
  if (score >= 0.7) return "high";
  if (score >= 0.5) return "medium";
  if (score >= 0.3) return "low";
  return "very-low";
}

// Generate heatmap data points for Leaflet
function generateHeatmapData(data) {
  return data.map((dept) => [dept.lat, dept.lng, dept.riskScore * 100]);
}

// Save processed data to JSON file
async function saveProcessedData() {
  const processedData = await processData();
  const heatmapData = generateHeatmapData(processedData);
  const output = {
    departments: processedData,
    heatmapPoints: heatmapData,
    lastUpdated: new Date().toISOString(),
  };
  const filePath = path.join(__dirname, "data", "processed-data.json");
  try {
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  } catch (_) {}
  return output;
}

module.exports = {
  processData,
  generateHeatmapData,
  saveProcessedData,
  sampleData,
};
