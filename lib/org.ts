// Organisasjoner skriver navnet sitt ulikt fra innspill til innspill («Legemiddelindustrien», «Legemiddelindustrien (LMI)»,
// «LMI»). Nøkkelen slår dem sammen: små bokstaver, uten parentes og tegnsetting, og med kjente forkortelser løst opp.
const ALIAS: Record<string, string> = {
  lmi: 'legemiddelindustrien',
  'legemiddelindustriforeningen': 'legemiddelindustrien',
  nsf: 'norsk sykepleierforbund',
  legeforeningen: 'den norske legeforening',
  'den norske legeforeningen': 'den norske legeforening',
  'norsk legeforening': 'den norske legeforening',
  ks: 'ks kommunesektorens organisasjon',
  'kommunesektorens organisasjon': 'ks kommunesektorens organisasjon',
  'ks kommunesektorens interesse og arbeidsgiverorganisasjon': 'ks kommunesektorens organisasjon',
  nho: 'næringslivets hovedorganisasjon',
  fhi: 'folkehelseinstituttet',
  ffo: 'funksjonshemmedes fellesorganisasjon',
  'nho geneo helse og velferd': 'nho geneo',
  'virke hovedorganisasjonen': 'hovedorganisasjonen virke',
  virke: 'hovedorganisasjonen virke',
  spekter: 'arbeidsgiverforeningen spekter',
  naaf: 'norges astma og allergiforbund',
  'norges astma og allergiforbund naaf': 'norges astma og allergiforbund',
};

export function orgNokkel(navn: string) {
  const ren = String(navn || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\d]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return ALIAS[ren] || ren;
}

/** Velger det peneste navnet blant variantene: uten parentes, ikke bare versaler, oftest brukt. */
export function velgVisningsnavn(varianter: string[]) {
  const tell = new Map<string, number>();
  for (const v of varianter) {
    const n = v.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    tell.set(n, (tell.get(n) || 0) + 1);
  }
  return [...tell.entries()].sort((a, b) => {
    const versal = (s: string) => (s === s.toUpperCase() ? 1 : 0);
    return versal(a[0]) - versal(b[0]) || b[1] - a[1] || a[0].length - b[0].length;
  })[0]?.[0] || varianter[0];
}
