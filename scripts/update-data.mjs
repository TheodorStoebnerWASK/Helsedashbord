#!/usr/bin/env node
// Henter data fra Stortinget (data.stortinget.no) og regjeringen.no (RSS), klassifiserer og skriver data/dashboard.json.
// Bruk:  node scripts/update-data.mjs        (regelbasert klassifisering)
//        node scripts/update-data.mjs --ki   (KI via GitHub Models; krever GITHUB_TOKEN med models:read)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { lagRegler, regelKlassifiser, kiKlassifiser, hashTekst } from './lib/klassifiser.mjs';
import { hentVoteringer } from './lib/voteringer.mjs';

const ROT = new URL('..', import.meta.url).pathname;
const DATA = ROT + 'data/';
const API = 'https://data.stortinget.no/eksport';
const PERIODE = '2025-2029';
const FORSTE_SESJON = '2025-2026';
const KOMITE = 'HELSEOMS';
const HOD_MINISTER = 'HHD';
const HOD_EIER = 421; // Helse- og omsorgsdepartementet på regjeringen.no
const HELSE_EMNER = new Set([61, 188, 62, 211, 48, 65, 63, 64, 224, 66]);
const BRUK_KI = process.argv.includes('--ki');
const logg = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const taks = JSON.parse(await readFile(ROT + 'config/taksonomi.json', 'utf8'));
const regler = lagRegler(taks);
const kategoriAv = Object.fromEntries(taks.temaer.map((t) => [t.id, t.kategori]));

