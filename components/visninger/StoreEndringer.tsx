'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, ElementListe, Chips } from '../felles';
import { Graf } from '../Graf';
import { kategoriOverTid, perTema } from '@/lib/byggere';
import { TYPE_NAVN, type ElementType } from '@/lib/types';

export function StoreEndringer() {
  const c = useData();
  const alle = useMemo(() => c.filtrert.filter((e) => e.storEndring), [c.filtrert]);
  const [typer, setTyper] = useState<ElementType[]>([]);
  const liste = typer.length ? alle.filter((e) => typer.includes(e.type)) : alle;
  const tid = useMemo(() => kategoriOverTid(liste, c, { id: 'store-tid', tittel: 'Signaler om store endringer per måned', undertittel: 'Lovendringer, forskrifter, reformer, nye finansieringsmodeller, prioriteringer m.m.' }), [liste, c]);
  const tema = useMemo(() => perTema(liste, c, { id: 'store-tema', tittel: 'Store endringer per tema', topp: 12 }), [liste, c]);
  const finnes = (['regjering', 'sak', 'horing', 'skriftlig', 'muntlig', 'interpellasjon'] as ElementType[]).filter((t) => alle.some((e) => e.type === t));
  return (
    <>
      <div className="infoboks bred">
        <p>
          Her samles saker som kan bety <strong>omfattende endringer</strong> i rammevilkårene, for eksempel nye lover og forskrifter,
          endrede terskelverdier og prioriteringskriterier, reformer, nedleggelser og nye finansieringsordninger. Flagget settes av KI
          (med begrunnelse) og av nøkkelordregler i <code>config/taksonomi.json</code>.
        </p>
      </div>
      <div className="rutenett-2">
        <Graf spec={tid} />
        <Graf spec={tema} />
      </div>
      <Seksjon tittel={`Store endringer (${liste.length})`}>
        <Chips valg={finnes.map((t) => ({ id: t, navn: t === 'regjering' ? 'Regjeringen' : TYPE_NAVN[t] }))} valgt={typer} sett={setTyper} />
        <ElementListe liste={liste} />
      </Seksjon>
    </>
  );
}
