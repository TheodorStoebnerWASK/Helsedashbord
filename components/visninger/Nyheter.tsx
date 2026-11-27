'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Stat, Segment, Chips, KategoriMerke } from '../felles';
import { Graf } from '../Graf';
import { useLat } from './Innspill';
import { datoKort, ukeNokkel } from '@/lib/analyse';
import type { Nyhet, NyhetData } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

// Faste farger per kilde (samme rekkefølge som sammenligningsfargene)
const KILDE_FARGE: Record<string, string> = {
  dagensmedisin: '#2F86B8', medwatch: '#E5402A', healthtalk: '#2E9E6E', dmp: '#DDA21A', sykehusinnkjop: '#8A5AB0', nyemetoder: '#B5651D', ema: '#7D7A74',
};
export type NyhetMedUrl = Nyhet & { url: string };

export function useNyheter() {
  const { data, feil } = useLat<NyhetData>('/api/nyheter');
  const liste = useMemo(() => Object.entries(data || {}).map(([url, n]) => ({ ...n, url })).sort((a, b) => b.d.localeCompare(a.d)), [data]);
  return { liste, lastet: !!data, feil };
}

export function NyhetRad({ n, ekstra }: { n: NyhetMedUrl; ekstra?: React.ReactNode }) {
  const { data, temaNavn, undertemaNavn, visTema } = useData();
  const kilde = data.nyhetskilder?.find((k) => k.id === n.k)?.navn || n.k;
  return (
    <li className={`element${n.se ? ' stor' : ''}`}>
      <div className="element-meta">
        <span className="type"><i className="prikk" style={{ background: KILDE_FARGE[n.k] || '#7D7A74' }} /> {kilde}</span>
        <time>{datoKort(n.d)}</time>
        {n.se && <span className="flagg">▲ Stor endring</span>}
      </div>
      <div className="element-innhold">
        <p className="element-tittel"><a href={n.url} target="_blank" rel="noreferrer">{n.t}</a>{n.p && <span className="pluss" title="Krever abonnement"> +</span>}</p>
        {n.i && <p className="dempet liten-tekst">{n.i}</p>}
        <div className="element-merker">
          {n.kat && <KategoriMerke id={n.kat} />}
          {n.tem?.filter((t) => t !== 'annet').map((t) => <button key={t} className="tema-merke" onClick={() => visTema(t)}>{temaNavn(t)}</button>)}
          {n.und?.map((u) => <button key={u} className="tema-merke under" onClick={() => visTema(u)}>› {undertemaNavn(u)}</button>)}
          {n.s && n.k === 'medwatch' && <span className="stikkord">{n.s}</span>}
        </div>
        {ekstra}
      </div>
    </li>
  );
}

