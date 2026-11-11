# Temaoversikt

Tre nivåer: **kategori → tema → undertema**. Alt redigeres i `config/taksonomi.json`, og endringer slår inn ved neste datakjøring.

Ordregler:

- Et ord treffer fra ordstart, så «fastleg» treffer «fastlegene».
- `*ord` treffer også inni sammensatte ord, så `*kreft` treffer «brystkreft».
- `ord\b` krever helt ord, så `ki\b` treffer ikke «kino».

Denne fila er generert fra `config/taksonomi.json`.

## Legemidler & Biotek

### Kreft og onkologi

Nøkkelord på temanivå: `*kreft`, `onkolog`, `cancer`, `cellegift`, `strålebehandl`, `lymfom`, `leukemi`, `myelom`, `car-t`, `immunterapi`, `mammografi`, `svulst`, `tumor`, `metastas`, `pakkeforløp`

| Undertema | Nøkkelord |
|---|---|
| Brystkreft | `brystkreft`, `mammografi`, `brystkreftscreening` |
| Prostatakreft | `prostata` |
| Lungekreft | `lungekreft`, `lungescreening` |
| Tarmkreft | `tarmkreft`, `kolorektal`, `tarmscreening` |
| Blodkreft og lymfom | `blodkreft`, `leukemi`, `lymfom`, `myelom` |
| Gynekologisk kreft | `livmorhalskreft`, `eggstokkreft`, `livmorkreft`, `hpv` |
| Hudkreft og føflekkreft | `hudkreft`, `føflekkreft`, `melanom` |
| Barnekreft | `barnekreft`, `kreftsyke barn` |
| Stråling, cellegift og immunterapi | `strålebehandl`, `stråleterapi`, `protonterapi`, `protonsenter`, `cellegift`, `kjemoterapi`, `immunterapi`, `car-t`, `celleterapi` |
| Kreftomsorg og pakkeforløp | `pakkeforløp`, `kreftkoordinator`, `kreftomsorg`, `kreftrehabilitering` |
| Kreftlegemidler og målrettet behandling | `kreftlegemid`, `kreftmedisin`, `målrettet behandling`, `persontilpasset kreftbehandling`, `utprøvende kreftbehandling`, `impress` |
| Hjernekreft og hjernesvulster | `hjernekreft`, `hjernesvulst`, `glioblastom` |
| Bukspyttkjertel-, lever- og magekreft | `bukspyttkjertel`, `leverkreft`, `magekreft`, `spiserørskreft` |
| Kreftstrategi og Kreftregisteret | `kreftstrategi`, `kreftregisteret`, `kreftplan`, `nasjonal kreftstrategi` |
| Kreftscreening | `brystkreftscreening`, `tarmkreftscreening`, `livmorhalsprogrammet`, `lungekreftscreening`, `prostatakreftscreening`, `masseundersøkelse` |

### Nye metoder og legemiddeltilgang

Nøkkelord på temanivå: `nye metoder`, `beslutningsforum`, `metodevurder`, `*legemid`, `medisiner`, `medikament`, `blåresept`, `refusjon`, `tidlig tilgang`, `terskelverdi`, `betalingsvilje`, `kostnadseffektiv`, `h-resept`, `sykehusinnkjøp`, `apotek`, `legemiddelmangel`, `dmp`, `legemiddelverket`, `legemid`, `*legemiddel`

