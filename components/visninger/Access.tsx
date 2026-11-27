'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Stat, Segment, Chips, ElementListe } from '../felles';
import { Graf } from '../Graf';
import { useLat } from './Innspill';
import { useNyheter, NyhetRad } from './Nyheter';
import { datoKort } from '@/lib/analyse';
import type { AccessData, EmaHendelse, ForumMote, MarkedData, Metode } from '@/lib/types';
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

type Tall = { emaOpinion: number; emaGodkjent: number; bestilt: number; ikkeOppdrag: number; full: number; underArbeid: number; prisnotat: number; innfort: number; ikke: number; median: number | null; antallTider: number };

/** Forklaring av tilgangsløpet: fra EMA til beslutning, og forskjellen på sykehus og blå resept. */
function Lopet({ b }: { b: Tall }) {
  return (
    <>
      <p className="ingress">
        Et nytt legemiddel må gjennom to løp før norske pasienter får det: først <b>godkjenning</b> (markedsføringstillatelse) og deretter <b>finansiering</b>.
        Hvilket finansieringsløp det havner i, avhenger av hvem som skal betale: sykehusene eller folketrygden. Det avgjør hvem som bestemmer og om saken kan bli politisk.
      </p>

      <Seksjon tittel="1. Godkjenning: EMA → EU-kommisjonen → DMP">
        <ol className="forklaring">
          <li><b>Søknad til EMA.</b> Selskapet søker om markedsføringstillatelse for hele EU/EØS. Vurderingen tar normalt rundt ett år (kortere ved hurtigvurdering / PRIME).</li>
          <li><b>CHMP-opinion.</b> EMAs legemiddelkomité (CHMP) gir en positiv eller negativ anbefaling. <em>Dette er det første offentlige signalet om at et legemiddel kommer.</em></li>
          <li><b>Vedtak i EU-kommisjonen</b> om markedsføringstillatelse, normalt innen 67 dager etter opinion.</li>
          <li><b>DMP</b> (Direktoratet for medisinske produkter) gjør vedtaket gjeldende i Norge, normalt innen 30 dager. Legemidlet kan da selges, men ingen betaler for det ennå.</li>
        </ol>
        <p className="dempet liten-tekst">Siste 12 måneder: {b.emaOpinion} positive opinions og {b.emaGodkjent} nye markedsføringstillatelser. Se undervalget «EMA» og Marked › «Kommer til Norge».</p>
      </Seksjon>

      <Seksjon tittel="2. Finansiering: to ulike løp">
        <div className="kanaler">
          <div className="kanal">
            <p className="eyebrow">Spesialisthelsetjenesten</p>
            <h3>Sykehuslegemidler i Nye metoder</h3>
            <dl>
              <dt>Hvem betaler</dt><dd>De regionale helseforetakene (sykehusbudsjettene)</dd>
              <dt>Hvem vurderer</dt><dd>DMP, på oppdrag fra Bestillerforum. Sykehusinnkjøp forhandler pris</dd>
              <dt>Hvem beslutter</dt><dd>Beslutningsforum, det vil si de fire administrerende direktørene i RHF-ene, etter anbefaling fra fagdirektørene</dd>
              <dt>Fullmaktsgrense</dt><dd><b>Ingen.</b> Beslutningsforum kan innføre et legemiddel uansett budsjettvirkning</dd>
              <dt>Politisk nivå</dt><dd>Ikke involvert i enkeltsaker. Stortinget har vedtatt prioriteringskriteriene (nytte, ressursbruk, alvorlighet) som beslutningene skal følge</dd>
              <dt>Typiske legemidler</dt><dd>Kreft, sjeldne sykdommer, biologiske legemidler, infusjoner og andre som gis eller startes på sykehus</dd>
            </dl>
          </div>
          <div className="kanal">
            <p className="eyebrow">Primærhelsetjenesten (fastlege, kommunen, apotek)</p>
            <h3>Blå resept via folketrygden</h3>
            <dl>
              <dt>Hvem betaler</dt><dd>Folketrygden (staten, via Helfo), ikke kommunen</dd>
              <dt>Hvem vurderer</dt><dd>DMP, etter søknad fra selskapet</dd>
              <dt>Hvem beslutter</dt><dd><b>Under 100 mill. kr</b> i årlig merutgift (5. budsjettår): DMP vedtar selv.<br /><b>Over 100 mill. kr:</b> saken går til HOD, må inn i statsbudsjettet og vedtas av Stortinget</dd>
              <dt>Fullmaktsgrense</dt><dd>100 mill. kr per år (legemiddelforskriften § 14-7, presisert per bruksområde fra 1. juli 2026)</dd>
              <dt>Politisk nivå</dt><dd>Avgjørende over fullmaktsgrensen. Ingen frist for når HOD må fremme saken. Kommer den ikke med i oktober, er neste sjanse ett år senere</dd>
              <dt>Typiske legemidler</dt><dd>Legemidler for kroniske sykdommer som brukes hjemme: diabetes, astma/KOLS, hjerte–kar, overvekt</dd>
            </dl>
          </div>
        </div>
        <p className="dempet liten-tekst">Legemidler som kommunene selv gir i sykehjem og hjemmetjeneste betales over kommunebudsjettet. Medisinsk utstyr har ingen fullmaktsgrense, men kjøpes inn gjennom anbud (Sykehusinnkjøp) og vurderes i Nye metoder når det er en ny metode.</p>
      </Seksjon>

      <Seksjon tittel="3. Tilgangsløpet i Nye metoder, med tall fra protokollene">
        <Lop steg={[
          { navn: 'Godkjenning', aktor: 'EMA → DMP', tall: `${b.emaOpinion + b.emaGodkjent}`, merk: `${b.emaOpinion} positive opinions, ${b.emaGodkjent} nye MT` },
          { nr: '1', navn: 'Bestilling', aktor: 'Bestillerforum', tall: `${b.bestilt}`, merk: `metoder bestilt · ${b.ikkeOppdrag} fikk ikke oppdrag`, flaskehals: 'Flaskehals 1' },
          { nr: '2', navn: 'Metodevurdering', aktor: 'DMP', tall: `${b.full}`, merk: 'fulle eller forenklede vurderinger bestilt', flaskehals: 'Flaskehals 2' },
          { nr: '3', navn: 'Prisforhandling', aktor: 'Sykehusinnkjøp', tall: `${b.prisnotat}`, merk: 'prisnotater bestilt', flaskehals: 'Flaskehals 3' },
          { nr: '4', navn: 'Anbefaling', aktor: 'Fagdirektørene', merk: 'Lukket. Anbefalingen publiseres ikke' },
          { nr: '5', navn: 'Beslutning', aktor: 'Beslutningsforum', tall: `${b.innfort} / ${b.ikke}`, merk: `innført / ikke innført${b.innfort + b.ikke ? ` · ${Math.round((100 * b.ikke) / (b.innfort + b.ikke))} % nei` : ''}` },
        ]} />
        <div className="rutenett-3 forklaring-kort">
          <div><p className="eyebrow">Flaskehals 1 · Bestillingen</p><p>Bestillerforum avgjør hvilken type vurdering som skal gjøres: full metodevurdering, forenklet vurdering eller bare et prisnotat. En uklar bestilling, for eksempel før indikasjonen er avklart, gir forsinkelser.</p></div>
          <div><p className="eyebrow">Flaskehals 2 · Dokumentasjonen</p><p>DMP kan ikke starte før selskapet har levert komplett dokumentasjon. Det tar i snitt 208 dager. Selve vurderingen tar rundt 133 dager.</p></div>
          <div><p className="eyebrow">Flaskehals 3 · Prisen</p><p>Avslag i Beslutningsforum er nesten alltid begrunnet med pris. Et nei kan snus med et nytt pristilbud, og det tok i snitt 83 dager.</p></div>
        </div>
        <p className="dempet liten-tekst">
          {b.median !== null && <>Median tid fra bestilling i Bestillerforum til beslutning i Beslutningsforum: <b>{b.median} dager</b> ({b.antallTider} metoder i dataene, inkludert forenklede løp). </>}
          {b.underArbeid} metoder er bestilt siden 2023 uten at vi har funnet en beslutning (noen avsluttes uten å gå til Beslutningsforum, så tallet er et anslag).
          Tall for flaskehalsene er fra WA Helses Access-modell.
        </p>
      </Seksjon>
    </>
  );
}

