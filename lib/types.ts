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
    ki: string;
    kiAndel: number;
    antall: Record<ElementType, number>;
  };
  taksonomi: { kategorier: Kategori[]; temaer: Tema[] };
  komite: { id: string; navn: string; medlemmer: string[]; roller: Record<string, string> };
  komiteNavn: Record<string, string>;
  voteringSaker?: Record<string, { tittel: string; sesjon: string; komite?: string; helse?: boolean; kategori?: string; temaer?: string[] }>;
  voteringer?: Votering[];
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