| Undertema | Nøkkelord |
|---|---|
| Nye metoder og Beslutningsforum | `nye metoder`, `beslutningsforum`, `metodevurder`, `hta\b`, `innføring av`, `metodevurdering`, `beslutningsforum for nye metoder`, `innført i spesialisthelsetjenesten`, `ikke innført`, `avslag`, `fullstendig metodevurdering`, `hurtig metodevurdering` |
| Terskelverdier, prioritering og pris | `terskelverdi`, `betalingsvilje`, `alvorlighet`, `kostnadseffektiv`, `prioriteringskriter`, `prisforhandl`, `legemiddelpris`, `sykehusinnkjøp`, `lis-avtal`, `prioriteringsmelding`, `helsetap`, `qaly`, `kvalitetsjusterte leveår`, `konfidensiell pris`, `hemmelige priser` |
| Blåresept og refusjon | `blåresept`, `refusjon`, `individuell stønad`, `h-resept`, `forhåndsgodkjent`, `refusjonslist`, `forhåndsgodkjent refusjon`, `§ 2`, `§ 3`, `individuell refusjon`, `stønad til legemidler` |
| Tidlig tilgang og utprøvende behandling | `tidlig tilgang`, `utprøvende behandling`, `eksperimentell behandling`, `compassionate` |
| Legemiddelmangel og forsyning | `legemiddelmangel`, `mangel på legemidler`, `restsituasjon`, `beredskapslager`, `forsyning av legemidler`, `leveringssvikt`, `leveringsproblem`, `legemiddelberedskap`, `egenproduksjon`, `produksjon av legemidler` |
| Apotek og legemiddelbruk | `apotek`, `farmasøyt`, `multidose`, `legemiddelgjennomgang`, `feilmedisinering`, `reseptfri`, `legemiddelbruk`, `vanedannende` |
| Legemiddelregelverk og myndigheter | `legemiddelloven`, `legemiddelforskrift`, `ema\b`, `dmp\b`, `legemiddelverket`, `direktoratet for medisinske produkter`, `markedsføringstillatelse` |
| Sykehusinnkjøp, LIS og anbud | `sykehusinnkjøp`, `lis\b`, `legemiddelanbud`, `innkjøpsavtale`, `anbudskonkurranse`, `innkjøpssamarbeid` |
| Biotilsvarende legemidler og generika | `biotilsvarende`, `biosimilar`, `generika`, `byttbar`, `bytteliste`, `trinnpris` |
| Vanedannende legemidler, ADHD-medisiner og opioider | `opioid`, `vanedannende`, `a-preparat`, `b-preparat`, `sentralstimulerende`, `adhd-medisin`, `smertestillende` |
| EUs legemiddelregelverk og HTA-forordningen | `legemiddelpakke`, `hta-forordning`, `eu-forordning`, `eøs-komiteen`, `europeisk legemiddel`, `felles europeisk` |

### Sjeldne sykdommer

Nøkkelord på temanivå: `sjeldne`, `sjelden sykdom`, `sjeldne diagnoser`, `spinal muskelatrofi`, `duchenne`, `\bals\b`, `genterapi`, `cystisk fibrose`

| Undertema | Nøkkelord |
|---|---|
| Genterapi og avanserte terapier | `genterapi`, `avansert terapi`, `atmp` |
| Nevromuskulære sykdommer (SMA, ALS, Duchenne) | `spinal muskelatrofi`, `sma\b`, `duchenne`, `als\b`, `muskelsyk`, `nevromuskulær`, `spinraza`, `zolgensma`, `myotonisk` |
| Andre sjeldne diagnoser | `cystisk fibrose`, `huntington`, `kompetansesenter for sjeldne`, `sjeldenfelt` |
| Legemidler mot sjeldne sykdommer | `orphan`, `særlegemid`, `sjeldne legemidler`, `legemidler mot sjeldne` |

### Vaksiner og smittevern

Nøkkelord på temanivå: `*vaksin`, `smittevern`, `smitte`, `pandemi`, `influensa`, `antibiotika`, `antimikrobiell`, `hepatitt`, `hiv`, `covid`, `korona`

| Undertema | Nøkkelord |
|---|---|
| Vaksinasjon | `*vaksin`, `barnevaksinasjonsprogram`, `vaksinasjonsdekning`, `vaksineskepsis`, `hpv-vaksine`, `influensavaksine`, `koronavaksine`, `rs-vaksine`, `pneumokokk` |
| Smittevern og pandemi | `smittevern`, `pandemi`, `covid`, `korona`, `utbrudd`, `influensa`, `rs-virus` |
| Antibiotikaresistens | `antibiotika`, `resistens`, `antimikrobiell` |
| Hiv, hepatitt og seksuell helse | `hiv\b`, `hepatitt`, `prep\b`, `kjønnssykdom`, `seksuelt overførbar`, `seksuell helse` |
| Infeksjoner og sykehusinfeksjoner | `sykehusinfeksjon`, `infeksjon`, `sepsis`, `borrelia`, `flått`, `tbe\b`, `tuberkulose`, `mpox` |

### Bioteknologi, forskning og helsenæring

Nøkkelord på temanivå: `bioteknologi`, `klinisk forskning`, `kliniske studier`, `klinisk studie`, `helseforskning`, `life science`, `helsenæring`, `persontilpasset`, `presisjonsmedisin`, `genom`, `gentest`

