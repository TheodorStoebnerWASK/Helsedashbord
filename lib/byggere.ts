// Ferdige grafoppskrifter som brukes på tvers av visningene.
import type { Data, Element } from './types';
import type { GrafSpec } from './graf';
import { PARTIER, PARTI_REKKEFOLGE, partiFarge, partiKort } from './parti';
import { telle, maneder, mndNokkel, mndNavn, sesjonKort, dagISesjon } from './analyse';

type Ctx = { data: Data; temaNavn: (id: string) => string; katFarge: (id: string) => string; katNavn: (id: string) => string };

const partiAv = (data: Data, e: Element) => (e.fra ? data.personer[e.fra]?.parti : undefined);

export function perParti(liste: Element[], c: Ctx, o: { tittel: string; undertittel?: string; id: string; etterKategori?: boolean }): GrafSpec {
  const partier = PARTI_REKKEFOLGE.filter((p) => liste.some((e) => partiAv(c.data, e) === p));
  if (o.etterKategori) {
    return {
      id: o.id, tittel: o.tittel, undertittel: o.undertittel, form: 'liggende', stablet: true,
      kategorier: partier.map((p) => PARTIER[p].navn),
      serier: c.data.taksonomi.kategorier.map((k) => ({
        navn: k.navn, farge: k.farge,
        data: partier.map((p) => liste.filter((e) => partiAv(c.data, e) === p && e.kategori === k.id).length),
      })),
    };
  }
  const m = telle(liste, (e) => partiAv(c.data, e));
  const sortert = partier.sort((a, b) => (m.get(b) || 0) - (m.get(a) || 0));
  return {
    id: o.id, tittel: o.tittel, undertittel: o.undertittel, form: 'liggende', enhet: 'stk',
    kategorier: sortert.map((p) => PARTIER[p].navn),
    serier: [{ navn: 'Antall', data: sortert.map((p) => m.get(p) || 0), fargerPerPunkt: sortert.map(partiFarge) }],
  };
}

export function perRepresentant(liste: Element[], c: Ctx, o: { tittel: string; undertittel?: string; id: string; topp?: number }): GrafSpec {
  const m = telle(liste, (e) => e.fra);
  const topp = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, o.topp ?? 15);
  return {
    id: o.id, tittel: o.tittel, undertittel: o.undertittel, form: 'liggende', enhet: 'stk',
    kategorier: topp.map(([id]) => `${c.data.personer[id]?.navn || id} (${partiKort(c.data.personer[id]?.parti)})`),
    serier: [{ navn: 'Antall', data: topp.map(([, n]) => n), fargerPerPunkt: topp.map(([id]) => partiFarge(c.data.personer[id]?.parti)) }],
  };
}

export function perTema(liste: Element[], c: Ctx, o: { tittel: string; undertittel?: string; id: string; topp?: number; kunHovedtema?: boolean }): GrafSpec {
  const m = telle(liste, (e) => (o.kunHovedtema ? e.temaer[0] : e.temaer));
  m.delete('annet');
  const topp = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, o.topp ?? 15);
  const temaKat = Object.fromEntries(c.data.taksonomi.temaer.map((t) => [t.id, t.kategori]));
  return {
    id: o.id, tittel: o.tittel, undertittel: o.undertittel, form: 'liggende', enhet: 'stk',
    kategorier: topp.map(([id]) => c.temaNavn(id)),
    serier: [{ navn: 'Antall', data: topp.map(([, n]) => n), fargerPerPunkt: topp.map(([id]) => c.katFarge(temaKat[id])) }],
  };
}

export function kategoriOverTid(liste: Element[], c: Ctx, o: { tittel: string; undertittel?: string; id: string }): GrafSpec {
  const mnd = maneder();
  return {
    id: o.id, tittel: o.tittel, undertittel: o.undertittel, form: 'stolpe', stablet: true,
    kategorier: mnd.map(mndNavn),
    serier: c.data.taksonomi.kategorier.map((k) => ({
      navn: k.navn, farge: k.farge,
      data: mnd.map((m) => liste.filter((e) => e.kategori === k.id && e.dato && mndNokkel(e.dato) === m).length),
    })),
  };
}

export interface Enhet { id: string; navn: string; farge: string; treff: (e: Element) => boolean }

/** Sammenligning over tid (linjer, én per enhet). */
export function sammenlignOverTid(liste: Element[], enheter: Enhet[], o: { tittel: string; undertittel?: string; id: string; kumulativ?: boolean }): GrafSpec {
  const mnd = maneder();
  return {
    id: o.id, tittel: o.tittel, undertittel: o.undertittel, form: 'linje',
    kategorier: mnd.map(mndNavn),
    serier: enheter.map((en) => {
      let sum = 0;
      return {
        navn: en.navn, farge: en.farge,
        data: mnd.map((m) => {
          const n = liste.filter((e) => e.dato && mndNokkel(e.dato) === m && en.treff(e)).length;
          sum += n;
          return o.kumulativ ? sum : n;
        }),
      };
    }),
  };
}

/** Sammenligning per sesjon (grupperte stolper). «Samme periode» sammenligner like mange dager inn i hver sesjon. */
export function sammenlignPerSesjon(
  liste: Element[], enheter: Enhet[], sesjoner: string[],
  o: { tittel: string; undertittel?: string; id: string; sammePeriode?: boolean },
): GrafSpec {
  const grense = o.sammePeriode ? dagISesjon(new Date().toISOString()) : Infinity;
  const l = liste.filter((e) => e.dato && dagISesjon(e.dato) <= grense);
  const farger = ['#9C988D', '#0A0A0A', '#3D99C7']; // forrige sesjon grå, inneværende svart
  return {
    id: o.id, tittel: o.tittel, undertittel: o.undertittel, form: 'stolpe',
    kategorier: enheter.map((e) => e.navn),
    serier: sesjoner.map((s, i) => ({
      navn: sesjonKort(s) + (o.sammePeriode ? ' (samme periode)' : ''),
      farge: farger[i % farger.length],
      data: enheter.map((en) => l.filter((e) => e.sesjon === s && en.treff(e)).length),
    })),
  };
}
