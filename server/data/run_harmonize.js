const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSONorCSV(baseName) {
  const rawDir = path.join(__dirname);
  const jsonPath = path.join(rawDir, baseName + '.json');
  const csvPath = path.join(rawDir, baseName + '.csv');
  if (fs.existsSync(jsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.error('Erreur lecture JSON', jsonPath, e.message);
      return [];
    }
  }
  if (fs.existsSync(csvPath)) {
    const txt = fs.readFileSync(csvPath, 'utf8');
    const lines = txt.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',');
      const obj = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = cols[i] ? cols[i].trim() : '';
      return obj;
    });
    return rows;
  }
  return null; // not found
}

const AGE_MAP = {
  '0-4': '0-4', '0_4': '0-4', '0–4': '0-4', '0 to 4': '0-4',
  '5-11': '5-11', '5_11': '5-11', '5–11': '5-11', '5 to 11': '5-11',
  '12-17': '12-17', '12_17': '12-17', '12–17': '12-17', '12 to 17': '12-17',
  '18-49': '18-49', '18_49': '18-49', '18–49': '18-49', '18 to 49': '18-49',
  '50-64': '50-64', '50_64': '50-64', '50–64': '50-64', '50 to 64': '50-64',
  '65+': '65+', '65_plus': '65+', '65 et plus': '65+', '65 and over': '65+'
};

function normalizeAge(age) {
  if (!age) return '65+';
  const key = String(age).trim().toLowerCase().replace(/\s+/g, ' ');
  if (AGE_MAP[key]) return AGE_MAP[key];
  const normalized = key.replace(/\s/g, '').replace(/–/g, '-');
  if (AGE_MAP[normalized]) return AGE_MAP[normalized];
  return '65+';
}

function normalizeRegion(code) {
  if (!code) return 'UNK';
  const c = String(code).trim().toUpperCase();
  return c.startsWith('FR-') ? c.slice(3) : c;
}

function toISOWeek(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'INVALID';
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const yyyy = dt.getUTCFullYear();
  const ww = String(weekNo).padStart(2, '0');
  return `${yyyy}-W${ww}`;
}

function clampPct(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function harmonizeVaccination(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(r => r.date && r.regionCode)
    .map(r => {
      const week = toISOWeek(r.date);
      const regionCode = normalizeRegion(r.regionCode);
      const age = normalizeAge(r.age);
      let coveragePct = NaN;
      const doses = Number(r.dosesAdmin ?? r.doses ?? r.DosesAdmin ?? r.doses_admin);
      const pop = Number(r.populationTarget ?? r.population_target ?? r.population);
      if (Number.isFinite(doses) && Number.isFinite(pop) && pop > 0) coveragePct = (doses / pop) * 100;
      return {
        week, regionCode, regionName: r.regionName || r.region || null, age, vaccine: 'Influenza', coveragePct: clampPct(coveragePct), dosesAdmin: doses || null, populationTarget: pop || null
      };
    })
    .filter(r => r.week !== 'INVALID');
}

function harmonizeFlu(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(r => r.date && r.regionCode)
    .map(r => {
      const week = toISOWeek(r.date);
      const regionCode = normalizeRegion(r.regionCode);
      const age = r.age ? normalizeAge(r.age) : 'ALL';
      const cases = Number(r.cases ?? r.cases_count ?? r.Cases);
      const pop = Number(r.population ?? r.population_target ?? r.populationTarget);
      let incidence = Number(r.incidencePer100k ?? r.incidence_per_100k ?? r.incidence);
      if ((!Number.isFinite(incidence) || incidence === 0) && Number.isFinite(cases) && Number.isFinite(pop) && pop > 0) {
        incidence = (cases / pop) * 100000;
      }
      return { week, regionCode, regionName: r.regionName || r.region || null, age, incidencePer100k: Number.isFinite(incidence) ? incidence : 0, cases: Number.isFinite(cases) ? cases : null, population: Number.isFinite(pop) ? pop : null };
    })
    .filter(r => r.week !== 'INVALID');
}

function joinFluVaccination(flu, vac, joinOnAge = false) {
  const key = (w, r, a) => `${w}__${r}__${a}`;
  const vacIdx = new Map();
  for (const v of vac) vacIdx.set(key(v.week, v.regionCode, joinOnAge ? v.age : 'ALL'), v);
  const seen = new Set();
  const out = [];
  for (const f of flu) {
    const ageKey = joinOnAge ? (f.age === 'ALL' ? '65+' : f.age) : 'ALL';
    const k = key(f.week, f.regionCode, ageKey);
    const v = vacIdx.get(k);
    out.push({ week: f.week, regionCode: f.regionCode, regionName: f.regionName || (v && v.regionName) || null, age: joinOnAge ? (f.age === 'ALL' ? '65+' : f.age) : 'ALL', incidencePer100k: f.incidencePer100k, coveragePct: v ? v.coveragePct : null });
    seen.add(k);
  }
  for (const v of vac) {
    const k = key(v.week, v.regionCode, joinOnAge ? v.age : 'ALL');
    if (seen.has(k)) continue;
    out.push({ week: v.week, regionCode: v.regionCode, regionName: v.regionName || null, age: joinOnAge ? v.age : 'ALL', incidencePer100k: null, coveragePct: v.coveragePct });
  }
  out.sort((a, b) => (a.week || '').localeCompare(b.week || '') || (a.regionCode || '').localeCompare(b.regionCode || '') || String(a.age).localeCompare(String(b.age)));
  return out;
}

function toCSV(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const keys = Object.keys(arr[0]);
  const lines = [keys.join(',')];
  for (const row of arr) {
    lines.push(keys.map(k => (row[k] === null || row[k] === undefined) ? '' : String(row[k])).join(','));
  }
  return lines.join('\n');
}

(function main() {
  console.log('Run harmonize ETL (server/data/run_harmonize.js)');
  const rawFlu = readJSONorCSV('sentiweb_data') || readJSONorCSV('flu') || readJSONorCSV('incidence') || [];
  const rawVac = readJSONorCSV('vaccination') || readJSONorCSV('vaccinationData') || [];
  if (rawFlu === null && rawVac === null) {
    console.warn('Aucun fichier d\'entrée trouvé dans server/data (attendu: sentiweb_data.json|csv, vaccination.json|csv, incidence.csv, ...). Le script va créer un dossier data/processed vide.');
  }
  const flu = harmonizeFlu(rawFlu || []);
  const vac = harmonizeVaccination(rawVac || []);
  const combined = joinFluVaccination(flu, vac, true);

  const outDir = path.join(__dirname, '..', '..', 'data', 'processed');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'combined.json'), JSON.stringify(combined, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'combined.csv'), toCSV(combined), 'utf8');
  console.log(`Wrote ${combined.length} records to ${outDir}`);
})();