| Undertema | Nøkkelord |
|---|---|
| Kliniske studier | `klinisk studie`, `kliniske studier`, `klinisk forskning`, `studiedeltak`, `utprøving`, `nasjonal handlingsplan for kliniske studier`, `nordictrials`, `flere kliniske studier`, `pasienter i studier` |
| Helsenæring og life science | `helsenæring`, `life science`, `legemiddelindustri`, `biotek`, `helseindustri`, `veikart for helsenæringen`, `eksportsatsing`, `investor`, `oppstartsselskap`, `gründer`, `helsenæringsmelding`, `industripolitikk` |
| Presisjonsmedisin og genetikk | `persontilpasset`, `presisjonsmedisin`, `genom`, `gentest`, `genetisk`, `biobank` |
| Helseforskning | `helseforskning`, `forskningsmidler`, `forskningsråd`, `forskningsinfrastruktur` |
| Innovasjon og offentlig-privat samarbeid | `innovasjon`, `offentlig-privat samarbeid`, `innovasjonspartnerskap`, `næringslivssamarbeid`, `testarena`, `katapult` |

## Medtek & diagnostikk

### Medisinsk utstyr og hjelpemidler

Nøkkelord på temanivå: `medisinsk utstyr`, `hjelpemid`, `implantat`, `protese`, `høreapparat`, `insulinpumpe`, `sensor`, `cgm`, `glukosemål`, `rullestol`, `utstyr`, `eøs-komiteen`, `forordning`

| Undertema | Nøkkelord |
|---|---|
| Hjelpemidler | `hjelpemid`, `rullestol`, `høreapparat`, `protese`, `ortopedisk`, `synshjelpemid`, `hjelpemiddelsentral` |
| Diabetes og diabetesteknologi | `diabetes`, `insulinpumpe`, `cgm\b`, `glukosemål`, `insulin`, `type 1-diabetes`, `type 2-diabetes`, `blodsukker`, `lukket sløyfe`, `kunstig bukspyttkjertel` |
| Medisinsk utstyr og regelverk | `medisinsk utstyr`, `implantat`, `pacemaker`, `mdr\b`, `ivd\b`, `utstyrsforordning` |
| Medisinsk forbruksmateriell, stomi og inkontinens | `forbruksmateriell`, `stomi`, `inkontinens`, `bandasje`, `kateter` |
| Syn og hørsel | `briller`, `høreapparat`, `cochlea`, `synshemm`, `hørselshemm`, `tinnitus` |
| Robotkirurgi og avansert medisinsk teknologi | `robotkirurgi`, `robot`, `medisinsk teknologi`, `medisinsk-teknisk`, `stråleutstyr`, `utstyrspark` |

### Screening og diagnostikk

Nøkkelord på temanivå: `screening`, `diagnost`, `laborator`, `patologi`, `bildediagnost`, `\bmr\b`, `\bct\b`, `\bpet\b`, `røntgen`, `prøvesvar`, `testing`

| Undertema | Nøkkelord |
|---|---|
| Screening og masseundersøkelser | `*screening`, `masseundersøkelse` |
| Bildediagnostikk | `bildediagnost`, `røntgen`, `mr\b`, `ct\b`, `pet\b`, `ultralyd`, `radiolog`, `mr-maskin`, `ct-maskin`, `bildediagnostikkapasitet` |
| Laboratorie og patologi | `laborator`, `patologi`, `prøvesvar`, `blodprøve`, `biopsi` |
| Gentesting og genetisk utredning | `gentest`, `genetisk testing`, `genetisk utredning` |
| Hjemmetester og selvtester | `hjemmetest`, `selvtest`, `hurtigtest` |
| Utredning og diagnoseventetid | `utredning`, `diagnoseventetid`, `ventetid på utredning`, `diagnostisk pakkeforløp`, `tidlig diagnose` |

## Digital Helse

### E-helse og journalsystemer

Nøkkelord på temanivå: `journal`, `helseplattformen`, `e-helse`, `ehelse`, `helsenorge`, `kjernejournal`, `norsk helsenett`, `digital`, `videokonsultasjon`, `e-konsultasjon`, `samhandlingsløsning`

