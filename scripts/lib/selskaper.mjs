// Marked: selskaper per sektor med tall fra Brønnøysundregistrene (Enhetsregisteret og Regnskapsregisteret),
// logo fra selskapets nettsted og fase 3-studier fra ClinicalTrials.gov.
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { hentTekst, parallell } from './nett.mjs';

const BRREG = 'https://data.brreg.no';
// Omtrentlige kurser for å kunne sortere selskaper som rapporterer i utenlandsk valuta (vises med opprinnelig valuta)
const KURS = { NOK: 1, EUR: 11.6, USD: 10.6, SEK: 1.0, DKK: 1.55, GBP: 13.6, CHF: 12.4 };

async function json(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function lesRegnskap(r) {
  const res = r.resultatregnskapResultat || {};
  const drift = res.driftsresultat || {};
  return {
    aar: Number(r.regnskapsperiode?.tilDato?.slice(0, 4)), valuta: r.valuta || 'NOK',
    omsetning: drift.driftsinntekter?.sumDriftsinntekter ?? null,
    driftsresultat: drift.driftsresultat ?? null,
    resultat: res.aarsresultat ?? null,
    lonn: drift.driftskostnad?.loennskostnad ?? null,
  };
}

async function hentLogo(s, dir, logg) {
  const domene = s.domene;
  if (!domene) return null;
  const fil = (ext) => `${dir}/${s.nokkel}.${ext}`;
  for (const ext of ['svg', 'png', 'ico']) if (existsSync(fil(ext))) return `/logo/${s.nokkel}.${ext}`;
  try {
    const base = `https://${domene.startsWith('www.') ? domene : 'www.' + domene}`;
    const html = await hentTekst(base, { forsøk: 1, tidsavbrudd: 15000 });
    // Foretrekk apple-touch-icon (høy oppløsning), så ikon i størst mulig størrelse
    const lenker = [...html.matchAll(/<link[^>]+rel=["']([^"']*icon[^"']*)["'][^>]*>/gi)].map((m) => {
      const href = /href=["']([^"']+)["']/i.exec(m[0])?.[1];
      const str = Number(/sizes=["'](\d+)/i.exec(m[0])?.[1] || (/apple/i.test(m[1]) ? 180 : 32));
      return href ? { href: new URL(href, base).href, str, apple: /apple/i.test(m[1]) } : null;
    }).filter(Boolean).sort((a, b) => b.str - a.str);
    const kandidater = [...lenker.map((l) => l.href), `${base}/favicon.ico`];
    for (const url of kandidater) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) continue;
        const type = res.headers.get('content-type') || '';
        const ext = /svg/.test(type) || url.endsWith('.svg') ? 'svg' : /png/.test(type) || url.endsWith('.png') ? 'png' : /icon|ico/.test(type) || url.endsWith('.ico') ? 'ico' : null;
        if (!ext) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 100 || buf.length > 500000) continue;
        writeFileSync(fil(ext), buf);
        return `/logo/${s.nokkel}.${ext}`;
      } catch { /* prøv neste */ }
    }
  } catch (e) { logg?.(`Logo ${s.navn}: ${e.message.slice(0, 60)}`); }
  return null;
}


/**
 * Logoer fra LMIs medlemsside (ekte logoer, bedre enn nettstedenes små ikoner). Siden leses som HTML: hvert bilde
 * matches mot selskapene på alt-tekst, tittel, filnavn og lenken rundt bildet. Returnerer nokkel → lokal sti.
 */
export async function hentLmiLogoer(selskaper, dir, logg) {
  const ut = new Map();
  let html;
  try { html = await hentTekst('https://www.lmi.no/lmi/om-legemiddelindustrien/medlemmer/', { forsøk: 2 }); }
  catch (e) { logg?.(`LMI-logoer: siden kunne ikke hentes (${e.message.slice(0, 60)})`); return ut; }
  const base = 'https://www.lmi.no';
  // Ta med lenken rundt bildet (ofte selskapets nettsted) som ekstra matchgrunnlag
  const bilder = [...html.matchAll(/(?:<a[^>]+href=["']([^"']+)["'][^>]*>\s*)?<img[^>]+>/gi)].map((m) => {
    const tag = m[0];
    const src = /(?:data-src|src)=["']([^"']+)["']/i.exec(tag.slice(tag.lastIndexOf('<img')))?.[1];
    const alt = /alt=["']([^"']*)["']/i.exec(tag)?.[1] || '';
    const tittel = /title=["']([^"']*)["']/i.exec(tag)?.[1] || '';
    return src ? { src: new URL(src, base).href, tekst: `${alt} ${tittel} ${decodeURIComponent(src.split('/').pop() || '').replace(/[-_]/g, ' ')} ${m[1] || ''}`.toLowerCase() } : null;
  }).filter((b) => b && !/logo-lmi|lmi_logo|icon|sprite/i.test(b.src));
  for (const s of selskaper) {
    if (!s.match) continue;
    let rx; try { rx = new RegExp(s.match, 'i'); } catch { continue; }
    const domene = (s.domene || '').split('.')[0];
    const b = bilder.find((x) => rx.test(x.tekst) || (domene.length > 3 && x.tekst.includes(domene)));
    if (!b) continue;
    try {
      const res = await fetch(b.src, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      const type = res.headers.get('content-type') || '';
      const ext = /svg/.test(type) ? 'svg' : /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : /jpe?g/.test(type) ? 'jpg' : null;
      if (!ext) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200) continue;
      writeFileSync(`${dir}/${s.nokkel}-lmi.${ext}`, buf);
      ut.set(s.nokkel, `/logo/${s.nokkel}-lmi.${ext}`);
    } catch { /* hopp over */ }
  }
  logg?.(`LMI-logoer: ${bilder.length} bilder på siden, ${ut.size} koblet til selskaper`);
  return ut;
}

