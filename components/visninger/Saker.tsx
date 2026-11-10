'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, ElementListe, Segment } from '../felles';
import { Graf } from '../Graf';
import { PARTIER, PARTI_REKKEFOLGE, partiFarge } from '@/lib/parti';
import { datoTid, telle } from '@/lib/analyse';
import type { GrafSpec } from '@/lib/graf';

export function Saker() {
  const { data, filtrert } = useData();
  const [omfang, setOmfang] = useState<'komite' | 'alle'>('komite');
  const nå = Date.now();
  const iOmfang = (e: (typeof filtrert)[number]) => omfang === 'alle' || e.komite === data.komite.id;

  const saker = useMemo(() => filtrert.filter((e) => e.type === 'sak' && iOmfang(e)), [filtrert, omfang]); // eslint-disable-line react-hooks/exhaustive-deps
  const horinger = useMemo(() => filtrert.filter((e) => e.type === 'horing' && iOmfang(e)), [filtrert, omfang]); // eslint-disable-line react-hooks/exhaustive-deps
  const kommende = useMemo(
    () => data.elementer
      .filter((e) => e.type === 'horing' && iOmfang(e) && (e.tider?.some((t) => new Date(t.tid).getTime() > nå - 86400000) || (e.frist && new Date(e.frist).getTime() > nå)))
      .sort((a, b) => (a.tider?.[0]?.tid || a.frist || '').localeCompare(b.tider?.[0]?.tid || b.frist || '')),
    [data, omfang, nå], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const tilBehandling = saker.filter((e) => e.status === 'Til behandling' || e.status === 'Varslet');

  const typeSpec: GrafSpec = useMemo(() => {
    const m = telle(saker, (e) => e.dokType || e.sakType || 'Annet');
    const k = [...m.entries()].sort((a, b) => b[1] - a[1]);
    return { id: `saker-type-${omfang}`, tittel: 'Saker etter dokumenttype', undertittel: omfang === 'komite' ? 'Helse- og omsorgskomiteen' : 'Alle helserelevante saker', form: 'liggende', enhet: 'saker',
      kategorier: k.map(([n]) => n), serier: [{ navn: 'Saker', data: k.map(([, n]) => n), farge: '#3D99C7' }] };
  }, [saker, omfang]);
  const forslagSpec: GrafSpec = useMemo(() => {
    const rf = saker.filter((e) => e.dokType === 'Representantforslag');
    const m = telle(rf, (e) => [...new Set((e.forslagstillere || []).map((id) => data.personer[id]?.parti).filter(Boolean) as string[])]);
    const ps = PARTI_REKKEFOLGE.filter((p) => m.has(p)).sort((a, b) => m.get(b)! - m.get(a)!);
    return { id: `saker-forslag-${omfang}`, tittel: 'Representantforslag per parti', undertittel: 'Et forslag telles for hvert parti som står bak det', form: 'liggende', enhet: 'forslag',
      kategorier: ps.map((p) => PARTIER[p].navn), serier: [{ navn: 'Forslag', data: ps.map((p) => m.get(p)!), fargerPerPunkt: ps.map(partiFarge) }] };
  }, [saker, data, omfang]);

  return (
    <>
      <div className="lokale-filtre">
        <Segment etikett="Omfang" verdi={omfang} sett={setOmfang} valg={[{ id: 'komite', navn: 'Helse- og omsorgskomiteen' }, { id: 'alle', navn: 'Alle helserelevante (også andre komiteer)' }]} />
      </div>
      <div className="rutenett-sidepanel">
        <Seksjon tittel="Høringskalender">
          {kommende.length === 0 ? <p className="tomt">Ingen kommende høringer eller åpne innspillsfrister.</p> : (
            <ul className="kalender stor">
              {kommende.map((h) => (
                <li key={h.id}>
                  <time>{h.tider?.length ? datoTid(h.tider[0].tid) : `Frist ${datoTid(h.frist)}`}</time>
                  <a href={h.url} target="_blank" rel="noreferrer">{h.tittel}</a>
                  <span className="dempet liten-tekst">
                    {data.komiteNavn[h.komite || '']} · {h.horingStatus}{h.skriftlig ? ' · skriftlig høring' : ''}
                    {h.frist ? ` · innspillsfrist ${datoTid(h.frist)}` : ''}{h.tider?.[0]?.sted ? ` · ${h.tider[0].sted}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Seksjon>
        <aside>
          <Graf spec={typeSpec} />
          <Graf spec={forslagSpec} />
        </aside>
      </div>
      <Seksjon tittel={`Til behandling (${tilBehandling.length})`}>
        <ElementListe liste={tilBehandling} tom="Ingen saker til behandling i utvalget." />
      </Seksjon>
      <Seksjon tittel={`Alle saker (${saker.length})`}>
        <ElementListe liste={saker} />
      </Seksjon>
      <Seksjon tittel={`Alle høringer (${horinger.length})`}>
        <ElementListe liste={horinger} />
      </Seksjon>
    </>
  );
}
