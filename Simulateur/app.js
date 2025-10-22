const ODS_BASE_URL = 'https://odisse.santepubliquefrance.fr/api/records/1.0/search/';
const ODS_DATASET = 'grippe-passages-urgences-et-actes-sos-medecin_reg';

const POPULATION = 68_000_000;
const BASE_R0 = 1.6;
const GENERATION_DAYS = 6;

const REGIONS = {
  'Auvergne-Rhone-Alpes': { name: 'Auvergne-Rh\u00f4ne-Alpes', lat: 45.5, lng: 4.5, pop: 8_000_000 },
  'Bourgogne-Franche-Comte': { name: 'Bourgogne-Franche-Comt\u00e9', lat: 47.2, lng: 5.5, pop: 2_800_000 },
  Bretagne: { name: 'Bretagne', lat: 48.2, lng: -2.9, pop: 3_400_000 },
  'Centre-Val-de-Loire': { name: 'Centre-Val de Loire', lat: 47.7, lng: 1.5, pop: 2_600_000 },
  Corse: { name: 'Corse', lat: 42.04, lng: 9.01, pop: 350_000 },
  'Grand-Est': { name: 'Grand Est', lat: 48.7, lng: 6.2, pop: 5_500_000 },
  'Hauts-de-France': { name: 'Hauts-de-France', lat: 50.4, lng: 2.8, pop: 6_000_000 },
  'Ile-de-France': { name: '\u00cele-de-France', lat: 48.7, lng: 2.3, pop: 12_200_000 },
  Normandie: { name: 'Normandie', lat: 49.2, lng: 0.5, pop: 3_300_000 },
  'Nouvelle-Aquitaine': { name: 'Nouvelle-Aquitaine', lat: 45.0, lng: 0.7, pop: 6_100_000 },
  Occitanie: { name: 'Occitanie', lat: 43.7, lng: 2.0, pop: 6_000_000 },
  'Pays-de-la-Loire': { name: 'Pays de la Loire', lat: 47.5, lng: -0.8, pop: 3_900_000 },
  'Provence-Alpes-Cote-d-Azur': { name: "Provence-Alpes-C\u00f4te d'Azur", lat: 43.9, lng: 6.0, pop: 5_200_000 }
};

const REGION_ALIASES = {
  'Auvergne et Rhone-Alpes': 'Auvergne-Rhone-Alpes',
  'Bourgogne et Franche-Comte': 'Bourgogne-Franche-Comte',
  'Bretagne': 'Bretagne',
  'Centre-Val de Loire': 'Centre-Val-de-Loire',
  'Corse': 'Corse',
  'Grand Est': 'Grand-Est',
  'Hauts-de-France': 'Hauts-de-France',
  'Ile-de-France': 'Ile-de-France',
  'Ile-de-France': 'Ile-de-France',
  'Normandie': 'Normandie',
  'Nouvelle Aquitaine': 'Nouvelle-Aquitaine',
  'Occitanie': 'Occitanie',
  'Pays de la Loire': 'Pays-de-la-Loire',
  "Provence-Alpes-C\u00f4te d'Azur": 'Provence-Alpes-Cote-d-Azur',
  "Provence-Alpes-Cote d'Azur": 'Provence-Alpes-Cote-d-Azur',
  'Provence-Alpes-Cote d\u2019Azur': 'Provence-Alpes-Cote-d-Azur',
  'Provence-Alpes-Cote d\'Azur': 'Provence-Alpes-Cote-d-Azur'
};

const RESOURCE_BASELINES = {
  doctors: 140_000,
  nurses: 75_000,
  students: 6_000,
  vaccination: 50
};

const RESOURCE_WEIGHTS = {
  doctors: 0.35,
  nurses: 0.25,
  students: 0.15,
  vaccination: 0.25
};

const REGION_KEYS = Object.keys(REGIONS);
const REGION_RESOURCE_KEYS = ['doctors', 'nurses', 'students'];
const RESOURCE_LABELS = {
  doctors: 'Medecins',
  nurses: 'Infirmiers',
  students: 'Etudiants'
};
const TOTAL_POPULATION = Object.values(REGIONS).reduce((sum, r) => sum + r.pop, 0);

