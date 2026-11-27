'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Data } from '@/lib/types';
import { sok, sesjonKort, datoTid, sesjonerI, settMndStart } from '@/lib/analyse';
import { DataCtx, Chips, Segment, type Filtre } from './felles';
import { SamlingProvider, SamlingKnapp } from './Samling';
import { PersonPanel } from './PersonPanel';
import { Oversikt } from './visninger/Oversikt';
import { Komite } from './visninger/Komite';
import { Sporsmal } from './visninger/Sporsmal';
import { Saker } from './visninger/Saker';
import { Regjeringen } from './visninger/Regjeringen';
import { Temaer } from './visninger/Temaer';
import { StoreEndringer } from './visninger/StoreEndringer';
import { Voteringer } from './visninger/Voteringer';
import { Innspill } from './visninger/Innspill';
import { Debatter } from './visninger/Debatter';
import { Overvaking } from './visninger/Overvaking';
import { Kalender } from './visninger/Kalender';
import { Nyheter } from './visninger/Nyheter';
import { Access, type AccessVisning } from './visninger/Access';
import { Marked } from './visninger/Marked';
import { Selskapsradar } from './visninger/Selskapsradar';

// Seks hovedfaner; de med flere visninger har undervalg. Adressen er #hovedfane/undervalg.
const FANER = [
  { id: 'oversikt', navn: 'Oversikt', under: [
    { id: 'sammendrag', navn: 'Sammendrag' }, { id: 'kalender', navn: 'Kalender' }, { id: 'temaer', navn: 'Temaer' }, { id: 'endringer', navn: 'Store endringer' },
  ] },
  { id: 'politikk', navn: 'Politikk', under: [
    { id: 'sporsmal', navn: 'Spørsmål' }, { id: 'saker', navn: 'Saker og høringer' }, { id: 'innspill', navn: 'Høringsinnspill' }, { id: 'debatter', navn: 'Debatter' },
    { id: 'voteringer', navn: 'Voteringer' }, { id: 'komite', navn: 'Komiteen' }, { id: 'regjeringen', navn: 'Regjeringen' },
  ] },
  { id: 'access', navn: 'Access', under: [
    { id: 'lopet', navn: 'Tilgangsløpet' }, { id: 'beslutning', navn: 'Beslutningsforum' }, { id: 'bestilling', navn: 'Bestillerforum' },
    { id: 'ema', navn: 'EMA' }, { id: 'metode', navn: 'Finn metode' }, { id: 'blaresept', navn: 'Blå resept og politikk' },
  ] },
  { id: 'marked', navn: 'Marked', under: [
    { id: 'selskaper', navn: 'Selskaper' }, { id: 'sammenlign', navn: 'Sammenlign' }, { id: 'kommer', navn: 'Kommer til Norge' }, { id: 'pipeline', navn: 'Pipeline' },
  ] },
  { id: 'nyheter', navn: 'Nyheter', under: [] },
  { id: 'kunder', navn: 'Kunder', under: [{ id: 'radar', navn: 'Selskapsradar' }, { id: 'lister', navn: 'Egne søkelister' }] },
] as const;
type Hoved = (typeof FANER)[number]['id'];
export type Visning = Hoved | (typeof FANER)[number]['under'][number]['id'];
// Hovedfane for hver visning (også gamle adresser som #sporsmal)
const FORELDER: Record<string, Hoved> = Object.fromEntries(FANER.flatMap((f) => [[f.id, f.id], ...f.under.map((u) => [u.id, f.id])])) as Record<string, Hoved>;
FORELDER.overvaking = 'kunder';
// Faner der de globale filtrene (periode, kategori, søk) gir mening
const MED_FILTER = new Set<Hoved>(['oversikt', 'politikk', 'nyheter', 'kunder']);

