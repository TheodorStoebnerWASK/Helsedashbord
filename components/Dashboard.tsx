'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Data } from '@/lib/types';
import { sok, sesjonKort, datoTid } from '@/lib/analyse';
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

const FANER = [
  { id: 'oversikt', navn: 'Oversikt' },
  { id: 'endringer', navn: 'Store endringer' },
  { id: 'temaer', navn: 'Temaer' },
  { id: 'sporsmal', navn: 'Spørsmål' },
  { id: 'komite', navn: 'Komiteen' },
  { id: 'voteringer', navn: 'Voteringer' },
  { id: 'saker', navn: 'Saker & høringer' },
  { id: 'innspill', navn: 'Høringsinnspill' },
  { id: 'debatter', navn: 'Debatter' },
  { id: 'regjeringen', navn: 'Regjeringen' },
] as const;
type Fane = (typeof FANER)[number]['id'];

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [feil, setFeil] = useState('');
  const [fane, setFane] = useState<Fane>('oversikt');
  const [filtre, setF] = useState<Filtre>({ sesjon: 'alle', kategorier: [], sok: '' });
  const [person, setPerson] = useState<string | null>(null);
  const [tema, setTema] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data')
      .then((r) => { if (r.status === 401) { location.href = '/login'; throw new Error('401'); } return r.json(); })
      .then(setData)
      .catch((e) => e.message !== '401' && setFeil('Kunne ikke laste data.'));
    const h = location.hash.slice(1) as Fane;
    if (FANER.some((f) => f.id === h)) setFane(h);
  }, []);
  const byttFane = useCallback((f: Fane) => {
    setFane(f);
    history.replaceState(null, '', `#${f}`);
    window.scrollTo({ top: 0 });
  }, []);

  const filtrert = useMemo(() => {
    if (!data) return [];
    let l = data.elementer;
    if (filtre.sesjon !== 'alle') l = l.filter((e) => e.sesjon === filtre.sesjon);
    if (filtre.kategorier.length) l = l.filter((e) => filtre.kategorier.includes(e.kategori));
    if (filtre.sok) l = sok(l, filtre.sok, data);
    return l;
  }, [data, filtre]);

  const ctx = useMemo(() => {
    if (!data) return null;
    const tm = Object.fromEntries(data.taksonomi.temaer.map((t) => [t.id, t.navn]));
    const um = Object.fromEntries(data.taksonomi.temaer.flatMap((t) => (t.undertemaer || []).map((u) => [u.id, u.navn])));
    const kf = Object.fromEntries(data.taksonomi.kategorier.map((k) => [k.id, k.farge]));
    const kn = Object.fromEntries(data.taksonomi.kategorier.map((k) => [k.id, k.navn]));
    return {
      data, filtre, filtrert,
      setFiltre: (f: Partial<Filtre>) => setF((g) => ({ ...g, ...f })),
      visPerson: setPerson,
      visTema: (id: string) => { setTema(id); setPerson(null); byttFane('temaer'); },
      temaNavn: (id: string) => tm[id] || id,
      undertemaNavn: (id: string) => um[id] || id,
      katFarge: (id: string) => kf[id] || '#8A877F',
      katNavn: (id: string) => kn[id] || id,
    };
  }, [data, filtre, filtrert, byttFane]);

  if (feil) return <div className="laster">{feil}</div>;
  if (!data || !ctx) return <div className="laster"><span className="spinner" /> Laster helsepolitiske data …</div>;

  return (
    <DataCtx.Provider value={ctx}>
      <SamlingProvider>
        <header className="topp">
          <div className="topp-indre">
            <a className="topp-logo" href="/" aria-label="Helsepolitisk radar – til forsiden">
              <img src="/wa-logo.svg" alt="Wergeland/Apenes" width={401} height={26} />
            </a>
            <span className="topp-produkt">Helsepolitisk radar</span>
            <div className="topp-hoyre">
              <SamlingKnapp />
              <button className="knapp knapp--naken" onClick={async () => { await fetch('/api/logout', { method: 'POST' }); location.href = '/login'; }}>Logg ut</button>
            </div>
          </div>
          <nav className="faner" aria-label="Visninger">
            <div className="faner-indre">
              {FANER.map((f) => (
                <button key={f.id} className={fane === f.id ? 'på' : ''} aria-current={fane === f.id ? 'page' : undefined} onClick={() => byttFane(f.id)}>
                  {f.navn}
                </button>
              ))}
            </div>
          </nav>
        </header>
        {fane === 'oversikt' && (
          <div className="hero">
            <div className="innhold">
              <p className="eyebrow">Helse- og omsorgskomiteen · Stortingsperioden {data.meta.periode.replace('-', '–')}</p>
              <h1>Hva rører seg i <em>helsepolitikken</em></h1>
              <p className="hero-meta">
                Oppdatert {datoTid(data.meta.oppdatert)} · Kilder: Stortinget og regjeringen.no ·{' '}
                {data.meta.kiAndel > 0.5 ? 'Temaer klassifisert med KI' : 'Temaer klassifisert med nøkkelord (KI aktiveres ved første automatiske kjøring)'}
              </p>
            </div>
          </div>
        )}
        <div className="filterlinje">
          <div className="innhold filterlinje-indre">
            <Segment
              etikett="Sesjon"
              verdi={filtre.sesjon}
              sett={(s) => ctx.setFiltre({ sesjon: s })}
              valg={[{ id: 'alle', navn: 'Hele perioden' }, ...data.meta.sesjoner.map((s) => ({ id: s, navn: sesjonKort(s) + (s === data.meta.innevaerende ? ' (nå)' : '') }))]}
            />
            <Chips
              valg={data.taksonomi.kategorier.map((k) => ({ id: k.id, navn: k.navn }))}
              valgt={filtre.kategorier}
              sett={(v) => ctx.setFiltre({ kategorier: v })}
              farge={ctx.katFarge}
            />
            <input
              className="sokefelt"
              type="search"
              placeholder="Søk i alt – f.eks. «kreft», «pollen», «Toppe»"
              value={filtre.sok}
              onChange={(e) => ctx.setFiltre({ sok: e.target.value })}
              aria-label="Søk"
            />
          </div>
        </div>
        <main className="innhold hoved">
          {fane === 'oversikt' && <Oversikt gaTil={byttFane} />}
          {fane === 'endringer' && <StoreEndringer />}
          {fane === 'temaer' && <Temaer valgt={tema} setValgt={setTema} />}
          {fane === 'sporsmal' && <Sporsmal />}
          {fane === 'komite' && <Komite />}
          {fane === 'voteringer' && <Voteringer />}
          {fane === 'saker' && <Saker />}
          {fane === 'innspill' && <Innspill />}
          {fane === 'debatter' && <Debatter />}
          {fane === 'regjeringen' && <Regjeringen />}
        </main>
        <footer className="bunn">
          <div className="innhold bunn-indre">
            <img src="/wa-logo-hvit.svg" alt="Wergeland/Apenes" width={240} height={16} />
            <span>Helsepolitisk radar · Oppdatert {datoTid(data.meta.oppdatert)}</span>
          </div>
        </footer>
        {person && <PersonPanel id={person} lukk={() => setPerson(null)} />}
      </SamlingProvider>
    </DataCtx.Provider>
  );
}