export function Nyheter() {
  const { data, filtre } = useData();
  const { liste, lastet, feil } = useNyheter();
  const kilder = data.nyhetskilder || [];
  const [valgte, setValgte] = useState<string[]>([]);
  const [periode, setPeriode] = useState<'7' | '30' | '180'>('30');
  const [kunEndring, setKunEndring] = useState(false);
  const [antall, setAntall] = useState(40);

  const utvalg = useMemo(() => {
    const fra = new Date(Date.now() - Number(periode) * 86400000).toISOString();
    const q = filtre.sok.trim().toLowerCase();
    return liste.filter((n) => n.d >= fra && (!valgte.length || valgte.includes(n.k)) &&
      (!filtre.kategorier.length || (n.kat && filtre.kategorier.includes(n.kat))) &&
      (!kunEndring || n.se) && (!q || `${n.t} ${n.i || ''}`.toLowerCase().includes(q)));
  }, [liste, periode, valgte, filtre, kunEndring]);

  const perUke: GrafSpec = useMemo(() => {
    const uker = [...new Set(liste.map((n) => ukeNokkel(n.d)))].sort().slice(-26);
    const aktive = kilder.filter((k) => (!valgte.length || valgte.includes(k.id)) && liste.some((n) => n.k === k.id));
    return {
      id: 'nyheter-uke', tittel: 'Saker per uke', undertittel: 'Fordelt på kilde, siste 26 uker', form: 'stolpe', stablet: true,
      kilde: 'Kilde: Dagens Medisin, Medwatch, HealthTalk, DMP, Sykehusinnkjøp og EMA. Bearbeidet av Wergeland Apenes.',
      kategorier: uker.map((u) => u.replace(/^\d{4}-U/, 'uke ')),
      serier: aktive.map((k) => ({ navn: k.navn, farge: KILDE_FARGE[k.id], data: uker.map((u) => liste.filter((n) => n.k === k.id && ukeNokkel(n.d) === u).length) })),
    };
  }, [liste, kilder, valgte]);

  const temaSpec: GrafSpec = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of utvalg) for (const t of n.tem || []) if (t !== 'annet') m.set(t, (m.get(t) || 0) + 1);
    const topp = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    const temaKat = Object.fromEntries(data.taksonomi.temaer.map((t) => [t.id, t.kategori]));
    const kf = Object.fromEntries(data.taksonomi.kategorier.map((k) => [k.id, k.farge]));
    return {
      id: `nyheter-tema-${periode}`, tittel: 'Mest omtalte temaer', undertittel: `Siste ${periode} dager, valgte kilder`, form: 'liggende', enhet: 'saker',
      kilde: 'Kilde: Fag- og nyhetsmedier. Temaer satt med nøkkelord. Bearbeidet av Wergeland Apenes.',
      kategorier: topp.map(([id]) => data.taksonomi.temaer.find((t) => t.id === id)?.navn || id),
      serier: [{ navn: 'Saker', data: topp.map(([, n]) => n), fargerPerPunkt: topp.map(([id]) => kf[temaKat[id]] || '#7D7A74') }],
    };
  }, [utvalg, data, periode]);

  if (feil) return <p className="tomt">Kunne ikke laste nyhetene.</p>;
  if (!lastet) return <p className="laster"><span className="spinner" /> Laster nyheter …</p>;
  if (!liste.length) return <p className="tomt">Nyhetsstrømmen fylles ved neste automatiske oppdatering.</p>;

  const feilKilder = kilder.filter((k) => k.status && (!k.status.ok || !k.status.funnet));
  const siste7 = liste.filter((n) => n.d >= new Date(Date.now() - 7 * 86400000).toISOString());

  return (
    <>
      <div className="lokale-filtre">
        <Chips valg={kilder.filter((k) => liste.some((n) => n.k === k.id)).map((k) => ({ id: k.id, navn: k.navn }))} valgt={valgte} sett={setValgte} farge={(id) => KILDE_FARGE[id]} />
        <Segment etikett="Periode" verdi={periode} sett={setPeriode} valg={[{ id: '7', navn: '7 dager' }, { id: '30', navn: '30 dager' }, { id: '180', navn: '6 måneder' }]} />
        <label className="bryter"><input type="checkbox" checked={kunEndring} onChange={(e) => setKunEndring(e.target.checked)} /> Kun store endringer</label>
      </div>
      <div className="stats">
        <Stat tall={siste7.length} etikett="saker siste 7 dager" />
        {kilder.filter((k) => k.type === 'medie' && liste.some((n) => n.k === k.id)).map((k) => (
          <Stat key={k.id} tall={siste7.filter((n) => n.k === k.id).length} etikett={`${k.navn} siste 7 dager`} />
        ))}
        <Stat tall={siste7.filter((n) => n.se).length} etikett="store endringer siste 7 dager" />
      </div>
      <div className="rutenett-sidepanel">
        <Seksjon tittel={`Saker (${utvalg.length})`}>
          {utvalg.length === 0 && <p className="tomt">Ingen saker i utvalget.</p>}
          <ul className="elementer">{utvalg.slice(0, antall).map((n) => <NyhetRad key={n.url} n={n} />)}</ul>
          {antall < utvalg.length && <button className="knapp knapp-lys vis-flere" onClick={() => setAntall(antall + 80)}>Vis flere ({utvalg.length - antall} igjen)</button>}
        </Seksjon>
        <aside>
          <Graf spec={temaSpec} />
          <Graf spec={perUke} />
          <p className="dempet liten-tekst">
            Titler og ingresser hentes fra sakenes åpne metadata (det samme som vises når en lenke deles). Saker merket + krever abonnement.
            Søkefeltet og kategorifilteret øverst gjelder også her.
            {feilKilder.length > 0 && <> Ikke tilgjengelig ved siste oppdatering: {feilKilder.map((k) => k.navn).join(', ')}.</>}
          </p>
        </aside>
      </div>
    </>
  );
}
