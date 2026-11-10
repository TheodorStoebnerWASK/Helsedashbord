'use client';
import { useMemo } from 'react';
import { useData, Seksjon, ElementListe, PersonLenke } from '../felles';
import { Graf } from '../Graf';
import { perParti, sammenlignOverTid } from '@/lib/byggere';
import { dagerSiden, telle } from '@/lib/analyse';
import { SPORSMAL_TYPER, TYPE_NAVN } from '@/lib/types';
import { Sammenligning } from './Sporsmal';
import type { Element } from '@/lib/types';

export function Temaer({ valgt, setValgt }: { valgt: string | null; setValgt: (t: string | null) => void }) {
  const c = useData();
  const { data, filtrert, katFarge } = c;

  const statistikk = useMemo(() => {
    return data.taksonomi.temaer.filter((t) => t.id !== 'annet').map((t) => {
      const l = filtrert.filter((e) => e.temaer.includes(t.id));
      const siste90 = l.filter((e) => dagerSiden(e.dato) <= 90).length;
      const forrige90 = l.filter((e) => dagerSiden(e.dato) > 90 && dagerSiden(e.dato) <= 180).length;
      return { ...t, antall: l.length, siste90, forrige90, store: l.filter((e) => e.storEndring).length };
    });
  }, [data, filtrert]);

  if (valgt) return <TemaDetalj id={valgt} tilbake={() => setValgt(null)} />;

  return (
    <>
      {data.taksonomi.kategorier.map((k) => (
        <Seksjon key={k.id} tittel={k.navn}>
          <div className="temakort-rutenett">
            {statistikk.filter((t) => t.kategori === k.id).sort((a, b) => b.antall - a.antall).map((t) => {
              const endring = t.forrige90 ? Math.round(((t.siste90 - t.forrige90) / t.forrige90) * 100) : null;
              return (
                <button key={t.id} className="temakort" style={{ ['--kf' as string]: katFarge(k.id) }} onClick={() => setValgt(t.id)}>
                  <span className="temakort-navn">{t.navn}</span>
                  <span className="temakort-tall">{t.antall}</span>
                  <span className="dempet liten-tekst">
                    {t.siste90} siste 90 d.
                    {endring !== null && <span className={endring > 0 ? 'opp' : endring < 0 ? 'ned' : ''}> {endring > 0 ? '▲' : endring < 0 ? '▼' : '–'} {Math.abs(endring)} %</span>}
                    {t.store ? ` · ${t.store} store endr.` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </Seksjon>
      ))}
      <Sammenligning liste={filtrert} standardDim="tema" />
      <p className="dempet liten-tekst">Antall = spørsmål, saker, høringer og regjeringsdokumenter der temaet er blant de tre viktigste. Endring sammenligner siste 90 dager med de 90 dagene før. Temaene redigeres i <code>config/taksonomi.json</code>.</p>
    </>
  );
}

function TemaDetalj({ id, tilbake }: { id: string; tilbake: () => void }) {
  const c = useData();
  const { data, filtrert, temaNavn, katFarge } = c;
  const tema = data.taksonomi.temaer.find((t) => t.id === id);
  const liste = useMemo(() => filtrert.filter((e) => e.temaer.includes(id)), [filtrert, id]);
  const sp = liste.filter((e) => SPORSMAL_TYPER.includes(e.type));
  const typer = ['skriftlig', 'muntlig', 'sak', 'horing', 'regjering'] as const;
  const tidSpec = useMemo(() => sammenlignOverTid(liste, typer.map((t, i) => ({
    id: t, navn: t === 'regjering' ? 'Regjeringen' : TYPE_NAVN[t], farge: ['#2F86B8', '#E5402A', '#2E9E6E', '#DDA21A', '#8A5AB0'][i], treff: (e: Element) => e.type === t,
  })).filter((en) => liste.some(en.treff)), { id: `tema-tid-${id}`, tittel: `${temaNavn(id)}: aktivitet per måned`, undertittel: 'Antall per kilde' }), [liste, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const partiSpec = useMemo(() => perParti(sp, c, { id: `tema-parti-${id}`, tittel: `${temaNavn(id)}: spørsmål per parti` }), [sp, c, id, temaNavn]);
  const aktive = [...telle(sp, (e) => e.fra).entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const stikkord = [...telle(liste, (e) => e.stikkord).entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

  return (
    <>
      <button className="lenkeknapp" onClick={tilbake}>← Alle temaer</button>
      <h2 className="tema-tittel" style={{ ['--kf' as string]: katFarge(tema?.kategori || '') }}>{temaNavn(id)}</h2>
      <p className="dempet">{c.katNavn(tema?.kategori || '')} · {liste.length} treff · {liste.filter((e) => e.storEndring).length} store endringer</p>
      <div className="rutenett-2">
        <Graf spec={tidSpec} />
        <Graf spec={partiSpec} />
      </div>
      <div className="rutenett-sidepanel">
        <Seksjon tittel="Alt om temaet">
          <ElementListe liste={liste} />
        </Seksjon>
        <aside>
          <Seksjon tittel="Mest aktive">
            <ol className="toppliste">{aktive.map(([pid, n]) => <li key={pid}><PersonLenke id={pid} /><span className="tall">{n}</span></li>)}</ol>
          </Seksjon>
          {stikkord.length > 0 && (
            <Seksjon tittel="Stikkord">
              <div className="stikkord-sky">{stikkord.map(([s, n]) => <span key={s} className="stikkord">#{s} <b>{n}</b></span>)}</div>
            </Seksjon>
          )}
        </aside>
      </div>
    </>
  );
}
