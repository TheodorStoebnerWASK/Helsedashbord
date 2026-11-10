// Klassifisering av saker: regelbasert (alltid) + KI via GitHub Models (gratis i GitHub Actions).
import { createHash } from 'node:crypto';

// JavaScripts \b forstår ikke æ/ø/å, så vi bruker en Unicode-bevisst ordgrense.
const GRENSE = '(?:(?<![\\p{L}\\d])(?=[\\p{L}\\d])|(?<=[\\p{L}\\d])(?![\\p{L}\\d]))';
const tilRegex = (ord, flagg) =>
  new RegExp(
    ord.map((o) => (o.startsWith('*') ? o.slice(1) : o.startsWith('\\b') ? o : '\\b' + o).replaceAll('\\b', GRENSE)).join('|'),
    flagg,
  ); // «*ord» = treff også inni sammensatte ord (f.eks. *sykehus → Finnmarkssykehuset)

export function lagRegler(taks) {
  return {
    helse: tilRegex(taks.helseord, 'iu'),
    storEndring: tilRegex(taks.storEndring.ord, 'iu'),
    storEndringSp: tilRegex(taks.storEndring.sporsmalOrd || taks.storEndring.ord, 'iu'),
    temaer: taks.temaer.map((t) => ({ ...t, rx: tilRegex(t.ord, 'giu') })),
  };
}

export const hashTekst = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/** Regelbasert klassifisering – brukes som utgangspunkt og som reserve hvis KI ikke er tilgjengelig. */
export function regelKlassifiser(item, regler, kategoriAv) {
  const tekst = `${item.tittel} ${item.ekstra || ''}`.toLowerCase();
  const treff = regler.temaer
    .map((t) => ({ id: t.id, n: (tekst.match(t.rx) || []).length }))
    .filter((t) => t.n > 0)
    .sort((a, b) => b.n - a.n);
  // Spesifikke temaer (legemidler/medtek/digital) vinner over generelle regulerings-temaer ved likt antall treff
  const prioritet = (id) => (kategoriAv[id] === 'regulering' ? 0 : 1);
  treff.sort((a, b) => b.n - a.n || prioritet(b.id) - prioritet(a.id));
  const temaer = treff.slice(0, 3).map((t) => t.id);
  const tema = temaer[0] || null;
  let kategori = tema ? kategoriAv[tema] : 'regulering';
  const spesifikk = treff.find((t) => kategoriAv[t.id] !== 'regulering');
  if (spesifikk) kategori = kategoriAv[spesifikk.id];
  return {
    kategori,
    temaer: temaer.length ? temaer : ['annet'],
    stikkord: [],
    storEndring: (['skriftlig', 'muntlig', 'interpellasjon'].includes(item.type) ? regler.storEndringSp : regler.storEndring).test(tekst),
    relevant: item.direkte || regler.helse.test(tekst),
    kilde: 'regel',
  };
}

const SYSTEM = (taks) => `Du er en erfaren helsepolitisk rådgiver i et norsk kommunikasjonsbyrå. Du klassifiserer saker fra Stortinget og regjeringen.
For HVER sak, returner:
- "id": samme id som input
- "relevant": true hvis saken handler om helse- og omsorgspolitikk, helsetjenester, legemidler, medisinsk utstyr, folkehelse eller helsenæring (ellers false)
- "kategori": én av ${taks.kategorier.map((k) => `"${k.id}" (${k.navn})`).join(', ')}. Velg legemidler/medtek/digital når saken primært handler om det; ellers "regulering" (som dekker helsetjenester, organisering, finansiering, lov og politikk generelt).
- "temaer": 1–3 tema-id-er fra listen, mest relevant først: ${taks.temaer.map((t) => `"${t.id}" (${t.navn})`).join(', ')}, eller "annet"
- "stikkord": 1–3 korte, konkrete stikkord på norsk (f.eks. "pollenvarsling", "fødeavdeling Kristiansund", "CAR-T")
- "storEndring": true KUN hvis saken gjelder eller varsler en omfattende endring i regelverk, finansiering, prioriteringer eller struktur (f.eks. lovendringer, nye forskrifter, endrede terskelverdier for legemidler, reformer, nedleggelser, nye finansieringsmodeller). Vanlige enkeltspørsmål om enkeltpasienter eller lokale forhold er false.
- "begrunnelse": maks 15 ord, kun hvis storEndring er true
Svar KUN med JSON: {"resultater": [ ... ]}`;