| Undertema | Nøkkelord |
|---|---|
| Helseplattformen | `helseplattformen`, `epic\b`, `helse midt-norge`, `trondheim kommune`, `it-problemer`, `innføringen av helseplattformen` |
| Helsenorge og digitale tjenester | `helsenorge`, `videokonsultasjon`, `e-konsultasjon`, `digital hjemmeoppfølging`, `digitale helsetjenester`, `digitale helsetenester`, `app\b`, `digital innbygger`, `digitale konsultasjoner`, `chat`, `digital dialog`, `timebestilling`, `digitalt førstemøte`, `selvbetjening` |
| Norsk helsenett og infrastruktur | `norsk helsenett`, `nhn\b`, `e-helseinfrastruktur`, `felleskomponent` |
| Pasientjournal og journalsystemer (EPJ) | `pasientjournal`, `journalsystem`, `epj\b`, `dips\b`, `journalinnsyn`, `innsyn i journal`, `journalføring`, `journal`, `elektronisk pasientjournal` |
| Kjernejournal, e-resept og pasientens legemiddelliste | `kjernejournal`, `e-resept`, `pasientens legemiddelliste`, `legemiddelliste`, `pll\b`, `multidose` |
| Samhandling og meldingsutveksling | `samhandlingsløsning`, `pasientens journaldokument`, `meldingsutveksling`, `elektronisk henvisning`, `epikrise`, `dokumentdeling`, `pasientens prøvesvar`, `deling av helseopplysninger` |
| Akson og felles kommunal journal | `akson`, `felles kommunal journal`, `kommunal journal` |
| Digital hjemmeoppfølging (DHO) og telemedisin | `digital hjemmeoppfølging`, `dho\b`, `hjemmeoppfølging`, `avstandsoppfølging`, `medisinsk avstandsoppfølging`, `fjernoppfølging`, `telemedisin`, `sykehus hjemme`, `hjemmesykehus`, `virtuell avdeling` |
| E-helselov, styring og finansiering av IKT | `e-helseloven`, `e-helsestrategi`, `nasjonal e-helseportefølje`, `e-helsedirektorat`, `ikt-prosjekt`, `it-system`, `digitaliseringsprosjekt`, `medfinansiering`, `ikt i helse` |

### Helsedata og KI

Nøkkelord på temanivå: `kunstig intelligens`, `\bki\b`, `helsedata`, `helseregist`, `helseanalyseplattform`, `personvern`, `velferdsteknologi`, `app\b`, `algoritme`, `syntetiske`

| Undertema | Nøkkelord |
|---|---|
| Kunstig intelligens | `kunstig intelligens`, `ki\b`, `maskinlæring`, `algoritme`, `språkmodell`, `ki-forordning`, `ai act`, `beslutningsstøtte`, `chatbot`, `ki-verktøy`, `ki-assistent`, `tale til tekst`, `automatisering` |
| Helsedata og registre | `helsedata`, `helseregist`, `helseanalyseplattform`, `kvalitetsregist`, `syntetiske`, `dataprioritering`, `datadeling`, `helsedataservice`, `helseanalyseplattformen`, `ehds\b`, `europeisk helsedataområde`, `sekundærbruk`, `registerdata`, `tilgang til helsedata`, `dispensasjon fra taushetsplikt` |
| Personvern og informasjonssikkerhet | `personvern`, `informasjonssikkerhet`, `dataangrep`, `cyberangrep`, `datainnbrudd`, `digital sårbarhet`, `nis2`, `løsepengevirus`, `it-angrep`, `datasikkerhet`, `hacking`, `skytjeneste` |
| Velferdsteknologi | `velferdsteknologi`, `trygghetsalarm`, `digitalt tilsyn`, `sensorteknologi`, `medisindispenser`, `lokaliseringsteknologi`, `gps-sporing`, `smarthus`, `digital medisineringsstøtte` |

## Regulering & Politikk

### Sykehus og spesialisthelsetjeneste

Nøkkelord på temanivå: `*sykehus`, `*helseforetak`, `helse sør-øst`, `helse vest`, `helse midt`, `helse nord`, `fødeavdeling`, `akuttmottak`, `ventetid`, `ventelist`, `spesialisthelsetjenest`, `poliklinikk`, `operasjon`, `kirurgi`, `nedlegg`, `rehabiliter`, `\bpci\b`, `slagbehandl`, `hjerte`, `nye rikshospitalet`, `\bous\b`

