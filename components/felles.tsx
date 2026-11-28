'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Data, Element } from '@/lib/types';
import { TYPE_NAVN } from '@/lib/types';
import { PARTIER, bildeUrl, partiFarge, partiKort, partiLogo } from '@/lib/parti';
import { datoKort } from '@/lib/analyse';

// ---------- Kontekst: data + globale filtre ----------
export interface Filtre {
  sesjon: 'alle' | string;
  kategorier: string[];
  sok: string;
  kunStore: boolean;
}
interface Ctx {
  data: Data;
  filtre: Filtre;
  setFiltre: (f: Partial<Filtre>) => void;
  filtrert: Element[]; // elementer etter globale filtre
  sesjoner: string[]; // sesjonene i valgt periode/sesjon
  visPerson: (id: string | null) => void;
  visTema: (id: string) => void;
  temaNavn: (id: string) => string;
  undertemaNavn: (id: string) => string;
  katFarge: (id: string) => string;
  katNavn: (id: string) => string;
}
export const DataCtx = createContext<Ctx | null>(null);
export const useData = () => useContext(DataCtx)!;

// ---------- Små byggeklosser ----------
export function KategoriMerke({ id }: { id: string }) {
  const { katFarge, katNavn } = useData();
  return (
    <span className="merke">
      <i className="prikk" style={{ background: katFarge(id) }} />
      {katNavn(id)}
    </span>
  );
}

/** Partiet som logo der vi har den (navnet ligger i alt-tekst og verktøytips), ellers som farget forkortelse. */
export function PartiMerke({ parti }: { parti?: string }) {
  const logo = partiLogo(parti);
  const navn = (parti && PARTIER[parti]?.navn) || partiKort(parti);
  if (logo) return <img className="parti-logo" src={logo.src} alt={navn} title={navn} />;
  return (
    <span className="parti" style={{ ['--pf' as string]: partiFarge(parti) }}>
      {partiKort(parti)}
    </span>
  );
}

export function Portrett({ id, str = 40, gra = false }: { id: string; str?: number; gra?: boolean }) {
  const { data } = useData();
  const p = data.personer[id];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`portrett${gra ? ' gra' : ''}`}
      src={bildeUrl(id, str > 90 ? 'stort' : 'middels')}
      alt={p?.navn || id}
      width={str}
      height={Math.round(str * 1.25)}
      loading="lazy"
    />
  );
}

/** Viser om personen sitter fast i helsekomiteen, er vararepresentant, eller sitter i regjeringen. */
export function RolleMerke({ id, navn }: { id?: string; navn?: string }) {
  const { data } = useData();
  const p = id ? data.personer[id] : undefined;
  const n = p?.navn || navn || '';
  const hod = data.hod?.personer?.find((h) => n && n.includes(h.navn));
  if (hod) return <span className="rolle-merke hod">{hod.statsraad ? 'Statsråd' : 'HOD'}</span>;
  if (/^statsråd|minister/i.test(navn || '')) return <span className="rolle-merke hod">Regjeringen</span>;
  if (!id) return null;
  if (data.komite.medlemmer.includes(id)) return <span className="rolle-merke komite" title="Fast medlem av helse- og omsorgskomiteen">Helsekomiteen</span>;
  // Alle faste representanter i begge periodene er i persondataene – de som mangler, har møtt som vara
  if (!p || p.vara) return <span className="rolle-merke vara" title="Vararepresentant, ikke fast representant">Vara</span>;
  return <span className="rolle-merke" title="Fast representant, men ikke medlem av helse- og omsorgskomiteen">Ikke i komiteen</span>;
}

export function PersonLenke({ id, bilde = true }: { id: string; bilde?: boolean }) {
  const { data, visPerson } = useData();
  const p = data.personer[id];
  if (!p) return <span>{id}</span>;
  return (
    <button className="personlenke" onClick={() => visPerson(id)}>
      {bilde && <Portrett id={id} str={22} />}
      <span>{p.navn}</span>
      <PartiMerke parti={p.parti} />
      {p.vara && <span className="rolle-merke vara" title="Vararepresentant">Vara</span>}
    </button>
  );
}

export function Stat({ tall, etikett, hint, onClick }: { tall: ReactNode; etikett: string; hint?: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`stat${onClick ? ' klikkbar' : ''}`} onClick={onClick}>
      <div className="stat-tall">{tall}</div>
      <div className="stat-etikett">{etikett}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </Tag>
  );
}

export function Seksjon({ tittel, children, hoyre, id }: { tittel: string; children: ReactNode; hoyre?: ReactNode; id?: string }) {
  return (
    <section className="seksjon" id={id}>
      <div className="seksjon-hode">
        <h2>{tittel}</h2>
        {hoyre}
      </div>
      {children}
    </section>
  );
}

/** Flervalg som «chips». */
export function Chips<T extends string>({
  valg, valgt, sett, maks, farge, bilde,
}: { valg: { id: T; navn: string }[]; valgt: T[]; sett: (v: T[]) => void; maks?: number; farge?: (id: T) => string; bilde?: (id: T) => string | undefined }) {
  return (
    <div className="chips" role="group">
      {valg.map((v) => {
        const på = valgt.includes(v.id);
        return (
          <button
            key={v.id}
            className={`chip${på ? ' på' : ''}`}
            aria-pressed={på}
            onClick={() => sett(på ? valgt.filter((x) => x !== v.id) : maks && valgt.length >= maks ? [...valgt.slice(1), v.id] : [...valgt, v.id])}
          >
            {bilde?.(v.id) ? <img className="chip-logo" src={bilde(v.id)} alt="" /> : farge && <i className="prikk" style={{ background: farge(v.id) }} />}
            {v.navn}
          </button>
        );
      })}
    </div>
  );
}