async function hentStudier(sponsor) {
  const q = new URLSearchParams({
    'query.spons': sponsor, 'filter.overallStatus': 'RECRUITING,ACTIVE_NOT_RECRUITING,NOT_YET_RECRUITING,ENROLLING_BY_INVITATION',
    'query.term': 'AREA[Phase]PHASE3', pageSize: '200', countTotal: 'true',
    fields: 'NCTId,BriefTitle,Condition,InterventionName,OverallStatus,PrimaryCompletionDate,LeadSponsorName,LocationCountry',
  });
  const d = await json(`https://clinicaltrials.gov/api/v2/studies?${q}`);
  const studier = (d?.studies || []).map((x) => {
    const p = x.protocolSection;
    const land = new Set((p.contactsLocationsModule?.locations || []).map((l) => l.country));
    return {
      id: p.identificationModule.nctId, t: p.identificationModule.briefTitle,
      tilstand: (p.conditionsModule?.conditions || []).slice(0, 3),
      legemiddel: (p.armsInterventionsModule?.interventions || []).map((i) => i.name).filter((n) => !/placebo|standard of care|best supportive/i.test(n)).slice(0, 3),
      status: p.statusModule.overallStatus, ferdig: p.statusModule.primaryCompletionDateStruct?.date,
      sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name,
      norge: land.has('Norway') || undefined, norden: ['Sweden', 'Denmark', 'Finland'].some((l) => land.has(l)) || undefined,
    };
  });
  // Bare studier der sponsoren faktisk er selskapet (søket treffer også samarbeidspartnere)
  const rot = sponsor.toLowerCase().split(/[ ,]/)[0];
  return { totalt: d?.totalCount ?? studier.length, studier: studier.filter((s) => (s.sponsor || '').toLowerCase().includes(rot)) };
}

/**
 * Henter selskapsdata. Enhet og regnskap hentes hver gang (raskt), logoer bare én gang,
 * studier fra ClinicalTrials.gov oppdateres hver kjøring for selskaper med sponsornavn.
 */
export async function hentSelskaper(cfg, cache, { rot, logg = console.log }) {
  const logoDir = `${rot}public/logo`;
  mkdirSync(logoDir, { recursive: true });
  const ut = [];
  const alle = cfg.sektorer.flatMap((sek) => sek.selskaper.map((s) => ({ ...s, nokkel: s.orgnr || s.id, sektor: sek.id })));
  let feil = 0;
  const lmi = await hentLmiLogoer(alle, logoDir, logg);
  await parallell(alle, 5, async (s) => {
    const gammel = cache[s.nokkel] || {};
    const x = { ...s };
    if (s.orgnr) try {
      const e = await json(`${BRREG}/enhetsregisteret/api/enheter/${s.orgnr}`);
      if (e) Object.assign(x, {
        offisieltNavn: e.navn, ansatte: e.antallAnsatte ?? null, form: e.organisasjonsform?.kode,
        bransje: e.naeringskode1 ? `${e.naeringskode1.kode} ${e.naeringskode1.beskrivelse}` : undefined,
        kommune: e.forretningsadresse?.kommune || e.beliggenhetsadresse?.kommune, stiftet: e.stiftelsesdato,
        hjemmeside: e.hjemmeside, slettet: e.slettedato || undefined,
      });
      const r = await json(`${BRREG}/regnskapsregisteret/regnskap/${s.orgnr}`);
      const regnskap = (r || []).map(lesRegnskap).filter((y) => y.aar).sort((a, b) => b.aar - a.aar);
      // Behold også eldre år fra cache, så vi kan vise utvikling over tid
      const perAar = new Map([...(gammel.regnskap || []), ...regnskap].map((y) => [y.aar, y]));
      x.regnskap = [...perAar.values()].sort((a, b) => b.aar - a.aar).slice(0, 5);
    } catch (err) { feil++; Object.assign(x, { ...gammel, ...s }); logg(`Selskap ${s.navn}: ${err.message.slice(0, 80)}`); }
    // LMI-logo først, deretter tidligere lagret logo, til slutt ikon fra selskapets nettsted
    const lmiFil = ['svg', 'png', 'webp', 'jpg'].map((e) => `/logo/${s.nokkel}-lmi.${e}`).find((f) => existsSync(`${rot}public${f}`));
    x.logo = lmi.get(s.nokkel) || lmiFil || (gammel.logo && existsSync(`${rot}public${gammel.logo}`) ? gammel.logo : await hentLogo(s, logoDir, null));
    if (s.sponsor) {
      try { const st = await hentStudier(s.sponsor); x.fase3 = st.totalt; x.studier = st.studier; }
      catch { x.fase3 = gammel.fase3; x.studier = gammel.studier; }
    }
    const siste = x.regnskap?.[0];
    x.omsetningNok = siste?.omsetning != null ? Math.round(siste.omsetning * (KURS[siste.valuta] || 1)) : null;
    ut.push(x);
  });
  for (const x of ut) cache[x.nokkel] = x;
  logg(`Selskaper: ${ut.length} hentet (${feil} feil), ${ut.filter((x) => x.logo).length} med logo, ${ut.filter((x) => x.regnskap?.length).length} med regnskap, ${ut.reduce((a, x) => a + (x.studier?.length || 0), 0)} fase 3-studier`);
  return ut;
}
