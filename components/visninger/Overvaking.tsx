'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Stat, Segment, ElementRad } from '../felles';
import { Graf } from '../Graf';
import { useLat } from './Innspill';
import { lagOrdRegex, treffI } from '@/lib/ord';
import { datoKort, maneder, mndNokkel, mndNavn } from '@/lib/analyse';
import type { DebattData, InnspillData, Element } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

type Kilde = 'stortinget' | 'regjeringen' | 'innspill' | 'debatter';
interface Treff { kilde: Kilde; dato?: string; tittel: string; url?: string; ord: string[]; element?: Element; undertekst?: string }

/** Overvåkingslister per kunde: søkeord fra config/overvaking.json mot alle kildene i dashbordet. */
export function Overvaking() {
  const { data, filtrert, sesjoner } = useData();
  const lister = data.overvaking || [];
  const [valgt, setValgt] = useState(lister[0]?.id || '');
  const [kilde, setKilde] = useState<'alle' | Kilde>('alle');
  const { data: inn } = useLat<InnspillData>('/api/innspill');
  const { data: deb } = useLat<DebattData>('/api/debatter');
  const liste = lister.find((l) => l.id === valgt);
  const rx = useMemo(() => lagOrdRegex(liste?.ord || []), [liste]);

  const treff = useMemo(() => {
    if (!rx) return [];
    const ut: Treff[] = [];
    for (const e of filtrert) {
      const ord = treffI(`${e.tittel} ${e.fullTittel || ''} ${e.beskrivelse || ''} ${(e.stikkord || []).join(' ')}`, rx);
      if (ord.length) ut.push({ kilde: e.type === 'regjering' ? 'regjeringen' : 'stortinget', dato: e.dato, tittel: e.tittel, url: e.url, ord, element: e });
    }
    const horinger = new Map(filtrert.filter((e) => e.type === 'horing').map((e) => [e.id.replace('horing-', ''), e]));
    for (const [hid, h] of Object.entries(inn || {})) {
      const hor = horinger.get(hid);
      if (!hor) continue;
      for (const i of h.innspill) {
        const ord = treffI(`${i.tittel} ${i.tekst}`, rx);
        if (ord.length) ut.push({ kilde: 'innspill', dato: i.dato, tittel: `${i.org}: ${hor.tittel}`, url: hor.url, ord, undertekst: i.tekst.slice(0, 320) });
      }
    }
    for (const [refId, r] of Object.entries(deb || {})) {
      if (!sesjoner.includes(r.sesjon)) continue;
      for (const d of r.deler) for (const i of d.innlegg) {
        const ord = treffI(i.tekst, rx);
        if (ord.length) ut.push({
          kilde: 'debatter', dato: r.dato, tittel: `${i.navn}${i.parti ? ` (${i.parti})` : ''} i «${d.tittel.slice(0, 120)}»`,
          url: `https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Referater/Stortinget/${r.sesjon}/${refId}/`, ord, undertekst: i.tekst.slice(0, 320),
        });
      }
    }
    return ut.sort((a, b) => String(b.dato).localeCompare(String(a.dato)));
  }, [rx, filtrert, inn, deb, sesjoner]);

  const vis = kilde === 'alle' ? treff : treff.filter((t) => t.kilde === kilde);
  const ordTelling = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of treff) for (const o of t.ord) m.set(o, (m.get(o) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [treff]);

  const tidSpec: GrafSpec = useMemo(() => {
    const mnd = maneder();
    const farger: Record<Kilde, string> = { stortinget: '#2F86B8', regjeringen: '#E5402A', innspill: '#2E9E6E', debatter: '#DDA21A' };
    const navn: Record<Kilde, string> = { stortinget: 'Stortinget', regjeringen: 'Regjeringen', innspill: 'Høringsinnspill', debatter: 'Debatter' };
    return {
      id: `overvaking-tid-${valgt}`, tittel: `${liste?.navn}: treff per måned`, undertittel: 'Spørsmål, saker, høringer, regjeringen, innspill og debattinnlegg', form: 'stolpe', stablet: true,
      kategorier: mnd.map(mndNavn),
      serier: (Object.keys(farger) as Kilde[]).map((k) => ({ navn: navn[k], farge: farger[k], data: mnd.map((m) => treff.filter((t) => t.kilde === k && t.dato && mndNokkel(t.dato) === m).length) })),
    };
  }, [treff, valgt, liste]);

  if (!lister.length) return <p className="tomt">Ingen overvåkingslister er satt opp. Legg dem inn i <code>config/overvaking.json</code>.</p>;

  return (
    <>
      <div className="lokale-filtre">
        <label className="velger">
          <span className="eyebrow">Liste</span>
          <select value={valgt} onChange={(e) => setValgt(e.target.value)}>
            {lister.map((l) => <option key={l.id} value={l.id}>{l.navn}</option>)}
          </select>
        </label>
        <Segment etikett="Kilde" verdi={kilde} sett={setKilde} valg={[{ id: 'alle', navn: 'Alle kilder' }, { id: 'stortinget', navn: 'Stortinget' }, { id: 'regjeringen', navn: 'Regjeringen' }, { id: 'innspill', navn: 'Innspill' }, { id: 'debatter', navn: 'Debatter' }]} />
      </div>
      {liste?.beskrivelse && <p className="dempet">{liste.beskrivelse}</p>}
      <div className="stats">
        <Stat tall={treff.length} etikett="treff totalt" />
        <Stat tall={treff.filter((t) => t.kilde === 'stortinget').length} etikett="i Stortinget" />
        <Stat tall={treff.filter((t) => t.kilde === 'innspill').length} etikett="i høringsinnspill" />
        <Stat tall={treff.filter((t) => t.kilde === 'debatter').length} etikett="i debatter" />
        <Stat tall={treff.filter((t) => t.element?.storEndring).length} etikett="store endringer" />
      </div>
      <div className="rutenett-sidepanel">
        <Seksjon tittel={`Treff (${vis.length})`}>
          {vis.length === 0 && <p className="tomt">Ingen treff i valgt periode.</p>}
          <ul className="elementer">
            {vis.slice(0, 100).map((t, i) => t.element ? (
              <div key={i}><ElementRad e={t.element} /><p className="trefford">Treff: {t.ord.join(', ')}</p></div>
            ) : (
              <li key={i} className="element">
                <div className="element-meta"><span className="type">{t.kilde === 'innspill' ? 'Høringsinnspill' : 'Debatt'}</span><time>{datoKort(t.dato)}</time></div>
                <div className="element-innhold">
                  <p className="element-tittel"><a href={t.url} target="_blank" rel="noreferrer">{t.tittel}</a></p>
                  {t.undertekst && <p className="dempet liten-tekst">{t.undertekst} …</p>}
                  <p className="trefford">Treff: {t.ord.join(', ')}</p>
                </div>
              </li>
            ))}
          </ul>
          {vis.length > 100 && <p className="dempet liten-tekst">Viser 100 av {vis.length}.</p>}
        </Seksjon>
        <aside>
          <Graf spec={tidSpec} />
          <Seksjon tittel="Søkeord">
            <div className="stikkord-sky">{ordTelling.map(([o, n]) => <span key={o} className="stikkord">{o} <b>{n}</b></span>)}</div>
            <p className="dempet liten-tekst">Listen har {liste?.ord.length} søkeord. De redigeres i <code>config/overvaking.json</code> på GitHub, der du også kan legge til nye kunder.</p>
          </Seksjon>
        </aside>
      </div>
    </>
  );
}
