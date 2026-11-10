'use client';
import { useMemo } from 'react';
import { useData, PartiMerke, Seksjon } from './felles';
import { SPORSMAL_TYPER } from '@/lib/types';
import { datoKort } from '@/lib/analyse';

const initialer = (navn: string) => navn.split(/\s+/).filter(Boolean).map((d) => d[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('');

/** Politisk ledelse i HOD: statsråd, statssekretærer og politisk rådgiver (fra config/hod-ledelse.json). */
export function HodLedelse() {
  const { data, filtrert } = useData();
  const hod = data.hod;

  const tall = useMemo(() => {
    const reg = filtrert.filter((e) => e.type === 'regjering');
    const sp = filtrert.filter((e) => SPORSMAL_TYPER.includes(e.type) && e.besvartDato && e.besvartAv === 'helse- og omsorgsministeren');
    return Object.fromEntries((hod?.personer || []).map((p) => {
      const etternavn = p.navn.split(' ').slice(-1)[0];
      const omtaler = reg.filter((e) => `${e.tittel} ${e.beskrivelse || ''}`.includes(etternavn)).length;
      return [p.navn, { omtaler, besvart: p.statsraad ? sp.length : undefined }];
    }));
  }, [filtrert, hod]);

  if (!hod?.personer.length) return null;
  return (
    <Seksjon
      tittel="Politisk ledelse i Helse- og omsorgsdepartementet"
      hoyre={<span className="dempet liten-tekst">Sist kontrollert {datoKort(hod.sistKontrollert)}{hod.kilde && <> · <a href={hod.kilde} target="_blank" rel="noreferrer">regjeringen.no</a></>}</span>}
    >
      <div className="ledelse">
        {hod.personer.map((p) => (
          <div key={p.navn} className={`leder${p.statsraad ? ' statsraad' : ''}`}>
            {p.bilde
              // eslint-disable-next-line @next/next/no-img-element
              ? <img className="portrett" src={`/hod/${p.bilde}`} alt={p.navn} width={p.statsraad ? 120 : 88} height={p.statsraad ? 150 : 110} />
              : <div className="portrett portrett-tom" aria-hidden="true">{initialer(p.navn)}</div>}
            <div className="medlem-info">
              <span className="rolle">{p.rolle}</span>
              <strong>{p.navn}</strong>
              <span className="dempet liten-tekst"><PartiMerke parti={p.parti} />{p.fra ? ` Tiltrådte ${datoKort(p.fra)}` : ''}</span>
              <span className="medlem-tall">
                {p.statsraad && <><b>{tall[p.navn]?.besvart}</b> helsespørsmål besvart · </>}
                <b>{tall[p.navn]?.omtaler}</b> omtaler fra departementet
              </span>
            </div>
          </div>
        ))}
      </div>
    </Seksjon>
  );
}
