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

export interface HodPerson { navn: string; rolle: string; parti?: string; fra?: string; bilde?: string; statsraad?: boolean }

export interface Kategori { id: string; navn: string; farge: string }
export interface Tema { id: string; navn: string; kategori: string }

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
