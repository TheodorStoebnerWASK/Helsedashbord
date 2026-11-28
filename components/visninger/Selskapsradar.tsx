'use client';
import { useEffect, useMemo, useState } from 'react';
import { Seksjon, Stat } from '../felles';
import { Graf } from '../Graf';
import { useLat } from './Innspill';
import { Overvaking } from './Overvaking';
import { useNyheter } from './Nyheter';
import { datoKort } from '@/lib/analyse';
import { legemiddelNokkel, veienTilNorge, terapiomrade, OMRADE_REKKEFOLGE } from '@/lib/studier';
import type { AccessData, MarkedData, Metode, Overvakingsliste, Selskap } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rxAv = (s?: string) => { try { return s ? new RegExp(s, 'i') : null; } catch { return null; } };
const LAGRE = 'selskapsradar-ekstra';
const KURS: Record<string, number> = { NOK: 1, EUR: 11.6, USD: 10.6, SEK: 1.0, DKK: 1.55, GBP: 13.6, CHF: 12.4 };
const mill = (v: number | null | undefined, valuta = 'NOK') => (v == null ? null : Math.round((v * (KURS[valuta] || 1)) / 1e6));
const dagerSiden = (d: string) => Math.round((Date.now() - new Date(d).getTime()) / 86400000);
const mndSiden = (d: string) => Math.max(0, Math.round(dagerSiden(d) / 30.4));
const BESTILT = ['full', 'forenklet', 'prisnotat'];

/** Rent søkenavn for selskapet: «Roche Norge» → «Roche», «Novo Nordisk Norway» → «Novo Nordisk». */
const sokenavn = (s: Selskap) => s.navn.replace(/\(.*?\)/g, '').replace(/\b(Norge|Norway|Nordic|Nordics|Scandinavia|AS|ASA|NUF)\b/gi, '').replace(/\s+/g, ' ').trim();

/** «Obinutuzumab (Gazyvaro) i kombinasjon med … til behandling av …» → legemiddel og indikasjon hver for seg. */
function delTittel(t: string) {
  const m = /^(.{3,90}?\))\s*(.*)$/.exec(t);
  const navn = m ? m[1] : t.split(/\s+(?:til|som|ved|i kombinasjon)\s+/)[0].slice(0, 80);
  const rest = (m ? m[2] : t.slice(navn.length)).replace(/^[\s–-]+/, '').replace(/^(som monoterapi |i kombinasjon med [^,]+? )?(til behandling av |til |ved |for )/i, '');
  return { navn, indikasjon: rest.charAt(0).toUpperCase() + rest.slice(1) };
}

type Fase = 'vurdering' | 'innfort' | 'ikke-innfort' | 'avsluttet';
interface MetodeRad { id: string; m: Metode; fase: Fase; dato: string; bestilt?: string; navn: string; indikasjon: string; omrade: string }

function fase(m: Metode): { fase: Fase; dato: string; bestilt?: string } {
  const siste = m.h.at(-1)!;
  const bsf = [...m.h].reverse().find((h) => h.f === 'bsf');
  const bestilt = m.h.find((h) => h.f === 'bf' && BESTILT.includes(h.s))?.d;
  if (bsf?.s === 'innfort') return { fase: 'innfort', dato: bsf.d, bestilt };
  if (bsf?.s === 'ikke-innfort') return { fase: 'ikke-innfort', dato: bsf.d, bestilt };
  const sisteBf = [...m.h].reverse().find((h) => h.f === 'bf');
  if (!bsf && sisteBf && ['avsluttet', 'ikke-oppdrag'].includes(sisteBf.s)) return { fase: 'avsluttet', dato: sisteBf.d, bestilt };
  return { fase: 'vurdering', dato: siste.d, bestilt };
}

const FASER: { id: Fase; navn: string; farge: string; hjelp: string }[] = [
  { id: 'vurdering', navn: 'Under vurdering', farge: '#2F86B8', hjelp: 'Bestilt i Bestillerforum, venter på beslutning' },
  { id: 'innfort', navn: 'Innført', farge: '#2E9E6E', hjelp: 'Ja i Beslutningsforum' },
  { id: 'ikke-innfort', navn: 'Ikke innført', farge: '#E5402A', hjelp: 'Nei i Beslutningsforum, ofte på grunn av pris' },
  { id: 'avsluttet', navn: 'Avsluttet', farge: '#8A877F', hjelp: 'Avsluttet eller ikke gitt oppdrag' },
];

