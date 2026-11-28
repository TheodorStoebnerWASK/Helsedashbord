// Nyhetsstrøm fra helsefaglige medier og etater. Ingen av kildene har en vanlig, åpen RSS-feed vi når,
// så vi finner nye artikkellenker (sitemap eller forsiden/seksjonssidene) og leser metataggene på hver
// artikkel: tittel, ingress og publiseringstidspunkt. Det er det samme som vises når en lenke deles.
// Selve artikkelteksten hentes ikke (mange saker er bak betalingsmur).
import { XMLParser } from 'fast-xml-parser';
import { hentTekst, lesMeta, parallell, isoDato, renTekst } from './nett.mjs';

const xml = new XMLParser({ ignoreAttributes: true });

export const KILDER = [
  {
    id: 'dagensmedisin', navn: 'Dagens Medisin', type: 'medie',
    // Sitemapet lister de nyeste artiklene først, med tidspunkt for siste endring
    finn: async () => {
      const t = await hentTekst('https://www.dagensmedisin.no/sitemap.xml');
      return [...t.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({ url: m[1], endret: m[2] }));
    },
  },
  {
    id: 'medwatch', navn: 'Medwatch', type: 'medie',
    finn: async () => {
      const sider = ['/', '/latest', '/nyheter/legemidler_biotek', '/nyheter/ehelse', '/nyheter/medtek_lab', '/nyheter/regulering_politikk', '/nyheter/debatt', '/nyheter/karriere_arbeidsliv'];
      return lenkerFraSider('https://medwatch.no', sider, /href="(\/nyheter\/[a-z_]+\/article\d+\.ece)"/g);
    },
  },
  {
    id: 'healthtalk', navn: 'HealthTalk', type: 'medie',
    // Sitemapet har alle artikler med tidspunkt for siste endring (ingen RSS)
    finn: () => fraSitemap('https://www.healthtalk.no/sitemap.xml', /^https:\/\/www\.healthtalk\.no\/[a-z0-9-]+\/[a-z0-9-]{15,}\/\d+$/),
  },
  {
    id: 'dmp', navn: 'DMP', type: 'etat',
    finn: () => lenkerFraSider('https://www.dmp.no', ['/', '/nyheter', '/offentlig-finansiering'], /href="(\/(?:[a-z0-9-]+\/)*nyheter\/[A-Za-z0-9.-]{8,})"/g),
  },
  {
    id: 'sykehusinnkjop', navn: 'Sykehusinnkjøp', type: 'etat',
    // Nyhetssidene lastes med JavaScript, men sitemapet lister alle saker under /nyheter/
    finn: () => fraSitemap('https://www.sykehusinnkjop.no/sitemap.xml', /^https:\/\/www\.sykehusinnkjop\.no\/nyheter\/(?:[a-z0-9-]+\/)?[a-z0-9-]{12,}\/$/),
  },
  {
    id: 'nyemetoder', navn: 'Nye metoder', type: 'etat',
    // Aktuelt-siden lastes med JavaScript; sitemapet har alle sakene
    finn: () => fraSitemap('https://www.nyemetoder.no/sitemap.xml', /^https:\/\/www\.nyemetoder\.no\/aktuelt\/[a-z0-9-]{8,}\/$/),
  },
  {
    id: 'ema', navn: 'EMA', type: 'etat',
    finn: async () => rssItems(await hentTekst('https://www.ema.europa.eu/en/news.xml')),
  },
];

/** Artikler fra et sitemap, nyest endret først. */
async function fraSitemap(url, filter) {
  const t = await hentTekst(url);
  return [...t.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => ({ url: (/<loc>([^<]+)<\/loc>/.exec(m[1])?.[1] || '').trim(), endret: /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1] || '' }))
    .filter((x) => filter.test(x.url))
    .sort((a, b) => b.endret.localeCompare(a.endret));
}

function rssItems(tekst) {
  let items = xml.parse(tekst.replace(/^﻿/, '')).rss?.channel?.item || [];
  if (!Array.isArray(items)) items = [items];
  return items.map((it) => ({
    url: String(it.link || '').trim(), meta: { tittel: renTekst(it.title), ingress: renTekst(it.description).slice(0, 400), dato: it.pubDate || it['dc:date'] || '' },
  })).filter((x) => x.url);
}

async function lenkerFraSider(base, sider, rx) {
  const sett = new Map();
  for (const s of sider) {
    try {
      const html = await hentTekst(base + s, { forsøk: 1 });
      for (const m of html.matchAll(rx)) {
        const url = m[1].startsWith('http') ? m[1] : base + m[1];
        sett.set(url.replace(/\/$/, ''), { url: url.replace(/\/$/, '') });
      }
    } catch { /* en side kan mangle – bruk de andre */ }
  }
  return [...sett.values()];
}

/**
 * Oppdaterer cache (url → artikkel) med nye artikler fra alle kilder.
 * maksPerKilde begrenser antall artikkelsider som leses per kjøring, så første kjøring ikke tar for lang tid.
 */
export async function hentNyheter(cache, { logg = console.log, dager = 180, maksPerKilde = 250, klassifiser } = {}) {
  const grense = new Date(Date.now() - dager * 86400000).toISOString();
  const status = {};
  for (const k of KILDER) {
    let funnet = [];
    try { funnet = await k.finn(); } catch (e) { status[k.id] = { ok: false, feil: e.message.slice(0, 120) }; logg(`Nyheter ${k.navn}: kunne ikke hentes (${e.message.slice(0, 80)})`); continue; }
    const nye = funnet.filter((f) => !cache[f.url] && (!f.endret || f.endret >= grense)).slice(0, maksPerKilde);
    let lagt = 0;
    await parallell(nye, 4, async (f) => {
      try {
        const m = f.meta?.tittel ? f.meta : lesMeta(await hentTekst(f.url, { forsøk: 1 }));
        let tittel = (m.tittel || '').replace(/\s*[|–-]\s*(Dagens Medisin|MedWatch|HealthTalk|DMP)$/i, '').trim();
        const pluss = /^\(\+\)\s*/.test(tittel);
        tittel = tittel.replace(/^\(\+\)\s*/, '');
        const dato = isoDato(m.dato) || isoDato(f.endret);
        if (!tittel || !dato) return;
        cache[f.url] = { k: k.id, t: tittel, i: (m.ingress || '').slice(0, 400), d: dato, s: m.seksjon || undefined, p: pluss || undefined };
        lagt++;
      } catch { /* hopp over enkeltartikler som feiler */ }
    });
    status[k.id] = { ok: true, funnet: funnet.length, nye: lagt };
    logg(`Nyheter ${k.navn}: ${funnet.length} lenker, ${lagt} nye artikler`);
  }
  for (const [url, a] of Object.entries(cache)) if (a.d < grense) delete cache[url];
  if (klassifiser) for (const a of Object.values(cache)) Object.assign(a, klassifiser(a));
  return status;
}