export function Segment<T extends string>({ valg, verdi, sett, etikett }: { valg: { id: T; navn: string }[]; verdi: T; sett: (v: T) => void; etikett?: string }) {
  return (
    <div className="segment" role="radiogroup" aria-label={etikett}>
      {valg.map((v) => (
        <button key={v.id} role="radio" aria-checked={verdi === v.id} className={verdi === v.id ? 'på' : ''} onClick={() => sett(v.id)}>
          {v.navn}
        </button>
      ))}
    </div>
  );
}

// ---------- Elementliste ----------
/** Hvem som fremmet et representantforslag: de fire første med bilde og partilogo, resten kan foldes ut. */
function Forslagstillere({ ider }: { ider: string[] }) {
  const [alle, setAlle] = useState(false);
  const vis = alle ? ider : ider.slice(0, 4);
  return (
    <span className="forslagstillere">
      <span className="dempet">Fremmet av</span>
      {vis.map((id) => <PersonLenke key={id} id={id} />)}
      {ider.length > 4 && <button className="lenkeknapp liten" onClick={() => setAlle(!alle)}>{alle ? 'Vis færre' : `og ${ider.length - 4} til`}</button>}
    </span>
  );
}

export function ElementRad({ e }: { e: Element }) {
  const { data, temaNavn, undertemaNavn, visTema } = useData();
  const [apen, setApen] = useState(false);
  const lang = (e.tittel || '').length > 220;
  const tid = e.type === 'horing' && e.tider?.length ? e.tider[0].tid : e.dato;
  return (
    <li className={`element${e.storEndring ? ' stor' : ''}`}>
      <div className="element-meta">
        <span className={`type type-${e.type}`}>{e.type === 'regjering' && e.dokType ? `Regjeringen · ${e.dokType}` : e.type === 'sak' && e.dokType ? e.dokType : TYPE_NAVN[e.type]}</span>
        <time>{datoKort(tid)}</time>
        {e.storEndring && <span className="flagg" title={e.begrunnelse || 'Mulig omfattende endring'}>▲ Stor endring</span>}
      </div>
      <div className="element-innhold">
        <p className={`element-tittel${apen || !lang ? '' : ' kuttet'}`}>
          {e.url ? <a href={e.url} target="_blank" rel="noreferrer">{e.tittel}</a> : e.tittel}
        </p>
        {lang && <button className="lenkeknapp liten" onClick={() => setApen(!apen)}>{apen ? 'Vis mindre' : 'Vis hele'}</button>}
        {e.begrunnelse && <p className="begrunnelse">{e.begrunnelse}</p>}
        {e.beskrivelse && e.type === 'regjering' && <p className="dempet liten-tekst">{e.beskrivelse}</p>}
        <div className="element-detaljer">
          {e.fra && <PersonLenke id={e.fra} />}
          {e.forslagstillere?.length ? <Forslagstillere ider={e.forslagstillere} /> : null}
          {e.til && <span className="dempet">til {e.til}{e.besvartDato ? ' · besvart' : ' · ubesvart'}</span>}
          {e.henvisning && <span className="dempet">{e.henvisning}</span>}
          {e.status && <span className="dempet">{e.status}</span>}
          {e.komite && e.komite !== data.komite.id && <span className="dempet">{data.komiteNavn[e.komite] || e.komite}</span>}
          {e.saksordforere?.length ? <span className="dempet">Saksordfører: {e.saksordforere.map((id) => <span key={id} className="navn-parti">{data.personer[id]?.navn || id} <PartiMerke parti={data.personer[id]?.parti} /></span>)}</span> : null}
          {e.type === 'horing' && e.horingStatus && <span className="dempet">{e.horingStatus}{e.skriftlig ? ' · skriftlig' : ''}{e.frist ? ` · frist ${datoKort(e.frist)}` : ''}</span>}
        </div>
        <div className="element-merker">
          <KategoriMerke id={e.kategori} />
          {e.temaer.filter((t) => t !== 'annet').map((t) => (
            <button key={t} className="tema-merke" onClick={() => visTema(t)}>{temaNavn(t)}</button>
          ))}
          {e.undertemaer?.map((u) => (
            <button key={u} className="tema-merke under" onClick={() => visTema(u)} title={`Undertema under ${temaNavn(u.split('/')[0])}`}>› {undertemaNavn(u)}</button>
          ))}
          {e.stikkord?.map((s) => <span key={s} className="stikkord">#{s}</span>)}
          {!e.direkte && e.type !== 'regjering' && <span className="stikkord" title="Fanget opp utenfor helse- og omsorgskomiteen/-ministeren">Andre komiteer</span>}
        </div>
      </div>
    </li>
  );
}

export function ElementListe({ liste, tom = 'Ingen treff.', side = 25 }: { liste: Element[]; tom?: string; side?: number }) {
  const [antall, setAntall] = useState(side);
  const vis = useMemo(() => liste.slice(0, antall), [liste, antall]);
  if (!liste.length) return <p className="tomt">{tom}</p>;
  return (
    <>
      <ul className="elementer">{vis.map((e) => <ElementRad key={e.id} e={e} />)}</ul>
      {antall < liste.length && (
        <button className="knapp knapp-lys vis-flere" onClick={() => setAntall(antall + side * 2)}>
          Vis flere ({liste.length - antall} igjen)
        </button>
      )}
    </>
  );
}
