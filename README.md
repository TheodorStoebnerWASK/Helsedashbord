# Helsepolitisk radar – Wergeland Apenes

Dashbord for helse- og omsorgskomiteen og helsefeltet i Stortinget og regjeringen. Det dekker stortingsperioden 2025–2029, det vil si sesjon 2025–26 og 2026–27.

## Innhold

| Fane | Innhold |
|---|---|
| **Oversikt** | Nøkkeltall, siste nytt, helsespørsmål per måned, temaer siste 90 dager, kommende høringer, mest aktive representanter |
| **Store endringer** | Saker som kan bety omfattende endringer: lover, forskrifter, terskelverdier, reformer, nedleggelser og finansiering. KI-en begrunner hvert flagg |
| **Temaer** | De fire kategoriene (Legemidler & Biotek, Medtek & diagnostikk, Digital Helse, Regulering & Politikk) med 22 undertemaer, trend og en egen side per tema |
| **Spørsmål** | Skriftlige spørsmål, spørretime og interpellasjoner per parti, representant og tema, med sammenligning (per måned, kumulativt, per sesjon og samme periode i fjor) |
| **Komiteen** | Medlemmene med bilde, aktivitet og temaer. Klikk på en person for å se profilen |
| **Saker & høringer** | Høringskalender, saker til behandling, representantforslag per parti, også fra andre komiteer |
| **Regjeringen** | Nyheter og dokumenter fra Helse- og omsorgsdepartementet: høringer, NOU-er, proposisjoner og strategier |

Alle grafer har disse knappene:

- **Kopier:** kopierer grafen som bilde, klar til å limes inn i PowerPoint.
- **PNG:** laster ned grafen i høy oppløsning.
- **PPT:** laster ned grafen som en ekte PowerPoint-graf. Den kan redigeres, og dataene ligger i et innebygd Excel-ark.
- **+ Presentasjon:** legger grafen i en samling. Hele samlingen kan lastes ned som én PowerPoint med WA-forside.

Helsespørsmål til andre statsråder, og helsesaker i andre komiteer, fanges også opp og merkes «Andre komiteer».

## Design

Dashbordet bruker WA-designsystemet fra nettsiden (`wask_website_2_0`):

- `app/tokens.css` er kopiert uendret fra `web/assets/css/tokens.css`.
- Fontene i `public/fonts/` er DM Sans og Source Serif 4 (SIL Open Font License).
- Logoen er `public/wa-logo.svg`. Den hvite varianten er `public/wa-logo-hvit.svg`.

Endres merkevaren på nettsiden, kopierer du `tokens.css` over på nytt. Komponentene i `app/globals.css` følger nettsidens regler:

- firkantede hjørner
- sperret versal på etiketter
- blått bare ved hover og fokus
- rødt bare som varsel

## Slik fungerer det

```
GitHub Actions (06:17 hver dag + 13:17 på hverdager)
  └─ scripts/update-data.mjs --ki
       ├─ data.stortinget.no: spørsmål, saker, høringer, representanter
       ├─ regjeringen.no: RSS fra HOD, lagres i data/regjeringen-arkiv.json
       ├─ KI-klassifisering via GitHub Models (gratis, ingen API-nøkkel)
       │    reserve: nøkkelordregler i config/taksonomi.json
       └─ skriver data/dashboard.json → commit → Vercel publiserer automatisk
```

- **KI-en er gratis.** Den bruker GitHub Models med den innebygde `GITHUB_TOKEN` i Actions (modell `openai/gpt-4.1-mini`). Klassifiseringen lagres i `data/klassifisering.json`, så hver sak klassifiseres bare én gang. Hvis dagskvoten brukes opp, fortsetter jobben ved neste kjøring.
- **Bilder** av representantene hentes direkte fra Stortingets API.
- **Passordet** settes bare med miljøvariabelen `DASHBOARD_PASSWORD` i Vercel. Det står ikke i koden. Mangler variabelen, slipper ingen inn.

## Oppsett (én gang)

1. **GitHub:** Lag et **privat** repo og last opp denne mappen.
2. **Actions:** Gå til *Settings → Actions → General → Workflow permissions* og velg *Read and write permissions*.
3. **Første kjøring:** Gå til *Actions → Oppdater data → Run workflow*. Første kjøring KI-klassifiserer alt, ca. 1 400 saker, og tar 10–15 minutter.
4. **Vercel:** Velg *Add New → Project*, importer repoet og legg inn miljøvariabelen `DASHBOARD_PASSWORD`. Velg også `AUTH_SECRET`, en tilfeldig tekst, og trykk *Deploy*.

> Merk: Vercels gratisplan (Hobby) er bare for ikke-kommersiell bruk. For bruk i byrået trengs Vercel Pro (ca. 20 USD/mnd per bruker).

## Tilpasning

- **Temaer, nøkkelord og «store endringer»:** endres i `config/taksonomi.json`. Endringene brukes ved neste kjøring.
  - Slett `data/klassifisering.json` hvis du vil KI-klassifisere alt på nytt.
- **Roller i komiteen** (leder, nestleder osv.): legges inn i `config/komite-roller.json` som `{"roller": {"KJT": "Leder"}}`. Person-ID-en står i lenken til representanten på stortinget.no.

## Lokalt

```bash
npm install
npm run data   # henter data, med regelbasert klassifisering
echo 'DASHBOARD_PASSWORD=velg-et-passord' > .env.local
npm run dev    # http://localhost:3000
```

Bak en proxy må Node få beskjed om å bruke den: `NODE_USE_ENV_PROXY=1 npm run data`.
