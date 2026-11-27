// Samme ordregler som i config/taksonomi.json og datahentingen:
// «ord» treffer fra ordstart, «*ord» treffer også inni sammensatte ord, «ord\b» krever helt ord.
const GRENSE = '(?:(?<![\\p{L}\\d])(?=[\\p{L}\\d])|(?<=[\\p{L}\\d])(?![\\p{L}\\d]))';

export function lagOrdRegex(ord: string[]) {
  const deler = ord
    .filter(Boolean)
    .map((o) => (o.startsWith('*') ? o.slice(1) : o.startsWith('\\b') ? o : '\\b' + o).replaceAll('\\b', GRENSE));
  return deler.length ? new RegExp(deler.join('|'), 'giu') : null;
}

/** Returnerer de unike ordene som traff i teksten (for å vise «Treff: adrenalin, anafylaksi»). */
export function treffI(tekst: string, rx: RegExp | null) {
  if (!rx || !tekst) return [];
  rx.lastIndex = 0;
  return [...new Set((tekst.match(rx) || []).map((t) => t.toLowerCase()))];
}