/** Klassifiserer en liste saker med GitHub Models. Returnerer map id -> resultat. Stopper rolig ved rate limit. */
export async function kiKlassifiser(items, taks, { token, modell, maksForesporsler = 120, batch = 20, logg = console.log }) {
  const ut = new Map();
  const gyldigeTemaer = new Set(taks.temaer.map((t) => t.id).concat('annet'));
  const gyldigeKat = new Set(taks.kategorier.map((k) => k.id));
  let forespørsler = 0;
  let feilPaRad = 0;
  for (let i = 0; i < items.length; i += batch) {
    if (forespørsler >= maksForesporsler) { logg(`KI: nådde maks ${maksForesporsler} forespørsler – resten tas neste kjøring`); break; }
    const del = items.slice(i, i + batch);
    const input = del.map((x) => ({ id: x.id, type: x.typeNavn, tittel: x.tittel.slice(0, 600), kontekst: x.kontekst || undefined }));
    let svar;
    for (let forsøk = 0; forsøk < 3; forsøk++) {
      forespørsler++;
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          model: modell,
          temperature: 0,
          // Noen modeller/versjoner avviser response_format – andre forsøk sendes uten
          ...(forsøk === 0 ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: SYSTEM(taks) },
            { role: 'user', content: JSON.stringify(input) },
          ],
        }),
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
      const tekst = await res.text();
      if (res.ok) {
        try { svar = JSON.parse(tekst); break; } catch {
          logg(`KI: uventet svar (ikke JSON, status ${res.status}): ${tekst.slice(0, 200).replace(/\s+/g, ' ')}`);
          await sleep(3000);
          continue;
        }
      }
      if (res.status === 429) {
        const vent = Number(res.headers?.get?.('retry-after') || 0);
        if (vent > 0 && vent < 90) { logg(`KI: rate limit, venter ${vent}s`); await sleep(vent * 1000); continue; }
        logg('KI: dagskvoten er brukt opp – fortsetter neste kjøring'); return ut;
      }
      logg(`KI: feil ${res.status}: ${tekst.slice(0, 200)}`);
      if (res.status === 401 || res.status === 403) return ut;
      await sleep(5000);
    }
    if (!svar) {
      if (++feilPaRad >= 3) { logg('KI: tre mislykkede forsøk på rad – bruker nøkkelord resten av denne kjøringen'); return ut; }
      continue;
    }
    feilPaRad = 0;
    try {
      const innhold = JSON.parse(svar.choices[0].message.content);
      for (const r of innhold.resultater || []) {
        if (!r || r.id == null) continue;
        const temaer = (r.temaer || []).filter((t) => gyldigeTemaer.has(t)).slice(0, 3);
        ut.set(String(r.id), {
          relevant: !!r.relevant,
          kategori: gyldigeKat.has(r.kategori) ? r.kategori : 'regulering',
          temaer: temaer.length ? temaer : ['annet'],
          stikkord: (r.stikkord || []).map(String).slice(0, 3),
          storEndring: !!r.storEndring,
          begrunnelse: r.storEndring ? String(r.begrunnelse || '').slice(0, 140) : undefined,
          kilde: 'ki',
        });
      }
    } catch (e) {
      logg('KI: kunne ikke tolke svar: ' + e.message);
    }
    logg(`KI: ${Math.min(i + batch, items.length)}/${items.length} klassifisert`);
    await sleep(4500); // gratisnivået tillater ca. 15 forespørsler i minuttet
  }
  return ut;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