| Undertema | Nøkkelord |
|---|---|
| Lokalsykehus og akuttfunksjoner | `lokalsykehus`, `akuttfunksjon`, `akuttmottak`, `nedlegg`, `sammenslå`, `funksjonsfordeling`, `sentraliser` |
| Ventetider og fristbrudd | `ventetid`, `ventelist`, `fristbrudd`, `helsekø` |
| Sykehusbygg og investeringer | `sykehusbygg`, `nye rikshospitalet`, `nytt sykehus`, `byggeprosjekt`, `investeringslån`, `sykehusutbygging` |
| Regionale helseforetak og styring | `helse sør-øst`, `helse vest`, `helse midt`, `helse nord`, `*helseforetak`, `ous\b`, `oppdragsdokument` |
| Rehabilitering og habilitering | `rehabiliter`, `habiliter`, `opptrening` |
| Hjerte, slag, kirurgi og andre fagfelt | `pci\b`, `kirurgi`, `ortoped`, `dialyse`, `nyre`, `øyeoperasjon`, `hjerneslag`, `slagbehandl`, `slagenhet`, `hjertesyk`, `hjerteinfarkt`, `hjertekirurgi`, `hjerte- og kar` |
| Sengeplasser, kapasitet og korridorpasienter | `sengeplass`, `korridorpasient`, `overbelegg`, `kapasitet`, `sengepost` |
| Pasientreiser og pasienthotell | `pasientreise`, `reisevei`, `pasienthotell`, `reiseavstand` |
| Barn og nyfødte i sykehus | `barneavdeling`, `barnesykehus`, `nyfødtintensiv`, `barneklinikk`, `syke barn` |
| Behandling i utlandet | `behandling i utlandet`, `utenlandsbehandling`, `pasientdirektiv`, `behandling i sverige` |
| Akuttkirurgi og traumebehandling | `akuttkirurgi`, `traume`, `traumesenter`, `beredskapskirurgi` |

### Fastlege og kommunehelse

Nøkkelord på temanivå: `fastleg`, `legevakt`, `kommunehelse`, `allmennleg`, `helsestasjon`, `helsesykepleier`, `skolehelse`, `primærhelse`, `kommunale helse`, `optiker`, `øyehelse`, `fysioterap`, `kiropraktor`

| Undertema | Nøkkelord |
|---|---|
| Fastlegeordningen | `fastleg`, `allmennleg`, `legeliste`, `listelengde`, `fastlegekrise`, `fastlegeordning`, `basistilskudd`, `fastlegetilskudd`, `pasientliste`, `uten fastlege` |
| Legevakt | `legevakt` |
| Helsestasjon og skolehelsetjeneste | `helsestasjon`, `helsesykepleier`, `skolehelse` |
| Fysioterapi og andre kommunale tjenester | `fysioterap`, `kiropraktor`, `optiker`, `øyehelse`, `ergoterap`, `logoped` |
| Kommunal akutt døgnenhet (KAD) og intermediære plasser | `kad\b`, `kommunal akutt døgnenhet`, `øyeblikkelig hjelp døgn`, `intermediær`, `korttidsplass` |
| Kommuneleger og allmennmedisin i distriktene | `kommunelege`, `distriktslege`, `distrikts`, `utkant`, `distriktskommune` |

### Eldreomsorg og omsorgstjenester

Nøkkelord på temanivå: `eldre`, `sykehjem`, `hjemmetjenest`, `omsorg`, `demens`, `\bbpa\b`, `pleie`, `avlastning`, `omsorgsbolig`, `pårørende`

| Undertema | Nøkkelord |
|---|---|
| Sykehjem | `sykehjem`, `institusjonsplass`, `langtidsplass` |
| Hjemmetjenester og omsorgsboliger | `hjemmetjenest`, `hjemmesykepleie`, `omsorgsbolig`, `bo trygt hjemme` |
| Demens | `demens`, `alzheimer` |
| Pårørende, BPA og avlastning | `pårørende`, `bpa\b`, `brukerstyrt personlig assistanse`, `avlastning`, `omsorgsstønad` |
| Eldrepolitikk | `eldre`, `eldrereform`, `aldersvennlig`, `eldrebølge`, `aldring`, `seniorer`, `eldreombud`, `eldremelding` |
| Heldøgns omsorg og institusjonsplasser | `heldøgns`, `institusjonsplass`, `døgnplass` |
| Utviklingshemming og funksjonsnedsettelser | `utviklingshemm`, `funksjonsnedsett`, `funksjonshemm`, `bofellesskap`, `ressurskrevende brukere` |
| Dagaktivitet og aktivitetstilbud | `dagaktivitet`, `dagsenter`, `aktivitetstilbud`, `meningsfull aktivitet` |

