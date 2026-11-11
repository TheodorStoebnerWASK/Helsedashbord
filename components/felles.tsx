'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Data, Element } from '@/lib/types';
import { TYPE_NAVN } from '@/lib/types';
import { bildeUrl, partiFarge, partiKort } from '@/lib/parti';
import { datoKort } from '@/lib/analyse';

// ---------- Kontekst: data + globale filtre ----------
export interface Filtre {
  sesjon: 'alle' | string;
  kategorier: string[];
  sok: string;
}
interface Ctx {
  data: Data;
  filtre: Filtre;
  setFiltre: (f: Partial<Filtre>) => void;
  filtrert: Element[]; // elementer etter globale filtre
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

export function PartiMerke({ parti }: { parti?: string }) {
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

export function PersonLenke({ id, bilde = true }: { id: string; bilde?: boolean }) {
  const { data, visPerson } = useData();
  const p = data.personer[id];
  if (!p) return <span>{id}</span>;
  return (
    <button className="personlenke" onClick={() => visPerson(id)}>
      {bilde && <Portrett id={id} str={22} />}
      <span>{p.navn}</span>
      <PartiMerke parti={p.parti} />
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
  valg, valgt, sett, maks, farge,
}: { valg: { id: T; navn: string }[]; valgt: T[]; sett: (v: T[]) => void; maks?: number; farge?: (id: T) => string }) {
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
            {farge && <i className="prikk" style={{ background: farge(v.id) }} />}
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
          {e.til && <span className="dempet">til {e.til}{e.besvartDato ? ' · besvart' : ' · ubesvart'}</span>}
          {e.henvisning && <span className="dempet">{e.henvisning}</span>}
          {e.status && <span className="dempet">{e.status}</span>}
          {e.komite && e.komite !== data.komite.id && <span className="dempet">{data.komiteNavn[e.komite] || e.komite}</span>}
          {e.saksordforere?.length ? <span className="dempet">Saksordfører: {e.saksordforere.map((id) => data.personer[id]?.navn || id).join(', ')}</span> : null}
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
