/* Clean Flu ETL
   - Lit les fichiers source (incidence.csv et couvertures vaccinales) situés à la racine du dépôt
   - Nettoie et normalise les données (semaines, champs numériques, identifiants géo)
   - Écrit les sorties JSON et CSV dans data/processed
   Notes:
   - Parser CSV naïf adapté aux fichiers fournis (pas de champs entre guillemets contenant des virgules)
   - Fonctions clés : parseCSV, weekNumberToISO, pickNumber, normalizeNumericString
*/

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// parseCSV: parse un CSV simple en {headers, rows}.
// Comportement attendu pour les datasets ici : pas de champs entre guillemets contenant des virgules.
// - lines: on enlève les lignes vides
// - headers: première ligne, séparée par des virgules
// - rows: chaque ligne suivante devient un objet mapping header -> valeur (trim)
// Utiliser cette fonction si vos fichiers CSV respectent ce format simple.
function parseCSV(text) {
  // naive CSV parser assuming no quoted commas in fields; OK for these datasets
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((ln) => {
    const cols = ln.split(',');
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = cols[i] !== undefined ? cols[i].trim() : '';
    }
    return obj;
  });
  return { headers, rows };
}

// weekNumberToISO: normalise différentes représentations de semaine en format "YYYY-Www"
// - Accepte "202541", "2025-W41", "2025W41", etc.
// - Si la chaine ne correspond pas, renvoie la valeur telle quelle (fallback).
function weekNumberToISO(weekNumStr) {
  // weekNumStr like 202541 or 2025-W41 or '202541' (Sentinelles format)
  const s = String(weekNumStr).trim();
  const m = s.match(/^(\d{4})-?W?(\d{1,2})$/);
  if (m) {
    const y = m[1];
    const w = String(m[2]).padStart(2, '0');
    return `${y}-W${w}`;
  }
  // fallback: try split last two digits
  if (s.length >= 6) {
    const y = s.slice(0, 4);
    const w = s.slice(4);
    return `${y}-W${w.padStart(2, '0')}`;
  }
  return s;
}

// helper: normalise une chaîne numérique (remplace ',' par '.', supprime '%', espaces)
// Exemple: "12,3 %" -> "12.3" puis Number("12.3") => 12.3
function normalizeNumericString(s) {
  if (s === undefined || s === null) return s;
  if (typeof s !== 'string') return s;
  const cleaned = s.replace(/\s+/g, '').replace(',', '.').replace('%', '');
  return cleaned;
}

// helper: renvoie la première clé présente/non vide convertie en Number, ou null
// améliorée : gère les virgules décimales et pourcentages en essayant une normalisation si Number(v) est NaN.
function pickNumber(obj, keys) {
  for (const k of keys) {
    const v = obj && Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : undefined;
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      // try direct Number
      const n1 = Number(v);
      if (!Number.isNaN(n1)) return n1;
      // try normalized string (comma -> dot, remove %)
      const norm = normalizeNumericString(String(v));
      const n2 = Number(norm);
      if (!Number.isNaN(n2)) return n2;
    }
  }
  return null;
}