// Kort forklaring øverst i hver visning
const INTRO: Record<string, string> = {
  kalender: 'Her kan du se hva som skjer de neste månedene: høringer, høringsfrister, frister for komiteens innstilling, debatter i salen og viktige datoer i budsjettåret.',
  temaer: 'Her kan du utforske helsepolitikken tema for tema – fra kreft og legemiddeltilgang til psykisk helse og digitalisering. Klikk på et tema for undertemaer, utvikling over tid og alle saker.',
  endringer: 'Her kan du se saker som kan bety omfattende endringer: nye lover og forskrifter, reformer, endret finansiering og nedleggelser. Sakene flagges automatisk ut fra nøkkelord, og grunnen står under hver sak.',
  sporsmal: 'Her kan du se alle helsespørsmål fra stortingsrepresentantene – skriftlige spørsmål, spørretimen og interpellasjoner – og sammenligne partier, representanter og temaer.',
  saker: 'Her kan du følge sakene Stortinget behandler og høringene i komiteene, med status, saksordfører og frister.',
  innspill: 'Her kan du se hvem som har levert høringsinnspill eller deltatt i komiteens høringer, og hva de har sagt.',
  debatter: 'Her kan du lese hva representantene og statsrådene har sagt i helsedebattene i Stortinget og i spørretimen.',
  voteringer: 'Her kan du se hvordan partiene har stemt i helsesaker, og hvor ofte de stemmer likt med hverandre.',
  komite: 'Her kan du bli kjent med Helse- og omsorgskomiteen: medlemmene, rollene og hvor aktive de er.',
  regjeringen: 'Her kan du følge Helse- og omsorgsdepartementet: nyheter, dokumenter og høringer, og se den politiske ledelsen.',
  beslutning: 'Her kan du se alle beslutninger i Beslutningsforum – om nye legemidler og metoder skal tas i bruk i sykehusene – møte for møte, med beslutning og selskap.',
  bestilling: 'Her kan du se hva Bestillerforum har bestilt: hvilke legemidler og metoder som skal vurderes, og hvilken type vurdering de får.',
  ema: 'Her kan du følge EMA: hvilke legemidler som har fått positiv anbefaling, godkjenning, avslag eller trukket søknaden i EU de siste to årene.',
  metode: 'Her kan du søke opp et legemiddel, et selskap eller en metode og se hele løpet – fra EMA og bestilling til beslutning.',
  blaresept: 'Her kan du følge det politiske løpet for legemidler på blå resept, og hva som skjer på Stortinget og hos etatene.',
  selskaper: 'Her kan du se de største helseselskapene i Norge per sektor, med ansatte, omsetning og resultat. Klikk på et selskap for regnskap, EMA-saker, studier og omtale.',
  nyheter: 'Her kan du lese siste nytt fra Dagens Medisin, Medwatch og helsemyndighetene, sortert etter tema. Søkefeltet og kategoriene øverst gjelder også her.',
  lister: 'Her kan du sette opp egne søkelister – for eksempel for en kunde eller et produkt – og se alle treff i Stortinget, regjeringen, høringsinnspill, debatter og nyheter.',
};

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [feil, setFeil] = useState('');
  const [hoved, setHoved] = useState<Hoved>('oversikt');
  const [under, setUnder] = useState<Record<string, string>>({ oversikt: 'sammendrag', politikk: 'sporsmal', access: 'lopet', marked: 'selskaper', kunder: 'radar' });
  const [filtre, setF] = useState<Filtre>({ sesjon: 'p:2025-2029', kategorier: [], sok: '', kunStore: false });
  const [person, setPerson] = useState<string | null>(null);
  const [visFiltre, setVisFiltre] = useState(false);
  const [tema, setTema] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data')
      .then((r) => { if (r.status === 401) { location.href = '/login'; throw new Error('401'); } return r.json(); })
      .then(setData)
      .catch((e) => e.message !== '401' && setFeil('Kunne ikke laste data.'));
    const [a, b] = location.hash.slice(1).split('/');
    const h = FORELDER[b || a] || FORELDER[a];
    if (h) { setHoved(h); const u = b || (a !== h ? a : ''); if (u && FORELDER[u] === h && u !== h) setUnder((x) => ({ ...x, [h]: u })); }
  }, []);
  // Gå til en hovedfane eller en undervisning (f.eks. 'sporsmal' åpner Politikk › Spørsmål)
  const byttFane = useCallback((v: Visning | 'overvaking') => {
    const h = FORELDER[v];
    if (!h) return;
    setHoved(h);
    if (v !== h) setUnder((x) => ({ ...x, [h]: v }));
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const u = under[hoved];
    const har = FANER.find((f) => f.id === hoved)!.under.length > 0;
    history.replaceState(null, '', `#${hoved}${har && u ? '/' + u : ''}`);
  }, [hoved, under]);

  const filtrert = useMemo(() => {
    if (!data) return [];
    let l = data.elementer;
    const ses = new Set(sesjonerI(filtre.sesjon, data));
    l = l.filter((e) => ses.has(e.sesjon));
    if (filtre.kategorier.length) l = l.filter((e) => filtre.kategorier.includes(e.kategori));
    if (filtre.kunStore) l = l.filter((e) => e.storEndring);
    if (filtre.sok) l = sok(l, filtre.sok, data);
    return l;
  }, [data, filtre]);

  const ctx = useMemo(() => {
    if (!data) return null;
    const tm = Object.fromEntries(data.taksonomi.temaer.map((t) => [t.id, t.navn]));
    const um = Object.fromEntries(data.taksonomi.temaer.flatMap((t) => (t.undertemaer || []).map((u) => [u.id, u.navn])));
    const kf = Object.fromEntries(data.taksonomi.kategorier.map((k) => [k.id, k.farge]));
    const kn = Object.fromEntries(data.taksonomi.kategorier.map((k) => [k.id, k.navn]));
    const sesjoner = sesjonerI(filtre.sesjon, data);
    settMndStart(sesjoner[0] ? `${sesjoner[0].slice(0, 4)}-10` : '2025-10');
    return {
      data, filtre, filtrert, sesjoner,
      setFiltre: (f: Partial<Filtre>) => setF((g) => ({ ...g, ...f })),
      visPerson: setPerson,
      visTema: (id: string) => { setTema(id); setPerson(null); byttFane('temaer'); },
      temaNavn: (id: string) => tm[id] || id,
      undertemaNavn: (id: string) => um[id] || id,
      katFarge: (id: string) => kf[id] || '#8A877F',
      katNavn: (id: string) => kn[id] || id,
    };
  }, [data, filtre, filtrert, byttFane]);

  const aktivFane = FANER.find((f) => f.id === hoved)!;
  const aktivUnder = under[hoved] || aktivFane.under[0]?.id;
  const vis = (id: string) => (aktivFane.under.length ? aktivUnder === id : hoved === id);
  if (feil) return <div className="laster">{feil}</div>;
  if (!data || !ctx) return <div className="laster"><span className="spinner" /> Laster helsepolitiske data …</div>;

  return (
    <DataCtx.Provider value={ctx}>
      <SamlingProvider>
        <header className="topp">
          <div className="topp-indre">
            <a className="topp-logo" href="/" aria-label="WA Helse – til forsiden">
              <img src="/wa-logo.svg" alt="Wergeland/Apenes" width={401} height={26} />
            </a>
            <span className="topp-produkt">WA Helse</span>
            <div className="topp-hoyre">
              <SamlingKnapp />
              <button className="knapp knapp--naken" onClick={async () => { await fetch('/api/logout', { method: 'POST' }); location.href = '/login'; }}>Logg ut</button>
            </div>
          </div>
          <nav className="faner" aria-label="Hovedfaner">
            <div className="faner-indre">
              {FANER.map((f) => (
                <button key={f.id} className={hoved === f.id ? 'på' : ''} aria-current={hoved === f.id ? 'page' : undefined} onClick={() => byttFane(f.id)}>
                  {f.navn}
                </button>
              ))}
            </div>
          </nav>
          {aktivFane.under.length > 0 && (
            <nav className="underfaner" aria-label={`Visninger i ${aktivFane.navn}`}>
              <div className="underfaner-indre">
                {aktivFane.under.map((u) => (
                  <button key={u.id} className={aktivUnder === u.id ? 'på' : ''} aria-current={aktivUnder === u.id ? 'page' : undefined} onClick={() => byttFane(u.id)}>
                    {u.navn}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </header>
        {hoved === 'oversikt' && aktivUnder === 'sammendrag' && (
          <div className="hero">
            <div className="innhold">
              <p className="eyebrow">Helse- og omsorgskomiteen · Stortingsperioden {data.meta.periode.replace('-', '–')}</p>
              <h1>Bedre kommunikasjon gir <em>bedre helse</em></h1>
              <p className="hero-meta">
                Oppdatert {datoTid(data.meta.oppdatert)}
              </p>
            </div>
          </div>
        )}
        {MED_FILTER.has(hoved) && <div className="filterlinje">
          <button className="filterknapp innhold" aria-expanded={visFiltre} onClick={() => setVisFiltre(!visFiltre)}>
            Filtre og søk{((filtre.sesjon !== 'p:2025-2029' ? 1 : 0) + filtre.kategorier.length + (filtre.sok ? 1 : 0) + (filtre.kunStore ? 1 : 0)) > 0 ? ` (${(filtre.sesjon !== 'p:2025-2029' ? 1 : 0) + filtre.kategorier.length + (filtre.sok ? 1 : 0) + (filtre.kunStore ? 1 : 0)} aktive)` : ''} <span aria-hidden>{visFiltre ? '▴' : '▾'}</span>
          </button>
          <div className={`innhold filterlinje-indre${visFiltre ? ' åpen' : ''}`}>
            <Segment
              etikett="Sesjon"
              verdi={filtre.sesjon}
              sett={(s) => ctx.setFiltre({ sesjon: s })}
              valg={[
                ...(data.meta.perioder || []).slice().reverse().map((p) => ({ id: `p:${p.id}`, navn: p.id.replace('-', '–') })),
                { id: 'alle', navn: 'Begge perioder' },
              ]}
            />
            <select className="sesjonvelger" aria-label="Velg én sesjon" value={filtre.sesjon.startsWith('p:') || filtre.sesjon === 'alle' ? '' : filtre.sesjon}
              onChange={(e) => ctx.setFiltre({ sesjon: e.target.value || 'p:2025-2029' })}>
              <option value="">Enkeltsesjon …</option>
              {data.meta.sesjoner.slice().reverse().map((s) => <option key={s} value={s}>{sesjonKort(s)}{s === data.meta.innevaerende ? ' (nå)' : ''}</option>)}
            </select>
            <Chips
              valg={data.taksonomi.kategorier.map((k) => ({ id: k.id, navn: k.navn }))}
              valgt={filtre.kategorier}
              sett={(v) => ctx.setFiltre({ kategorier: v })}
              farge={ctx.katFarge}
            />
            <label className="bryter"><input type="checkbox" checked={filtre.kunStore} onChange={(e) => ctx.setFiltre({ kunStore: e.target.checked })} /> Kun store endringer</label>
            <input
              className="sokefelt"
              type="search"
              placeholder="Søk i alt – f.eks. «kreft», «pollen», «Toppe»"
              value={filtre.sok}
              onChange={(e) => ctx.setFiltre({ sok: e.target.value })}
              aria-label="Søk"
            />
          </div>
        </div>}
        <main className="innhold hoved">
          {INTRO[aktivUnder || hoved] && <p className="visning-intro">{INTRO[aktivUnder || hoved]}</p>}
          {vis('sammendrag') && <Oversikt gaTil={byttFane} />}
          {vis('kalender') && <Kalender />}
          {vis('temaer') && <Temaer valgt={tema} setValgt={setTema} />}
          {vis('endringer') && <StoreEndringer />}
          {vis('sporsmal') && <Sporsmal />}
          {vis('saker') && <Saker />}
          {vis('innspill') && <Innspill />}
          {vis('debatter') && <Debatter />}
          {vis('voteringer') && <Voteringer />}
          {vis('komite') && <Komite />}
          {vis('regjeringen') && <Regjeringen />}
          {hoved === 'access' && <Access visning={aktivUnder as AccessVisning} gaTil={byttFane} />}
          {hoved === 'marked' && <Marked visning={aktivUnder as 'selskaper' | 'sammenlign' | 'kommer' | 'pipeline'} />}
          {vis('nyheter') && <Nyheter />}
          {vis('radar') && <Selskapsradar />}
          {vis('lister') && <Overvaking />}
        </main>
        <footer className="bunn">
          <div className="innhold bunn-indre">
            <img src="/wa-logo-hvit.svg" alt="Wergeland/Apenes" width={240} height={16} />
            <span>WA Helse · Oppdatert {datoTid(data.meta.oppdatert)}</span>
          </div>
        </footer>
        {person && <PersonPanel id={person} lukk={() => setPerson(null)} />}
      </SamlingProvider>
    </DataCtx.Provider>
  );
}