async function hent(url, { json = true, forsøk = 4 } = {}) {
  for (let i = 0; i < forsøk; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: json ? 'application/json' : 'application/rss+xml, application/xml' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return json ? await res.json() : await res.text();
    } catch (e) {
      if (i === forsøk - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
}
const sth = (sti) => hent(`${API}/${sti}${sti.includes('?') ? '&' : '?'}format=json`);
const dato = (s) => {
  const m = /\/Date\((-?\d+)/.exec(s || '');
  if (!m || Number(m[1]) < 0) return null;
  return new Date(Number(m[1])).toISOString();
};
const lesJson = async (f, standard) => (existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : standard);
const rens = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));
const sesjonFor = (iso) => { const d = new Date(iso); const y = d.getUTCFullYear(); return d.getUTCMonth() >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`; };

// ---------- Sesjoner ----------
const sesjonData = await sth('sesjoner');
const innevaerende = sesjonData.innevaerende_sesjon.id;
const sesjoner = sesjonData.sesjoner_liste.map((s) => s.id).filter((id) => id >= FORSTE_SESJON && id <= innevaerende).sort();
logg('Sesjoner:', sesjoner.join(', '));

// ---------- Personer ----------
const personer = {};
const leggTilPerson = (p, ekstra = {}) => {
  if (!p?.id) return;
  const fra = personer[p.id] || {};
  personer[p.id] = rens({
    ...fra,
    navn: `${p.fornavn} ${p.etternavn}`.trim(),
    parti: p.parti?.id ?? fra.parti,
    fylke: p.fylke?.navn ?? fra.fylke,
    kjonn: p.kjoenn === 1 ? 'K' : p.kjoenn === 2 ? 'M' : fra.kjonn,
    vara: p.vara_representant ?? fra.vara,
    ...ekstra,
  });
};
for (const p of (await sth(`representanter?stortingsperiodeid=${PERIODE}`)).representanter_liste) leggTilPerson(p);
const dagens = (await sth('dagensrepresentanter')).dagensrepresentanter_liste;
for (const p of dagens) leggTilPerson(p, { komiteer: (p.komiteer_liste || []).map((k) => k.id), aktiv: true, epost: p.epost });
const komiteMedlemmer = dagens.filter((p) => (p.komiteer_liste || []).some((k) => k.id === KOMITE)).map((p) => p.id);
const komiteNavn = Object.fromEntries((await sth(`komiteer?sesjonid=${innevaerende}`)).komiteer_liste.map((k) => [k.id, k.navn]));
logg(`Personer: ${Object.keys(personer).length}, komitémedlemmer: ${komiteMedlemmer.length}`);

// ---------- Rådata → kandidater ----------
const kandidater = [];
const alleSaker = new Map(); // alle saker i perioden (også ikke-helse), for voteringsmatrisen // {id, type, typeNavn, tittel, direkte, kontekst, ekstra, data}
const SP_TYPER = [
  { sti: 'skriftligesporsmal', type: 'skriftlig', navn: 'Skriftlig spørsmål', url: (q) => `https://www.stortinget.no/no/Saker-og-publikasjoner/Sporsmal/Skriftlige-sporsmal-og-svar/Skriftlig-sporsmal/?qnid=${q.id}` },
  { sti: 'sporretimesporsmal', type: 'muntlig', navn: 'Spørretimespørsmål', url: (q) => `https://www.stortinget.no/no/Saker-og-publikasjoner/Sporsmal/Sporretimesporsmal/?qnid=${q.id}` },
  { sti: 'interpellasjoner', type: 'interpellasjon', navn: 'Interpellasjon', url: (q) => `https://www.stortinget.no/no/Saker-og-publikasjoner/Sporsmal/Interpellasjoner/Interpellasjon/?qnid=${q.id}` },
];

for (const sesjon of sesjoner) {
  for (const t of SP_TYPER) {
    // status=alle gir også ubesvarte spørsmål (standard er kun besvarte)
    const liste = (await sth(`${t.sti}?sesjonid=${sesjon}&status=alle`)).sporsmal_liste || [];
    for (const q of liste) {
      leggTilPerson(q.sporsmal_fra);
      const tilHod = [q.sporsmal_til_minister_id, q.besvart_av_minister_id, q.rette_vedkommende_minister_id].includes(HOD_MINISTER);
      const tekst = q.tittel || '';
      if (!tilHod && !regler.helse.test(tekst)) continue;
      kandidater.push({
        id: `${t.type}-${q.id}`, type: t.type, typeNavn: t.navn, tittel: tekst.trim(), direkte: tilHod,
        kontekst: tilHod ? undefined : `Stilt til ${q.sporsmal_til_minister_tittel}`,
        data: rens({
          sesjon, dato: dato(q.datert_dato) || dato(q.sendt_dato), url: t.url(q), fra: q.sporsmal_fra?.id,
          til: q.sporsmal_til_minister_tittel, tilId: q.sporsmal_til_minister_id,
          besvartDato: dato(q.besvart_dato), besvartAv: q.besvart_av_minister_tittel, nr: q.sporsmal_nummer,
        }),
      });
    }
    logg(`${sesjon} ${t.navn}: ${liste.length} totalt`);
  }

  // Saker
  const saker = (await sth(`saker?sesjonid=${sesjon}`)).saker_liste || [];
  for (const s of saker) alleSaker.set(String(s.id), { id: s.id, sesjon, tittel: (s.korttittel || s.tittel || '').trim(), behandlet: s.status === 1, komite: s.komite?.id });
  const SAK_STATUS = { 1: 'Behandlet', 2: 'Til behandling', 3: 'Varslet', 5: 'Trukket/bortfalt' };
  const SAK_TYPE = { 1: 'Budsjettsak', 2: 'Alminnelig sak', 3: 'Lovsak' };
  const DOKGRUPPE = { 1: 'Proposisjon', 2: 'Melding', 4: 'Representantforslag', 5: 'Grunnlovsforslag', 6: 'Riksrevisjon/kontroll', 7: 'Innstilling', 8: 'Innberetning' };
  for (const s of saker) {
    for (const p of [...(s.forslagstiller_liste || []), ...(s.saksordfoerer_liste || [])]) leggTilPerson(p);
    const emner = (s.emne_liste || []).flatMap((e) => [e, ...(e.underemne_liste || [])]);
    const direkte = s.komite?.id === KOMITE;
    const helseEmne = emner.some((e) => HELSE_EMNER.has(e.id) || HELSE_EMNER.has(e.hovedemne_id));
    const tittel = (s.korttittel || s.tittel || '').trim();
    if (!direkte && !helseEmne && !regler.helse.test(`${tittel} ${s.tittel}`)) continue;
    kandidater.push({
      id: `sak-${s.id}`, type: 'sak', typeNavn: 'Sak i Stortinget', tittel, direkte: direkte || helseEmne,
      ekstra: `${s.tittel} ${emner.map((e) => e.navn).join(' ')}`,
      kontekst: `${DOKGRUPPE[s.dokumentgruppe] || ''} ${s.henvisning || ''} – komité: ${komiteNavn[s.komite?.id] || 'ikke fordelt'}. Full tittel: ${(s.tittel || '').slice(0, 300)}`,
      data: rens({
        sesjon, dato: dato(s.sist_oppdatert_dato), url: `https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${s.id}`,
        fullTittel: s.tittel !== s.korttittel ? s.tittel?.trim() : undefined, henvisning: s.henvisning, komite: s.komite?.id,
        status: SAK_STATUS[s.status] || String(s.status), sakType: SAK_TYPE[s.type], dokType: DOKGRUPPE[s.dokumentgruppe],
        forslagstillere: (s.forslagstiller_liste || []).map((p) => p.id), saksordforere: (s.saksordfoerer_liste || []).map((p) => p.id),
        emner: emner.map((e) => e.navn),
      }),
    });
  }
  logg(`${sesjon} saker: ${saker.length} totalt`);

  // Høringer
  const horinger = (await sth(`horinger?sesjonid=${sesjon}`)).horinger_liste || [];
  const helseSaker = new Set(kandidater.filter((k) => k.type === 'sak').map((k) => k.id));
  for (const h of horinger) {
    const sakerH = (h.horing_sak_info_liste || []).map((x) => ({ id: x.sak_id, tittel: (x.sak_korttittel || x.sak_tittel || '').trim(), henvisning: x.sak_henvisning }));
    const tittel = sakerH.map((x) => x.tittel).join(' / ') || 'Høring';
    const direkte = h.komite?.id === KOMITE || sakerH.some((x) => helseSaker.has(`sak-${x.id}`) && kandidater.find((k) => k.id === `sak-${x.id}`)?.direkte);
    if (!direkte && !regler.helse.test(tittel)) continue;
    const tider = (h.horingstidspunkt_liste || []).map((t) => rens({ tid: dato(t.tidspunkt), sted: t.sted })).filter((t) => t.tid);
    kandidater.push({
      id: `horing-${h.id}`, type: 'horing', typeNavn: 'Høring i Stortinget', tittel, direkte,
      kontekst: `Høring i ${komiteNavn[h.komite?.id] || 'komité'}`,
      data: rens({
        sesjon, dato: tider[0]?.tid || dato(h.start_dato) || dato(h.innspillsfrist), url: `https://www.stortinget.no/no/Hva-skjer-pa-Stortinget/Horing/?h=${h.id}`,
        komite: h.komite?.id, horingStatus: h.horing_status, skriftlig: h.skriftlig || undefined, frist: dato(h.innspillsfrist),
        tider, saker: sakerH.map((x) => x.id),
      }),
    });
  }
  logg(`${sesjon} høringer: ${horinger.length} totalt`);
}

// ---------- Regjeringen (HOD) – RSS akkumuleres i arkiv fordi feeden bare viser de siste ~100 ---------
const arkivFil = DATA + 'regjeringen-arkiv.json';
const arkiv = await lesJson(arkivFil, {});
const xml = new XMLParser({ ignoreAttributes: true });
const DOKTYPER = [
  [/^høring|^høyring/i, 'Høring'], [/^nou\b/i, 'NOU'], [/^prop\./i, 'Proposisjon'], [/^meld\. st/i, 'Stortingsmelding'],
  [/strategi|handlingsplan|opptrappingsplan|\bplan\b/i, 'Strategi/plan'], [/forskrift/i, 'Forskrift'], [/rapport|evaluering|utredning/i, 'Rapport'],
  [/^presseinvitasjon/i, 'Presseinvitasjon'],
];
for (const [feed, standardType] of [['aktuelt/nyheter', 'Nyhet'], ['dokumenter', 'Dokument']]) {
  try {
    const tekst = await hent(`https://www.regjeringen.no/no/rss/Rss/2581966/?documentType=${feed}&owner=${HOD_EIER}`, { json: false });
    let items = xml.parse(tekst.replace(/^﻿/, '')).rss?.channel?.item || [];
    if (!Array.isArray(items)) items = [items];
    for (const it of items) {
      const tittel = String(it.title || '').trim();
      const type = DOKTYPER.find(([rx]) => rx.test(tittel))?.[1] || standardType;
      arkiv[String(it.guid)] = rens({
        tittel, beskrivelse: String(it.description || '').trim().slice(0, 400), lenke: String(it.link || '').replace(/\?utm_.*$/, ''),
        dato: new Date(it.pubDate).toISOString(), type, feed: standardType,
      });
    }
    logg(`Regjeringen ${feed}: ${items.length} elementer`);
  } catch (e) {
    logg(`ADVARSEL: kunne ikke hente regjeringen ${feed}: ${e.message}`);
  }
}
await mkdir(DATA, { recursive: true });
await writeFile(arkivFil, JSON.stringify(arkiv, null, 1));
const periodeStart = '2025-10-01';
for (const [guid, r] of Object.entries(arkiv)) {
  if (r.dato < periodeStart) continue;
  kandidater.push({
    id: `regjering-${guid}`, type: 'regjering', typeNavn: `Regjeringen: ${r.type}`, tittel: r.tittel, direkte: true,
    ekstra: r.beskrivelse, kontekst: r.beskrivelse,
    data: rens({ sesjon: sesjonFor(r.dato), dato: r.dato, url: r.lenke, dokType: r.type, beskrivelse: r.beskrivelse }),
  });
}

// Saker/høringer kan dukke opp i flere sesjoner – behold siste versjon
{
  const unike = new Map();
  for (const k of kandidater) unike.set(k.id, k);
  kandidater.length = 0;
  kandidater.push(...unike.values());
}

// ---------- Klassifisering ----------
const cacheFil = DATA + 'klassifisering.json';
const cache = await lesJson(cacheFil, {});
const trengerKi = [];
for (const k of kandidater) {
  const h = hashTekst(k.tittel + (k.kontekst || ''));
  const c = cache[k.id];
  if (!c || c.h !== h) cache[k.id] = { ...regelKlassifiser(k, regler, kategoriAv), h };
  if (BRUK_KI && cache[k.id].kilde !== 'ki') trengerKi.push(k);
}
let kiStatus = BRUK_KI ? 'ikke kjørt' : 'av';
if (BRUK_KI && trengerKi.length) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_MODELS_TOKEN;
  if (!token) logg('KI: mangler GITHUB_TOKEN – bruker regelbasert klassifisering');
  else {
    trengerKi.sort((a, b) => (b.direkte - a.direkte) || String(b.data.dato).localeCompare(String(a.data.dato)));
    logg(`KI: ${trengerKi.length} saker skal klassifiseres`);
    // KI-feil skal aldri stoppe datahentingen – da brukes nøkkelordreglene til neste kjøring
    const res = await kiKlassifiser(trengerKi, taks, { token, modell: process.env.KI_MODELL || 'openai/gpt-4.1-mini', logg })
      .catch((e) => { logg(`KI: feilet (${e.message}) – bruker nøkkelord`); return new Map(); });
    for (const [id, r] of res) {
      const k = kandidater.find((x) => x.id === id);
      if (k) cache[id] = { ...r, relevant: k.direkte || r.relevant, h: cache[id].h };
    }
    kiStatus = `${res.size} klassifisert med KI denne kjøringen`;
  }
}
// Rydd cache for elementer som ikke finnes lenger
for (const id of Object.keys(cache)) if (!kandidater.some((k) => k.id === id)) delete cache[id];
await writeFile(cacheFil, JSON.stringify(cache, null, 0));

