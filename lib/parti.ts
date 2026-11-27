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

// Partilogoer (symbolversjon for små flater). Forholdet bredde/høyde trengs for å tegne dem riktig i grafene.
const LOGO_FORHOLD: Record<string, number> = {"H": 1.829, "SV": 1.702, "V": 1.086, "FrP": 1.071, "Sp": 0.97, "A": 0.932, "R": 1.129, "MDG": 1.616, "KrF": 1.389};
export const partiLogo = (id?: string) => (id && LOGO_FORHOLD[id] ? { src: `/parti/${id}-ikon.png`, forhold: LOGO_FORHOLD[id] } : null);
