// Debatter i Stortinget: henter referatene (XML) og plukker ut helserelevante saker og spørretimespørsmål med alle innlegg.
// Komplette referater endres ikke og lagres i cachen; ufullstendige hentes på nytt.

const ent = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const tekstAv = (xml) => ent(xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

/** Plukker ut innlegg (hovedinnlegg og replikker) fra et XML-utsnitt. */
function innleggI(xml, maks) {
  const ut = [];
  for (const m of xml.matchAll(/<(Hovedinnlegg|Replikk)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const navnM = /<Navn(?:\s+personID="([^"]*)")?\s*>([\s\S]*?)<\/Navn>/.exec(m[2]);
    if (!navnM) continue;
    const hode = tekstAv(navnM[2]); // «Kjersti Toppe (Sp) [10:02:04]:» eller «Statsråd Jan Christian Vestre [..]:»
    if (/^presidenten/i.test(hode)) continue;
    const tid = /\[(\d\d:\d\d)/.exec(hode)?.[1];
    const parti = /\(([^)]+)\)\s*\[/.exec(hode)?.[1];
    const navn = hode.replace(/\s*\[.*$/, '').replace(/\s*\([^)]*\)\s*$/, '').replace(/:$/, '').trim();
    const tekst = tekstAv(m[2].replace(navnM[0], ''));
    ut.push({ p: navnM[1] || undefined, navn, parti, tid, type: m[1] === 'Replikk' ? 'replikk' : 'innlegg', tekst: tekst.slice(0, maks), lengde: tekst.length });
  }
  return ut;
}

export async function hentDebatter(sesjoner, cache, { sth, hent, logg, erHelse, erHelseSak, maks = 900 }) {
  let nye = 0;
  for (const sesjon of sesjoner) {
    const liste = ((await sth(`publikasjoner?publikasjontype=referat&sesjonid=${sesjon}`)).publikasjoner_liste || [])
      .filter((x) => String(x.id).startsWith('refs-')); // refs = Stortingets plenum
    for (const ref of liste) {
      if (cache[ref.id]?.komplett) continue;
      try {
        const xml = await hent(`https://data.stortinget.no/eksport/publikasjon?publikasjonid=${ref.id}`, { json: false });
        const komplett = /<Forhandlinger[^>]*Status="Komplett"/.test(xml);
        const dato = /\/Date\((\d+)/.exec(ref.dato)?.[1];
        const deler = [];
        // Saker (lovsaker, meldinger, interpellasjoner, representantforslag …)
        for (const m of xml.matchAll(/<Sak\b([^>]*)>([\s\S]*?)<\/Sak>/g)) {
          const sakId = /sakID="(\d+)"/.exec(m[1])?.[1];
          const tittel = tekstAv(/<Saktittel[^>]*>([\s\S]*?)<\/Saktittel>/.exec(m[2])?.[1] || '');
          if (!(erHelseSak(sakId) || erHelse(tittel))) continue;
          const innlegg = innleggI(m[2], maks);
          if (innlegg.length) deler.push({ type: 'sak', sakId: sakId ? Number(sakId) : undefined, tittel, innlegg });
        }
        // Muntlig spørretime og ordinær spørretime: hvert spørsmål er et eget utsnitt
        for (const m of xml.matchAll(/<Spm\b[^>]*>([\s\S]*?)<\/Spm>/g)) {
          const innlegg = innleggI(m[1], maks);
          const alt = tekstAv(m[1]);
          if (!innlegg.length || !(/helse- og omsorgsminister/i.test(alt) || erHelse(innlegg[0].tekst))) continue;
          const sporsmal = /«([^»]{10,400})»/.exec(innlegg[0].tekst)?.[1];
          deler.push({ type: 'spørretime', tittel: sporsmal || innlegg[0].tekst.slice(0, 200), innlegg });
        }
        cache[ref.id] = { sesjon, dato: dato ? new Date(Number(dato)).toISOString() : undefined, tittel: ref.tittel, komplett, deler };
        nye++;
        if (nye % 20 === 0) logg(`Debatter: ${nye} referater lest`);
      } catch (e) {
        logg(`Debatter: hopper over ${ref.id} (${e.message})`);
      }
    }
  }
  return nye;
}