### Psykisk helse og rus

Nøkkelord på temanivå: `psykisk`, `*psykiatri`, `\brus`, `narkotika`, `alkohol`, `\blar\b`, `overdose`, `selvmord`, `\bdps\b`, `\bbup\b`, `spiseforstyrr`, `avhengighet`, `cannabis`

| Undertema | Nøkkelord |
|---|---|
| Psykisk helse hos barn og unge | `bup\b`, `barne- og ungdomspsykiatri`, `psykisk helse hos barn`, `ungdomspsykiatri` |
| Psykisk helsevern og DPS | `dps\b`, `*psykiatri`, `psykisk helsevern`, `tvang`, `sengeplass` |
| Rus og avhengighet | `\brus`, `narkotika`, `avhengighet`, `lar\b`, `overdose`, `rusreform`, `avrusing`, `cannabis`, `sprøyterom`, `heroinassistert`, `avrusingsplass`, `rusbehandling`, `tvungen rusbehandling`, `mindreårige og rus` |
| Alkoholpolitikk | `alkohol`, `vinmonopol`, `skjenk` |
| Selvmordsforebygging | `selvmord` |
| Spiseforstyrrelser | `spiseforstyrr` |
| Psykisk helse generelt | `psykisk`, `psykolog`, `opptrappingsplan for psykisk` |
| Traumer, vold og overgrep | `traume`, `vold`, `overgrep`, `ptsd`, `barnehus` |
| ADHD, autisme og nevroutviklingsforstyrrelser | `adhd`, `autisme`, `nevroutvikling`, `tourette` |
| Pengespill og spillavhengighet | `pengespill`, `spillavhengighet`, `gambling`, `dataspillavhengighet` |

### Helsepersonell og bemanning

Nøkkelord på temanivå: `helsepersonell`, `sykepleier`, `bemanning`, `rekrutter`, `spesialistutdann`, `turnus`, `\blis1`, `autorisasjon`, `jordmødre`, `jordmor`, `helsefagarbeider`, `legemangel`, `vikar`

| Undertema | Nøkkelord |
|---|---|
| Legemangel og rekruttering | `legemangel`, `rekrutter`, `stabiliser`, `bemanning` |
| Sykepleiere og helsefagarbeidere | `sykepleier`, `helsefagarbeider`, `spesialsykepleier`, `jordmødre`, `jordmor` |
| Utdanning og spesialisering | `spesialistutdann`, `lis1`, `utdanningsplass`, `studieplass`, `medisinstudi`, `praksisplass` |
| Autorisasjon og utenlandsk utdanning | `autorisasjon`, `utenlandsk utdann`, `helsepersonellregister` |
| Arbeidsvilkår og innleie | `arbeidstid`, `turnus`, `vikar`, `innleie`, `deltid`, `lønn` |
| Oppgavedeling og kompetanse | `oppgavedeling`, `kompetanseløft`, `videreutdanning`, `avansert klinisk sykepleie`, `spesialisering` |
| Legespesialister og legefordeling | `legespesialist`, `legefordeling`, `spesialistmangel`, `psykiatermangel`, `legestilling` |
| Helsepersonellkommisjonen | `helsepersonellkommisjon`, `tid for handling` |

### Akuttmedisin og beredskap

Nøkkelord på temanivå: `ambulanse`, `luftambulanse`, `akuttmedisin`, `\bamk\b`, `beredskap`, `redningshelikopter`, `forsyningssikkerhet`, `helseberedskap`, `beredskapslag`, `nukleær`, `atomberedskap`, `strålevern`

| Undertema | Nøkkelord |
|---|---|
| Ambulanse og luftambulanse | `ambulanse`, `luftambulanse`, `redningshelikopter`, `amk\b`, `responstid` |
| Helseberedskap og forsyning | `beredskap`, `forsyningssikkerhet`, `helseberedskapsloven`, `totalforsvar`, `beredskapslag` |
| Atom- og strålevern | `atom`, `nukleær`, `strålevern`, `cbrn` |
| Akuttmedisin og hjertestans | `akuttmedisin`, `hjertestans`, `akuttmedisinforskrift`, `førstehjelp`, `hjertestarter` |
| Totalforsvar og militær helsetjeneste | `totalforsvar`, `forsvaret`, `sanitet`, `krigssituasjon`, `sivil beredskap` |

