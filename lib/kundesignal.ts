// Felles logikk for kundeprofilen og kundeoversikten: hva skjer med et selskap i Nye metoder, på kommende
// sakslister, i blåreseptsystemet hos DMP, og hvem konkurrerer i de samme terapiområdene.
import type { AccessData, BlaReseptSak, BlaReseptVurdering, MarkedData, Metode, Selskap } from './types';
import { terapiomrade } from './studier';

export const rxAv = (s?: string) => { try { return s ? new RegExp(s, 'i') : null; } catch { return null; } };

/** Merkenavn selskapet har i EUs legemiddelregister (godkjent eller positiv opinion). */
export function merkenavn(s: Selskap, acc: AccessData) {
  const rx = rxAv(s.match);
  if (!rx) return [];
  return [...new Set((acc.emaRegister || []).filter((x) => rx.test(x.i || '') && /authorised|opinion/i.test(x.s || '')).map((x) => x.n).filter((n) => n && n.length >= 4))];
}

export function selskapsMetoder(s: Selskap, acc: AccessData): [string, Metode][] {
  const rx = rxAv(s.match);
  return rx ? Object.entries(acc.metoder || {}).filter(([, m]) => m.selskap && rx.test(m.selskap)) : [];
}

export interface SakslisteTreff { dato: string; forum: 'Beslutningsforum' | 'Bestillerforum'; id: string; tittel: string; url?: string }

/** Metoder fra selskapet på sakslister til møter som ikke er holdt ennå (eller mangler protokoll). */
export function sakslisteTreff(s: Selskap, acc: AccessData, merker = merkenavn(s, acc)): SakslisteTreff[] {
  const egne = new Set(selskapsMetoder(s, acc).map(([id]) => id));
  const merkeRx = merker.length ? new RegExp(`\\((?:${merker.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\)`, 'i') : null;
  const idag = new Date().toISOString().slice(0, 10);
  const ut: SakslisteTreff[] = [];
  for (const [forum, moter] of [['Beslutningsforum', acc.beslutningsforum], ['Bestillerforum', acc.bestillerforum]] as const) {
    for (const m of moter || []) {
      if (!m.sakslisteSaker?.length || (m.dato < idag && m.saker?.length)) continue;
      for (const x of m.sakslisteSaker) {
        if (x.ider.some((id) => egne.has(id)) || (merkeRx && merkeRx.test(x.tittel))) ut.push({ dato: m.dato, forum, id: x.ider.join(', '), tittel: x.tittel, url: m.dokumenter.saksliste });
      }
    }
  }
  return ut.sort((a, b) => a.dato.localeCompare(b.dato));
}

/** Kommende møter der sakslisten er publisert (for kalenderen og oversikten). */
export function kommendeSakslister(acc: AccessData) {
  const idag = new Date().toISOString().slice(0, 10);
  return [['Beslutningsforum', acc.beslutningsforum], ['Bestillerforum', acc.bestillerforum]].flatMap(([forum, moter]) =>
    ((moter || []) as NonNullable<AccessData['beslutningsforum']>).filter((m) => m.sakslisteSaker?.length && (m.dato >= idag || !m.saker?.length)).map((m) => ({ forum: forum as string, mote: m })));
}

/** Blåreseptsaker hos DMP: pågående saker (firma oppgitt) og fullførte metodevurderinger (via merkenavn). */
export function blaresept(s: Selskap, acc: AccessData, merker = merkenavn(s, acc)): { saker: BlaReseptSak[]; vurderinger: BlaReseptVurdering[] } {
  const b = acc.blaresept;
  if (!b) return { saker: [], vurderinger: [] };
  const rx = rxAv(s.match);
  const kort = s.navn.replace(/\(.*?\)/g, '').replace(/\b(Norge|Norway|Nordic|AS|ASA)\b/gi, '').trim().toLowerCase();
  const saker = b.status.filter((x) => x.firma && ((rx && rx.test(x.firma)) || x.firma.toLowerCase().startsWith(kort)));
  const merkeSett = new Set(merker.map((m) => m.toLowerCase()));
  const produkter = new Set(saker.map((x) => x.preparat.toLowerCase()));
  const vurderinger = b.vurderinger.filter((v) => v.produkt.toLowerCase().split(/[,/]| og /).some((p) => merkeSett.has(p.trim()) || produkter.has(p.trim())));
  return { saker, vurderinger: vurderinger.sort((a, c) => (c.aar || 0) - (a.aar || 0)) };
}

export const BLA_STATUS_FORKLARING: Record<string, string> = {
  Klokkestopp: 'DMP venter på svar eller dokumentasjon fra firmaet',
  'Under behandling': 'DMP vurderer saken',
  'Forhåndsgodkjent refusjon, §2': 'Innvilget blå resept',
  'Individuell stønad §3': 'Individuell stønad',
  'Avslag folketrygden': 'Avslag på blå resept',
  Kvalitetssikring: 'Rapporten kvalitetssikres',
  'Metodevurdering ferdigstilt': 'Ferdig vurdert',
};

/** Profil per terapiområde: antall metoder i Nye metoder og fase 3-studier. */
export function omradeProfil(s: Selskap, acc: AccessData) {
  const p = new Map<string, number>();
  for (const [, m] of selskapsMetoder(s, acc)) { const o = terapiomrade(m.tittel); p.set(o, (p.get(o) || 0) + 1); }
  for (const x of s.studier || []) { const o = terapiomrade(`${x.tilstand.join(' ')} ${x.t}`); p.set(o, (p.get(o) || 0) + 1); }
  p.delete('Annet');
  return p;
}

/** Konkurrenter: selskaper i samme sektor med mest overlapp i terapiområder. */
export function konkurrenter(s: Selskap, marked: MarkedData, acc: AccessData, antall = 6) {
  const egen = omradeProfil(s, acc);
  if (!egen.size) return [];
  return marked.selskaper.filter((x) => x.nokkel !== s.nokkel && x.sektor === s.sektor).map((x) => {
    const p = omradeProfil(x, acc);
    const felles = [...egen.keys()].filter((o) => p.has(o)).map((o) => ({ omrade: o, poeng: Math.min(egen.get(o)!, p.get(o)!) })).sort((a, b) => b.poeng - a.poeng);
    return { selskap: x, poeng: felles.reduce((a, f) => a + f.poeng, 0), felles };
  }).filter((x) => x.poeng > 0).sort((a, b) => b.poeng - a.poeng).slice(0, antall);
}

/** Samme regel som tavlen i kundeprofilen: ingen beslutning (innført/ikke innført) og ikke avsluttet i Bestillerforum. */
export function underVurdering(m: Metode) {
  if (m.h.some((h) => h.f === 'bsf' && (h.s === 'innfort' || h.s === 'ikke-innfort'))) return false;
  const sisteBf = [...m.h].reverse().find((h) => h.f === 'bf');
  return !(sisteBf && ['avsluttet', 'ikke-oppdrag'].includes(sisteBf.s));
}