// ---------- Bygg dashboard.json ----------
const elementer = kandidater
  .filter((k) => k.direkte || cache[k.id].relevant)
  .map((k) => {
    const c = cache[k.id];
    return rens({
      id: k.id, type: k.type, tittel: k.tittel, ...k.data, direkte: k.direkte || undefined,
      kategori: c.kategori, temaer: c.temaer, stikkord: c.stikkord, storEndring: c.storEndring || undefined,
      begrunnelse: c.begrunnelse, kilde: c.kilde,
    });
  })
  .sort((a, b) => String(b.dato).localeCompare(String(a.dato)));

// Ta kun med personer som er relevante (komité, aktive eller nevnt i data)
const nevnt = new Set(komiteMedlemmer);
for (const e of elementer) for (const id of [e.fra, ...(e.forslagstillere || []), ...(e.saksordforere || [])]) if (id) nevnt.add(id);
const personerUt = Object.fromEntries(Object.entries(personer).filter(([id, p]) => nevnt.has(id) || p.aktiv));

// ---------- Voteringer (alle ferdigbehandlede saker i perioden) ----------
const voteringFil = DATA + 'voteringer.json';
const voteringCache = await lesJson(voteringFil, {});
try {
  await hentVoteringer([...alleSaker.values()].filter((s) => s.behandlet), voteringCache, { sth, logg });
} catch (e) {
  logg(`ADVARSEL: voteringer feilet (${e.message})`);
}
await writeFile(voteringFil, JSON.stringify(voteringCache));
const helseSakId = new Map(elementer.filter((e) => e.type === 'sak').map((e) => [e.id.replace('sak-', ''), e]));
const voteringSaker = {};
const voteringer = [];
for (const [sakId, { v }] of Object.entries(voteringCache)) {
  const sak = alleSaker.get(sakId);
  if (!sak || !v?.length) continue;
  const h = helseSakId.get(sakId);
  voteringSaker[sakId] = rens({ tittel: sak.tittel, sesjon: sak.sesjon, komite: sak.komite, helse: h ? true : undefined, kategori: h?.kategori, temaer: h?.temaer });
  for (const x of v) voteringer.push(rens({ s: Number(sakId), id: x.id, t: x.tid, ty: x.type, tema: x.tema, p: x.p }));
}
logg(`Voteringer: ${voteringer.length} personlige voteringer i ${Object.keys(voteringSaker).length} saker (${Object.values(voteringSaker).filter((s) => s.helse).length} helsesaker)`);

