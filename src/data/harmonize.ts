export type AgeBin = '0-4' | '5-11' | '12-17' | '18-49' | '50-64' | '65+';

export interface RawVaccination {
  date: string;              // ex: '2024-10-15'
  regionCode: string;        // ex: '84' ou 'FR-ARA'
  regionName?: string;
  age?: string;              // ex: '0-4', '0_4', '0–4', '0 to 4', etc.
  vaccine?: string;          // ex: 'Influenza'
  dosesAdmin?: number;       // doses administrées (cumul ou hebdo)
  populationTarget?: number; // population cible pour la vaccination
}

export interface RawFlu {
  date: string;              // ex: '2024-10-15'
  regionCode: string;
  regionName?: string;
  age?: string;
  cases?: number;            // cas hebdo
  incidencePer100k?: number; // si déjà fourni
  population?: number;       // population pour calculer l'incidence si besoin
}

export interface VaccinationHarmonized {
  week: string;              // 'YYYY-Www'
  regionCode: string;
  regionName?: string;
  age: AgeBin;
  vaccine: 'Influenza';
  coveragePct: number;       // 0..100
  dosesAdmin?: number;
  populationTarget?: number;
}

export interface FluHarmonized {
  week: string;
  regionCode: string;
  regionName?: string;
  age: AgeBin | 'ALL';
  incidencePer100k: number;  // incidence standardisée
  cases?: number;
  population?: number;
}

export interface CombinedRecord {
  week: string;
  regionCode: string;
  regionName?: string;
  age: AgeBin | 'ALL';
  incidencePer100k: number | null;
  coveragePct: number | null;
}

const AGE_MAP: Record<string, AgeBin> = {
  '0-4': '0-4', '0_4': '0-4', '0–4': '0-4', '0 to 4': '0-4',
  '5-11': '5-11', '5_11': '5-11', '5–11': '5-11', '5 to 11': '5-11',
  '12-17': '12-17', '12_17': '12-17', '12–17': '12-17', '12 to 17': '12-17',
  '18-49': '18-49', '18_49': '18-49', '18–49': '18-49', '18 to 49': '18-49',
  '50-64': '50-64', '50_64': '50-64', '50–64': '50-64', '50 to 64': '50-64',
  '65+': '65+', '65_plus': '65+', '65 et plus': '65+', '65 and over': '65+'
};

function normalizeAgeBin(age?: string): AgeBin {
  if (!age) return '65+'; // fallback conservateur
  const key = age.trim().toLowerCase().replace(/\s+/g, ' ');
  // try direct map
  if (AGE_MAP[key]) return AGE_MAP[key];
  // remove spaces and replace unicode dash
  const normalized = key.replace(/\s/g, '').replace(/–/g, '-');
  if (AGE_MAP[normalized]) return AGE_MAP[normalized];
  // fallback
  return '65+';
}

function normalizeRegionCode(code: string | undefined): string {
  if (!code) return 'UNK';
  const c = code.toString().trim().toUpperCase();
  return c.startsWith('FR-') ? c.slice(3) : c;
}

function toISOWeek(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'INVALID';
  // Use UTC to avoid timezone issues
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7; // 1..7 (Mon..Sun)
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const yyyy = dt.getUTCFullYear();
  const ww = String(weekNo).padStart(2, '0');
  return `${yyyy}-W${ww}`;
}

function clampPct(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

export function harmonizeVaccination(rows: RawVaccination[]): VaccinationHarmonized[] {
  return rows
    .filter(r => r.date && r.regionCode)
    .map(r => {
      const week = toISOWeek(r.date);
      const regionCode = normalizeRegionCode(r.regionCode);
      const age = normalizeAgeBin(r.age);
      const vaccine: 'Influenza' = 'Influenza';
      let coveragePct = NaN;
      if (typeof r.dosesAdmin === 'number' && typeof r.populationTarget === 'number' && r.populationTarget > 0) {
        coveragePct = (r.dosesAdmin / r.populationTarget) * 100;
      }
      return {
        week,
        regionCode,
        regionName: r.regionName,
        age,
        vaccine,
        coveragePct: clampPct(coveragePct),
        dosesAdmin: r.dosesAdmin,
        populationTarget: r.populationTarget
      };
    })
    .filter(r => r.week !== 'INVALID');
}

export function harmonizeFlu(rows: RawFlu[]): FluHarmonized[] {
  return rows
    .filter(r => r.date && r.regionCode)
    .map(r => {
      const week = toISOWeek(r.date);
      const regionCode = normalizeRegionCode(r.regionCode);
      const age = r.age ? normalizeAgeBin(r.age) : ('ALL' as const);
      let incidence = r.incidencePer100k as number | undefined;
      if ((incidence === undefined || incidence === null) && typeof r.cases === 'number' && typeof r.population === 'number' && r.population > 0) {
        incidence = (r.cases / r.population) * 100000;
      }
      return {
        week,
        regionCode,
        regionName: r.regionName,
        age,
        incidencePer100k: Number.isFinite(incidence as number) ? (incidence as number) : 0,
        cases: r.cases,
        population: r.population
      };
    })
    .filter(r => r.week !== 'INVALID');
}

export function joinFluVaccination(
  flu: FluHarmonized[],
  vac: VaccinationHarmonized[],
  joinOnAge: boolean = false
): CombinedRecord[] {
  const key = (w: string, r: string, a: string) => `${w}__${r}__${a}`;
  const vacIdx = new Map<string, VaccinationHarmonized>();
  for (const v of vac) {
    vacIdx.set(key(v.week, v.regionCode, joinOnAge ? v.age : 'ALL'), v);
  }

  const seen = new Set<string>();
  const out: CombinedRecord[] = [];

  for (const f of flu) {
    const ageKey = joinOnAge ? (f.age === 'ALL' ? '65+' : (f.age as string)) : 'ALL';
    const k = key(f.week, f.regionCode, ageKey);
    const v = vacIdx.get(k);
    out.push({
      week: f.week,
      regionCode: f.regionCode,
      regionName: f.regionName ?? v?.regionName,
      age: joinOnAge ? (f.age === 'ALL' ? ('65+' as AgeBin) : f.age) : ('ALL' as const),
      incidencePer100k: f.incidencePer100k,
      coveragePct: v ? v.coveragePct : null
    });
    seen.add(k);
  }

  for (const v of vac) {
    const k = key(v.week, v.regionCode, joinOnAge ? v.age : 'ALL');
    if (seen.has(k)) continue;
    out.push({
      week: v.week,
      regionCode: v.regionCode,
      regionName: v.regionName,
      age: joinOnAge ? v.age : ('ALL' as const),
      incidencePer100k: null,
      coveragePct: v.coveragePct
    });
  }

  out.sort((a, b) => a.week.localeCompare(b.week) || a.regionCode.localeCompare(b.regionCode) || String(a.age).localeCompare(String(b.age)));
  return out;
}

export function qualityReport(
  flu: FluHarmonized[],
  vac: VaccinationHarmonized[]
): { invalidWeeks: number; missingRegions: number; outOfRangeCoverage: number } {
  const invalidWeeks = [...flu, ...vac].filter(r => r.week === 'INVALID').length;
  const regions = new Set([...flu.map(r => r.regionCode), ...vac.map(r => r.regionCode)]);
  const missingRegions = regions.has('UNK') ? 1 : 0;
  const outOfRangeCoverage = vac.filter(v => v.coveragePct < 0 || v.coveragePct > 100).length;
  return { invalidWeeks, missingRegions, outOfRangeCoverage };
}

