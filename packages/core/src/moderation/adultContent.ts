import { normalizeForModeration } from './filter.js';

// Détection de contenu PORNOGRAPHIQUE (hentai, porno, softcore, X, eroge…) sur
// les titres/résumés de séries, films, animés ET jeux. Objectif produit : ne
// RIEN laisser passer de pornographique, TOUT EN NE bloquant PAS la violence —
// un contenu 18+ pour violence/gore/langage reste autorisé. On cible donc des
// SIGNAUX DE PORNOGRAPHIE sans ambiguïté, pas le simple classement d'âge.
//
// Deux stratégies de correspondance (réutilisent la normalisation de la
// modération de commentaires : minuscules, accents retirés, leetspeak,
// répétitions réduites, séparateurs → espace) :
//   - `substr` : racines NON ambiguës sans surchaîne bénigne (« porn » attrape
//     porno/pornographic/pornographie/pornografia/pornografico/pornostar…).
//     Testées sur la version COMPACTE (sans séparateur) → attrape « p.o.r.n »,
//     « p0rn », etc.
//   - `word` : marqueurs COURTS ou ambigus (« xxx », « jav », « milf ») exigeant
//     une frontière de mot, pour éviter « MaXXXine » (film d'horreur 2024),
//     « milfoil » (plante), « Java », etc.
//
// NE PAS ajouter de termes grand public : PAS « erotic »/« erotique » seul
// (« erotic thriller » type Basic Instinct = grand public), PAS « ecchi »
// (fan-service léger), PAS « sexy », PAS « nude »/« nudity » seul, PAS « sex »
// seul (« Sex Education », « Sex and the City » sont grand public). On préfère
// des marqueurs composés ou non ambigus.

type MarkerMode = 'substr' | 'word';
export interface AdultMarker {
  /** Marqueur lisible (multilingue). Normalisé comme le texte avant compilation. */
  term: string;
  mode: MarkerMode;
  /** Origine linguistique/thématique — purement documentaire. */
  lang: string;
}

// Racines/expressions PORNO sans ambiguïté (correspondance par sous-chaîne).
// « porn » couvre à lui seul porno/pornographic/pornographie/pornografia/
// pornografico/pornografisch/pornography/pornstar/filmporno… dans toutes les
// langues, mais on garde des entrées explicites par langue pour la lisibilité.
const SUBSTR_MARKERS: AdultMarker[] = [
  // Anglais
  { term: 'porn', mode: 'substr', lang: 'en' },
  { term: 'pornographic', mode: 'substr', lang: 'en' },
  { term: 'hardcore porn', mode: 'substr', lang: 'en' },
  { term: 'softcore', mode: 'substr', lang: 'en' },
  { term: 'sex tape', mode: 'substr', lang: 'en' },
  { term: 'porn star', mode: 'substr', lang: 'en' },
  { term: 'explicit sex', mode: 'substr', lang: 'en' },
  { term: 'adult anime', mode: 'substr', lang: 'en' },
  { term: 'adult video', mode: 'substr', lang: 'en' },
  { term: 'adult film', mode: 'substr', lang: 'en' },
  { term: 'gangbang', mode: 'substr', lang: 'en' },
  { term: 'creampie', mode: 'substr', lang: 'en' },
  // Français
  { term: 'porno', mode: 'substr', lang: 'fr' },
  { term: 'pornographie', mode: 'substr', lang: 'fr' },
  { term: 'pornographique', mode: 'substr', lang: 'fr' },
  { term: 'film porno', mode: 'substr', lang: 'fr' },
  { term: 'film x', mode: 'substr', lang: 'fr' },
  // Espagnol
  { term: 'pornografia', mode: 'substr', lang: 'es' },
  { term: 'pornografico', mode: 'substr', lang: 'es' },
  { term: 'sexo explicito', mode: 'substr', lang: 'es' },
  { term: 'pelicula porno', mode: 'substr', lang: 'es' },
  // Allemand
  { term: 'pornografie', mode: 'substr', lang: 'de' },
  { term: 'pornografisch', mode: 'substr', lang: 'de' },
  // Italien
  { term: 'pornografia', mode: 'substr', lang: 'it' },
  { term: 'film porno', mode: 'substr', lang: 'it' },
  // Portugais
  { term: 'pornografia', mode: 'substr', lang: 'pt' },
  { term: 'filme porno', mode: 'substr', lang: 'pt' },
  // Japonais romanisé (hentai/eroge) — termes explicites sans ambiguïté.
  { term: 'hentai', mode: 'substr', lang: 'ja' },
  { term: 'eroge', mode: 'substr', lang: 'ja' },
  { term: 'nukige', mode: 'substr', lang: 'ja' },
  { term: 'ahegao', mode: 'substr', lang: 'ja' },
  { term: 'bukkake', mode: 'substr', lang: 'ja' },
  { term: 'futanari', mode: 'substr', lang: 'ja' },
  { term: 'jav idol', mode: 'substr', lang: 'ja' },
  { term: 'av idol', mode: 'substr', lang: 'ja' },
];

// Marqueurs COURTS ou ambigus : frontière de mot obligatoire (token isolé).
const WORD_MARKERS: AdultMarker[] = [
  { term: 'xxx', mode: 'word', lang: 'intl' }, // NB : collision connue avec « xXx » (Vin Diesel, 2002).
  { term: 'jav', mode: 'word', lang: 'ja' }, // Japanese Adult Video
  { term: 'milf', mode: 'word', lang: 'en' },
];

// Liste exportée (extensible) de TOUS les marqueurs pornographiques.
export const ADULT_MARKERS: readonly AdultMarker[] = [...SUBSTR_MARKERS, ...WORD_MARKERS];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Chaque caractère peut se répéter (« a » → « a+ ») : combiné à la réduction des
// répétitions de la normalisation, attrape « porn » comme « poooorn ».
function repeatTolerantPattern(compactTerm: string): string {
  let pattern = '';
  for (const ch of compactTerm) pattern += `${escapeRegExp(ch)}+`;
  return pattern;
}

type CompiledMarker = { mode: MarkerMode; re: RegExp };

function buildMarkers(): CompiledMarker[] {
  const out: CompiledMarker[] = [];
  const seen = new Set<string>();
  for (const m of ADULT_MARKERS) {
    // Normalise le marqueur exactement comme le texte, puis compacte.
    const spaced = normalizeForModeration(m.term);
    const compact = spaced.replace(/[^a-z0-9]/g, '');
    if (!compact) continue;
    const key = `${m.mode}:${compact}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pattern = repeatTolerantPattern(compact);
    out.push({
      mode: m.mode,
      re: m.mode === 'word' ? new RegExp(`\\b${pattern}\\b`) : new RegExp(pattern),
    });
  }
  return out;
}

const MARKERS = buildMarkers();

/**
 * `true` si l'un des textes fournis (titre, titre original, résumé…) contient un
 * marqueur pornographique sans ambiguïté. Chaque champ est testé séparément (pas
 * de concaténation) pour éviter les faux positifs à cheval sur deux champs.
 */
export function containsAdultContent(
  text: string | null | undefined,
  ...more: (string | null | undefined)[]
): boolean {
  for (const raw of [text, ...more]) {
    if (typeof raw !== 'string' || raw.length === 0) continue;
    const spaced = normalizeForModeration(raw);
    if (!spaced) continue;
    const compact = spaced.replace(/[^a-z0-9]/g, '');
    for (const m of MARKERS) {
      if (m.mode === 'word') {
        if (m.re.test(spaced)) return true;
      } else if (m.re.test(compact)) {
        return true;
      }
    }
  }
  return false;
}
