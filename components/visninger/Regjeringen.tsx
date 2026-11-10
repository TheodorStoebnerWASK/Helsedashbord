'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, ElementListe, Chips } from '../felles';
import { Graf } from '../Graf';
import { kategoriOverTid } from '@/lib/byggere';
import { telle } from '@/lib/analyse';
import { HodLedelse } from '../HodLedelse';

export function Regjeringen() {
  const c = useData();
  const reg = useMemo(() => c.filtrert.filter((e) => e.type === 'regjering'), [c.filtrert]);
  const typer = useMemo(() => [...telle(reg, (e) => e.dokType).entries()].sort((a, b) => b[1] - a[1]), [reg]);
  const [valgt, setValgt] = useState<string[]>([]);
  const liste = valgt.length ? reg.filter((e) => valgt.includes(e.dokType || '')) : reg;
  const spec = useMemo(
    () => kategoriOverTid(reg, c, { id: 'reg-tid', tittel: 'Helse- og omsorgsdepartementet: publisert per måned', undertittel: 'Nyheter, pressemeldinger og dokumenter fordelt på kategori' }),
    [reg, c],
  );
  return (
    <>
      <HodLedelse />
      <div className="rutenett-2">
        <Graf spec={spec} />
        <div className="infoboks">
          <h3>Om kilden</h3>
          <p>Hentes fra regjeringen.no sine RSS-strømmer for Helse- og omsorgsdepartementet: nyheter og pressemeldinger, høringer, NOU-er, proposisjoner, stortingsmeldinger, strategier og forskrifter.</p>
          <p className="dempet">RSS-strømmene viser bare de siste ca. 100 publiseringene. Dashbordet lagrer alt fortløpende, så historikken bygges opp og blir mer komplett for hver dag. Nyheter før mai 2026 kan derfor mangle.</p>
          <p><a href="https://www.regjeringen.no/no/dep/hod/id421/" target="_blank" rel="noreferrer">Helse- og omsorgsdepartementet på regjeringen.no ↗</a></p>
        </div>
      </div>
      <Seksjon tittel="Publisert av departementet">
        <Chips valg={typer.map(([t, n]) => ({ id: t!, navn: `${t} (${n})` }))} valgt={valgt} sett={setValgt} />
        <ElementListe liste={liste} />
      </Seksjon>
    </>
  );
}