const FALLBACK = {
  weeks: ['2025-W06', '2025-W05', '2025-W04', '2025-W03', '2025-W02'],
  dataByWeek: {
    '2025-W06': [
      { region: 'Ile-de-France', inc: 245 },
      { region: 'Hauts-de-France', inc: 310 },
      { region: 'Grand-Est', inc: 285 },
      { region: 'Normandie', inc: 210 },
      { region: 'Bretagne', inc: 180 },
      { region: 'Pays-de-la-Loire', inc: 195 },
      { region: 'Centre-Val-de-Loire', inc: 205 },
      { region: 'Bourgogne-Franche-Comte', inc: 230 },
      { region: 'Nouvelle-Aquitaine', inc: 260 },
      { region: 'Occitanie', inc: 275 },
      { region: 'Auvergne-Rhone-Alpes', inc: 290 },
      { region: 'Provence-Alpes-Cote-d-Azur', inc: 315 },
      { region: 'Corse', inc: 190 }
    ],
    '2025-W05': [
      { region: 'Ile-de-France', inc: 220 },
      { region: 'Hauts-de-France', inc: 295 },
      { region: 'Grand-Est', inc: 270 },
      { region: 'Normandie', inc: 195 },
      { region: 'Bretagne', inc: 170 },
      { region: 'Pays-de-la-Loire', inc: 185 },
      { region: 'Centre-Val-de-Loire', inc: 190 },
      { region: 'Bourgogne-Franche-Comte', inc: 215 },
      { region: 'Nouvelle-Aquitaine', inc: 245 },
      { region: 'Occitanie', inc: 260 },
      { region: 'Auvergne-Rhone-Alpes', inc: 270 },
      { region: 'Provence-Alpes-Cote-d-Azur', inc: 300 },
      { region: 'Corse', inc: 180 }
    ],
    '2025-W04': [
      { region: 'Ile-de-France', inc: 200 },
      { region: 'Hauts-de-France', inc: 260 },
      { region: 'Grand-Est', inc: 240 },
      { region: 'Normandie', inc: 175 },
      { region: 'Bretagne', inc: 160 },
      { region: 'Pays-de-la-Loire', inc: 170 },
      { region: 'Centre-Val-de-Loire', inc: 175 },
      { region: 'Bourgogne-Franche-Comte', inc: 195 },
      { region: 'Nouvelle-Aquitaine', inc: 220 },
      { region: 'Occitanie', inc: 235 },
      { region: 'Auvergne-Rhone-Alpes', inc: 250 },
      { region: 'Provence-Alpes-Cote-d-Azur', inc: 270 },
      { region: 'Corse', inc: 165 }
    ],
    '2025-W03': [
      { region: 'Ile-de-France', inc: 185 },
      { region: 'Hauts-de-France', inc: 235 },
      { region: 'Grand-Est', inc: 220 },
      { region: 'Normandie', inc: 165 },
      { region: 'Bretagne', inc: 150 },
      { region: 'Pays-de-la-Loire', inc: 160 },
      { region: 'Centre-Val-de-Loire', inc: 165 },
      { region: 'Bourgogne-Franche-Comte', inc: 180 },
      { region: 'Nouvelle-Aquitaine', inc: 205 },
      { region: 'Occitanie', inc: 215 },
      { region: 'Auvergne-Rhone-Alpes', inc: 230 },
      { region: 'Provence-Alpes-Cote-d-Azur', inc: 250 },
      { region: 'Corse', inc: 155 }
    ],
    '2025-W02': [
      { region: 'Ile-de-France', inc: 170 },
      { region: 'Hauts-de-France', inc: 210 },
      { region: 'Grand-Est', inc: 200 },
      { region: 'Normandie', inc: 150 },
      { region: 'Bretagne', inc: 140 },
      { region: 'Pays-de-la-Loire', inc: 150 },
      { region: 'Centre-Val-de-Loire', inc: 155 },
      { region: 'Bourgogne-Franche-Comte', inc: 170 },
      { region: 'Nouvelle-Aquitaine', inc: 190 },
      { region: 'Occitanie', inc: 200 },
      { region: 'Auvergne-Rhone-Alpes', inc: 215 },
      { region: 'Provence-Alpes-Cote-d-Azur', inc: 235 },
      { region: 'Corse', inc: 145 }
    ]
  }
};

