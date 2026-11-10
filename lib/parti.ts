// Partifarger følger etablert konvensjon i norske medier, slik at grafene leses umiddelbart.
// Partinavn står alltid på aksen eller i forklaringen, så fargen bærer aldri identiteten alene.
export const PARTIER: Record<string, { navn: string; kort: string; farge: string }> = {
  R: { navn: 'Rødt', kort: 'R', farge: '#8A0B1F' },
  SV: { navn: 'Sosialistisk Venstreparti', kort: 'SV', farge: '#E8538A' },
  A: { navn: 'Arbeiderpartiet', kort: 'Ap', farge: '#E3001B' },
  Sp: { navn: 'Senterpartiet', kort: 'Sp', farge: '#00843D' },
  MDG: { navn: 'Miljøpartiet De Grønne', kort: 'MDG', farge: '#6AAE39' },
  KrF: { navn: 'Kristelig Folkeparti', kort: 'KrF', farge: '#F2B400' },
  V: { navn: 'Venstre', kort: 'V', farge: '#00807A' },
  H: { navn: 'Høyre', kort: 'H', farge: '#1A7FD6' },
  FrP: { navn: 'Fremskrittspartiet', kort: 'FrP', farge: '#0B2F6B' },
  PF: { navn: 'Pasientfokus', kort: 'PF', farge: '#6A5ACD' },
};
export const PARTI_REKKEFOLGE = ['R', 'SV', 'A', 'Sp', 'MDG', 'KrF', 'V', 'H', 'FrP', 'PF'];
export const partiFarge = (id?: string) => (id && PARTIER[id]?.farge) || '#8A877F';
export const partiKort = (id?: string) => (id && PARTIER[id]?.kort) || id || 'Ukjent';

export const bildeUrl = (personId: string, storrelse: 'lite' | 'middels' | 'stort' = 'middels') =>
  `https://data.stortinget.no/eksport/personbilde?personid=${encodeURIComponent(personId)}&storrelse=${storrelse}&erstatningsbilde=true`;

export const representantUrl = (personId: string) =>
  `https://www.stortinget.no/no/Representanter-og-komiteer/Representantene/Representant/?perid=${encodeURIComponent(personId)}`;