### Folkehelse og forebygging

Nøkkelord på temanivå: `folkehelse`, `forebygg`, `tobakk`, `snus`, `nikotin`, `e-sigarett`, `vape`, `fysisk aktivitet`, `kosthold`, `sukker`, `overvekt`, `fedme`, `pollen`, `allergi`, `astma`, `luftkvalitet`, `solarium`, `ernæring`, `ultraprosesser`, `\bmat\b`, `helse blant`

| Undertema | Nøkkelord |
|---|---|
| Tobakk og nikotin | `tobakk`, `snus`, `nikotin`, `e-sigarett`, `vape`, `røyk`, `røykeslutt`, `snusbruk`, `tobakksskadeloven`, `nøytral innpakning`, `smakstilsetning` |
| Kosthold og overvekt | `kosthold`, `sukker`, `overvekt`, `fedme`, `ultraprosesser`, `ernæring`, `mat\b`, `matsystem`, `sukkeravgift`, `brus`, `matmerking`, `nøkkelhull`, `salt` |
| Fysisk aktivitet | `fysisk aktivitet`, `aktivitetsnivå`, `stillesitt` |
| Allergi, astma og pollen | `pollen`, `allergi`, `astma`, `luftkvalitet`, `luftforurensning` |
| Skjermbruk og sosiale medier | `skjermbruk`, `skjermtid`, `sosiale medier` |
| Sosial ulikhet i helse | `sosial ulikhet`, `ulikhet i helse`, `levekår`, `helse blant innvandrere` |
| Barn og unges helse | `barn og unge`, `barnehage`, `skolemat`, `skolemåltid`, `barns helse`, `ungdomshelse` |
| Ensomhet og psykisk folkehelse | `ensomhet`, `utenforskap`, `psykisk folkehelse` |
| Miljø og helse | `miljøgift`, `pfas`, `støy`, `drikkevann`, `inneklima`, `radon` |

### Tannhelse

Nøkkelord på temanivå: `tannhelse`, `tannleg`, `tannbehandl`, `tannpleie`

| Undertema | Nøkkelord |
|---|---|
| Tannhelsestøtte og egenandeler | `tannhelsestøtte`, `billigere tannhelse`, `gratis tannhelse`, `tannbehandling`, `stønad til tannbehandling`, `tannhelsereform`, `egenandel tannlege`, `tannhelse for unge voksne` |
| Den offentlige tannhelsetjenesten | `tannhelsetjeneste`, `fylkeskommunale tannhelse`, `tannlegemangel`, `tannleg` |

### Finansiering og budsjett

Nøkkelord på temanivå: `statsbudsjett`, `budsjett`, `bevilgning`, `finansiering`, `egenandel`, `frikort`, `innsatsstyrt`, `\bisf\b`, `takst`, `underskudd`, `økonomi`, `kroner`

| Undertema | Nøkkelord |
|---|---|
| Statsbudsjett og bevilgninger | `statsbudsjett`, `budsjett`, `revidert nasjonalbudsjett`, `bevilgning` |
| Finansieringsordninger | `innsatsstyrt`, `isf\b`, `takst`, `basisramme`, `finansieringsmodell`, `toppfinansiering`, `kommuneøkonomi` |
| Egenandeler og frikort | `egenandel`, `frikort` |
| Sykehusøkonomi, underskudd og kutt | `underskudd`, `sykehusøkonomi`, `økonomiske rammer`, `kutt`, `innsparing`, `sparekrav`, `omstilling` |
| Kommuneøkonomi og ressurskrevende tjenester | `kommuneøkonomi`, `ressurskrevende`, `toppfinansiering`, `rammetilskudd`, `øremerk` |
| Investeringer og lån | `investering`, `investeringslån`, `lånerammer`, `kapitalbehov` |

### Helselovgivning og pasientrettigheter

Nøkkelord på temanivå: `pasientrettighet`, `pasient- og brukerrettighet`, `helsepersonelloven`, `spesialisthelsetjenesteloven`, `abort`, `bioteknologiloven`, `aktiv dødshjelp`, `tvang`, `\blov\b`, `loven`, `forskrift`, `prioritering`, `klage`, `pasientskade`, `fritt behandlingsvalg`, `erstatning`, `gransking`, `tilsyn`, `helsetilsyn`, `statsforvalter`

