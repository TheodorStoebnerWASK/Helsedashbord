import type { Data, Element } from './types';

export const sesjonKort = (s: string) => s.replace(/^20(\d\d)-20(\d\d)$/, '$1–$2');

/** Dager siden sesjonsstart (1. oktober) – brukes for «samme periode»-sammenligning. */
export function dagISesjon(iso: string) {
  const d = new Date(iso);
  const start = new Date(Date.UTC(d.getUTCMonth() >= 9 ? d.getUTCFullYear() : d.getUTCFullYear() - 1, 9, 1));
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export function telle<T extends string>(liste: Element[], nokkel: (e: Element) => T | T[] | undefined | null) {
  const m = new Map<T, number>();
  for (const e of liste) {
    const k = nokkel(e);
    for (const x of Array.isArray(k) ? k : k ? [k] : []) m.set(x, (m.get(x) || 0) + 1);
  }
  return m;
}

export const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
export const mndNokkel = (iso: string) => iso.slice(0, 7);
export const mndNavn = (k: string) => `${MND[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;

/** Alle måneder fra periodestart til i dag. */
export function maneder(fra = '2025-10', til = new Date().toISOString().slice(0, 7)) {
  const ut: string[] = [];
  let [y, m] = fra.split('-').map(Number);
  const [ty, tm] = til.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    ut.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return ut;
}

/** ISO-ukenummer-nøkkel for ukentlige serier. */
export function ukeNokkel(iso: string) {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  const aar = t.getUTCFullYear();
  const uke = Math.ceil(((t.getTime() - Date.UTC(aar, 0, 1)) / 86400000 + 1) / 7);
  return `${aar}-U${String(uke).padStart(2, '0')}`;
}

const TZ = 'Europe/Oslo';
export const datoKort = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '';
/** Dato med klokkeslett (norsk tid). Stortinget bruker 23:59/00:00 når klokkeslett ikke er satt – da vises bare dato. */
export const datoTid = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const kl = d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const dag = d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
  return kl === '23:59' || kl === '00:00' ? dag : `${dag} kl. ${kl}`;
};

export const dagerSiden = (iso?: string) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity);

export function sok(liste: Element[], q: string, data: Data) {
  const ord = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!ord.length) return liste;
  return liste.filter((e) => {
    const tekst = [
      e.tittel, e.fullTittel, e.henvisning, e.beskrivelse, ...(e.stikkord || []), e.til,
      e.fra && data.personer[e.fra]?.navn,
    ].filter(Boolean).join(' ').toLowerCase();
    return ord.every((o) => tekst.includes(o));
  });
}
