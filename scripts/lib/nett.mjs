// Felles hjelpere for å hente åpne nettsider (nyhetssaker, Nye metoder, DMP, EMA).
// Vanlig nettleser-identitet: enkelte nettsteder (bl.a. LMI) avviser forespørsler uten.
const HODER = {
  'Accept-Language': 'nb-NO,nb;q=0.9,en;q=0.5',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

export async function hentTekst(url, { forsøk = 2, tidsavbrudd = 30000 } = {}) {
  for (let i = 0; i < forsøk; i++) {
    try {
      const res = await fetch(url, { headers: HODER, redirect: 'follow', signal: AbortSignal.timeout(tidsavbrudd) });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      if (i === forsøk - 1) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
}

export async function hentBuffer(url, { tidsavbrudd = 60000 } = {}) {
  const res = await fetch(url, { headers: HODER, redirect: 'follow', signal: AbortSignal.timeout(tidsavbrudd) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '' };
export const avkod = (s = '') => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
export const renTekst = (s = '') => avkod(String(s).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Tittel, ingress, dato og seksjon fra metataggene på en artikkelside. */
export function lesMeta(html) {
  const meta = (navn) => {
    const rx = new RegExp(`<meta[^>]+(?:property|name)=["']${navn}["'][^>]*>`, 'i');
    const tag = rx.exec(html)?.[0];
    return tag ? avkod(/content=["']([^"']*)["']/i.exec(tag)?.[1] || '').trim() : '';
  };
  const tittel = meta('og:title') || renTekst(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '');
  const dato = meta('article:published_time') || meta('og:published_time') || meta('date') ||
    /"datePublished"\s*:\s*"([^"]+)"/.exec(html)?.[1] || /<time[^>]+datetime=["']([^"']+)["']/i.exec(html)?.[1] || '';
  return {
    tittel, ingress: meta('og:description') || meta('description'), dato,
    seksjon: meta('article:section'),
  };
}

/** Kjører oppgaver med begrenset parallellitet. */
export async function parallell(liste, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, liste.length) }, async () => {
    while (i < liste.length) { const x = liste[i++]; await fn(x); }
  }));
}

export const isoDato = (s) => { const d = new Date(s); return isNaN(d) ? null : d.toISOString(); };
