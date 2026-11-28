// Forklarer status og datoer for kliniske studier (ClinicalTrials.gov) på vanlig norsk.
export const STATUS: Record<string, string> = {
  RECRUITING: 'Rekrutterer pasienter',
  ACTIVE_NOT_RECRUITING: 'Pågår, tar ikke inn flere pasienter',
  NOT_YET_RECRUITING: 'Ikke startet ennå',
  ENROLLING_BY_INVITATION: 'Rekrutterer etter invitasjon',
};

const MND = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
const mnd = (d: string) => `${MND[Number(d.slice(5, 7)) - 1] || ''} ${d.slice(0, 4)}`.trim();

/**
 * «ferdig» er datoen for når hovedresultatene (primærendepunktet) ventes – ikke når legemidlet kommer på markedet.
 * Ligger datoen bak oss, er datainnsamlingen avsluttet, men studien følger fortsatt pasientene eller resultatene er ikke publisert.
 */
export function resultatTekst(ferdig?: string) {
  if (!ferdig) return 'Dato for resultater ikke oppgitt';
  const passert = ferdig.slice(0, 7) < new Date().toISOString().slice(0, 7);
  return passert ? `Hovedresultat samlet inn ${mnd(ferdig)}, oppfølging pågår` : `Hovedresultater ventes ${mnd(ferdig)}`;
}

/** Studielegemidlets navn som søkenøkkel: første intervensjon, uten dose og administrasjonsform. «ianalumab s.c. q4w» → «ianalumab». */
export function legemiddelNokkel(legemiddel: string[]) {
  const forste = (legemiddel[0] || '').toLowerCase().replace(/\(.*?\)/g, ' ');
  return forste.split(/\s+|,|\/|\+/).find((o) => /^[a-z][a-z0-9-]{4,}$/.test(o) && !/^(dose|arm|cohort|tablet|injection|oral|placebo|matching)$/.test(o)) || '';
}

/**
 * Grovt anslag for når legemidlet kan nå Norge: søknad til EMA 6–12 måneder etter hovedresultatet,
 * EMA-behandling om lag ett år. Deretter kommer Nye metoder eller blåreseptsøknad.
 */
export function veienTilNorge(ferdig?: string): { tekst: string; aar?: number; passert: boolean } {
  if (!ferdig) return { tekst: 'Ingen dato oppgitt', passert: false };
  const aar = Number(ferdig.slice(0, 4));
  const passert = ferdig.slice(0, 7) < new Date().toISOString().slice(0, 7);
  return passert
    ? { tekst: `Resultat forelå ${mnd(ferdig)}`, aar, passert }
    : { tekst: `Resultat ventes ${mnd(ferdig)}, mulig EU-godkjenning ca. ${aar + 1}–${aar + 2}`, aar, passert };
}
