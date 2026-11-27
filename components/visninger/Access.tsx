'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Stat, Segment, Chips, ElementListe } from '../felles';
import { Graf } from '../Graf';
import { useLat } from './Innspill';
import { useNyheter, NyhetRad } from './Nyheter';
import { datoKort } from '@/lib/analyse';
import type { AccessData, EmaHendelse, ForumMote, Metode } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

const BSF: Record<string, { navn: string; farge: string }> = {
  innfort: { navn: 'Innført', farge: '#2E9E6E' },
  'ikke-innfort': { navn: 'Ikke innført', farge: '#E5402A' },
  utsatt: { navn: 'Utsatt / ny vurdering', farge: '#DDA21A' },
  annet: { navn: 'Annet', farge: '#8A877F' },
};
const BF: Record<string, { navn: string; farge: string }> = {
  full: { navn: 'Full metodevurdering', farge: '#2F86B8' },
  forenklet: { navn: 'Forenklet metodevurdering', farge: '#8A5AB0' },
  prisnotat: { navn: 'Prisnotat (Sykehusinnkjøp)', farge: '#2E9E6E' },
  'ikke-oppdrag': { navn: 'Ikke oppdrag', farge: '#E5402A' },
  utsatt: { navn: 'Utsatt', farge: '#DDA21A' },
  avsluttet: { navn: 'Avsluttet', farge: '#B5651D' },
  opprettholdt: { navn: 'Oppdrag opprettholdt', farge: '#8A877F' },
  orientering: { navn: 'Orientering', farge: '#8A877F' },
  annet: { navn: 'Annet', farge: '#8A877F' },
};
const EMA: Record<EmaHendelse['type'], { navn: string; farge: string }> = {
  opinion: { navn: 'Positiv CHMP-opinion', farge: '#2F86B8' },
  godkjent: { navn: 'Markedsføringstillatelse', farge: '#2E9E6E' },
  avslag: { navn: 'Avslag', farge: '#E5402A' },
  trukket: { navn: 'Søknad trukket', farge: '#DDA21A' },
};
const BESTILT = ['full', 'forenklet', 'prisnotat'];
const dagerMellom = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
const median = (l: number[]) => { if (!l.length) return null; const s = [...l].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const ACCESS_ORD = /blå resept|blåresept|refusjon|nye metoder|beslutningsforum|bestillerforum|metodevurder|sykehusinnkjøp|legemiddeltilgang|tilgang til (nye )?(legemidler|medisiner|behandling)|direktoratet for medisinske produkter|\bdmp\b|fullmaktsgrense|prioriteringsmelding|prioriteringskriter|kostnadseffektiv|terskelverdi/i;

function Merke({ m }: { m?: { navn: string; farge: string } }) {
  if (!m) return null;
  return <span className="merke"><i className="prikk" style={{ background: m.farge }} />{m.navn}</span>;
}

/** Tilgangsløpet fra Access-modellen, med tall fra dataene der vi har dem. */
function Lop({ steg }: { steg: { nr?: string; navn: string; aktor: string; tall?: string; merk?: string; flaskehals?: string }[] }) {
  return (
    <ol className="lop">
      {steg.map((s, i) => (
        <li key={i} className={s.flaskehals ? 'flaskehals' : ''}>
          <span className="eyebrow">{s.nr ? `${s.nr} · ` : ''}{s.navn}</span>
          <strong>{s.aktor}</strong>
          {s.tall && <span className="lop-tall">{s.tall}</span>}
          {s.merk && <span className="dempet liten-tekst">{s.merk}</span>}
          {s.flaskehals && <span className="lop-flaske">{s.flaskehals}</span>}
        </li>
      ))}
    </ol>
  );
}

function MoteListe({ moter, kart, status }: { moter: ForumMote[]; kart: Record<string, { navn: string; farge: string }>; status: string[] }) {
  const [antall, setAntall] = useState(6);
  const vis = moter.map((m) => ({ ...m, saker: (m.saker || []).filter((s) => !status.length || status.includes(s.status)) })).filter((m) => m.saker.length || (m.skannet && !status.length));
  if (!vis.length) return <p className="tomt">Ingen saker i utvalget.</p>;
  return (
    <>
      {vis.slice(0, antall).map((m) => (
        <div key={m.dato} className="mote">
          <h4>
            {datoKort(m.dato)}
            {m.dokumenter.protokoll && <a className="lenkeknapp liten" href={m.dokumenter.protokoll} target="_blank" rel="noreferrer">Protokoll (PDF)</a>}
            {m.dokumenter.saksliste && <a className="lenkeknapp liten" href={m.dokumenter.saksliste} target="_blank" rel="noreferrer">Saksliste</a>}
            {m.dokumenter.sakspapirer && <a className="lenkeknapp liten" href={m.dokumenter.sakspapirer} target="_blank" rel="noreferrer">Sakspapirer</a>}
          </h4>
          {m.skannet && <p className="dempet liten-tekst">Protokollen er en skannet PDF og kan ikke leses automatisk – åpne den for å se beslutningene.</p>}
          <ul className="elementer">
            {m.saker.map((s, i) => (
              <li key={i} className="element">
                <div className="element-meta"><span className="type">{s.ider.join(', ')}</span><Merke m={kart[s.status]} /></div>
                <div className="element-innhold">
                  <p className="element-tittel">{s.tittel}</p>
                  <p className="dempet liten-tekst">{s.beslutning}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {antall < vis.length && <button className="knapp knapp-lys vis-flere" onClick={() => setAntall(antall + 10)}>Vis flere møter ({vis.length - antall} igjen)</button>}
    </>
  );
}

function MetodeKort({ id, m, ema }: { id: string; m: Metode; ema?: EmaHendelse[] }) {
  const bf = m.h.find((h) => h.f === 'bf' && BESTILT.includes(h.s));
  const bsf = [...m.h].reverse().find((h) => h.f === 'bsf');
  return (
    <li className="element">
      <div className="element-meta">
        <span className="type">{id}</span>
        {bsf ? <Merke m={BSF[bsf.s]} /> : bf ? <span className="merke"><i className="prikk" style={{ background: '#2F86B8' }} />Bestilt – ikke besluttet ennå</span> : null}
        {bf && bsf && <span className="dempet liten-tekst">{dagerMellom(bf.d, bsf.d)} dager fra bestilling til beslutning</span>}
      </div>
      <div className="element-innhold">
        <p className="element-tittel">{m.tittel}</p>
        <ol className="tidslinje">
          {ema?.map((e, i) => <li key={`e${i}`}><time>{datoKort(e.dato)}</time> EMA: {EMA[e.type].navn} ({e.navn})</li>)}
          {m.h.map((h, i) => (
            <li key={i}>
              <time>{datoKort(h.d)}</time> {h.f === 'bf' ? 'Bestillerforum' : 'Beslutningsforum'}: <b>{(h.f === 'bf' ? BF : BSF)[h.s]?.navn || h.s}</b>
              {h.u && <> · <a href={h.u} target="_blank" rel="noreferrer">protokoll</a></>}
              <span className="dempet liten-tekst"> – {h.b.slice(0, 220)}{h.b.length > 220 ? ' …' : ''}</span>
            </li>
          ))}
        </ol>
      </div>
    </li>
  );
}

export function Access() {
  const { data: acc, feil } = useLat<AccessData>('/api/access');
  const { data, filtrert } = useData();
  const { liste: nyheter } = useNyheter();
  const [visning, setVisning] = useState<'beslutning' | 'bestilling' | 'ema' | 'metode' | 'politisk'>('beslutning');
  const [bsfStatus, setBsfStatus] = useState<string[]>([]);
  const [bfStatus, setBfStatus] = useState<string[]>([]);
  const [emaType, setEmaType] = useState<EmaHendelse['type'][]>([]);
  const [emaFlagg, setEmaFlagg] = useState<string[]>([]);
  const [sok, setSok] = useState('');
  const [emaAntall, setEmaAntall] = useState(40);

  const beregnet = useMemo(() => {
    if (!acc) return null;
    const aar = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const bsfSaker = (acc.beslutningsforum || []).filter((m) => m.dato >= aar).flatMap((m) => m.saker || []);
    const bfSaker = (acc.bestillerforum || []).filter((m) => m.dato >= aar).flatMap((m) => m.saker || []);
    const metoder = Object.entries(acc.metoder || {});
    const tider: number[] = [];
    let underArbeid = 0;
    for (const [, m] of metoder) {
      const bf = m.h.find((h) => h.f === 'bf' && BESTILT.includes(h.s));
      const bsf = m.h.find((h) => h.f === 'bsf' && bf && h.d > bf.d);
      if (bf && bsf) tider.push(dagerMellom(bf.d, bsf.d));
      const sisteBf = [...m.h].reverse().find((h) => h.f === 'bf');
      if (sisteBf && BESTILT.includes(sisteBf.s) && !m.h.some((h) => h.f === 'bsf' && h.d > sisteBf.d)) underArbeid++;
    }
    const ema = (acc.ema || []).filter((e) => e.dato >= aar);
    return {
      innfort: bsfSaker.filter((s) => s.status === 'innfort').length,
      ikke: bsfSaker.filter((s) => s.status === 'ikke-innfort').length,
      bestilt: bfSaker.filter((s) => BESTILT.includes(s.status)).length,
      prisnotat: bfSaker.filter((s) => s.status === 'prisnotat').length,
      full: bfSaker.filter((s) => s.status === 'full' || s.status === 'forenklet').length,
      ikkeOppdrag: bfSaker.filter((s) => s.status === 'ikke-oppdrag').length,
      underArbeid, median: median(tider), antallTider: tider.length,
      emaOpinion: ema.filter((e) => e.type === 'opinion').length, emaGodkjent: ema.filter((e) => e.type === 'godkjent').length,
    };
  }, [acc]);

  const kvartalSpec: GrafSpec | null = useMemo(() => {
    if (!acc?.beslutningsforum) return null;
    const kv = (d: string) => `${d.slice(0, 4)} K${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;
    const kvartaler = [...new Set(acc.beslutningsforum.map((m) => kv(m.dato)))].sort();
    return {
      id: 'access-bsf-kvartal', tittel: 'Beslutninger i Beslutningsforum', undertittel: 'Antall metoder per kvartal', form: 'stolpe', stablet: true, enhet: 'metoder',
      kilde: 'Kilde: Protokoller fra Beslutningsforum for nye metoder (nyemetoder.no). Bearbeidet av Wergeland Apenes.',
      kategorier: kvartaler,
      serier: (['innfort', 'ikke-innfort', 'utsatt'] as const).map((s) => ({
        navn: BSF[s].navn, farge: BSF[s].farge,
        data: kvartaler.map((k) => acc.beslutningsforum!.filter((m) => kv(m.dato) === k).flatMap((m) => m.saker || []).filter((x) => x.status === s).length),
      })),
    };
  }, [acc]);

  const bfSpec: GrafSpec | null = useMemo(() => {
    if (!acc?.bestillerforum) return null;
    const aar = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const saker = acc.bestillerforum.filter((m) => m.dato >= aar).flatMap((m) => m.saker || []);
    const typer = Object.keys(BF).filter((s) => saker.some((x) => x.status === s)).sort((a, b) => saker.filter((x) => x.status === b).length - saker.filter((x) => x.status === a).length);
    return {
      id: 'access-bf-typer', tittel: 'Hva bestiller Bestillerforum?', undertittel: 'Beslutninger om metoder siste 12 måneder', form: 'liggende', enhet: 'metoder',
      kilde: 'Kilde: Protokoller fra Bestillerforum for nye metoder (nyemetoder.no). Bearbeidet av Wergeland Apenes.',
      kategorier: typer.map((s) => BF[s].navn),
      serier: [{ navn: 'Metoder', data: typer.map((s) => saker.filter((x) => x.status === s).length), fargerPerPunkt: typer.map((s) => BF[s].farge) }],
    };
  }, [acc]);

  const emaVis = useMemo(() => (acc?.ema || []).filter((e) =>
    (!emaType.length || emaType.includes(e.type)) &&
    emaFlagg.every((f) => (e as unknown as Record<string, unknown>)[f]) &&
    (!sok || `${e.navn} ${e.virkestoff} ${e.omrade.join(' ')} ${e.innehaver}`.toLowerCase().includes(sok.toLowerCase()))), [acc, emaType, emaFlagg, sok]);

  const metodeTreff = useMemo(() => {
    if (!acc?.metoder) return [];
    const q = sok.trim().toLowerCase();
    const l = Object.entries(acc.metoder).filter(([id, m]) => !q || `${id} ${m.tittel}`.toLowerCase().includes(q));
    return l.sort((a, b) => (b[1].h.at(-1)?.d || '').localeCompare(a[1].h.at(-1)?.d || '')).slice(0, 60);
  }, [acc, sok]);

  const emaPerMetode = useMemo(() => {
    const m = new Map<string, EmaHendelse[]>();
    for (const e of acc?.ema || []) for (const id of e.nm || []) m.set(id, [...(m.get(id) || []), e]);
    return m;
  }, [acc]);

  const politisk = useMemo(() => filtrert.filter((e) => ACCESS_ORD.test(`${e.tittel} ${e.fullTittel || ''} ${e.beskrivelse || ''}`)), [filtrert]);
  const etatNyheter = nyheter.filter((n) => ['dmp', 'sykehusinnkjop', 'nyemetoder', 'ema'].includes(n.k));

  if (feil) return <p className="tomt">Kunne ikke laste Access-data.</p>;
  if (!acc || !beregnet) return <p className="laster"><span className="spinner" /> Laster Access-data …</p>;

  const b = beregnet;
  return (
    <>
      <p className="ingress">
        Tilgangsløpet for nye legemidler og metoder, fra godkjenning i EMA til beslutning i Beslutningsforum – og det politiske løpet for blå resept.
        Strukturen følger WA Helses Access-modell. Tallene gjelder siste 12 måneder.
      </p>
      <Seksjon tittel="Tilgangsløpet – sykehuslegemidler (Nye metoder)">
        <Lop steg={[
          { navn: 'Godkjenning', aktor: 'EMA → DMP', tall: `${b.emaOpinion + b.emaGodkjent}`, merk: `${b.emaOpinion} positive opinions, ${b.emaGodkjent} nye MT` },
          { nr: '1', navn: 'Bestilling', aktor: 'Bestillerforum', tall: `${b.bestilt}`, merk: `metoder bestilt · ${b.ikkeOppdrag} fikk ikke oppdrag`, flaskehals: 'Flaskehals 1' },
          { nr: '2', navn: 'Metodevurdering', aktor: 'DMP', tall: `${b.full}`, merk: `fulle/forenklede vurderinger bestilt · ${b.underArbeid} bestilte metoder uten registrert beslutning`, flaskehals: 'Flaskehals 2' },
          { nr: '3', navn: 'Prisforhandling', aktor: 'Sykehusinnkjøp', tall: `${b.prisnotat}`, merk: 'prisnotater bestilt', flaskehals: 'Flaskehals 3' },
          { nr: '4', navn: 'Anbefaling', aktor: 'Fagdirektørene', merk: 'Lukket – anbefalingen publiseres ikke før beslutningen' },
          { nr: '5', navn: 'Beslutning', aktor: 'Beslutningsforum', tall: `${b.innfort} / ${b.ikke}`, merk: `innført / ikke innført${b.innfort + b.ikke ? ` · ${Math.round((100 * b.ikke) / (b.innfort + b.ikke))} % nei` : ''}` },
        ]} />
        <p className="dempet liten-tekst">
          {b.median !== null && <>Median tid fra bestilling i Bestillerforum til beslutning i Beslutningsforum: <b>{b.median} dager</b> ({b.antallTider} metoder i dataene, inkludert forenklede løp). </>}
          Protokollene leses automatisk (Bestillerforum fra 2023, Beslutningsforum fra 2024). Noen eldre protokoller er skannet og kan ikke leses maskinelt.
        </p>
      </Seksjon>

      <div className="lokale-filtre">
        <Segment etikett="Visning" verdi={visning} sett={setVisning} valg={[
          { id: 'beslutning', navn: 'Beslutningsforum' }, { id: 'bestilling', navn: 'Bestillerforum' }, { id: 'ema', navn: 'EMA' },
          { id: 'metode', navn: 'Finn metode' }, { id: 'politisk', navn: 'Blå resept og politikk' },
        ]} />
        {(visning === 'ema' || visning === 'metode') && <input className="sokefelt" type="search" placeholder={visning === 'ema' ? 'Søk legemiddel, virkestoff, område …' : 'Søk ID, legemiddel eller indikasjon …'} value={sok} onChange={(e) => setSok(e.target.value)} />}
      </div>

      {visning === 'beslutning' && (
        <div className="rutenett-sidepanel">
          <Seksjon tittel="Møter i Beslutningsforum">
            <Chips valg={Object.entries(BSF).map(([id, x]) => ({ id, navn: x.navn }))} valgt={bsfStatus} sett={setBsfStatus} farge={(id) => BSF[id].farge} />
            <MoteListe moter={acc.beslutningsforum || []} kart={BSF} status={bsfStatus} />
          </Seksjon>
          <aside>{kvartalSpec && <Graf spec={kvartalSpec} />}</aside>
        </div>
      )}
      {visning === 'bestilling' && (
        <div className="rutenett-sidepanel">
          <Seksjon tittel="Møter i Bestillerforum">
            <Chips valg={Object.entries(BF).filter(([id]) => id !== 'annet').map(([id, x]) => ({ id, navn: x.navn }))} valgt={bfStatus} sett={setBfStatus} farge={(id) => BF[id].farge} />
            <MoteListe moter={acc.bestillerforum || []} kart={BF} status={bfStatus} />
          </Seksjon>
          <aside>{bfSpec && <Graf spec={bfSpec} />}</aside>
        </div>
      )}
      {visning === 'ema' && (
        <Seksjon tittel={`EMA – siste to år (${emaVis.length})`}>
          <div className="lokale-filtre">
            <Chips valg={(Object.keys(EMA) as EmaHendelse['type'][]).map((id) => ({ id, navn: EMA[id].navn }))} valgt={emaType} sett={setEmaType} farge={(id) => EMA[id].farge} />
            <Chips valg={[{ id: 'orphan', navn: 'Sjeldne (orphan)' }, { id: 'prime', navn: 'PRIME' }, { id: 'atmp', navn: 'Avansert terapi (ATMP)' }, { id: 'betinget', navn: 'Betinget godkjenning' }]} valgt={emaFlagg} sett={setEmaFlagg} />
          </div>
          <ul className="elementer">
            {emaVis.slice(0, emaAntall).map((e, i) => (
              <li key={i} className="element">
                <div className="element-meta"><Merke m={EMA[e.type]} /><time>{datoKort(e.dato)}</time></div>
                <div className="element-innhold">
                  <p className="element-tittel"><a href={e.url} target="_blank" rel="noreferrer">{e.navn}</a> <span className="dempet">({e.virkestoff})</span></p>
                  {e.indikasjon && <p className="dempet liten-tekst">{e.indikasjon.slice(0, 260)}{e.indikasjon.length > 260 ? ' …' : ''}</p>}
                  <div className="element-merker">
                    {e.omrade.map((o) => <span key={o} className="stikkord">{o}</span>)}
                    {e.orphan && <span className="stikkord">Orphan</span>}{e.prime && <span className="stikkord">PRIME</span>}{e.atmp && <span className="stikkord">ATMP</span>}
                    {e.betinget && <span className="stikkord">Betinget</span>}{e.biotilsvarende && <span className="stikkord">Biotilsvarende</span>}{e.generisk && <span className="stikkord">Generisk</span>}
                    {e.innehaver && <span className="dempet liten-tekst">{e.innehaver}</span>}
                    {e.nm?.map((id) => <button key={id} className="tema-merke" onClick={() => { setSok(id); setVisning('metode'); }}>Nye metoder {id}</button>)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {emaAntall < emaVis.length && <button className="knapp knapp-lys vis-flere" onClick={() => setEmaAntall(emaAntall + 80)}>Vis flere ({emaVis.length - emaAntall} igjen)</button>}
          <p className="dempet liten-tekst">Kilde: EMAs åpne legemiddeldata. Etter positiv opinion fra CHMP fatter EU-kommisjonen vedtak om markedsføringstillatelse, normalt innen 67 dager. Deretter kan legemidlet bestilles inn i Nye metoder.</p>
        </Seksjon>
      )}
      {visning === 'metode' && (
        <Seksjon tittel={sok ? `Metoder som matcher «${sok}»` : 'Sist behandlede metoder'}>
          {metodeTreff.length === 0 && <p className="tomt">Ingen metoder funnet. Søk på ID (f.eks. ID2025_052), virkestoff eller merkenavn.</p>}
          <ul className="elementer">{metodeTreff.map(([id, m]) => <MetodeKort key={id} id={id} m={m} ema={emaPerMetode.get(id)} />)}</ul>
        </Seksjon>
      )}
      {visning === 'politisk' && (
        <>
          <Seksjon tittel="Det politiske løpet – blå resept (primærhelsetjenesten)">
            <Lop steg={[
              { navn: 'Godkjenning', aktor: 'EMA → DMP' },
              { nr: '1', navn: 'Metodevurdering', aktor: 'DMP, blå resept', merk: 'Under 100 mill. kr i årlig merkostnad vedtar DMP selv', flaskehals: 'Flaskehals 1' },
              { nr: '2', navn: 'Departementet', aktor: 'HOD prioriterer', merk: 'Ingen frist for når HOD må fremme saken', flaskehals: 'Flaskehals 2' },
              { nr: '3', navn: 'Statsbudsjettet', aktor: 'Regjeringen, Prop. 1 S', merk: 'Ikke med i oktober = 12 mnd. til neste sjanse', flaskehals: 'Flaskehals 3' },
              { nr: '4', navn: 'Vedtak', aktor: 'Stortinget', merk: 'Budsjettforlik og vedtak i desember' },
            ]} />
            <p className="dempet liten-tekst">Kilde: Legemiddelforskriften § 14-7 (fullmaktsgrense, presisert per bruksområde fra 1. juli 2026); WA Helses Access-modell. Se Kalender-fanen for budsjettåret.</p>
          </Seksjon>
          <div className="rutenett-2">
            <Seksjon tittel={`Siste fra DMP, Sykehusinnkjøp og EMA (${etatNyheter.length})`}>
              {etatNyheter.length === 0 ? <p className="tomt">Ingen saker ennå.</p> : <ul className="elementer">{etatNyheter.slice(0, 25).map((n) => <NyhetRad key={n.url} n={n} />)}</ul>}
            </Seksjon>
            <Seksjon tittel={`På Stortinget og i regjeringen (${politisk.length})`}>
              <p className="dempet liten-tekst">Spørsmål, saker og høringer om blå resept, refusjon, Nye metoder, DMP og prioritering – i valgt periode.</p>
              <ElementListe liste={politisk} side={15} />
            </Seksjon>
          </div>
        </>
      )}
      {data.nyhetskilder?.some((k) => k.id === 'sykehusinnkjop' && k.status && !k.status.funnet) && (
        <p className="dempet liten-tekst">Sykehusinnkjøp var ikke tilgjengelig ved siste oppdatering.</p>
      )}
    </>
  );
}
