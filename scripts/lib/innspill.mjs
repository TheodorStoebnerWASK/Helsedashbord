// Høringsinnspill (skriftlige) og deltakere i muntlige høringer for helserelevante høringer.
// Avholdte høringer endres ikke og hentes bare én gang; aktive/planlagte hentes på nytt hver kjøring.

const renTekst = (html) =>
  String(html || '')
    .replace(/<\/(p|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

// Organisasjonsnavn skrives ulikt («NORSK SYKEPLEIERFORBUND», «Norsk Sykepleierforbund ») – lag en nøkkel for gruppering
export const orgNokkel = (navn) => String(navn || '').toLowerCase().replace(/[^\p{L}\d]+/gu, ' ').trim();
const penNavn = (navn) => {
  const n = String(navn || '').trim().replace(/\s+/g, ' ');
  // Navn i rene versaler (fra høringsprogrammet) gjøres om til vanlig skrivemåte
  return n === n.toUpperCase() && /\p{L}/u.test(n)
    ? n.toLowerCase().replace(/(^|[\s\-/(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Nho|Lo|Ys|Ks|Nsf|Fhi|Hod|Nav|Sv|Ap|Hf|Rhf|Ikt|Adhd|Als|Sma)\b/g, (x) => x.toUpperCase())
    : n;
};

export async function hentInnspill(horinger, cache, { sth, logg, utdrag = 900 }) {
  let nye = 0;
  for (const h of horinger) {
    const id = String(h.id).replace('horing-', '');
    const c = cache[id];
    if (c?.status === 'Avholdt' && !c.utilgjengelig) continue;
    // Stortingets API gir serverfeil for skriftlige høringer – prøv på nytt én gang i uka
    if (c?.utilgjengelig && Date.now() - new Date(c.sjekket).getTime() < 7 * 86400000) continue;
    try {
      const inn = (await sth(`horingsinnspill?horingid=${id}`)).horingsinnspill_liste || [];
      let deltakere = [];
      try {
        const prog = (await sth(`horingsprogram?horingid=${id}`)).horingsprogram_liste || [];
        for (const p of prog) {
          for (const el of p.horingsprogram_element_liste || []) {
            if (!el.tidsangivelse) continue;
            const deler = String(el.tekst || '').split(';').map((s) => s.trim()).filter(Boolean);
            const org = deler[0];
            if (!org || /innledning|spørsmålsrunde|pause|oppsummering|avslutning/i.test(org)) continue;
            deltakere.push({ org: penNavn(org), tid: el.tidsangivelse, personer: deler.slice(1).map((x) => x.replace(/\s+/g, ' ')) });
          }
        }
      } catch { /* høringsprogram finnes ikke for skriftlige høringer */ }
      cache[id] = {
        status: h.horingStatus,
        innspill: inn.map((x) => {
          const tekst = renTekst(x.tekst);
          return { id: x.id, org: penNavn(x.organisasjon), tittel: String(x.tittel || '').trim(), dato: x.dato, tekst: tekst.slice(0, utdrag), lengde: tekst.length };
        }),
        deltakere,
      };
      nye++;
    } catch (e) {
      cache[id] = { status: h.horingStatus, innspill: [], deltakere: [], utilgjengelig: true, sjekket: new Date().toISOString() };
      logg(`Innspill: høring ${id} er ikke tilgjengelig i API-et (${e.message.slice(0, 60)}) – prøver igjen om en uke`);
    }
  }
  return nye;
}