let map;
let heatLayer = null;
let circleMarkers = [];
let weeks = [];
let dataByWeek = {};
let currentIncidence = 0;
let activeWeek = null;

const sliderValueEls = {};
const regionState = {};
const simState = {
  doctors: 143_000,
  nurses: 60_000,
  students: 8_000,
  vaccination: 35,
  contacts: 0
};

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function fmt(n) {
  return (n ?? 0).toLocaleString('fr-FR');
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function parseWeekToRank(weekStr) {
  if (!weekStr) return -Infinity;
  const parts = weekStr.split('-S');
  if (parts.length !== 2) return -Infinity;
  return Number(parts[0]) * 100 + Number(parts[1]);
}

function harmonizeRegion(label) {
  if (!label) return null;
  const mapped = REGION_ALIASES[label];
  if (mapped) return mapped;
  const cleaned = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/nouvelle-aquitaine/i, 'Nouvelle-Aquitaine')
    .replace(/provence-alpes-cote-d-azur/i, 'Provence-Alpes-Cote-d-Azur')
    .replace(/ile-de-france/i, 'Ile-de-France');
  const canonical = REGION_ALIASES[cleaned] || cleaned;
  return REGIONS[canonical] ? canonical : null;
}

async function loadDataAPI() {
  setStatus('Connexion aux donnees ODiSSE...');
  const params = new URLSearchParams({
    dataset: ODS_DATASET,
    rows: '10000',
    timezone: 'UTC'
  });
  params.set('refine.sursaud_cl_age_gene', 'Tous \u00e2ges');

  const resp = await fetch(`${ODS_BASE_URL}?${params.toString()}`);
  if (!resp.ok) throw new Error('API ODiSSE indisponible');

  const js = await resp.json();
  const records = js.records || [];
  if (!records.length) throw new Error('Aucune donnee retournee');

  const tmp = {};
  records.forEach(rec => {
    const fields = rec.fields || {};
    const week = fields.semaine;
    const regionKey = harmonizeRegion(fields.reglib);
    const value = Number(fields.taux_passages_grippe_sau);
    const dateStr = fields.date_complet;
    if (!week || !regionKey || Number.isNaN(value) || !REGIONS[regionKey]) return;
    tmp[week] = tmp[week] || {};
    const current = tmp[week][regionKey];
    if (!current || (dateStr && new Date(dateStr) >= new Date(current.date))) {
      tmp[week][regionKey] = { value, date: dateStr ? new Date(dateStr) : null };
    }
  });

  weeks = Object.keys(tmp).sort((a, b) => parseWeekToRank(b) - parseWeekToRank(a));
  dataByWeek = {};
  weeks.forEach(week => {
    dataByWeek[week] = Object.entries(tmp[week]).map(([region, entry]) => ({
      region,
      inc: entry.value
    }));
  });

  setStatus('Donnees ODiSSE chargees');
}

function loadDataFallback() {
  weeks = [...FALLBACK.weeks];
  dataByWeek = JSON.parse(JSON.stringify(FALLBACK.dataByWeek));
  setStatus('Mode demo (fallback) - derniere API indisponible');
}

