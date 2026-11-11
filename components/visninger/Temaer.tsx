'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, ElementListe, PersonLenke, Chips } from '../felles';
import { Graf } from '../Graf';
import { perParti, sammenlignOverTid } from '@/lib/byggere';
import { dagerSiden, telle } from '@/lib/analyse';
import { SPORSMAL_TYPER, TYPE_NAVN } from '@/lib/types';
import { Sammenligning } from './Sporsmal';
import type { Element } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

export function Temaer({ valgt, setValgt }: { valgt: string | null; setValgt: (t: string | null) => void }) {
  const c = useData();
  const { data, filtrert, katFarge } = c;

  const statistikk = useMemo(() => {
    return data.taksonomi.temaer.filter((t) => t.id !== 'annet').map((t) => {
      const l = filtrert.filter((e) => e.temaer.includes(t.id));
      const siste90 = l.filter((e) => dagerSiden(e.dato) <= 90).length;
      const forrige90 = l.filter((e) => dagerSiden(e.dato) > 90 && dagerSiden(e.dato) <= 180).length;
      const under = [...telle(l, (e) => e.undertemaer?.filter((u) => u.startsWith(t.id + '/'))).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return { ...t, antall: l.length, siste90, forrige90, store: l.filter((e) => e.storEndring).length, under };
    });
  }, [data, filtrert]);

  if (valgt) return <TemaDetalj key={valgt} id={valgt.split('/')[0]} startUndertema={valgt.includes('/') ? valgt : null} tilbake={() => setValgt(null)} />;

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
                  {t.under.length > 0 && (
                    <span className="temakort-under">{t.under.map(([u, n]) => `${c.undertemaNavn(u)} ${n}`).join(' · ')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </Seksjon>
      ))}
      <Sammenligning liste={filtrert} standardDim="tema" />
      <p className="dempet liten-tekst">Tre nivåer: kategori → tema → undertema. Antall = spørsmål, saker, høringer og regjeringsdokumenter der temaet er blant de tre viktigste. Under hvert tema står de største undertemaene; klikk på et tema for å se og filtrere på alle undertemaene. Endring sammenligner siste 90 dager med de 90 dagene før. Temaene redigeres i <code>config/taksonomi.json</code>.</p>
    </>
  );
}

function TemaDetalj({ id, startUndertema, tilbake }: { id: string; startUndertema: string | null; tilbake: () => void }) {
  const c = useData();
  const { data, filtrert, temaNavn, katFarge } = c;
  const tema = data.taksonomi.temaer.find((t) => t.id === id);
  const [under, setUnder] = useState<string[]>(startUndertema ? [startUndertema] : []);
  const helTema = useMemo(() => filtrert.filter((e) => e.temaer.includes(id)), [filtrert, id]);
  const liste = useMemo(() => (under.length ? helTema.filter((e) => e.undertemaer?.some((u) => under.includes(u))) : helTema), [helTema, under]);
  const navnMedUtvalg = under.length ? `${temaNavn(id)} – ${under.map(c.undertemaNavn).join(', ')}` : temaNavn(id);
  const underSpec: GrafSpec = useMemo(() => {
    const m = telle(helTema, (e) => e.undertemaer);
    const u = (tema?.undertemaer || []).map((x) => x.id).filter((x) => m.has(x)).sort((a, b) => m.get(b)! - m.get(a)!);
    return {
      id: `tema-under-${id}`, tittel: `${temaNavn(id)}: undertemaer`, undertittel: 'Antall spørsmål, saker, høringer og regjeringsdokumenter per undertema', form: 'liggende', enhet: 'stk',
      kategorier: u.map(c.undertemaNavn), serier: [{ navn: 'Antall', data: u.map((x) => m.get(x)!), farge: katFarge(tema?.kategori || '') }],
    };
  }, [helTema, tema, id, c, temaNavn, katFarge]);
  const sp = liste.filter((e) => SPORSMAL_TYPER.includes(e.type));
  const typer = ['skriftlig', 'muntlig', 'sak', 'horing', 'regjering'] as const;
  const tidSpec = useMemo(() => sammenlignOverTid(liste, typer.map((t, i) => ({
    id: t, navn: t === 'regjering' ? 'Regjeringen' : TYPE_NAVN[t], farge: ['#2F86B8', '#E5402A', '#2E9E6E', '#DDA21A', '#8A5AB0'][i], treff: (e: Element) => e.type === t,
  })).filter((en) => liste.some(en.treff)), { id: `tema-tid-${id}-${under.join('_')}`, tittel: `${navnMedUtvalg}: aktivitet per måned`, undertittel: 'Antall per kilde' }), [liste, id, under]); // eslint-disable-line react-hooks/exhaustive-deps
  const partiSpec = useMemo(() => perParti(sp, c, { id: `tema-parti-${id}-${under.join('_')}`, tittel: `${navnMedUtvalg}: spørsmål per parti` }), [sp, c, id, under, navnMedUtvalg]);
  const aktive = [...telle(sp, (e) => e.fra).entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const stikkord = [...telle(liste, (e) => e.stikkord).entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

  return (
    <>
      <button className="lenkeknapp" onClick={tilbake}>← Alle temaer</button>
      <h2 className="tema-tittel" style={{ ['--kf' as string]: katFarge(tema?.kategori || '') }}>{temaNavn(id)}</h2>
      <p className="dempet">{c.katNavn(tema?.kategori || '')} · {liste.length} treff · {liste.filter((e) => e.storEndring).length} store endringer</p>
      {(tema?.undertemaer?.length || 0) > 0 && (
        <>
          <div className="lokale-filtre">
            <span className="eyebrow">Undertema</span>
            <Chips valg={(tema?.undertemaer || []).map((u) => ({ id: u.id, navn: u.navn }))} valgt={under} sett={setUnder} />
          </div>
          <Graf spec={underSpec} />
        </>
      )}
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
