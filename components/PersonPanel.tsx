'use client';
import { useEffect, useMemo } from 'react';
import { useData, Portrett, PartiMerke, ElementListe } from './felles';
import { Graf } from './Graf';
import { perTema } from '@/lib/byggere';
import { PARTIER, representantUrl } from '@/lib/parti';
import { SPORSMAL_TYPER } from '@/lib/types';

export function PersonPanel({ id, lukk }: { id: string; lukk: () => void }) {
  const c = useData();
  const { data, filtrert } = c;
  const p = data.personer[id];
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && lukk();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [lukk]);
  const mine = useMemo(
    () => filtrert.filter((e) => e.fra === id || e.saksordforere?.includes(id) || e.forslagstillere?.includes(id)),
    [filtrert, id],
  );
  const sp = mine.filter((e) => SPORSMAL_TYPER.includes(e.type));
  const temaSpec = useMemo(() => perTema(sp, c, { id: `person-tema-${id}`, tittel: `${p?.navn}: spørsmål per tema`, topp: 10 }), [sp, c, id, p]);
  if (!p) return null;
  return (
    <div className="panel-bakgrunn" onClick={lukk}>
      <aside className="panel" role="dialog" aria-label={p.navn} onClick={(e) => e.stopPropagation()}>
        <button className="panel-lukk" onClick={lukk} aria-label="Lukk">×</button>
        <div className="panel-hode">
          <Portrett id={id} str={110} />
          <div>
            <h2>{p.navn}</h2>
            <p><PartiMerke parti={p.parti} /> {PARTIER[p.parti || '']?.navn} · {p.fylke}</p>
            {p.komiteer?.length ? <p className="dempet liten-tekst">{p.komiteer.map((k) => data.komiteNavn[k] || k).join(', ')}</p> : null}
            {data.komite.roller[id] && <p className="rolle">{data.komite.roller[id]}</p>}
            <p className="liten-tekst">
              <a href={representantUrl(id)} target="_blank" rel="noreferrer">Profil på stortinget.no ↗</a>
              {p.epost && <> · <a href={`mailto:${p.epost}`}>{p.epost}</a></>}
            </p>
          </div>
        </div>
        <div className="stats kompakt">
          <div className="stat"><div className="stat-tall">{sp.length}</div><div className="stat-etikett">helsespørsmål</div></div>
          <div className="stat"><div className="stat-tall">{mine.filter((e) => e.saksordforere?.includes(id)).length}</div><div className="stat-etikett">saksordfører</div></div>
          <div className="stat"><div className="stat-tall">{mine.filter((e) => e.forslagstillere?.includes(id)).length}</div><div className="stat-etikett">forslag</div></div>
          <div className="stat"><div className="stat-tall">{sp.filter((e) => e.storEndring).length}</div><div className="stat-etikett">om store endringer</div></div>
        </div>
        {sp.length > 0 && <Graf spec={temaSpec} />}
        <h3>Aktivitet</h3>
        <ElementListe liste={mine} tom="Ingen helsesaker i valgt periode." side={15} />
      </aside>
    </div>
  );
}
