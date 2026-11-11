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
    // Temaets regex dekker både temaets egne ord og alle undertemaenes ord
    temaer: taks.temaer.map((t) => ({ ...t, rx: tilRegex([...t.ord, ...(t.undertemaer || []).flatMap((u) => u.ord)], 'giu') })),
    undertemaer: taks.temaer.flatMap((t) => (t.undertemaer || []).map((u) => ({ id: u.id, tema: t.id, rx: tilRegex(u.ord, 'giu') }))),
  };
}

/** Undertemaer (nivå 3) settes alltid med nøkkelord, også når KI har valgt temaene. Bare undertemaer under elementets temaer tas med. */
export function finnUndertemaer(item, temaer, regler) {
  const tekst = `${item.tittel} ${item.ekstra || ''}`.toLowerCase();
  return regler.undertemaer
    .filter((u) => temaer.includes(u.tema))
    .map((u) => ({ id: u.id, n: (tekst.match(u.rx) || []).length }))
    .filter((u) => u.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((u) => u.id);
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
  // Store endringer: lagre ordet som utløste flagget, så det vises hvorfor saken er flagget
  const endringTreff = (['skriftlig', 'muntlig', 'interpellasjon'].includes(item.type) ? regler.storEndringSp : regler.storEndring).exec(tekst);
  return {
    kategori,
    temaer: temaer.length ? temaer : ['annet'],
    stikkord: [],
    storEndring: !!endringTreff,
    begrunnelse: endringTreff ? `Nøkkelord: «${endringTreff[0].trim().slice(0, 50)}»` : undefined,
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

// KI-klassifisering med Claude (Anthropic API). Krever ANTHROPIC_API_KEY (GitHub-secret i Actions).
// Strukturert JSON-svar via skjema, så svaret alltid kan tolkes. Avviser Claude en forespørsel,
// kjører API-et den automatisk på en reservemodell (server-side fallback).
const MODELL = process.env.KI_MODELL || 'claude-opus-5-5';

export async function kiKlassifiser(items, taks, { batch = 25, parallelt = 3, logg = console.log } = {}) {
  const ut = new Map();
  if (!process.env.ANTHROPIC_API_KEY) { logg('KI: mangler ANTHROPIC_API_KEY – bruker nøkkelord'); return ut; }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const { betaZodOutputFormat } = await import('@anthropic-ai/sdk/helpers/beta/zod');
  const { z } = await import('zod');
  const client = new Anthropic({ maxRetries: 4 });

  const temaIder = taks.temaer.map((t) => t.id).concat('annet');
  const katIder = taks.kategorier.map((k) => k.id);
  const Skjema = z.object({
    resultater: z.array(z.object({
      id: z.string(),
      relevant: z.boolean(),
      kategori: z.enum(katIder),
      temaer: z.array(z.enum(temaIder)),
      stikkord: z.array(z.string()),
      storEndring: z.boolean(),
      begrunnelse: z.string(),
    })),
  });
  const system = SYSTEM(taks).replace(/Svar KUN med JSON[^\n]*$/, 'Svar med ett resultat per sak. «begrunnelse» er tom tekst når storEndring er false.');

  const bunker = [];
  for (let i = 0; i < items.length; i += batch) bunker.push(items.slice(i, i + batch));
  let ferdig = 0, stopp = false, virket = false;

  async function kjør(del) {
    const input = del.map((x) => ({ id: x.id, type: x.typeNavn, tittel: x.tittel.slice(0, 1200), kontekst: x.kontekst || undefined }));
    const svar = await client.beta.messages.parse({
      model: MODELL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Skjema) },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], // fast systemprompt → hurtigbufres mellom bunkene
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    });
    if (svar.stop_reason === 'refusal') { logg(`KI: bunke avvist (${svar.stop_details?.category ?? 'ukjent'}) – nøkkelord brukes for disse`); return; }
    if (!svar.parsed_output) { logg(`KI: kunne ikke tolke svaret (stop_reason ${svar.stop_reason})`); return; }
    if (!virket) { virket = true; logg(`KI: Claude virker (modell ${svar.model})`); }
    for (const r of svar.parsed_output.resultater) {
      const temaer = [...new Set(r.temaer)].slice(0, 3);
      ut.set(String(r.id), {
        relevant: r.relevant, kategori: r.kategori, temaer: temaer.length ? temaer : ['annet'],
        stikkord: r.stikkord.map(String).slice(0, 3), storEndring: r.storEndring,
        begrunnelse: r.storEndring && r.begrunnelse ? r.begrunnelse.slice(0, 160) : undefined, kilde: 'ki',
      });
    }
  }

  async function arbeider() {
    while (bunker.length && !stopp) {
      const del = bunker.shift();
      try {
        await kjør(del);
      } catch (e) {
        const status = e?.status;
        logg(`KI: feil ${status ?? ''} ${String(e?.message || e).slice(0, 200)}`);
        if (status === 401 || status === 403) { stopp = true; logg('KI: nøkkelen avvises – sjekk ANTHROPIC_API_KEY'); }
      }
      ferdig += del.length;
      if (ferdig % 200 < batch) logg(`KI: ${Math.min(ferdig, items.length)}/${items.length} behandlet`);
    }
  }
  await Promise.all(Array.from({ length: parallelt }, arbeider));
  return ut;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