(function main() {
  console.log('Clean Flu ETL: démarrage');
  const repoRoot = path.resolve(__dirname, '..', '..');
  const outDir = path.join(repoRoot, 'data', 'processed');
  ensureDir(outDir);

  // 1) Process incidence.csv (root)
  // Étapes de nettoyage pour l'incidence :
  // - Lecture et suppression des lignes commençant par '#' (métadonnées)
  // - Parsing CSV via parseCSV
  // - Filtrage optionnel sur la colonne "indicator" : si présente, on conserve surtout les enregistrements d'indicateur 3 (Sentinelles)
  // - Normalisation de la date/semaine via weekNumberToISO
  // - Extraction des valeurs numériques d'incidence avec pickNumber pour gérer plusieurs noms de colonnes possibles (inc, inc100, inc100_up)
  // - Normalisation des identifiants géographiques (geo_insee, geo_name) en testant plusieurs noms possibles de colonnes
  // - Écriture des sorties JSON et CSV dans data/processed
  const incidencePath = path.join(repoRoot, 'incidence.csv');
  let incidenceOut = [];
  if (fs.existsSync(incidencePath)) {
    const raw = fs.readFileSync(incidencePath, 'utf8');
    // remove initial lines starting with '#'
    const cleaned = raw
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n')
      .trim();
    const parsed = parseCSV(cleaned);
    // Expected headers include: week,indicator,inc,inc_low,inc_up,inc100,inc100_low,inc100_up,geo_insee,geo_name
    incidenceOut = parsed.rows
      .filter((r) => {
        // filter indicator 3 (sentinelles: maybe flu-like illness)
        const ind = Number(r['indicator'] ?? r['Indicator'] ?? r['INDICATOR']);
        return Number.isFinite(ind) ? ind === 3 : true;
      })
      .map((r) => {
        const weekRaw = r['week'] ?? r['Week'] ?? r['WEEK'];
        return {
          week: weekNumberToISO(weekRaw),
          week_raw: String(weekRaw),
          // incidence (raw) and incidencePer100k normalized via pickNumber
          incidence: pickNumber(r, ['inc', 'inc100', 'inc100_up']),
          incidencePer100k: pickNumber(r, ['inc100', 'inc100_up', 'inc']),
          geo_insee: r['geo_insee'] ?? r['geo'] ?? r['insee'] ?? null,
          geo_name: r['geo_name'] ?? r['geoName'] ?? r['geo'] ?? null,
          raw: r,
        };
      });

    // write outputs
    fs.writeFileSync(path.join(outDir, 'flu_incidence.json'), JSON.stringify(incidenceOut, null, 2), 'utf8');
    // csv
    const incCsvHeader = ['week','week_raw','incidencePer100k','geo_insee','geo_name'];
    const incCsvLines = [incCsvHeader.join(',')];
    for (const row of incidenceOut) {
      incCsvLines.push([
        row.week,
        row.week_raw,
        row.incidencePer100k ?? '',
        row.geo_insee ?? '',
        '"' + String(row.geo_name ?? '').replace(/"/g, '""') + '"'
      ].join(','));
    }
    fs.writeFileSync(path.join(outDir, 'flu_incidence.csv'), incCsvLines.join('\n'), 'utf8');
    console.log(`Écrit ${incidenceOut.length} enregistrements d'incidence dans ${outDir}`);
  } else {
    console.warn('Fichier incidence.csv introuvable à la racine du dépôt ; traitement des incidences ignoré');
  }

  // 2) Process vaccination coverage CSV (root)
  // Étapes de nettoyage pour la couverture vaccinale :
  // - Lecture du CSV (suppression du BOM si présent)
  // - Parsing via parseCSV
  // - Détection automatique des colonnes contenant "Grippe" (insensible à la casse)
  // - Pour chaque ligne (département), on crée un enregistrement par mesure "Grippe" trouvée
  //   * On normalise l'année, les codes et noms de région/département en testant plusieurs variantes de noms de colonnes
  //   * On convertit la valeur texte en nombre (virgule décimale transformée en point), ou null si vide
  // - Écriture des sorties JSON et CSV dans data/processed
  const vacPath = path.join(repoRoot, 'couvertures-vaccinales-des-adolescent-et-adultes-departement.csv');
  let vacOut = [];
  if (fs.existsSync(vacPath)) {
    let rawVac = fs.readFileSync(vacPath, 'utf8');
    // remove BOM if present
    if (rawVac.charCodeAt(0) === 0xfeff) rawVac = rawVac.slice(1);
    const parsedVac = parseCSV(rawVac);
    // Identify columns containing 'Grippe' (case-insensitive)
    const fluCols = parsedVac.headers.filter((h) => /grippe/i.test(h));

    for (const r of parsedVac.rows) {
      const base = {
        year: r['Année'] || r['Annee'] || r['year'] || '',
        departmentCode: r['Département Code'] || r['Departement Code'] || r['code_departement'] || r['dept_code'] || r['département_code'] || r['departement_code'] || '',
        department: r['Département'] || r['Departement'] || r['department'] || '',
        region: r['Région'] || r['Region'] || r['region'] || '',
        regionCode: r['Région Code'] || r['Region Code'] || r['region_code'] || '',
        raw: r,
      };

      for (const col of fluCols) {
        const val = r[col];
        // utiliser normalizeNumericString avant conversion pour gérer "12,3" ou "45 %"
        const numeric = val === '' || val === undefined ? null : Number(normalizeNumericString(String(val)));
        vacOut.push({
          year: base.year,
          departmentCode: String(base.departmentCode),
          department: base.department,
          region: base.region,
          regionCode: String(base.regionCode),
          measure: col,
          coveragePct: Number.isNaN(numeric) ? null : numeric,
        });
      }
    }

    // write outputs
    fs.writeFileSync(path.join(outDir, 'flu_vaccination.json'), JSON.stringify(vacOut, null, 2), 'utf8');
    const vacHeader = ['year','regionCode','region','departmentCode','department','measure','coveragePct'];
    const vacLines = [vacHeader.join(',')];
    for (const r of vacOut) {
      vacLines.push([
        r.year,
        r.regionCode,
        '"' + String(r.region).replace(/"/g, '""') + '"',
        r.departmentCode,
        '"' + String(r.department).replace(/"/g, '""') + '"',
        '"' + String(r.measure).replace(/"/g, '""') + '"',
        r.coveragePct ?? ''
      ].join(','));
    }
    fs.writeFileSync(path.join(outDir, 'flu_vaccination.csv'), vacLines.join('\n'), 'utf8');
    console.log(`Écrit ${vacOut.length} enregistrements de couverture vaccinale dans ${outDir}`);
  } else {
    console.warn('Fichier de couverture vaccinale introuvable à la racine du dépôt ; traitement de la vaccination ignoré');
  }

  console.log('Clean Flu ETL: terminé');
})();