interface Anledning { type: string; farge: string; dato: string; tekst: React.ReactNode; vekt: number }
interface Hendelse { dato: string; type: string; farge: string; tekst: React.ReactNode }

/**
 * Kundeprofil: velg et selskap og få alt samlet: nøkkeltall, anledninger til kontakt, tidslinje,
 * metodene i Nye metoder som en tavle, pipeline og omtale i politikken og mediene.
 */
export function Selskapsradar() {
  const { data: marked } = useLat<MarkedData>('/api/marked');
  const { data: acc } = useLat<AccessData>('/api/access');
  const { liste: nyheter } = useNyheter();
  const [valgt, setValgt] = useState('');
  const [ekstra, setEkstra] = useState('');
  const [visAlleMetoder, setVisAlleMetoder] = useState(false);
  const [visAllePipeline, setVisAllePipeline] = useState(false);
  const [visAlleHendelser, setVisAlleHendelser] = useState(false);

  const selskaper = useMemo(() => [...(marked?.selskaper || [])].sort((a, b) => a.navn.localeCompare(b.navn, 'nb')), [marked]);
  const s = selskaper.find((x) => x.nokkel === valgt);
  useEffect(() => { if (!valgt && selskaper.length) setValgt(selskaper.find((x) => /^roche norge/i.test(x.navn))?.nokkel || selskaper[0].nokkel); }, [selskaper, valgt]);
  useEffect(() => {
    if (!valgt) return;
    setVisAlleMetoder(false); setVisAllePipeline(false); setVisAlleHendelser(false);
    try { setEkstra(JSON.parse(localStorage.getItem(LAGRE) || '{}')[valgt] || ''); } catch { setEkstra(''); }
  }, [valgt]);
  const lagreEkstra = (v: string) => {
    setEkstra(v);
    try { const m = JSON.parse(localStorage.getItem(LAGRE) || '{}'); m[valgt] = v; localStorage.setItem(LAGRE, JSON.stringify(m)); } catch { /* ikke kritisk */ }
  };

  const r = useMemo(() => {
    if (!s || !acc) return null;
    const rx = rxAv(s.match);
    const idag = new Date().toISOString().slice(0, 10);
    const aarSiden = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const omAar = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 7);
    const register = (acc.emaRegister || []).filter((x) => rx && rx.test(x.i || ''));
    const merker = [...new Set(register.filter((x) => /authorised|opinion/i.test(x.s || '')).map((x) => x.n).filter((n) => n && n.length >= 4))];
    const metoder: MetodeRad[] = Object.entries(acc.metoder || {}).filter(([, m]) => rx && m.selskap && rx.test(m.selskap)).map(([id, m]) => {
      const f = fase(m);
      const { navn, indikasjon } = delTittel(m.tittel);
      return { id, m, ...f, navn, indikasjon, omrade: terapiomrade(m.tittel) };
    }).sort((a, b) => b.dato.localeCompare(a.dato));
    const ema = (acc.ema || []).filter((e) => rx && rx.test(e.innehaver || ''));
    const egne = ekstra.split(',').map((x) => x.trim()).filter(Boolean);
    const ord = [esc(sokenavn(s)) + '\\b', ...merker.map((m) => esc(m) + '\\b'), ...egne];
    const liste: Overvakingsliste = { id: `selskap-${s.nokkel}`, navn: s.navn, ord };
    const ordRx = new RegExp(ord.map((o) => o.replaceAll('\\b', '(?![\\p{L}\\d])')).map((o) => `(?<![\\p{L}\\d])${o}`).join('|'), 'iu');
    const omtale = nyheter.filter((n) => ordRx.test(`${n.t} ${n.i || ''}`));
    const pipeline = (s.studier || []).map((x) => ({ ...x, veien: veienTilNorge(x.ferdig), omrade: terapiomrade(`${x.tilstand.join(' ')} ${x.t}`), nokkel: legemiddelNokkel(x.legemiddel) }));
    const grense = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 7);
    const naer = (f?: string) => (!f ? '9999' : f.slice(0, 7) < grense ? `5${f}` : f);
    pipeline.sort((a, b) => naer(a.ferdig).localeCompare(naer(b.ferdig)));
    const nesteMote = (acc.moteplan?.beslutningsforum || []).find((d) => d >= idag);

    // Anledninger til kontakt: regelbaserte, med vekt for rekkefølge
    const anl: Anledning[] = [];
    for (const x of metoder) {
      if (x.fase === 'ikke-innfort' && x.dato >= new Date(Date.now() - 540 * 86400000).toISOString().slice(0, 10)) {
        anl.push({ type: 'Ikke innført', farge: '#E5402A', dato: x.dato, vekt: 3, tekst: <><b>{x.navn}</b> ble ikke innført {datoKort(x.dato)} ({x.id}). Selskapet kan komme tilbake med nytt pristilbud eller ny dokumentasjon, og kan trenge hjelp med en ny runde.</> });
      }
      if (x.fase === 'vurdering' && x.bestilt && x.bestilt >= new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10)) {
        anl.push({ type: 'Venter på beslutning', farge: '#2F86B8', dato: x.bestilt, vekt: 2, tekst: <><b>{x.navn}</b>: metodevurdering bestilt {datoKort(x.bestilt)}, {mndSiden(x.bestilt)} måneder siden ({x.id}).{nesteMote ? ` Neste møte i Beslutningsforum er ${datoKort(nesteMote)}.` : ''}</> });
      }
    }
    for (const e of ema.filter((e) => e.dato >= aarSiden && (e.type === 'godkjent' || e.type === 'opinion'))) {
      const iNm = metoder.some((x) => x.m.tittel.toLowerCase().includes(e.navn.toLowerCase()));
      anl.push({ type: e.type === 'godkjent' ? 'Ny EU-godkjenning' : 'Positiv CHMP-opinion', farge: '#8A5AB0', dato: e.dato, vekt: iNm ? 1 : 2.5, tekst: <><b>{e.navn}</b> {e.type === 'godkjent' ? 'fikk markedsføringstillatelse i EU' : 'fikk positiv anbefaling fra EMA'} {datoKort(e.dato)}{e.omrade.length ? ` (${e.omrade.slice(0, 2).join(', ')})` : ''}. {iNm ? 'Ligger allerede i Nye metoder.' : 'Ingen metode funnet i Nye metoder ennå: neste steg er Bestillerforum eller blåreseptsøknad.'}</> });
    }
    const snart = pipeline.filter((x) => x.ferdig && x.ferdig >= idag.slice(0, 7) && x.ferdig.slice(0, 7) <= omAar);
    for (const x of [...snart].sort((a, b) => Number(!!b.norge) - Number(!!a.norge)).slice(0, 3)) {
      anl.push({ type: 'Fase 3-resultat snart', farge: '#DDA21A', dato: x.ferdig!, vekt: x.norge ? 1.8 : 1.2, tekst: <><b>{x.legemiddel[0]}</b> mot {x.tilstand[0]?.toLowerCase()}: hovedresultat ventes {veienTilNorge(x.ferdig).tekst.replace(/^Resultat ventes /, '').split(',')[0]}.{x.norge ? ' Norske sykehus deltar i studien.' : ''}</> });
    }
    anl.sort((a, b) => b.vekt - a.vekt || b.dato.localeCompare(a.dato));

    // Tidslinje siste 12 måneder
    const hend: Hendelse[] = [];
    for (const x of metoder) for (const h of x.m.h.filter((h) => h.d >= aarSiden)) {
      const bsf = h.f === 'bsf';
      const tekst = bsf ? ({ innfort: 'innført', 'ikke-innfort': 'ikke innført', utsatt: 'utsatt' } as Record<string, string>)[h.s] || h.s
        : ({ full: 'full metodevurdering bestilt', forenklet: 'forenklet vurdering bestilt', prisnotat: 'prisnotat bestilt', avsluttet: 'avsluttet', 'ikke-oppdrag': 'ikke gitt oppdrag', utsatt: 'utsatt' } as Record<string, string>)[h.s] || h.s;
      hend.push({ dato: h.d, type: bsf ? 'Beslutningsforum' : 'Bestillerforum', farge: bsf ? (h.s === 'innfort' ? '#2E9E6E' : h.s === 'ikke-innfort' ? '#E5402A' : '#DDA21A') : '#2F86B8', tekst: <><b>{x.navn}</b>: {tekst}</> });
    }
    for (const e of ema.filter((e) => e.dato >= aarSiden)) hend.push({ dato: e.dato, type: 'EMA', farge: '#8A5AB0', tekst: <><a href={e.url} target="_blank" rel="noreferrer">{e.navn}</a>: {({ opinion: 'positiv CHMP-opinion', godkjent: 'godkjent i EU', avslag: 'avslag', trukket: 'søknad trukket' } as Record<string, string>)[e.type] || e.type}</> });
    for (const n of omtale.filter((n) => n.d >= aarSiden)) hend.push({ dato: n.d.slice(0, 10), type: 'Media', farge: '#685048', tekst: <a href={n.url} target="_blank" rel="noreferrer">{n.t}</a> });
    hend.sort((a, b) => b.dato.localeCompare(a.dato));

    return { merker, metoder, ema, liste, omtale, pipeline, anl, hend, nesteMote, snart, aarSiden };
  }, [s, acc, ekstra, nyheter]);

  const grafer = useMemo(() => {
    if (!s || !r) return [];
    const ut: GrafSpec[] = [];
    const omr = OMRADE_REKKEFOLGE.filter((o) => r.pipeline.some((x) => x.omrade === o) || r.metoder.some((x) => x.omrade === o));
    if (omr.length) ut.push({
      id: `kunde-omrade-${s.nokkel}`, tittel: 'Terapiområder', undertittel: 'Metoder i Nye metoder og pågående fase 3-studier', form: 'liggende', enhet: 'stk',
      kilde: 'Kilde: Nye metoder, ClinicalTrials.gov. Gruppert av Wergeland Apenes.',
      kategorier: omr, serier: [
        { navn: 'Metoder i Nye metoder', farge: '#2E9E6E', data: omr.map((o) => r.metoder.filter((x) => x.omrade === o).length) },
        { navn: 'Fase 3-studier', farge: '#2F86B8', data: omr.map((o) => r.pipeline.filter((x) => x.omrade === o).length) },
      ],
    });
    const rs = [...(s.regnskap || [])].sort((a, b) => a.aar - b.aar);
    if (rs.length) ut.push({
      id: `kunde-okonomi-${s.nokkel}`, tittel: 'Økonomi i Norge', undertittel: 'Millioner kroner', form: 'stolpe', enhet: 'mill. kr',
      kilde: 'Kilde: Brønnøysundregistrene (Regnskapsregisteret). Bearbeidet av Wergeland Apenes.',
      kategorier: rs.map((x) => String(x.aar)), serier: [
        { navn: 'Omsetning', farge: '#2F86B8', data: rs.map((x) => mill(x.omsetning, x.valuta) ?? 0) },
        { navn: 'Årsresultat', farge: '#DDA21A', data: rs.map((x) => mill(x.resultat, x.valuta) ?? 0) },
      ],
    });
    return ut;
  }, [s, r]);

  if (!marked || !acc) return <p className="laster"><span className="spinner" /> Laster selskaper …</p>;
  const reg = s?.regnskap || [];
  const [na, forrige] = reg;
  const vekst = na?.omsetning && forrige?.omsetning ? Math.round((100 * (na.omsetning - forrige.omsetning)) / forrige.omsetning) : null;
  const telle = (f: Fase) => r?.metoder.filter((x) => x.fase === f).length || 0;
  const siste12 = (f: Fase) => r?.metoder.filter((x) => x.fase === f && x.dato >= r.aarSiden).length || 0;

  return (
    <>
      <div className="lokale-filtre">
        <label className="velger">
          <span className="eyebrow">Selskap</span>
          <select value={valgt} onChange={(e) => setValgt(e.target.value)}>
            {marked.sektorer.map((sek) => (
              <optgroup key={sek.id} label={sek.navn}>
                {selskaper.filter((x) => x.sektor === sek.id).map((x) => <option key={x.nokkel} value={x.nokkel}>{x.navn}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      {s && r && (
        <>
          <div className="kunde-hode">
            {s.logo ? <img className="logo stor" src={s.logo} alt="" /> : <span className="logo stor tom">{sokenavn(s).slice(0, 2)}</span>}
            <div>
              <p className="eyebrow">{marked.sektorer.find((x) => x.id === s.sektor)?.navn}</p>
              <h2>{s.navn}</h2>
              <p className="dempet">
                {s.orgnr ? (
                  <>
                    {s.ansatte != null && <>{s.ansatte.toLocaleString('nb-NO')} ansatte i Norge · </>}
                    {na?.omsetning != null && <>omsetning {mill(na.omsetning, na.valuta)!.toLocaleString('nb-NO')} mill. kr i {na.aar}</>}
                    {vekst != null && <span className={vekst >= 0 ? 'opp' : 'ned'}> ({vekst >= 0 ? '+' : ''}{vekst} % fra {forrige.aar})</span>}
                    {s.kommune && <> · {s.kommune[0] + s.kommune.slice(1).toLowerCase()}</>}
                  </>
                ) : 'Ingen norsk enhet registrert i Brønnøysund'}
              </p>
              <p className="kunde-lenker">
                {s.orgnr && <a href={`https://virksomhet.brreg.no/oppslag/enheter/${s.orgnr}`} target="_blank" rel="noreferrer">Brønnøysund ↗</a>}
                {s.orgnr && <a href={`https://www.proff.no/bransjes%C3%B8k?q=${s.orgnr}`} target="_blank" rel="noreferrer">Proff ↗</a>}
                {(s.hjemmeside || s.domene) && <a href={`https://${(s.hjemmeside || s.domene)!.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer">Nettsted ↗</a>}
                <a href={`#marked/sammenlign`}>Sammenlign med andre</a>
              </p>
            </div>
          </div>

          <div className="stats kompakt seks">
            <Stat tall={telle('vurdering')} etikett="under vurdering" hint="i Nye metoder nå" />
            <Stat tall={siste12('innfort')} etikett="innført" hint="siste 12 måneder" />
            <Stat tall={siste12('ikke-innfort')} etikett="ikke innført" hint="siste 12 måneder" />
            <Stat tall={r.ema.length} etikett="saker hos EMA" hint="siste to år" />
            <Stat tall={r.snart.length} etikett="fase 3-resultater" hint="ventes neste 12 måneder" />
            <Stat tall={r.omtale.length} etikett="saker i mediene" hint="siste seks måneder" />
          </div>

          <div className="rutenett-2">
            <Seksjon tittel="Anledninger til kontakt">
              {r.anl.length === 0 ? <p className="tomt">Ingen åpenbare anledninger akkurat nå.</p> : (
                <ul className="anledninger">
                  {r.anl.slice(0, 7).map((a, i) => (
                    <li key={i} style={{ ['--af' as string]: a.farge }}>
                      <span className="anledning-type">{a.type}</span>
                      <p>{a.tekst}</p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="dempet liten-tekst">Laget automatisk fra Nye metoder, EMA og ClinicalTrials.gov. Sjekk detaljene før du tar kontakt.</p>
            </Seksjon>
            <Seksjon tittel="Siste 12 måneder">
              {r.hend.length === 0 ? <p className="tomt">Ingen hendelser.</p> : (
                <ul className="tidslinje">
                  {(visAlleHendelser ? r.hend : r.hend.slice(0, 10)).map((h, i) => (
                    <li key={i} style={{ ['--hf' as string]: h.farge }}>
                      <time>{datoKort(h.dato)}</time>
                      <span className="hendelse-type">{h.type}</span>
                      <span>{h.tekst}</span>
                    </li>
                  ))}
                </ul>
              )}
              {r.hend.length > 10 && <button className="lenkeknapp liten" onClick={() => setVisAlleHendelser(!visAlleHendelser)}>{visAlleHendelser ? 'Vis færre' : `Vis alle ${r.hend.length}`}</button>}
            </Seksjon>
          </div>

          <Seksjon tittel={`Tilgang i Norge: metoder i Nye metoder (${r.metoder.length})`}>
            {r.metoder.length === 0 ? <p className="tomt">Ingen metoder funnet for selskapet siden 2023.</p> : (
              <>
                <div className="tavle">
                  {FASER.map((f) => {
                    const kol = r.metoder.filter((x) => x.fase === f.id);
                    return (
                      <div key={f.id} className="tavle-kolonne" style={{ ['--tf' as string]: f.farge }}>
                        <h4>{f.navn} <span>{kol.length}</span></h4>
                        <p className="dempet liten-tekst">{f.hjelp}</p>
                        {(visAlleMetoder ? kol : kol.slice(0, 5)).map((x) => (
                          <div key={x.id} className="tavle-kort">
                            <p className="tavle-navn">{x.navn}</p>
                            <p className="liten-tekst">{x.indikasjon.slice(0, 110)}{x.indikasjon.length > 110 ? ' …' : ''}</p>
                            <p className="dempet liten-tekst">
                              <a href={`https://www.nyemetoder.no/metoder/${x.id.toLowerCase()}/`} target="_blank" rel="noreferrer">{x.id}</a> · {datoKort(x.dato)}
                              {f.id === 'vurdering' && x.bestilt ? ` · bestilt for ${mndSiden(x.bestilt)} mnd. siden` : ''}
                            </p>
                          </div>
                        ))}
                        {!visAlleMetoder && kol.length > 5 && <p className="dempet liten-tekst">og {kol.length - 5} til</p>}
                      </div>
                    );
                  })}
                </div>
                {r.metoder.length > 5 && <button className="lenkeknapp liten" onClick={() => setVisAlleMetoder(!visAlleMetoder)}>{visAlleMetoder ? 'Vis færre' : 'Vis alle metodene'}</button>}
              </>
            )}
          </Seksjon>

          <div className="rutenett-sidepanel">
            <Seksjon tittel={`Pipeline: fase 3-studier (${r.pipeline.length})`}>
              {r.pipeline.length === 0 ? <p className="tomt">Ingen pågående fase 3-studier med selskapet som hovedsponsor.</p> : (
                <table className="tabell">
                  <thead><tr><th>Legemiddel</th><th>Sykdom</th><th>Veien til Norge</th></tr></thead>
                  <tbody>{(visAllePipeline ? r.pipeline : r.pipeline.slice(0, 10)).map((x) => (
                    <tr key={x.id}>
                      <td>{x.norge && <b className="norge" title="Norske sykehus er studiesentre">NO </b>}<a href={`https://clinicaltrials.gov/study/${x.id}`} target="_blank" rel="noreferrer">{x.legemiddel[0] || x.id}</a><br /><span className="dempet liten-tekst">{x.omrade}</span></td>
                      <td className="liten-tekst">{x.tilstand.slice(0, 2).join(', ')}</td>
                      <td className="liten-tekst">{x.veien.tekst}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              {r.pipeline.length > 10 && <button className="lenkeknapp liten" onClick={() => setVisAllePipeline(!visAllePipeline)}>{visAllePipeline ? 'Vis færre' : `Vis alle ${r.pipeline.length}`}</button>}
              <p className="dempet liten-tekst">Sortert med de som er nærmest markedet først. Se Marked, Pipeline for forklaring.</p>
            </Seksjon>
            <aside>{grafer.map((g) => <Graf key={g.id} spec={g} />)}</aside>
          </div>

          <Seksjon tittel="Omtale i politikken og mediene">
            <p className="dempet liten-tekst">
              Søker på «{sokenavn(s)}»{r.merker.length ? ` og ${r.merker.length} legemiddelnavn (${r.merker.slice(0, 6).join(', ')}${r.merker.length > 6 ? ' …' : ''})` : ''}{ekstra ? ' pluss egne søkeord' : ''} i Stortinget, regjeringen, høringsinnspill, debatter og nyheter.
            </p>
            <input className="sokefelt bred" placeholder="Legg til egne søkeord, kommaseparert, for eksempel «Eurneffy, anafylaksi»" value={ekstra} onChange={(e) => lagreEkstra(e.target.value)} />
            <Overvaking fast={r.liste} />
          </Seksjon>
        </>
      )}
    </>
  );
}