| Undertema | Nøkkelord |
|---|---|
| Pasientrettigheter, klage og erstatning | `pasientrettighet`, `pasient- og brukerrettighet`, `klage`, `pasientombud`, `pasientskade`, `npe\b`, `erstatning` |
| Abort og bioteknologi | `abort`, `bioteknologiloven`, `eggdonasjon`, `surrogati`, `assistert befruktning` |
| Livets slutt og palliasjon | `aktiv dødshjelp`, `selvbestemt livsavslutning`, `palliati`, `lindrende` |
| Tilsyn, kvalitet og pasientsikkerhet | `tilsyn`, `helsetilsyn`, `statsforvalter`, `gransking`, `pasientsikkerhet`, `uønskede hendelser`, `avvik` |
| Lovverk og forskrifter | `\blov\b`, `loven`, `forskrift`, `helsepersonelloven`, `spesialisthelsetjenesteloven`, `helse- og omsorgstjenesteloven` |
| Tvang og samtykkekompetanse | `tvangsbegrensningslov`, `tvang`, `samtykkekompetanse`, `tvangsbruk` |
| Taushetsplikt og informasjonsdeling | `taushetsplikt`, `opplysningsplikt`, `informasjonsdeling` |
| Barn som pårørende og barns rettigheter | `barn som pårørende`, `barns rettigheter`, `barnekonvensjon` |

### Private og ideelle aktører

Nøkkelord på temanivå: `privat`, `kommersiell`, `ideell`, `anbud`, `avtalespesialist`, `helseforsikring`, `nærklinikk`, `konkurranseutsett`

| Undertema | Nøkkelord |
|---|---|
| Private sykehus og klinikker | `privat`, `kommersiell`, `nærklinikk`, `privatklinikk` |
| Fritt behandlingsvalg, anbud og avtalespesialister | `fritt behandlingsvalg`, `anbud`, `avtalespesialist`, `konkurranseutsett` |
| Ideelle og frivillige | `ideell`, `frivillig` |
| Helseforsikring | `helseforsikring` |
| Kommersialisering og profitt i helse | `kommersialisering`, `profitt`, `utbytte`, `private eiere`, `oppkjøp` |
| Private avtaleleverandører | `avtaleleverandør`, `private leverandører`, `kjøp av private`, `privat rehabilitering` |

### Kvinnehelse og fødsel

Nøkkelord på temanivå: `kvinnehelse`, `fødsel`, `føde`, `svangerskap`, `endometriose`, `barsel`, `gynekolog`, `overgangsalder`, `\bpcos\b`

| Undertema | Nøkkelord |
|---|---|
| Fødsel og svangerskap | `fødsel`, `føde`, `svangerskap`, `barsel`, `jordmor`, `fødeavdeling`, `fødetilbud`, `fødestue`, `reisetid til fødeavdeling`, `følgetjeneste`, `barselomsorg` |
| Kvinnesykdommer | `endometriose`, `pcos\b`, `overgangsalder`, `kvinnehelse`, `gynekolog`, `lipødem`, `pmdd` |
| Fertilitet og assistert befruktning | `fertilitet`, `ivf\b`, `assistert befruktning`, `eggfrys`, `barnløshet` |
| Prevensjon og seksuell helse | `prevensjon`, `p-piller`, `angrepille`, `gratis prevensjon` |

### Helsereform og styring

Nøkkelord på temanivå: `helsereform`, `én helsetjeneste`, `helsefellesskap`, `foretaksmodell`, `styring`, `helse- og samhandlingsplan`, `organisering`, `regionale helseforetak`, `strategi for`, `nasjonal plan`

| Undertema | Nøkkelord |
|---|---|
| Helsereform og organisering | `helsereform`, `én helsetjeneste`, `foretaksmodell`, `organisering`, `styring` |
| Samhandling og helsefellesskap | `helsefellesskap`, `samhandling`, `helse- og samhandlingsplan` |
| Nasjonale planer og strategier | `nasjonal plan`, `nasjonal strategi`, `handlingsplan`, `stortingsmelding`, `meld. st` |
| Ansvarsdeling mellom stat og kommune | `ansvarsdeling`, `oppgavefordeling`, `staten og kommunene`, `forvaltningsnivå` |
| Utvalg og offentlige utredninger | `nou\b`, `utvalg`, `utredning`, `helsereformutvalg`, `ekspertutvalg` |