const roller = await lesJson(ROT + 'config/komite-roller.json', {});
const hod = await lesJson(ROT + 'config/hod-ledelse.json', { personer: [] });
// Ta bare med bilder som faktisk finnes i public/hod/
for (const p of hod.personer) if (p.bilde && !existsSync(ROT + 'public/hod/' + p.bilde)) delete p.bilde;
const ut = {
  meta: {
    oppdatert: new Date().toISOString(), sesjoner, innevaerende, periode: PERIODE,
    ki: kiStatus, kiAndel: elementer.length ? elementer.filter((e) => e.kilde === 'ki').length / elementer.length : 0,
    antall: Object.fromEntries(['skriftlig', 'muntlig', 'interpellasjon', 'sak', 'horing', 'regjering'].map((t) => [t, elementer.filter((e) => e.type === t).length])),
  },
  taksonomi: { kategorier: taks.kategorier, temaer: taks.temaer.map(({ id, navn, kategori }) => ({ id, navn, kategori })).concat({ id: 'annet', navn: 'Annet', kategori: 'regulering' }) },
  komite: { id: KOMITE, navn: komiteNavn[KOMITE], medlemmer: komiteMedlemmer, roller: roller.roller || {} },
  komiteNavn,
  voteringSaker,
  voteringer,
  hod: { personer: hod.personer, kilde: hod.kilde, sistKontrollert: hod.sistKontrollert },
  personer: personerUt,
  elementer,
};
await writeFile(DATA + 'dashboard.json', JSON.stringify(ut));
logg(`Ferdig: ${elementer.length} elementer`, ut.meta.antall, `KI: ${kiStatus}`);