function initMap() {
  map = L.map('map').setView([46.7, 2.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
}

function updateSummary(week, incidence) {
  const weekEl = document.getElementById('weekLabel');
  const incEl = document.getElementById('incidenceFR');
  const infectionEl = document.getElementById('infectionValue');
  const hasIncidence = Number.isFinite(incidence);

  if (weekEl) weekEl.textContent = week || '--';
  if (incEl) incEl.textContent = hasIncidence ? incidence.toFixed(1) : '--';

  const totalCases = hasIncidence ? Math.round((incidence / 100_000) * POPULATION) : null;
  if (infectionEl) infectionEl.textContent = totalCases !== null ? fmt(totalCases) : '--';
}

function updateRiskDisplay(score, level) {
  const scoreEl = document.getElementById('riskScore');
  const levelEl = document.getElementById('riskLevel');
  const barEl = document.getElementById('riskProgress');
  if (scoreEl) scoreEl.textContent = `${score}/100`;
  if (levelEl) levelEl.textContent = level;
  if (barEl) {
    barEl.style.width = `${score}%`;
    barEl.classList.remove('low', 'moderate', 'high', 'critical');
    const cls = score > 75 ? 'critical' : score > 50 ? 'high' : score > 25 ? 'moderate' : 'low';
    barEl.classList.add(cls);
  }
}

function updatePropagationDisplay(daily, projection, effectiveR) {
  const dailyEl = document.getElementById('dailyInfections');
  const projEl = document.getElementById('projection7d');
  const r0El = document.getElementById('effectiveR0');
  if (dailyEl) dailyEl.textContent = Number.isFinite(daily) ? fmt(Math.max(0, Math.round(daily))) : '--';
  if (projEl) projEl.textContent = Number.isFinite(projection) ? fmt(Math.max(0, Math.round(projection))) : '--';
  if (r0El) r0El.textContent = effectiveR.toFixed(2);
}

function regionFactor(key) {
  if (!REGION_KEYS.length) return 1;
  let weightedSum = 0;
  let totalPop = 0;
  REGION_KEYS.forEach(regionKey => {
    const pop = REGIONS[regionKey]?.pop || 0;
    if (pop <= 0) return;
    totalPop += pop;
    const expected = simState[key] > 0 ? simState[key] * (pop / TOTAL_POPULATION) : 0;
    const rawAlloc = regionState[regionKey]?.[key];
    const allocated = Number.isFinite(rawAlloc) ? rawAlloc : expected;
    const ratio = expected > 0 ? clamp(allocated / expected, 0, 2.5) : 1;
    weightedSum += pop * ratio;
  });
  if (!totalPop) return 1;
  return weightedSum / totalPop;
}

function computeCapacityScore() {
  return Object.entries(RESOURCE_WEIGHTS).reduce((sum, [key, weight]) => {
    const baseline = RESOURCE_BASELINES[key] || 1;
    const regionalMultiplier = regionFactor(key);
    const ratio = clamp((simState[key] / baseline) * regionalMultiplier, 0, 2.5);
    return sum + weight * ratio;
  }, 0);
}

function computeEffectiveR() {
  const capacityScore = computeCapacityScore();
  const deficit = clamp(1 - capacityScore, 0, 1);
  const surplus = clamp(capacityScore - 1, 0, 1);
  const resourceModifier = clamp(1 + deficit * 0.8 - surplus * 0.45, 0.45, 1.9);
  const contactModifier = clamp(1 - (simState.contacts / 100) * 0.9, 0.1, 1);
  const effectiveR = clamp(BASE_R0 * resourceModifier * contactModifier, 0.25, 2.6);
  return { effectiveR, capacityScore };
}

function totalRegionalAllocation(key) {
  return REGION_KEYS.reduce((sum, regionKey) => sum + (regionState[regionKey]?.[key] || 0), 0);
}

function updateSimulation() {
  const { effectiveR, capacityScore } = computeEffectiveR();
  const growthPerDay = Math.pow(effectiveR, 1 / GENERATION_DAYS);
  const totalCases = currentIncidence ? (currentIncidence / 100_000) * POPULATION : 0;
  const dailyIncrease = totalCases * (growthPerDay - 1);
  const projection = totalCases * Math.pow(growthPerDay, 7);

  const adjustedIncidence = Math.max((currentIncidence || 0) - 120, 0);
  const incidenceComponent = clamp(adjustedIncidence / 380, 0, 1);
  const rComponent = clamp((effectiveR - 0.8) / 1.1, 0, 1);
  const stressComponent = clamp(1 - capacityScore, 0, 1);
  const baseScore =
    (incidenceComponent * 0.5 + rComponent * 0.35 + stressComponent * 0.15) * 100;
  const escalation =
    clamp(stressComponent * Math.max(effectiveR - 1.1, 0) / 1.2, 0, 1) * 45;
  let riskScore = Math.round(clamp(baseScore + escalation, 0, 100));
  if (riskScore < 5) riskScore = 5;

  let riskLevel = 'Faible';
  if (riskScore > 75) {
    riskLevel = 'Critique';
  } else if (riskScore > 50) {
    riskLevel = 'Eleve';
  } else if (riskScore > 25) {
    riskLevel = 'Modere';
  }

  updateRiskDisplay(riskScore, riskLevel);
  updatePropagationDisplay(dailyIncrease, projection, effectiveR);
}

function clearCircles() {
  circleMarkers.forEach(layer => map.removeLayer(layer));
  circleMarkers = [];
}

function computeRegionCapacityRatio(regionKey) {
  const state = regionState[regionKey];
  if (!state) return 1;
  let weighted = 0;
  let weightSum = 0;
  REGION_RESOURCE_KEYS.forEach(key => {
    const totalAvailable = simState[key];
    if (!totalAvailable) return;
    const expected = totalAvailable * (REGIONS[regionKey].pop / TOTAL_POPULATION);
    if (expected <= 0) return;
    const allocated = state[key] || 0;
    const ratio = clamp(allocated / expected, 0, 2.5);
    const weight = RESOURCE_WEIGHTS[key];
    weighted += weight * ratio;
    weightSum += weight;
  });
  if (!weightSum) return 1;
  return weighted / weightSum;
}

function regionIntensityMultiplier(regionKey) {
  const capacityRatio = computeRegionCapacityRatio(regionKey);
  if (!Number.isFinite(capacityRatio) || capacityRatio <= 0) return 1.6;
  if (capacityRatio >= 1) {
    return clamp(1 / (1 + (capacityRatio - 1) * 0.8), 0.45, 1);
  }
  return clamp(1 + (1 - capacityRatio) * 0.85, 1, 1.75);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function rgbToHex({ r, g, b }) {
  const clampByte = v => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

function getGradientColor(value, maxValue) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(maxValue) || maxValue <= 0) {
    return '#cbd5f5';
  }
  const ratio = clamp(value / maxValue, 0, 1);
  const stops = ['#18753c', '#f9a825', '#ff9940', '#b34000'];
  const scaled = ratio * (stops.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const from = hexToRgb(stops[idx]);
  const to = hexToRgb(stops[Math.min(idx + 1, stops.length - 1)]);
  return rgbToHex({
    r: lerp(from.r, to.r, frac),
    g: lerp(from.g, to.g, frac),
    b: lerp(from.b, to.b, frac)
  });
}

function renderWeek(weekKey) {
  const wk = weekKey || activeWeek || weeks[0];
  if (!wk) return;
  activeWeek = wk;

  const selector = document.getElementById('weekSelect');
  if (selector && selector.value !== wk) selector.value = wk;

  const list = (dataByWeek[wk] || []).filter(item => REGIONS[item.region]);
  const adjusted = list.map(item => {
    const region = REGIONS[item.region];
    const multiplier = regionIntensityMultiplier(item.region);
    const adjustedInc = item.inc * multiplier;
    return { ...item, region, multiplier, adjustedInc };
  });

  const totalPop = Object.values(REGIONS).reduce((sum, region) => sum + region.pop, 0);
  const incidence = adjusted.reduce(
    (sum, item) => sum + item.adjustedInc * (item.region.pop / totalPop),
    0
  );

  currentIncidence = incidence || 0;
  updateSummary(wk, incidence);

  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }
  clearCircles();

  const maxInc = adjusted.reduce((max, item) => Math.max(max, item.adjustedInc || 0), 0);
  const heatData = adjusted.map(item => {
    const ratio = maxInc ? clamp(item.adjustedInc / maxInc, 0, 1) : 0;
    const intensity = ratio > 0 ? Math.max(0.05, Math.pow(ratio, 0.7)) : 0;
    return [item.region.lat, item.region.lng, intensity];
  });

  const nonZeroHeat = heatData.some(pt => pt[2] > 0);
  if (heatData.length && nonZeroHeat) {
    heatLayer = L.heatLayer(heatData, {
      radius: 45,
      blur: 25,
      maxZoom: 10,
      gradient: { 0: '#18753c', 0.4: '#f9a825', 0.7: '#ff9940', 1: '#b34000' }
    }).addTo(map);
  }

  adjusted.forEach(item => {
    const region = item.region;
    if (!region) return;
    const inc = Number(item.adjustedInc) || 0;
    const color = getGradientColor(inc, maxInc || 1);
    const radius = inc > 0 ? Math.max(8, Math.sqrt(inc) * 0.45) : 6;
    const circle = L.circleMarker([region.lat, region.lng], {
      radius,
      color: color,
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.65
    }).addTo(map);
    circle.bindTooltip(
      `${region.name}<br>Incidence ajustee : ${inc.toFixed(1)} /100k<br>Capacite relative : ${computeRegionCapacityRatio(
        item.region
      ).toFixed(2)}`,
      { direction: 'top' }
    );
    circleMarkers.push(circle);
  });

  updateSimulation();
}

function setupWeekSelector() {
  const selector = document.getElementById('weekSelect');
  if (!selector) return;
  selector.innerHTML = '';
  weeks.forEach(week => {
    const option = document.createElement('option');
    option.value = week;
    option.textContent = week;
    selector.appendChild(option);
  });
  selector.addEventListener('change', event => {
    renderWeek(event.target.value);
  });
}

function proportionalShare(resourceKey, regionKey) {
  const total = simState[resourceKey] || 0;
  const region = REGIONS[regionKey];
  if (!region || !TOTAL_POPULATION) return 0;
  return total * (region.pop / TOTAL_POPULATION);
}

function ensureRegionDefaults() {
  REGION_KEYS.forEach(regionKey => {
    regionState[regionKey] = regionState[regionKey] || {};
    REGION_RESOURCE_KEYS.forEach(key => {
      if (!Number.isFinite(regionState[regionKey][key])) {
        regionState[regionKey][key] = proportionalShare(key, regionKey);
      }
    });
  });
}

function applyRegionAllocation(regionKey, resourceKey, proposed) {
  const totalAvailable = simState[resourceKey] || 0;
  const otherSum = REGION_KEYS.reduce((sum, rk) => {
    if (rk === regionKey) return sum;
    return sum + (regionState[rk]?.[resourceKey] || 0);
  }, 0);
  const maxForRegion = Math.max(0, totalAvailable - otherSum);
  const step = resourceKey === 'students' ? 500 : 1000;
  const clamped = clamp(proposed, 0, maxForRegion);
  const rounded = Math.max(0, Math.round(clamped / step) * step);
  const finalValue = Math.min(rounded, maxForRegion);
  regionState[regionKey][resourceKey] = finalValue;
  return finalValue;
}

function updateRegionSliderBounds(resourceKey) {
  const totalAvailable = simState[resourceKey] || 0;
  document.querySelectorAll(`.region-slider[data-key="${resourceKey}"]`).forEach(slider => {
    slider.max = totalAvailable;
    const regionKey = slider.dataset.region;
    const raw = regionState[regionKey]?.[resourceKey] || 0;
    slider.value = Math.min(totalAvailable, raw);
    const label = document.getElementById(`${slider.id}Value`);
    if (label) label.textContent = fmt(Math.round(raw));
  });
}

function updateRegionSummary() {
  const summaryEl = document.getElementById('regionSummary');
  if (!summaryEl) return;
  const html = REGION_RESOURCE_KEYS.map(key => {
    const total = simState[key] || 0;
    const allocated = totalRegionalAllocation(key);
    return `<div class="region-summary-item"><span>${RESOURCE_LABELS[key]}</span><span>${fmt(
      Math.round(allocated)
    )} / ${fmt(Math.round(total))}</span></div>`;
  }).join('');
  summaryEl.innerHTML = html;
}

function scaleRegionAllocations(resourceKey) {
  ensureRegionDefaults();
  const totalAvailable = simState[resourceKey] || 0;
  const currentTotal = totalRegionalAllocation(resourceKey);
  if (totalAvailable <= 0) {
    REGION_KEYS.forEach(regionKey => {
      regionState[regionKey][resourceKey] = 0;
    });
    return;
  }
  if (currentTotal <= 0) {
    REGION_KEYS.forEach(regionKey => {
      regionState[regionKey][resourceKey] = proportionalShare(resourceKey, regionKey);
    });
    return;
  }
  const scale = totalAvailable / currentTotal;
  REGION_KEYS.forEach(regionKey => {
    regionState[regionKey][resourceKey] = (regionState[regionKey][resourceKey] || 0) * scale;
  });

  const diff = totalAvailable - totalRegionalAllocation(resourceKey);
  if (Math.abs(diff) > 1) {
    const sorted = [...REGION_KEYS].sort(
      (a, b) => (REGIONS[b].pop || 0) - (REGIONS[a].pop || 0)
    );
    const target = sorted[0];
    if (target) {
      regionState[target][resourceKey] = Math.max(
        0,
        (regionState[target][resourceKey] || 0) + diff
      );
    }
  }
}

function setupRegionControls() {
  const container = document.getElementById('regionControls');
  if (!container) return;
  container.innerHTML = '';
  ensureRegionDefaults();

  REGION_KEYS.forEach(regionKey => {
    const info = REGIONS[regionKey];
    const section = document.createElement('details');
    section.className = 'region-section';
    if (regionKey === REGION_KEYS[0]) section.open = true;

    const summary = document.createElement('summary');
    summary.textContent = info.name;
    section.appendChild(summary);

    const group = document.createElement('div');
    group.className = 'region-slider-group';

    REGION_RESOURCE_KEYS.forEach(resourceKey => {
      const sliderId = `region-${regionKey}-${resourceKey}`;
      const defaultValue =
        regionState[regionKey][resourceKey] !== undefined
          ? regionState[regionKey][resourceKey]
          : proportionalShare(resourceKey, regionKey);
      regionState[regionKey][resourceKey] = defaultValue;

      const row = document.createElement('div');
      row.className = 'slider-row region';

      const meta = document.createElement('div');
      meta.className = 'slider-meta';

      const label = document.createElement('label');
      label.setAttribute('for', sliderId);
      label.className = 'slider-label';
      label.textContent = RESOURCE_LABELS[resourceKey];

      const value = document.createElement('span');
      value.className = 'slider-value';
      value.id = `${sliderId}Value`;
      value.textContent = fmt(Math.round(defaultValue));

      meta.appendChild(label);
      meta.appendChild(value);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'slider region-slider';
      slider.id = sliderId;
      slider.min = '0';
      slider.max = String(simState[resourceKey] || 0);
      slider.step = resourceKey === 'students' ? '500' : '1000';
      slider.value = defaultValue;
      slider.dataset.key = resourceKey;
      slider.dataset.region = regionKey;

      row.appendChild(meta);
      row.appendChild(slider);
      group.appendChild(row);
    });

    section.appendChild(group);
    container.appendChild(section);
  });

  REGION_RESOURCE_KEYS.forEach(updateRegionSliderBounds);
  updateRegionSummary();
}

function setupSliders() {
  document.querySelectorAll('.slider').forEach(slider => {
    const key = slider.dataset.key;
    if (!key) return;

    const regionKey = slider.dataset.region || null;
    const valueEl = document.getElementById(`${slider.id}Value`);
    if (!regionKey) sliderValueEls[key] = valueEl;

    const isPercent = regionKey ? false : key === 'contacts' || key === 'vaccination';
    const initialVal = Number(slider.value);
    if (valueEl) valueEl.innerHTML = isPercent ? `${initialVal} %` : fmt(initialVal);

    if (regionKey) {
      regionState[regionKey] = regionState[regionKey] || {};
    } else {
      simState[key] = initialVal;
    }

    slider.addEventListener('input', () => {
      const val = Number(slider.value);
      if (regionKey) {
        regionState[regionKey] = regionState[regionKey] || {};
        const applied = applyRegionAllocation(regionKey, key, val);
        slider.value = applied;
        if (valueEl) valueEl.innerHTML = fmt(Math.round(applied));
        updateRegionSummary();
        updateRegionSliderBounds(key);
        updateSimulation();
        renderWeek(activeWeek);
        return;
      }

      simState[key] = val;
      if (valueEl) valueEl.innerHTML = isPercent ? `${val} %` : fmt(val);
      if (REGION_RESOURCE_KEYS.includes(key)) {
        scaleRegionAllocations(key);
        updateRegionSliderBounds(key);
        updateRegionSummary();
      }
      updateSimulation();
      renderWeek(activeWeek);
    });
  });
}

async function boot() {
  try {
    initMap();
    try {
      await loadDataAPI();
    } catch (err) {
      console.warn('API ODiSSE indisponible, fallback utilise:', err);
      loadDataFallback();
    }

    setupWeekSelector();
    setupRegionControls();
    setupSliders();

    const latest = weeks[0] || null;
    const selector = document.getElementById('weekSelect');
    if (selector && latest) selector.value = latest;
    renderWeek(latest);
  } catch (err) {
    console.error(err);
    setStatus(`Erreur : ${err.message}`);
  }
}

window.addEventListener('DOMContentLoaded', boot);
