export type ElementType = 'skriftlig' | 'muntlig' | 'interpellasjon' | 'sak' | 'horing' | 'regjering';

export interface Element {
  id: string;
  type: ElementType;
  tittel: string;
  sesjon: string;
  dato?: string;
  url?: string;
  direkte?: boolean;
  // spørsmål
  fra?: string;
  til?: string;
  tilId?: string;
  besvartDato?: string;
  besvartAv?: string;
  nr?: number;
  // sak
  fullTittel?: string;
  henvisning?: string;
  komite?: string;
  status?: string;
  sakType?: string;
  dokType?: string;
  forslagstillere?: string[];
  saksordforere?: string[];
  emner?: string[];
  // høring
  frister?: { sendt?: string; horingsfrist?: string; horing?: string; avgivelsesfrist?: string; avgitt?: string };
  horingStatus?: string;
  skriftlig?: boolean;
  frist?: string;
  tider?: { tid: string; sted?: string }[];
  saker?: number[];
  // regjering
  beskrivelse?: string;
  // klassifisering
  kategori: string;
  temaer: string[];
  undertemaer?: string[];
  stikkord?: string[];
  storEndring?: boolean;
  begrunnelse?: string;
  kilde: 'ki' | 'regel';
}

export interface Person {
  navn: string;
  parti?: string;
  fylke?: string;
  kjonn?: string;
  vara?: boolean;
  komiteer?: string[];
  aktiv?: boolean;
  epost?: string;
}

/** Én personlig votering. p = partienes standpunkt: 1 for, -1 mot (mangler = ikke standpunkt). */
export interface Votering { s: number; id: number; t?: string; ty: 'innstilling' | 'forslag' | 'annet'; tema?: string; p: Record<string, 1 | -1> }

export interface HodPerson { navn: string; rolle: string; parti?: string; fra?: string; bilde?: string; statsraad?: boolean }

export interface Kategori { id: string; navn: string; farge: string }
export interface Tema { id: string; navn: string; kategori: string; undertemaer?: { id: string; navn: string }[] }

export interface Data {
  meta: {
    oppdatert: string;
    sesjoner: string[];
    innevaerende: string;
    periode: string;
    perioder?: { id: string; navn: string; fra: string; til: string; start: string }[];
    ki: string;
    kiAndel: number;
    antall: Record<ElementType, number>;
  };
  taksonomi: { kategorier: Kategori[]; temaer: Tema[] };
  komite: { id: string; navn: string; medlemmer: string[]; roller: Record<string, string> };
  komiteNavn: Record<string, string>;
  voteringSaker?: Record<string, { tittel: string; sesjon: string; komite?: string; helse?: boolean; kategori?: string; temaer?: string[] }>;
  voteringer?: Votering[];
  kalender?: { salen: { dato: string; sakId?: number; tekst: string; henvisning?: string; komite?: string; nr?: string }[] };
  overvaking?: Overvakingsliste[];
  nyhetskilder?: Nyhetskilde[];
  hod?: { personer: HodPerson[]; kilde?: string; sistKontrollert?: string };
  personer: Record<string, Person>;
  elementer: Element[];
}

export const SPORSMAL_TYPER: ElementType[] = ['skriftlig', 'muntlig', 'interpellasjon'];

export const TYPE_NAVN: Record<ElementType, string> = {
  skriftlig: 'Skriftlig spørsmål',
  muntlig: 'Spørretime',
  interpellasjon: 'Interpellasjon',
  sak: 'Sak',
  horing: 'Høring',
  regjering: 'Regjeringen',
};

// ---------- Høringsinnspill (data/innspill.json) ----------
export interface Innspill { id: string; org: string; tittel: string; dato: string; tekst: string; lengde: number }
export interface Deltaker { org: string; tid: string; personer: string[] }
export type InnspillData = Record<string, { status?: string; innspill: Innspill[]; deltakere: Deltaker[]; utilgjengelig?: boolean }>;

// ---------- Debatter (data/debatter.json) ----------
export interface Innlegg { p?: string; navn: string; parti?: string; tid?: string; type: 'innlegg' | 'replikk'; tekst: string; lengde: number }
export interface Debattdel { type: 'sak' | 'spørretime'; sakId?: number; tittel: string; innlegg: Innlegg[]; kategori?: string; temaer?: string[]; undertemaer?: string[] }
export type DebattData = Record<string, { sesjon: string; dato?: string; tittel: string; komplett: boolean; deler: Debattdel[] }>;

export interface Overvakingsliste { id: string; navn: string; kunde?: string; beskrivelse?: string; ord: string[] }

// Nyhetsstrøm: url → artikkel (korte nøkler for å holde filen liten)
export interface Nyhet { k: string; t: string; i?: string; d: string; s?: string; p?: boolean; kat?: string; tem?: string[]; und?: string[]; se?: boolean }
export type NyhetData = Record<string, Nyhet>;
export interface Nyhetskilde { id: string; navn: string; type: 'medie' | 'etat'; status?: { ok: boolean; funnet?: number; nye?: number; feil?: string } }

// Access
export interface MetodeSak { sak?: string; ider: string[]; tittel: string; beslutning: string; status: string }
export interface ForumMote { dato: string; skannet?: boolean; dokumenter: { saksliste?: string; sakspapirer?: string; protokoll?: string }; saker?: MetodeSak[] }
export interface EmaHendelse {
  navn: string; virkestoff?: string; url?: string; omrade: string[]; innehaver?: string; atc?: string; indikasjon?: string;
  orphan?: boolean; prime?: boolean; betinget?: boolean; biotilsvarende?: boolean; generisk?: boolean; atmp?: boolean;
  type: 'opinion' | 'godkjent' | 'avslag' | 'trukket'; dato: string; status: string; nm?: string[];
}
export interface Metode { tittel: string; h: { f: 'bf' | 'bsf'; d: string; s: string; b: string; u?: string }[] }
export interface AccessData {
  oppdatert?: string; ema?: EmaHendelse[]; beslutningsforum?: ForumMote[]; bestillerforum?: ForumMote[]; metoder?: Record<string, Metode>;
}

// Marked: selskaper fra Brønnøysund, studier fra ClinicalTrials.gov
export interface Regnskap { aar: number; valuta: string; omsetning: number | null; driftsresultat: number | null; resultat: number | null }
export interface Studie { id: string; t: string; tilstand: string[]; legemiddel: string[]; status: string; ferdig?: string; norge?: boolean; norden?: boolean }
export interface Selskap {
  orgnr: string; navn: string; sektor: string; domene?: string; match?: string; sponsor?: string;
  offisieltNavn?: string; ansatte?: number | null; form?: string; bransje?: string; kommune?: string; stiftet?: string; hjemmeside?: string;
  regnskap?: Regnskap[]; omsetningNok?: number | null; logo?: string | null; studier?: Studie[];
}
export interface MarkedData { oppdatert?: string; sektorer: { id: string; navn: string; kategori: string }[]; selskaper: Selskap[] }
