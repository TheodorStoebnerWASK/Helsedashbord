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
