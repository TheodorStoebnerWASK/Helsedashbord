'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Stat, Segment, Chips } from '../felles';
import { Graf } from '../Graf';
import { useLat } from './Innspill';
import { useNyheter, NyhetRad } from './Nyheter';
import { datoKort } from '@/lib/analyse';
import type { AccessData, EmaHendelse, MarkedData, Selskap } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

const KILDE = 'Kilde: Brønnøysundregistrene (Enhetsregisteret og Regnskapsregisteret). Bearbeidet av Wergeland Apenes.';
const mill = (n?: number | null) => (n == null ? '–' : `${(n / 1e6).toLocaleString('nb-NO', { maximumFractionDigits: n >= 1e10 ? 0 : 1 })} mill.`);
const regex = (s?: string) => { try { return s ? new RegExp(s, 'i') : null; } catch { return null; } };
const EMA_NAVN: Record<EmaHendelse['type'], string> = { opinion: 'Positiv CHMP-opinion', godkjent: 'Markedsføringstillatelse', avslag: 'Avslag', trukket: 'Søknad trukket' };

function Logo({ s, str = 40 }: { s: Selskap; str?: number }) {
  const [feil, setFeil] = useState(false);
  const init = s.navn.replace(/\(.*?\)/g, '').split(/\s+/).filter((w) => /^[A-ZÆØÅ0-9]/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  if (s.logo && !feil) return <img className="logo" src={s.logo} alt="" width={str} height={str} onError={() => setFeil(true)} />;
  return <span className="logo logo-init" style={{ width: str, height: str }} aria-hidden>{init}</span>;
}

/** Felles beregninger: EMA-hendelser og nyheter knyttet til hvert selskap. */
function useKoblinger(marked: MarkedData | null, acc: AccessData | null) {
  const { liste: nyheter } = useNyheter();
  return useMemo(() => {
    const ema = new Map<string, EmaHendelse[]>();
    const nyh = new Map<string, typeof nyheter>();
    const finnSelskap = (tekst: string) => (marked?.selskaper || []).find((s) => regex(s.match)?.test(tekst));
    for (const s of marked?.selskaper || []) {
      const rx = regex(s.match);
      if (!rx) continue;
      ema.set(s.orgnr, (acc?.ema || []).filter((e) => rx.test(e.innehaver || '')));
      nyh.set(s.orgnr, nyheter.filter((n) => rx.test(`${n.t} ${n.i || ''}`)));
    }
    return { ema, nyh, finnSelskap };
  }, [marked, acc, nyheter]);
}

function SelskapDetalj({ s, k }: { s: Selskap; k: ReturnType<typeof useKoblinger> }) {
  const ema = k.ema.get(s.orgnr) || [];
  const nyh = k.nyh.get(s.orgnr) || [];
  const studier = [...(s.studier || [])].sort((a, b) => Number(!!b.norge) - Number(!!a.norge));
  return (
    <div className="selskap-detalj">
      <div className="rutenett-2">
        <div>
          <p className="dempet liten-tekst">
            {s.offisieltNavn} · org.nr. {s.orgnr}{s.form ? ` · ${s.form}` : ''}{s.kommune ? ` · ${s.kommune}` : ''}{s.stiftet ? ` · stiftet ${s.stiftet.slice(0, 4)}` : ''}<br />
            {s.bransje}<br />
            <a href={`https://virksomhet.brreg.no/nb/oppslag/enheter/${s.orgnr}`} target="_blank" rel="noreferrer">Brønnøysund</a>
            {' · '}<a href={`https://www.proff.no/bransjes%C3%B8k?q=${s.orgnr}`} target="_blank" rel="noreferrer">Proff</a>
            {s.hjemmeside && <> · <a href={s.hjemmeside.startsWith('http') ? s.hjemmeside : `https://${s.hjemmeside}`} target="_blank" rel="noreferrer">Nettsted</a></>}
          </p>
          {s.regnskap?.length ? (
            <table className="tabell">
              <thead><tr><th>År</th><th>Omsetning</th><th>Driftsresultat</th><th>Årsresultat</th></tr></thead>
              <tbody>{s.regnskap.map((r) => (
                <tr key={r.aar}><td>{r.aar}</td><td>{mill(r.omsetning)} {r.valuta !== 'NOK' ? r.valuta : ''}</td><td>{mill(r.driftsresultat)}</td><td>{mill(r.resultat)}</td></tr>
              ))}</tbody>
            </table>
          ) : <p className="dempet liten-tekst">Ingen regnskap i Regnskapsregisteret (utenlandske filialer leverer ofte ikke norsk regnskap).</p>}
        </div>
        <div>
          <h4 className="eyebrow">EMA siste to år ({ema.length})</h4>
          {ema.length ? <ul className="kortliste">{ema.slice(0, 8).map((e, i) => <li key={i}><time>{datoKort(e.dato)}</time> <a href={e.url} target="_blank" rel="noreferrer">{e.navn}</a> – {EMA_NAVN[e.type]}{e.nm ? ` · Nye metoder ${e.nm.join(', ')}` : ''}</li>)}</ul> : <p className="dempet liten-tekst">Ingen.</p>}
          {s.sponsor && <>
            <h4 className="eyebrow">Fase 3-studier pågår ({studier.length}, {studier.filter((x) => x.norge).length} med norske studiesentre)</h4>
            <ul className="kortliste">{studier.slice(0, 8).map((x) => <li key={x.id}>{x.norge && <b className="norge">NO </b>}<a href={`https://clinicaltrials.gov/study/${x.id}`} target="_blank" rel="noreferrer">{x.legemiddel.join(', ') || x.id}</a> – {x.tilstand.join(', ')}{x.ferdig ? ` · ferdig ${x.ferdig.slice(0, 7)}` : ''}</li>)}</ul>
          </>}
        </div>
      </div>
      {nyh.length > 0 && <>
        <h4 className="eyebrow">I mediene ({nyh.length})</h4>
        <ul className="elementer">{nyh.slice(0, 4).map((n) => <NyhetRad key={n.url} n={n} />)}</ul>
      </>}
    </div>
  );
}

function Selskaper({ marked, k }: { marked: MarkedData; k: ReturnType<typeof useKoblinger> }) {
  const { katFarge } = useData();
  const [sektor, setSektor] = useState(marked.sektorer[0]?.id || '');
  const [sorter, setSorter] = useState<'omsetning' | 'ansatte' | 'resultat' | 'omtale'>('omsetning');
  const [apen, setApen] = useState<string | null>(null);
  const sek = marked.sektorer.find((x) => x.id === sektor);
  const liste = useMemo(() => {
    const l = marked.selskaper.filter((s) => s.sektor === sektor);
    const v = (s: Selskap) => sorter === 'omsetning' ? s.omsetningNok ?? -1 : sorter === 'ansatte' ? s.ansatte ?? -1 : sorter === 'resultat' ? (s.regnskap?.[0]?.resultat ?? -Infinity) : (k.nyh.get(s.orgnr)?.length || 0);
    return [...l].sort((a, b) => v(b) - v(a));
  }, [marked, sektor, sorter, k]);

  const spec: GrafSpec = useMemo(() => {
    const topp = liste.filter((s) => s.omsetningNok).sort((a, b) => b.omsetningNok! - a.omsetningNok!).slice(0, 15);
    const aar = topp[0]?.regnskap?.[0]?.aar;
    return {
      id: `marked-oms-${sektor}`, tittel: `Største selskaper i Norge: ${sek?.navn}`, undertittel: `Driftsinntekter ${aar || ''}, millioner kroner`, form: 'liggende', enhet: 'mill. kr', kilde: KILDE,
      kategorier: topp.map((s) => s.navn),
      serier: [{ navn: 'Omsetning', data: topp.map((s) => Math.round(s.omsetningNok! / 1e6)), farge: katFarge(sek?.kategori || '') }],
    };
  }, [liste, sektor, sek, katFarge]);

  return (
    <>
      <div className="lokale-filtre">
        <Segment etikett="Sektor" verdi={sektor} sett={(v) => { setSektor(v); setApen(null); }} valg={marked.sektorer.map((x) => ({ id: x.id, navn: x.navn }))} />
        <Segment etikett="Sorter" verdi={sorter} sett={setSorter} valg={[{ id: 'omsetning', navn: 'Omsetning' }, { id: 'ansatte', navn: 'Ansatte' }, { id: 'resultat', navn: 'Resultat' }, { id: 'omtale', navn: 'Omtale' }]} />
      </div>
      <div className="stats kompakt">
        <Stat tall={liste.length} etikett="selskaper" />
        <Stat tall={liste.reduce((a, s) => a + (s.ansatte || 0), 0).toLocaleString('nb-NO')} etikett="ansatte i Norge" />
        <Stat tall={`${Math.round(liste.reduce((a, s) => a + (s.omsetningNok || 0), 0) / 1e9).toLocaleString('nb-NO')} mrd.`} etikett="samlet omsetning" />
        {sektor === 'legemidler' && <Stat tall={liste.reduce((a, s) => a + (s.studier?.length || 0), 0)} etikett="fase 3-studier pågår" hint={`${liste.reduce((a, s) => a + (s.studier?.filter((x) => x.norge).length || 0), 0)} med norske sentre`} />}
      </div>
      <div className="rutenett-sidepanel">
        <Seksjon tittel={sek?.navn || ''}>
          <ul className="selskaper">
            {liste.map((s, i) => {
              const r = s.regnskap?.[0];
              const forrige = s.regnskap?.[1];
              const vekst = r?.omsetning && forrige?.omsetning ? (r.omsetning / forrige.omsetning - 1) * 100 : null;
              return (
                <li key={s.orgnr} className={apen === s.orgnr ? 'apen' : ''}>
                  <button className="selskap-rad" onClick={() => setApen(apen === s.orgnr ? null : s.orgnr)} aria-expanded={apen === s.orgnr}>
                    <span className="nr">{i + 1}</span>
                    <Logo s={s} />
                    <span className="selskap-navn"><strong>{s.navn}</strong><span className="dempet liten-tekst">{s.kommune || ''}</span></span>
                    <span className="tall"><b>{s.ansatte?.toLocaleString('nb-NO') ?? '–'}</b><span>ansatte</span></span>
                    <span className="tall"><b>{mill(r?.omsetning)}{r && r.valuta !== 'NOK' ? ` ${r.valuta}` : ''}</b><span>omsetning {r?.aar || ''}{vekst !== null && <em className={vekst >= 0 ? 'opp' : 'ned'}> {vekst >= 0 ? '+' : ''}{vekst.toFixed(0)} %</em>}</span></span>
                    <span className="tall"><b>{mill(r?.resultat)}</b><span>årsresultat</span></span>
                    {s.sponsor && <span className="tall"><b>{s.studier?.length ?? 0}</b><span>fase 3</span></span>}
                  </button>
                  {apen === s.orgnr && <SelskapDetalj s={s} k={k} />}
                </li>
              );
            })}
          </ul>
          <p className="dempet liten-tekst">Tall for det norske selskapet (ikke konsernet globalt), fra siste innleverte årsregnskap. Selskaper som rapporterer i euro er regnet om til kroner for sorteringen. Listen redigeres i <code>config/selskaper.json</code>.</p>
        </Seksjon>
        <aside><Graf spec={spec} /></aside>
      </div>
    </>
  );
}

function KommerTilNorge({ marked, acc, k }: { marked: MarkedData; acc: AccessData; k: ReturnType<typeof useKoblinger> }) {
  const [typer, setTyper] = useState<string[]>(['opinion', 'godkjent']);
  const [flagg, setFlagg] = useState<string[]>([]);
  const [kunUten, setKunUten] = useState(true);
  const [sok, setSok] = useState('');
  const [antall, setAntall] = useState(50);
  const fra = new Date(Date.now() - 548 * 86400000).toISOString().slice(0, 10);
  const liste = useMemo(() => (acc.ema || []).filter((e) =>
    e.dato >= fra && typer.includes(e.type) && !e.generisk && !e.biotilsvarende && (!kunUten || !e.nm?.length) &&
    flagg.every((f) => (e as unknown as Record<string, unknown>)[f]) &&
    (!sok || `${e.navn} ${e.virkestoff} ${e.omrade.join(' ')} ${e.innehaver} ${e.indikasjon}`.toLowerCase().includes(sok.toLowerCase()))), [acc, typer, flagg, kunUten, sok, fra]);
  const medNorsk = liste.filter((e) => k.finnSelskap(e.innehaver || '')).length;

  return (
    <>
      <p className="ingress">
        Nye legemidler som har fått positiv anbefaling (CHMP) eller markedsføringstillatelse i EU de siste 18 månedene, og som ennå ikke er bestilt i Nye metoder.
        Dette er selskapene som er på vei inn i det norske markedet – og tidspunktet der Access-modellen sier gjennomslaget skapes.
      </p>
      <div className="lokale-filtre">
        <Chips valg={[{ id: 'opinion', navn: 'Positiv opinion' }, { id: 'godkjent', navn: 'Godkjent i EU' }]} valgt={typer} sett={(v) => setTyper(v.length ? v : typer)} />
        <Chips valg={[{ id: 'orphan', navn: 'Sjeldne (orphan)' }, { id: 'prime', navn: 'PRIME' }, { id: 'atmp', navn: 'Avansert terapi' }, { id: 'betinget', navn: 'Betinget' }]} valgt={flagg} sett={setFlagg} />
        <label className="bryter"><input type="checkbox" checked={kunUten} onChange={(e) => setKunUten(e.target.checked)} /> Bare de som ikke er i Nye metoder</label>
        <input className="sokefelt" type="search" placeholder="Søk legemiddel, sykdom, selskap …" value={sok} onChange={(e) => setSok(e.target.value)} />
      </div>
      <div className="stats kompakt">
        <Stat tall={liste.length} etikett="legemidler" />
        <Stat tall={new Set(liste.map((e) => e.innehaver)).size} etikett="selskaper" />
        <Stat tall={medNorsk} etikett="med norsk selskap i listen" />
        <Stat tall={liste.filter((e) => e.orphan).length} etikett="sjeldne sykdommer" />
      </div>
      <table className="tabell bred">
        <thead><tr><th>Dato</th><th>Legemiddel</th><th>Område</th><th>Selskap (EU)</th><th>Norsk selskap</th></tr></thead>
        <tbody>
          {liste.slice(0, antall).map((e, i) => {
            const s = k.finnSelskap(e.innehaver || '');
            return (
              <tr key={i}>
                <td><time>{datoKort(e.dato)}</time><br /><span className="dempet liten-tekst">{EMA_NAVN[e.type]}</span></td>
                <td><a href={e.url} target="_blank" rel="noreferrer"><b>{e.navn}</b></a><br /><span className="dempet liten-tekst">{e.virkestoff}</span>
                  <div className="element-merker">{e.orphan && <span className="stikkord">Orphan</span>}{e.prime && <span className="stikkord">PRIME</span>}{e.atmp && <span className="stikkord">ATMP</span>}{e.betinget && <span className="stikkord">Betinget</span>}{e.nm?.map((id) => <span key={id} className="stikkord">Nye metoder {id}</span>)}</div>
                </td>
                <td className="liten-tekst">{e.omrade.join(', ')}</td>
                <td className="liten-tekst">{e.innehaver}</td>
                <td>{s ? <span className="selskap-mini"><Logo s={s} str={22} /> {s.navn}{s.ansatte ? <span className="dempet liten-tekst"> · {s.ansatte} ansatte</span> : null}</span> : e.innehaver ? <a className="liten-tekst" href={`https://virksomhet.brreg.no/nb/sok?q=${encodeURIComponent(e.innehaver.split(/[ ,]/)[0])}`} target="_blank" rel="noreferrer">Søk i Brønnøysund</a> : <span className="dempet liten-tekst">–</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {antall < liste.length && <button className="knapp knapp-lys vis-flere" onClick={() => setAntall(antall + 100)}>Vis flere ({liste.length - antall} igjen)</button>}
      <p className="dempet liten-tekst">
        Kilde: EMAs åpne legemiddeldata og protokoller fra Nye metoder. Legemidler som skal på blå resept vurderes av DMP og dukker ikke opp i Nye metoder, så «ikke i Nye metoder» betyr ikke nødvendigvis at ingen prosess er startet.
        Generika og biotilsvarende legemidler er utelatt. «Norsk selskap» kobles på navnet til innehaveren hos EMA.
      </p>
    </>
  );
}

function Pipeline({ marked }: { marked: MarkedData }) {
  const [valgt, setValgt] = useState<string[]>([]);
  const [kunNorge, setKunNorge] = useState(false);
  const [sok, setSok] = useState('');
  const [antall, setAntall] = useState(60);
  const pharma = marked.selskaper.filter((s) => s.studier?.length).sort((a, b) => b.studier!.length - a.studier!.length);
  const alle = useMemo(() => pharma.flatMap((s) => s.studier!.map((x) => ({ ...x, selskap: s }))), [pharma]);
  const liste = alle.filter((x) => (!valgt.length || valgt.includes(x.selskap.orgnr)) && (!kunNorge || x.norge) &&
    (!sok || `${x.t} ${x.tilstand.join(' ')} ${x.legemiddel.join(' ')}`.toLowerCase().includes(sok.toLowerCase())))
    .sort((a, b) => Number(!!b.norge) - Number(!!a.norge) || String(a.ferdig).localeCompare(String(b.ferdig)));
  const spec: GrafSpec = useMemo(() => {
    const topp = pharma.slice(0, 20);
    return {
      id: 'pipeline-selskap', tittel: 'Pågående fase 3-studier per selskap', undertittel: 'Studier med og uten norske studiesentre', form: 'liggende', stablet: true, enhet: 'studier',
      kilde: 'Kilde: ClinicalTrials.gov (selskapet som hovedsponsor). Bearbeidet av Wergeland Apenes.',
      kategorier: topp.map((s) => s.navn),
      serier: [
        { navn: 'Med norske sentre', farge: '#E5402A', data: topp.map((s) => s.studier!.filter((x) => x.norge).length) },
        { navn: 'Uten norske sentre', farge: '#2F86B8', data: topp.map((s) => s.studier!.filter((x) => !x.norge).length) },
      ],
    };
  }, [pharma]);
  return (
    <>
      <p className="ingress">Legemidler i sen fase (fase 3) hos selskapene i listen. Studier med norske studiesentre er de tidligste signalene om at et legemiddel kan komme til Norge – og at norske fagmiljøer allerede kjenner det.</p>
      <div className="lokale-filtre">
        <label className="bryter"><input type="checkbox" checked={kunNorge} onChange={(e) => setKunNorge(e.target.checked)} /> Bare studier med norske sentre</label>
        <input className="sokefelt" type="search" placeholder="Søk sykdom eller legemiddel – f.eks. «myelom», «Alzheimer»" value={sok} onChange={(e) => setSok(e.target.value)} />
      </div>
      <Chips valg={pharma.map((s) => ({ id: s.orgnr, navn: s.navn.replace(/\s*\(.*\)/, '') }))} valgt={valgt} sett={setValgt} />
      <div className="rutenett-sidepanel">
        <Seksjon tittel={`Studier (${liste.length})`}>
          <table className="tabell bred">
            <thead><tr><th>Legemiddel</th><th>Sykdom</th><th>Selskap</th><th>Ferdig</th></tr></thead>
            <tbody>{liste.slice(0, antall).map((x) => (
              <tr key={`${x.selskap.orgnr}-${x.id}`}>
                <td>{x.norge && <b className="norge">NO </b>}<a href={`https://clinicaltrials.gov/study/${x.id}`} target="_blank" rel="noreferrer">{x.legemiddel.join(', ') || x.id}</a><br /><span className="dempet liten-tekst">{x.t.slice(0, 140)}</span></td>
                <td className="liten-tekst">{x.tilstand.join(', ')}</td>
                <td className="liten-tekst">{x.selskap.navn}</td>
                <td className="liten-tekst">{x.ferdig?.slice(0, 7) || '–'}</td>
              </tr>
            ))}</tbody>
          </table>
          {antall < liste.length && <button className="knapp knapp-lys vis-flere" onClick={() => setAntall(antall + 100)}>Vis flere ({liste.length - antall} igjen)</button>}
        </Seksjon>
        <aside><Graf spec={spec} hoyde={520} /></aside>
      </div>
    </>
  );
}

export function Marked({ visning }: { visning: 'selskaper' | 'kommer' | 'pipeline' }) {
  const { data: marked, feil } = useLat<MarkedData>('/api/marked');
  const { data: acc } = useLat<AccessData>('/api/access');
  const k = useKoblinger(marked, acc);
  if (feil) return <p className="tomt">Kunne ikke laste markedsdata.</p>;
  if (!marked) return <p className="laster"><span className="spinner" /> Laster selskaper …</p>;
  if (!marked.selskaper?.length) return <p className="tomt">Selskapsdata hentes ved neste automatiske oppdatering.</p>;
  if (visning === 'kommer') return acc ? <KommerTilNorge marked={marked} acc={acc} k={k} /> : <p className="laster"><span className="spinner" /> Laster EMA-data …</p>;
  if (visning === 'pipeline') return <Pipeline marked={marked} />;
  return <Selskaper marked={marked} k={k} />;
}