function MoteListe({ moter, kart, status, metoder, norsk }: { moter: ForumMote[]; kart: Record<string, { navn: string; farge: string }>; status: string[]; metoder: Record<string, Metode>; norsk: (n?: string) => string | null }) {
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
          {m.skannet && <p className="dempet liten-tekst">Protokollen er en skannet PDF og kan ikke leses automatisk. Åpne den for å se beslutningene.</p>}
          <ul className="elementer">
            {m.saker.map((s, i) => (
              <li key={i} className="element">
                <div className="element-meta"><span className="type">{s.ider.join(', ')}</span><Merke m={kart[s.status]} /></div>
                <div className="element-innhold">
                  <p className="element-tittel">{s.tittel}</p>
                  <Produsent m={metoder[s.ider[0]]} norsk={norsk} />
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

function Produsent({ m, norsk }: { m?: Metode; norsk: (n?: string) => string | null }) {
  if (!m?.selskap) return null;
  const no = norsk(m.selskap);
  return <p className="produsent">Selskap: <b>{m.selskap}</b>{no && <span className="dempet"> · i Norge: {no}</span>}</p>;
}

function MetodeKort({ id, m, ema, norsk }: { id: string; m: Metode; ema?: EmaHendelse[]; norsk: (n?: string) => string | null }) {
  const bf = m.h.find((h) => h.f === 'bf' && BESTILT.includes(h.s));
  const bsf = [...m.h].reverse().find((h) => h.f === 'bsf');
  return (
    <li className="element">
      <div className="element-meta">
        <span className="type">{id}</span>
        {bsf ? <Merke m={BSF[bsf.s]} /> : bf ? <span className="merke"><i className="prikk" style={{ background: '#2F86B8' }} />Bestilt, ikke besluttet ennå</span> : null}
        {bf && bsf && <span className="dempet liten-tekst">{dagerMellom(bf.d, bsf.d)} dager fra bestilling til beslutning</span>}
      </div>
      <div className="element-innhold">
        <p className="element-tittel">{m.tittel}</p>
        <Produsent m={m} norsk={norsk} />
        <ol className="tidslinje">
          {ema?.map((e, i) => <li key={`e${i}`}><time>{datoKort(e.dato)}</time> EMA: {EMA[e.type].navn} ({e.navn})</li>)}
          {m.h.map((h, i) => (
            <li key={i}>
              <time>{datoKort(h.d)}</time> {h.f === 'bf' ? 'Bestillerforum' : 'Beslutningsforum'}: <b>{(h.f === 'bf' ? BF : BSF)[h.s]?.navn || h.s}</b>
              {h.u && <> · <a href={h.u} target="_blank" rel="noreferrer">protokoll</a></>}
              <span className="dempet liten-tekst"> · {h.b.slice(0, 220)}{h.b.length > 220 ? ' …' : ''}</span>
            </li>
          ))}
        </ol>
      </div>
    </li>
  );
}

export type AccessVisning = 'lopet' | 'beslutning' | 'bestilling' | 'ema' | 'metode' | 'blaresept';

export function Access({ visning, gaTil }: { visning: AccessVisning; gaTil: (v: AccessVisning) => void }) {
  const { data: acc, feil } = useLat<AccessData>('/api/access');
  const { data, filtrert } = useData();
  const { liste: nyheter } = useNyheter();
  const { data: marked } = useLat<MarkedData>('/api/marked');
  const norsk = useMemo(() => {
    const l = (marked?.selskaper || []).filter((x) => x.orgnr && x.match).map((x) => ({ rx: (() => { try { return new RegExp(x.match!, 'i'); } catch { return null; } })(), navn: x.navn }));
    return (n?: string) => (n ? l.find((x) => x.rx?.test(n))?.navn || null : null);
  }, [marked]);
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
    const l = Object.entries(acc.metoder).filter(([id, m]) => !q || `${id} ${m.tittel} ${m.selskap || ''} ${m.legemiddel || ''}`.toLowerCase().includes(q));
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
      {visning === 'lopet' && <Lopet b={b} />}
      {(visning === 'ema' || visning === 'metode') && (
        <div className="lokale-filtre">
          <input className="sokefelt" type="search" placeholder={visning === 'ema' ? 'Søk legemiddel, virkestoff, område, selskap …' : 'Søk ID, legemiddel, selskap eller indikasjon …'} value={sok} onChange={(e) => setSok(e.target.value)} />
        </div>
      )}

      {visning === 'beslutning' && (
        <div className="rutenett-sidepanel">
          <Seksjon tittel="Møter i Beslutningsforum">
            <Chips valg={Object.entries(BSF).map(([id, x]) => ({ id, navn: x.navn }))} valgt={bsfStatus} sett={setBsfStatus} farge={(id) => BSF[id].farge} />
            <MoteListe moter={acc.beslutningsforum || []} kart={BSF} status={bsfStatus} metoder={acc.metoder || {}} norsk={norsk} />
          </Seksjon>
          <aside>{kvartalSpec && <Graf spec={kvartalSpec} />}</aside>
        </div>
      )}
      {visning === 'bestilling' && (
        <div className="rutenett-sidepanel">
          <Seksjon tittel="Møter i Bestillerforum">
            <Chips valg={Object.entries(BF).filter(([id]) => id !== 'annet').map(([id, x]) => ({ id, navn: x.navn }))} valgt={bfStatus} sett={setBfStatus} farge={(id) => BF[id].farge} />
            <MoteListe moter={acc.bestillerforum || []} kart={BF} status={bfStatus} metoder={acc.metoder || {}} norsk={norsk} />
          </Seksjon>
          <aside>{bfSpec && <Graf spec={bfSpec} />}</aside>
        </div>
      )}
      {visning === 'ema' && (
        <Seksjon tittel={`EMA siste to år (${emaVis.length})`}>
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
                    {e.innehaver && <span className="dempet liten-tekst">{e.innehaver}{norsk(e.innehaver) ? ` · i Norge: ${norsk(e.innehaver)}` : ''}</span>}
                    {e.nm?.map((id) => <button key={id} className="tema-merke" onClick={() => { setSok(id); gaTil('metode'); }}>Nye metoder {id}</button>)}
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
          <ul className="elementer">{metodeTreff.map(([id, m]) => <MetodeKort key={id} id={id} m={m} ema={emaPerMetode.get(id)} norsk={norsk} />)}</ul>
        </Seksjon>
      )}
      {visning === 'blaresept' && (
        <>
          <Seksjon tittel="Det politiske løpet for blå resept (primærhelsetjenesten)">
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
              <p className="dempet liten-tekst">Spørsmål, saker og høringer om blå resept, refusjon, Nye metoder, DMP og prioritering i valgt periode.</p>
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
