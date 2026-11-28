// Access: tilgangsløpet for nye legemidler og metoder.
//  - EMA: åpne data om legemidler (positive opinions, godkjenninger, avslag, trukne søknader)
//  - Bestillerforum og Beslutningsforum (Nye metoder): møtearkivene og protokollene (PDF → tekst med pdftotext)
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hentTekst, hentBuffer, avkod } from './nett.mjs';

const NM = 'https://www.nyemetoder.no';
const ID_RX = /ID\d{4}_\d{3}/g;
// Økes når tolkningen av protokollene endres, så alle protokoller leses på nytt
const TOLKER = 2;

// ---------- EMA ----------
const emaDato = (s) => { const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(s || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
export async function hentEma({ fra }) {
  const res = await fetch('https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json', { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`EMA ${res.status}`);
  const { data } = await res.json();
  const ut = [];
  // Register over alle legemidler i EU (merkenavn, virkestoff, innehaver) – brukes til å finne selskapet bak metodene i Nye metoder
  const register = [];
  for (const x of data) {
    if (x.category !== 'Human') continue;
    register.push({ n: x.name_of_medicine, v: x.active_substance || x.international_non_proprietary_name_common_name, i: x.marketing_authorisation_developer_applicant_holder, s: x.medicine_status, u: x.medicine_url });
    const felles = {
      navn: x.name_of_medicine, virkestoff: x.active_substance || x.international_non_proprietary_name_common_name, url: x.medicine_url,
      omrade: (x.therapeutic_area_mesh || '').split(';').map((s) => s.trim()).filter(Boolean).slice(0, 3),
      innehaver: x.marketing_authorisation_developer_applicant_holder, atc: x.atc_code_human,
      indikasjon: String(x.therapeutic_indication || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      orphan: x.orphan_medicine === 'Yes' || undefined, prime: x.prime_priority_medicine === 'Yes' || undefined,
      betinget: x.conditional_approval === 'Yes' || undefined, biotilsvarende: x.biosimilar === 'Yes' || undefined, generisk: x.generic === 'Yes' || undefined,
      atmp: x.advanced_therapy === 'Yes' || undefined,
    };
    const hend = [
      ['opinion', emaDato(x.opinion_adopted_date)],
      ['godkjent', emaDato(x.marketing_authorisation_date)],
      ['avslag', emaDato(x.refusal_of_marketing_authorisation_date)],
      ['trukket', emaDato(x.withdrawal_of_application_date)],
    ];
    for (const [type, dato] of hend) {
      if (!dato || dato < fra) continue;
      // En positiv opinion som allerede er fulgt av godkjenning vises bare som godkjenning
      if (type === 'opinion' && (x.medicine_status !== 'Opinion')) continue;
      if (type === 'godkjent' && x.medicine_status === 'Opinion') continue;
      ut.push({ ...felles, type, dato, status: x.medicine_status });
    }
  }
  return { hendelser: ut.sort((a, b) => b.dato.localeCompare(a.dato)), register };
}

// ---------- Nye metoder: møtearkiv ----------
/** Leser møtearkivsiden og returnerer møter med dato og PDF-lenker (saksliste, sakspapirer, protokoll). */
async function moter(sti) {
  const html = await hentTekst(NM + sti);
  const main = html.slice(Math.max(0, html.indexOf('<main')));
  const tokens = /(\b\d{2}\.\d{2}\.(?:\d{4}|\d{2})\b)|<a [^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/g;
  const ut = new Map();
  let dato = null;
  for (const m of main.matchAll(tokens)) {
    if (m[1]) {
      const [d, mn, y] = m[1].split('.');
      dato = `${y.length === 2 ? '20' + y : y}-${mn}-${d}`;
      continue;
    }
    if (!dato) continue;
    const tekst = avkod(m[3].replace(/<[^>]+>/g, '')).toLowerCase();
    const url = m[2].startsWith('http') ? m[2] : NM + m[2];
    const mote = ut.get(dato) || { dato, dokumenter: {} };
    const type = /protokoll/.test(tekst + url) ? 'protokoll' : /saksliste/.test(tekst + url) ? 'saksliste' : /sakspapir/.test(tekst + url) ? 'sakspapirer' : null;
    if (type && !mote.dokumenter[type]) mote.dokumenter[type] = url;
    ut.set(dato, mote);
  }
  return [...ut.values()].sort((a, b) => b.dato.localeCompare(a.dato));
}

let pdfOk = null;
function pdfTilTekst(buf, layout = false) {
  if (pdfOk === null) { try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); pdfOk = true; } catch { pdfOk = false; } }
  if (!pdfOk) throw new Error('pdftotext mangler (installer poppler-utils)');
  const dir = mkdtempSync(join(tmpdir(), 'nm-'));
  try {
    writeFileSync(join(dir, 'f.pdf'), buf);
    return execFileSync('pdftotext', [...(layout ? ['-layout'] : []), '-enc', 'UTF-8', join(dir, 'f.pdf'), '-'], { maxBuffer: 50 * 1024 * 1024 }).toString('utf8');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const vask = (s) => s.replace(/Side \d+ av \d+/g, ' ').replace(/\bSak \d{1,3}-\d{2,4}\b[\s\S]*$/, '').replace(/-\n(?=[a-zæøå])/g, '').replace(/\s+/g, ' ').trim();

export function beslutningStatus(t) {
  const s = t.toLowerCase();
  if (/innføres ikke|ikke innføres|kan ikke innføres/.test(s)) return 'ikke-innfort';
  if (/innføres/.test(s)) return 'innfort';
  if (/utsett|sendes tilbake|ny vurdering|revurder/.test(s)) return 'utsatt';
  return 'annet';
}

/** Beslutningsforum-protokoll: én post per metode-ID med beslutningen (punkt 1) og status. */
export function parseBeslutningsforum(tekst) {
  const ut = [];
  const blokker = tekst.split(/\n\s*(?=Sak \d{1,3}\s*[-–]\s*\d{2,4}\b)/);
  for (const b of blokker) {
    const hode = /^Sak (\d{1,3}\s*[-–]\s*\d{2,4})\s+([\s\S]*?)\n\s*Beslutning:?\s*\n([\s\S]*?)(?:\n\s*Begrunnelse\b|$)/.exec(b);
    if (!hode) continue;
    const ider = [...new Set(hode[2].match(ID_RX) || [])];
    if (!ider.length) continue;
    const tittel = vask(hode[2]).replace(ID_RX, '').replace(/^[\s,:og]+/, '').trim();
    let besl = hode[3];
    const punkt = /(?:^|\n)\s*1\.\s+([\s\S]*?)(?=\n\s*2\.\s|\n\s*\n\s*\n|$)/.exec(besl);
    besl = vask(punkt ? punkt[1] : besl.replace(/Beslutning(?:ene|en) som er fattet[\s\S]*?vurderes? på nytt\.?/i, '')).slice(0, 600);
    ut.push({ sak: hode[1].replace(/\s*[–-]\s*/, '-'), ider, tittel: tittel.slice(0, 300), beslutning: besl, status: beslutningStatus(besl) });
  }
  return ut;
}

export function bestillingStatus(t) {
  const s = t.toLowerCase();
  if (/(gir|gis) ikke oppdrag|ikke gi oppdrag/.test(s)) return 'ikke-oppdrag';
  if (/utsettes|utsatt/.test(s)) return 'utsatt';
  if (/avslutt|avbestill|trekkes|utkvitter/.test(s)) return 'avsluttet';
  if (/metodevurdering.{0,40}uten.{0,20}helseøkonomisk|forenklet/.test(s)) return 'forenklet';
  if (/metodevurdering[\s\S]{0,200}gjennomføres|fullstendig metodevurdering|helseøkonomisk analyse/.test(s)) return 'full';
  if (/prisnotat|pristilbud|prisforhandling/.test(s)) return 'prisnotat';
  if (/opprettholder/.test(s)) return 'opprettholdt';
  if (/orientering/.test(s)) return 'orientering';
  return 'annet';
}

/** Bestillerforum-protokoll (tospaltet): «Metode IDxxxx_yyy Tittel … Beslutning …». */
export function parseBestillerforum(tekst) {
  const ut = [];
  const rx = /Metode\s+(ID\d{4}_\d{3})\s+([\s\S]*?)(?=\n\s*(?:Kommentar|Beslutning)\b)([\s\S]*?)\n\s*Beslutning\s*\n([\s\S]*?)(?=\n\s*\n|\n\s*Metode\s+ID|\nSak \d|$)/g;
  for (const m of tekst.matchAll(rx)) {
    const besl = vask(m[4]).slice(0, 500);
    ut.push({ ider: [m[1]], tittel: vask(m[2]).slice(0, 300), beslutning: besl, status: bestillingStatus(besl) });
  }
  if (ut.length) return ut;
  // Eldre protokoller (enspaltet): «Sak 168-24 Anmodning: IDxxxx Tittel. Til drøfting. … Beslutning …»
  for (const b of tekst.split(/\n\s*(?=Sak \d{1,3}\s*[-–]\s*\d{2,4}\b)/)) {
    const m = /^Sak (\d{1,3}\s*[-–]\s*\d{2,4})\s+([\s\S]*?)\n\s*Beslutning:?\s*\n([\s\S]*?)(?=\n\s*\n|$)/.exec(b);
    if (!m) continue;
    const ider = [...new Set(m[2].slice(0, 400).match(ID_RX) || [])];
    if (!ider.length) continue;
    const hode = vask(m[2]);
    const tittel = (/(ID\d{4}_\d{3}[\s\S]*?)(?:\.\s*Til drøfting|\.\s*Til orientering|$)/.exec(hode)?.[1] || hode).replace(ID_RX, '').replace(/^[\s,:og]+/, '');
    const besl = vask(m[3]).slice(0, 500);
    ut.push({ sak: m[1].replace(/\s*[–-]\s*/, '-'), ider, tittel: tittel.slice(0, 300), beslutning: besl, status: bestillingStatus(besl) });
  }
  return ut;
}

/**
 * Henter møter fra Bestillerforum og Beslutningsforum og tolker protokollene. Protokoller som er lest
 * før (samme URL) gjenbrukes fra cache.
 */
export async function hentNyeMetoder(cache, { fra, logg = console.log }) {
  const ut = {};
  for (const [forum, sti, parse] of [
    ['beslutningsforum', '/moter-i-beslutningsforum-for-nye-metoder/', parseBeslutningsforum],
    ['bestillerforum', '/moter-i-bestillerforum-rhf/', parseBestillerforum],
  ]) {
    let liste = [];
    try { liste = (await moter(sti)).filter((m) => m.dato >= fra); } catch (e) { logg(`Access: ${forum} møtearkiv feilet (${e.message})`); ut[forum] = cache[forum] || []; continue; }
    const gamle = new Map((cache[forum] || []).map((m) => [m.dato, m]));
    let lest = 0;
    for (const m of liste) {
      const g = gamle.get(m.dato);
      const prot = m.dokumenter.protokoll;
      if (g && g.kilde === prot && g.v === TOLKER && (g.saker?.length || g.skannet)) { m.saker = g.saker; m.kilde = g.kilde; m.v = g.v; m.skannet = g.skannet; continue; }
      if (!prot) continue;
      try {
        const tekst = pdfTilTekst(await hentBuffer(prot), forum === 'beslutningsforum');
        m.saker = parse(tekst); m.kilde = prot; m.v = TOLKER; lest++;
        if (tekst.replace(/\s/g, '').length < 300) m.skannet = true; // bilde-PDF uten tekstlag
        else delete m.skannet;
      } catch (e) { logg(`Access: kunne ikke lese protokoll ${m.dato} (${e.message.slice(0, 80)})`); }
    }
    ut[forum] = liste;
    logg(`Access: ${forum} ${liste.length} møter, ${lest} protokoller lest, ${liste.reduce((a, m) => a + (m.saker?.length || 0), 0)} metodesaker`);
  }
  return ut;
}

/** Metodeoversikt: alle hendelser per Nye metoder-ID, og kobling fra EMA-legemiddel (merkenavn) til metodene. */
export function byggMetoder(access) {
  const metoder = {};
  for (const forum of ['bestillerforum', 'beslutningsforum']) for (const m of access[forum] || []) for (const s of m.saker || []) for (const id of s.ider) {
    const x = (metoder[id] ||= { tittel: s.tittel, h: [] });
    if (forum === 'beslutningsforum' || !x.tittel) x.tittel = s.tittel;
    x.h.push({ f: forum === 'bestillerforum' ? 'bf' : 'bsf', d: m.dato, s: s.status, b: s.beslutning, u: m.dokumenter.protokoll });
  }
  for (const x of Object.values(metoder)) x.h.sort((a, b) => a.d.localeCompare(b.d));
  // Selskapet bak metoden: merkenavnet i parentes slås opp i EMAs register, ellers virkestoffet (første ord i tittelen)
  const reg = access.emaRegister || [];
  const perNavn = new Map(), perStoff = new Map();
  const aktiv = (r) => /authorised|opinion/i.test(r.s || '');
  for (const r of reg) {
    const n = String(r.n || '').toLowerCase();
    if (!perNavn.has(n) || aktiv(r)) perNavn.set(n, r);
    for (const v of String(r.v || '').toLowerCase().split(/\s*[,/;]\s*|\s+and\s+/)) if (v && !(perStoff.get(v) || []).some((x) => x.i === r.i)) perStoff.set(v, [...(perStoff.get(v) || []), r]);
  }
  const normStoff = (t) => t.toLowerCase().replace(/k(?=[aeiouy])/g, 'c').replace(/ks/g, 'x').replace(/f(?=[aeiou])/g, 'ph');
  for (const x of Object.values(metoder)) {
    const merker = [...x.tittel.matchAll(/\(([^()]{3,40})\)/g)].map((m) => m[1].toLowerCase().trim());
    let treff = merker.map((m) => perNavn.get(m)).find(Boolean);
    if (!treff) {
      const ord = (x.tittel.split(/[\s(]/)[0] || '').toLowerCase();
      const kand = perStoff.get(ord) || perStoff.get(normStoff(ord)) || [...perStoff.entries()].find(([k]) => k.startsWith(normStoff(ord)) && ord.length > 6)?.[1];
      // Bare entydige treff på virkestoff (ett selskap), ellers blir det gjetting
      if (kand && new Set(kand.filter((r) => !/generic|withdrawn/i.test(r.s || '')).map((r) => r.i)).size === 1) treff = kand.find((r) => aktiv(r)) || kand[0];
    }
    if (treff?.i) { x.selskap = treff.i; x.legemiddel = treff.n; }
  }
  access.metoder = metoder;
  const merke = (t) => [...t.matchAll(/\(([^()]{3,40})\)/g)].map((m) => m[1].toLowerCase());
  const indeks = Object.entries(metoder).map(([id, x]) => [id, merke(x.tittel)]);
  for (const e of access.ema || []) {
    const n = String(e.navn || '').toLowerCase();
    const treff = indeks.filter(([, m]) => m.includes(n)).map(([id]) => id);
    if (treff.length) e.nm = treff; else delete e.nm;
  }
  return access;
}

const MANED = { januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12 };

/**
 * Planlagte møtedatoer for Beslutningsforum fra «Tidsfrister og møtedatoer». Siden skriver dem som tekst,
 * for eksempel «Høsten 2026 er det planlagt møter i Beslutningsforum … 24. august, 21. september og 7. desember.»
 */
export async function hentMoteplan() {
  const html = await hentTekst('https://www.nyemetoder.no/om-systemet/tidsfrister-og-motedatoer/');
  const tekst = avkod(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/[\s​]+/g, ' ');
  const del = tekst.slice(tekst.search(/Møter for Beslutningsforum/i));
  const datoer = new Set();
  // Datoene har punktum («24. august»), så hver periode leses fram til neste periode eller neste avsnitt
  for (const m of del.matchAll(/(Høsten|Våren)\s+(\d{4})\s+er det planlagt møter([\s\S]*?)(?=Høsten|Våren|Møtetidspunkt|$)/gi)) {
    const aar = Number(m[2]);
    for (const d of m[3].matchAll(/(\d{1,2})\.\s+([a-zæøå]+)/gi)) {
      const mnd = MANED[d[2].toLowerCase()];
      if (mnd) datoer.add(`${aar}-${String(mnd).padStart(2, '0')}-${d[1].padStart(2, '0')}`);
    }
  }
  return { beslutningsforum: [...datoer].sort(), kilde: 'https://www.nyemetoder.no/om-systemet/tidsfrister-og-motedatoer/', hentet: new Date().toISOString() };
}
