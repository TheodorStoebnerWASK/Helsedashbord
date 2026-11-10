'use client';
import { useMemo } from 'react';
import { useData, Stat, Seksjon, ElementListe, PersonLenke } from '../felles';
import { Graf } from '../Graf';
import { kategoriOverTid, perTema } from '@/lib/byggere';
import { dagerSiden, datoTid, telle } from '@/lib/analyse';
import { SPORSMAL_TYPER } from '@/lib/types';

export function Oversikt({ gaTil }: { gaTil: (f: 'endringer' | 'saker' | 'sporsmal' | 'regjeringen') => void }) {
  const c = useData();
  const { data, filtrert } = c;
  const nå = Date.now();

  const t = useMemo(() => {
    const sp = filtrert.filter((e) => SPORSMAL_TYPER.includes(e.type));
    const siste7 = filtrert.filter((e) => dagerSiden(e.dato) <= 7 && e.type !== 'horing');
    const kommende = data.elementer
      .filter((e) => e.type === 'horing' && e.tider?.some((x) => new Date(x.tid).getTime() > nå - 86400000))
      .sort((a, b) => a.tider![0].tid.localeCompare(b.tider![0].tid));
    const frister = data.elementer
      .filter((e) => e.type === 'horing' && e.frist && new Date(e.frist).getTime() > nå)
      .sort((a, b) => a.frist!.localeCompare(b.frist!));
    const store30 = filtrert.filter((e) => e.storEndring && dagerSiden(e.dato) <= 30);
    const reg30 = filtrert.filter((e) => e.type === 'regjering' && dagerSiden(e.dato) <= 30);
    const ubesvart = sp.filter((e) => e.type === 'skriftlig' && !e.besvartDato);
    const aktive = [...telle(sp.filter((e) => dagerSiden(e.dato) <= 90), (e) => e.fra).entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { sp, siste7, kommende, frister, store30, reg30, ubesvart, aktive };
  }, [filtrert, data, nå]);

  const siste = filtrert.filter((e) => e.type !== 'horing').slice(0, 10);
  const temaSpec = useMemo(
    () => perTema(filtrert.filter((e) => dagerSiden(e.dato) <= 90), c, { id: 'oversikt-tema-90', tittel: 'Mest omtalte temaer siste 90 dager', undertittel: 'Antall spørsmål, saker, høringer og regjeringsdokumenter per tema', topp: 12 }),
    [filtrert, c],
  );
  const tidSpec = useMemo(
    () => kategoriOverTid(t.sp, c, { id: 'oversikt-kat-tid', tittel: 'Helsespørsmål per måned', undertittel: 'Skriftlige spørsmål, spørretime og interpellasjoner, fordelt på kategori' }),
    [t.sp, c],
  );

  return (
    <>
      <div className="stats">
        <Stat tall={t.sp.length} etikett="helsespørsmål" hint={`${t.ubesvart.length} skriftlige ubesvart`} onClick={() => gaTil('sporsmal')} />
        <Stat tall={t.siste7.length} etikett="nye saker siste 7 dager" hint="spørsmål, saker og regjeringen" />
        <Stat tall={t.store30.length} etikett="store endringer siste 30 dager" hint="lov, forskrift, reform, finansiering" onClick={() => gaTil('endringer')} />
        <Stat tall={t.kommende.length} etikett="kommende høringer" hint={t.kommende[0] ? datoTid(t.kommende[0].tider![0].tid) : 'ingen planlagt'} onClick={() => gaTil('saker')} />
        <Stat tall={t.reg30.length} etikett="fra departementet siste 30 dager" onClick={() => gaTil('regjeringen')} />
      </div>

      <div className="rutenett-2">
        <Graf spec={tidSpec} />
        <Graf spec={temaSpec} />
      </div>

      <div className="rutenett-sidepanel">
        <Seksjon tittel="Siste nytt" hoyre={<span className="dempet liten-tekst">Nyeste først</span>}>
          <ElementListe liste={siste} side={10} />
        </Seksjon>
        <aside>
          <Seksjon tittel="Kommende høringer">
            {t.kommende.length === 0 && t.frister.length === 0 ? <p className="tomt">Ingen planlagte høringer nå.</p> : (
              <ul className="kalender">
                {t.kommende.slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <time>{datoTid(h.tider![0].tid)}</time>
                    <a href={h.url} target="_blank" rel="noreferrer">{h.tittel}</a>
                    <span className="dempet liten-tekst">{data.komiteNavn[h.komite || ''] || ''}</span>
                  </li>
                ))}
                {t.frister.filter((h) => !t.kommende.includes(h)).slice(0, 4).map((h) => (
                  <li key={h.id}>
                    <time>Frist {datoTid(h.frist)}</time>
                    <a href={h.url} target="_blank" rel="noreferrer">{h.tittel}</a>
                    <span className="dempet liten-tekst">Skriftlig innspill</span>
                  </li>
                ))}
              </ul>
            )}
          </Seksjon>
          <Seksjon tittel="Mest aktive siste 90 dager">
            <ol className="toppliste">
              {t.aktive.map(([id, n]) => (
                <li key={id}><PersonLenke id={id} /><span className="tall">{n}</span></li>
              ))}
            </ol>
          </Seksjon>
          <Seksjon tittel="Siste store endringer" hoyre={<button className="lenkeknapp" onClick={() => gaTil('endringer')}>Se alle</button>}>
            <ul className="enkel-liste">
              {filtrert.filter((e) => e.storEndring).slice(0, 5).map((e) => (
                <li key={e.id}><a href={e.url} target="_blank" rel="noreferrer">{e.tittel.length > 140 ? e.tittel.slice(0, 140) + ' …' : e.tittel}</a></li>
              ))}
            </ul>
          </Seksjon>
        </aside>
      </div>
    </>
  );
}
