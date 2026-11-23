# Living World 2.0 — audit dei sistemi (allegato dell'incremento 0)

Rapporti integrali dei quattro revisori in sola lettura (2026-11-23, base `main` `96eb9be`). Sono la base della matrice in [LIVING_WORLD.md](LIVING_WORLD.md). **Dove questi rapporti e LIVING_WORLD.md discordano vale LIVING_WORLD.md**, che riporta le verifiche dirette: in particolare D-1 (morti lontane) è stato **ridimensionato** con il motore reale (in 48 ore di gioco 4 morti, nessuno dei 18 abitanti), mentre A3-01 (denaro infinito) è stato **confermato** (LW-ECO-01). I riferimenti `file:riga` valgono per `96eb9be`. Le prove citate dai revisori (`sim-morti.cjs`, `loop.cjs`, `blades.cjs`) erano script temporanei fuori dal progetto.

## Audit A1 — World Simulation Architect (sola lettura)

Base: `C:\Users\elaro\Downloads\Reincarnation-living-world`, branch `claude/living-world-2` = `main` `96eb9be`. Nessun file del progetto modificato. `urban-life.js` letto senza proposte (PERF-003 è di un altro agente). File di Codex (`urban-districts.js`, `urban-sector-layout.js`, `urban-lab*.js`, `urban-profiles.js`) non toccati.

### 0. Sintesi

1. **Non esiste un bus di eventi.** `Game.onEvent` è un solo slot riservato all'interfaccia (`engine.js:160`, `interface.js:452-460`). Il vero punto di smistamento delle azioni del giocatore è `record()` (`engine.js:164-171`), che chiama in modo fisso Growth, Life, Daily, Reputation e Guild. Sette chiamate dirette a `Reputation.record` passano fuori da `record()`.
2. **Non esiste un registro generale delle azioni del giocatore.** Ci sono solo frammenti limitati e specializzati: `conflicts.events` (32), `life.news` (8, ciclo fisso), le memorie per abitante di `society` (16) e di `urban` (8).
3. **Non esiste un evento di cambio giorno.** Ogni sistema confronta un proprio giorno. Il blocco a impulsi di `step` (ogni 1,15 s, `engine.js:1148-1162`) e `sleep()` (`engine.js:751-754`) sono i punti economici per conseguenze differite.
4. **Il salvataggio v7 è a prova di versione solo per i campi di primo livello nuovi.** I validatori esistenti accettano soltanto valori elencati. Un validatore troppo severo in un campo nuovo può causare la **perdita silenziosa della partita** (§7, D3).
5. Lo stato regionale c'è, ma è sparso: reputazione per città e regno, `society.towns`, mercati per continente, lutto, distretti e visite. **Mancano le regole per continente.**
6. Punto consigliato per la memoria del mondo: un nuovo modulo `world-memory.js` **subito prima di `engine.js`**, con un campo di primo livello `s.memory` (`schema:1`) e un ripristino tollerante.

### 1. Tempo, cadenze e costi

**Due orologi.** `s.time` è il tempo di simulazione: il passo è limitato a 0,1 s e il sonno aggiunge `rest.seconds`. Il calendario vale `startMinute + s.time·0,8 + offset` (`calendar.js:91-94`). L'offset riceve anche il tempo dei rallentamenti dei fotogrammi (`engine.js:1112`, `interface.js:435`). Un giorno dura 1800 s (`calendar.js:4-9`), una stagione 12 giorni e un anno 48 giorni. Il meteo è deterministico per blocchi di 3 ore, con cache (`calendar.js:108-124`). Il tempo si ferma quando un pannello è aperto o la scheda è nascosta (`interface.js:432-436`).

| Cadenza | Cosa gira | Riferimento |
|---|---|---|
| Ogni fotogramma | `Game.step` (mostri, colpi, aree, effetti), `Conflicts.tick` locale (scontro entro 410 px), `UrbanLife.tick` con preparazione serale a Velaris dalle 22:00, `Guild.tick` con squadra, `Game.view` (Calendar.view, **`focus()` che raccoglie tutti i siti**, compresi `UrbanLife.sites` e `Society.sites`), `Game.actors` (Society.actors → `entry()` per ogni residente della regione) | `engine.js:1109-1176`, `311-339`, `372-389`; `interface.js:436-445` |
| 0,35 s | `tryEvolution` | `engine.js:1173-1174` |
| 1,05 s | Impulso dei conflitti (scadenze, pattuglie lontane) | `npc-conflicts.js:433-452` |
| **1,15 s** | `Life.tick`, `Society.tick`, `Build.tick`, `Economy.tick`, `Legendary.tick`, `Daily.tick` | `engine.js:1148-1162`, `world-life.js:172` |
| 3 s | Controllo del giorno in `UrbanLife` (produzione all'alba) | `urban-life.js:508-523` |
| 12 s | Salvataggio automatico completo (`JSON.stringify(s)`, 28–44 KB, 0,1–0,5 ms secondo PROGRESS) | `engine.js:1175`, `1385-1389` |
| Ogni `keep()` | Salvataggio completo sincrono dopo uccisioni, raccolte, notizie, cambi di regione | `engine.js:406` e oltre 20 chiamate |
| Giorno di calendario | `MarketFlows.stepDay` (recupero ≤120 giorni), produzione di Velaris, limiti giornalieri della reputazione, offerta del giorno, erede del Santuario | `market-flows.js:400-410`, `urban-life.js:513-522`, `reputation.js:57-63`, `daily-life.js:110-121`, `legendary.js:164` |
| Su `s.time` | Notizia del borgo ogni 68 s, Society ogni 65 s, Build ogni 125 s, lutto di 3600 s | `world-life.js:64`, `society.js:179`, `construction.js:65`, `npc-conflicts.js:167` |

**Da non toccare (PERF-001/002/003).** Non toccare `path()`/`canWalk` (PERF-001), il pianificatore e `prepareNextDay`/`localActors` di `urban-life.js` (PERF-002/003), `focus()` e `Game.actors` (per fotogramma), né il percorso di `sleep()` → `UrbanLife.tick`, che è lo scenario del salto di PERF-003. Il lavoro nuovo va nell'impulso da 1,15 s o nel cambio di giorno, con costo O(voci) e senza chiamare `keep()`.

### 2. Eventi

**Ricevuti da `record(event,amount,info)`** (contesto `{region:s.region,...}`): `visit`, `kill`, `boss`, `death`, `dodge`, `damage`, `innate`, `physical`, `run` (ogni secondo di cammino), `npcRescue`, `event` (statua, lanterna), `mine`, `harvest`, `trade` (Economy, Society, UrbanLife, Build), `craft`, `field`, `build`, `train`, `study`, `livestock`, `fish`, `forge`, `sow`, `reap`, `care`, `ranch`, `cook`, `sew`, `gearWork`, `*Attempt`, `npcRitual`, `urban-restoration`. Fonti: `engine.js:298`, `429-430`, `474`, `491`, `498`, `553-554`, `615`, `641`, `715`, `720`, `730`, `802`, `806`, `868`, `1123`; `trade-economy.js:264`; `society.js:163`; `urban-life.js:587`; `urban-services.js:69-86`; `gear.js:304`; `npc-conflicts.js:239`, `248`.

**Fuori da `record()`** (chiamate dirette a `Reputation.record`): `legendary-kill` (`engine.js:432`), `campaign-vela` (`789`), `campaign-rift` (`794`), `guild-claim`, `guild-found`, `guild-branch` (`815`), `quest-claim` (`828`), `sovereign` (`839`), `npc-neglect` (`1164`, da `Conflicts` → `notify`).

**`emit` verso l'interfaccia**: solo `toast`, `sound`, `panel`, `region` e `change` (`engine.js:160`). Non usarli per la simulazione: i test in Node sostituiscono `onEvent` con una funzione vuota.

### 3. Schede per sistema

| Sistema | Dati posseduti / salvati | Ricevuti → prodotti | Effetti permanenti / temporanei | Stato |
|---|---|---|---|---|
| **Calendario** (`calendar.js`) | `s.calendar={seed,offset}` (`73-83`); `restore` rifiuta un seme diverso o un offset fuori intervallo | avanza da `step` e `sleep` → `view` (giorno, stagione, fase, meteo, `shopOpen`) | data permanente; meteo per blocchi di 3 h | ✅ funzionante; **evento di cambio giorno assente** |
| **Vita del borgo** (`world-life.js`) | `s.life`: xp di 17 mestieri, scorte, aiuole, gregge, progetto, `visits` (≤260), `checkpoint`, `inscriptions` (≤5), `deathCaches`, `eventBlock`, `news` (≤8), impulsi (`70-117`) | `record` → messaggi di livello; `tick` → notizie e scoperte | livelli, visite, borselli alla morte / evento del borgo a rotazione | ✅ mestieri; 🟡 **«Cronaca» scollegata** (D1); Nerea, Tessa e Ivo senza memoria |
| **Vita quotidiana** (`daily-life.js`) | `s.daily` (`schema:1`): bisogni, temperatura, `buff`, `quests`, `offerClaimed`, `last` (`32-45`; `restore` restituisce l'oggetto grezzo) | `log` (da `record`) → avanzamento delle missioni; `dailyOffer` legge carenze, lupi e meteo (`110-121`) | missioni / bisogni e modificatori | ✅; **unico precedente di evento contestuale** |
| **Residenti urbani** (`urban-life.js`, sola lettura) | `s.urban`: `people[id]=[{kind:'chat'|'gift',day}]` (≤8), `city` (scorte e produzione), `mission`, `pulse` (`104-132`) | comandi conversa/dono/consegna → memoria e `trade`; all'alba scorte → `Economy.supplyVelarisMarket` | memorie e fiducia (`463-470`) / routine | ✅; memoria solo per interazione diretta |
| **Società** (`society.js`) | `s.society.people[id].memories` (`chat`/`trade`/`gift`, ≤16), `towns[9]` (`level`, `stock`, `trade`, `accord`), famiglia (`31-68`) | comandi → memoria, `trade`; `tick` ogni 65 s | legami e famiglia / migrazioni | 🟡 economia dei borghi scollegata e satura (D2) |
| **Reputazione** (`reputation.js`) | `standings` `town:`/`realm:`/`faction:`/`guild:` (±100), `titles`, `visited`, `medics`, `daily` (`16`, `28-46`) | `visit`, `trade` (4/giorno), `kill` (3/giorno), `npcRescue` (3/giorno), `npc-neglect`, campagna, gilda → titoli | punteggi e titoli / limiti giornalieri; `discount` ±2 sul prezzo (`109`) | 🟡 implementata ma poco visibile (variazioni silenziose); nessun concetto di testimone |
| **Conflitti** (`npc-conflicts.js`) | `people` (stato, punti vita, `witnessed`, `cause`), `regions` (pattuglie), `events` (≤32, solo id di abitanti noti), `mourning` per regione (`35-131`) | danni, cure, rito → `monitor` (cronaca), `npc-neglect` solo se il giocatore era entro 185 px (`181`, `437-441`) | morte permanente, memoriale / lutto di 2 giorni → prezzo +1 (`trade-economy.js:177`) | ✅ unico registro di avvenimenti visibile («Cronaca degli scontri») |
| **Economia** (`trade-economy.js`, `market-flows.js`) | `s.economy` (`balance`, 5 `markets`, `flows` facoltativo: `day`, `wealth`, `carry`, `shipments`, `ledger`) | `trade` del giocatore → `external`; giorno → produzione, consumo, rotte | scorte, ricchezza, prezzi (scarsità ×0,4–1,6) | ✅ ciclo completo; 🟡 poco visibile (ECO-003: `flowReport` non è usato da nessun pannello) |
| **Persistenza** (`engine.js`) | chiave v7, `saveKeys` v7…v1 (`132-133`), `parseSave` (`1411-1510`) | `keep()`, salvataggio automatico, `pagehide` e `visibilitychange` (`interface.js:285-286`) | — | ✅ migrazione v1→v7 e test in entrambe le direzioni; ⚠️ D3 |

Altri registri: `Growth.history` (≤2 stadi, `growth.js:211`), `guild.completed` (regione/tipo → tempo), `build.districts` (fondi per regione), `legendary` (date di scoperta e dell'erede dopo 7 anni, `legendary.js:156-168`).

### 4. Risposte alle domande specifiche

**Registro persistente delle azioni del giocatore.** È **assente** come sistema generale. Frammenti:

- `conflicts.events` contiene `{title,region,id,at}`, al massimo 32 voci con titolo di 170 caratteri. Viene scritto da `monitor` (`npc-conflicts.js:155-161`) e letto in `npc-conflict-panel.js:42`. Il validatore richiede che `id` sia un abitante noto (`127`), quindi non è riutilizzabile per eventi generici.
- `life.news` contiene `{id,day,block}`, al massimo 8 voci di soli quattro eventi fissi (`world-life.js:99`, `177-178`). Il diario lo mostra in `panels.js:515-516`.
- Memorie per abitante: Society ≤16 e UrbanLife ≤8, con **tipi ammessi elencati** (`society.js:55`, `urban-life.js:117`).

**Bus di eventi.** Non esiste. Il gancio è `record()`, a cui va aggiunta una riga, più i sette punti diretti del §2.

**Agganci a bassa frequenza.** L'impulso da 1,15 s esegue una funzione `tick` che esce subito se `Calendar.absoluteDays(s.calendar,s.time)` non è cambiato. `sleep()` (`engine.js:751-754`) va gestito con recupero dei giorni passati e un limite, come `maxCatchUp=120` (`market-flows.js:24`). Per le date mostrate e per il decadimento usare il **giorno di calendario**, non `s.time`.

**Formato del salvataggio.**

- Versione 7 e chiave `reincarnation.lumora.save.v7`, limite di 12 MB (`engine.js:132`).
- Il validatore rifiuta tipi e intervalli errati, coerenze della campagna, mostri e regioni (`1393-1410`, `1414-1466`) e i moduli nulli.
- Richiede `calendar`, `bag`, `workshop`, `daily` ed `economy` dalla v5 (`1475`), `gear`, `adaptive`, `conflicts`, `legendary` e `reputation` dalla v6 (`1492`), `urban` e `cityWorks` nella v7 (`1504`).
- **Non rifiuta campi sconosciuti di primo livello**: li conserva e li risalva.
- Campi nuovi annidati: Daily, Society, Reputation e Guild restituiscono l'oggetto grezzo e conservano i campi extra. Life, UrbanLife, Conflicts e MarketFlows ricostruiscono l'oggetto e **li perdono**.
- Esempi di campo facoltativo con valore predefinito: `cityWorks.seedbedAt` (`urban-services.js:21-23`) ed `economy.flows`, ricreato se non è valido (`trade-economy.js:90-91`).
- I test (`verifica-salvataggi-incrociati.cjs`) provano A→B **e B→A**. Una partita della nuova versione deve quindi caricarsi anche in `96eb9be`: dati solo in un **campo di primo livello nuovo**, mai nuovi tipi in `urban.people`, `society.memories`, `conflicts.events` o nelle chiavi di `reputation.standings` (`reputation.js:20-27`).
- **Laboratorio di Codex** (`3f3add9`, branch `codex/urban-scale`): `build.py --urban-lab` sostituisce `"reincarnation.lumora.save."` **solo dentro `engine.js`**. Conseguenze: nessuna chiave `localStorage` con quel prefisso in altri moduli. Una futura v8 va scritta come stringa letterale intera in `engine.js`. La memoria del mondo va tenuta nel salvataggio principale.

**Stato regionale salvato.**

| Dato | Chiave | Granularità |
|---|---|---|
| Reputazione | `reputation.standings['town:'|'realm:']` | città, continente |
| Borghi | `society.towns` | 9 regioni continentali |
| Mercati | `economy.markets`, `flows.wealth` | 5, uno per continente (`trade-economy.js:30`; ECO-002: esattamente 5) |
| Lutto, pattuglie | `conflicts.mourning`, `conflicts.regions` | regione |
| Distretti, gilda | `build.districts`, `guild.completed` | regione |
| Visite, borselli | `life.visits`, `life.deathCaches` | regione e luogo |
| Clima | `Calendar` zones/byPalette (statico) | regione |

**Cultura e leggi per continente: assenti** (`continents.js:7-16` ha solo nome, sottotitolo e statua; GAME_DESIGN §7 «leggi locali con taglie» da fare).

**Dove inserire la memoria del mondo.** Un modulo nuovo, non un'estensione: `world-life.js` ha un validatore stretto e ricostruisce l'oggetto. Vedi §6.

### 5. Opportunità di integrazione

- **Cronaca reale**: sostituire o affiancare la «Cronaca di Lùmora» (`panels.js:510-517`) con le voci della memoria del mondo.
- **Conoscenza degli abitanti a basso costo**:
  - *presenza*: regione dell'azione e raggio dell'insediamento (`settlement.radius` 78, `townRadius` 300 per Vela);
  - *testimoni*: residenti di Society con `people[id].region===regione` e il precedente dei 185 px di Conflicts;
  - *pubblico*: punteggio cittadino già esistente;
  - *voci*: propagazione nel passo giornaliero ad altri borghi dello stesso continente (`World.regions[id].continent`).
  - **Non** interrogare le posizioni del pianificatore urbano.
- **Tre eventi contestuali** sullo schema di `Daily.dailyOffer`: valutati al cambio di giorno da `Economy.shortage`, `Conflicts.faction().mourning`, `flows.wealth` e meteo, con seme da `(seed, giorno, regione)`.
- **Ciclo economico misurabile**: `Economy.flowReport`/`MarketFlows.report` già forniscono prezzi e ricchezza. La memoria può registrare «prima/dopo» di uno scambio rilevante (`trade-economy.js:264` ha `market`, `item`, `direction`, `quantity`). Effetti di prezzo additivi con lo stesso schema di `favor` e `mourning` (`trade-economy.js:176-178`).
- **Regole per continente**: tabella statica per `continent-1…5` (nessun dato salvato), applicata tramite modificatori letti in modo pigro (`window.WorldMemory?.…`), come oggi `Conflicts.faction`.

### 6. Modulo «memoria del mondo»

- **Posizione in `MODULES`**: `…"urban-services.js", "urban-life.js", "world-memory.js", "engine.js", …`. Dipende da Calendar, World, Reputation, Society e Conflicts, tutti caricati prima. Deve stare **prima di `audio.js`**, perché `verifica-integrazione.cjs:40` e `verifica-salvataggi-incrociati.cjs:30` interrompono il caricamento lì.
- **API minima**:

  | Funzione | Comportamento |
  |---|---|
  | `create(seed)` | crea lo stato iniziale |
  | `restore(raw,s)` | **mai `null`**: se il dato non è valido restituisce `create()` con un `console.warn` |
  | `note(s,event,amount,ctx)` | filtro con `Set`, O(1), nessun `keep()` |
  | `tick(s)` | lavora solo al cambio di giorno, con un limite ai giorni recuperati |
  | `view(s)`, `knows(s,npcId,deedId)` | lettura per i pannelli |

- **Salvataggio**: `s.memory={schema:1, day, deeds:[…≤48], towns:{…}, rumors:[…]}` con budget di circa 4–6 KB, contro i 28–44 KB attuali. Va in `newGame` dopo `engine.js:238` e in `parseSave` dopo `engine.js:1506-1507`, **senza** aggiungerlo all'elenco obbligatorio di `1504`.
- **Agganci**: una riga in `record()` (`engine.js:164-171`); una funzione locale `deed(id,meta)` che sostituisca le sette chiamate dirette (§2); una chiamata nell'impulso (`1148-1162`) e in `sleep()` (`751-754`).

### 7. Difetti

| Id | Tipo | Evidenza | Scenario |
|---|---|---|---|
| D1 | **Confermato** | `world-life.js:64`, `151-153`, `177-178`; `panels.js:516` | Gli eventi del borgo ruotano ogni 68 s su un ciclo di quattro. `news.slice(-4)` mostra quindi **sempre gli stessi quattro eventi**, senza alcun legame con le azioni del giocatore. |
| D2 | **Confermato** | `society.js:179-187` | `level` dipende da `floor(s.time/65)+trade·2`. Dopo 1105 s (un sonno aggiunge fino a 1800 s) tutti e nove i borghi sono al livello 3 con accordo, e il commercio non conta più. Le scorte crescono di 1 ogni 65 s. Il commercio di Society non passa da `Economy`/`MarketFlows` (`159-163`). |
| D3 | **Meccanismo confermato**, innesco ipotetico | `engine.js:1517-1521`, `1386-1389`; nessun `removeItem`; `interface.js:57`, `107` | Se un nuovo `restore` rifiuta la v7, il gioco carica la vecchia v6 rimasta e il primo salvataggio sovrascrive la v7. Se non esiste una v6, compare «Nuova incarnazione» senza conferma e `newGame()` sovrascrive la partita. Da qui il ripristino tollerante obbligatorio. |
| D4 | **Confermato** (strutturale) | `engine.js:432`, `789`, `794`, `815`, `828`, `839`, `1164` | Un ascoltatore agganciato solo a `record()` perde campagna, gilda, sovrano e negligenza. |
| D5 | **Confermato** (minore) | `engine.js:1112`; `interface.js:435` | Il tempo dei rallentamenti avanza solo il calendario. I timer su `s.time` (lutto, aiuole, Society, notizie) si scostano dai giorni di calendario. |
| D6 | **Confermato** (minore) | `engine.js:406`, `1175`, `1388` | Un errore nel salvataggio automatico o in `keep()` è silenzioso. Solo il salvataggio manuale avvisa (`interface.js:103`). |
| S1 | Sospetto / trappola | `daily-life.js:44`, `society.js:67` contro `world-life.js:109`, `urban-life.js:114`, `npc-conflicts.js:129` | Il passaggio dei campi annidati sconosciuti è incoerente fra i moduli. |
| S2 | Design | `reputation.js:74-75` | Le uccisioni alzano la reputazione del regno ovunque, senza testimoni. |

### 8. Rischi tecnici

- **Validatori con elenchi chiusi**: aggiungere un tipo fa rifiutare la partita alle versioni precedenti, che i test provano.
- **D3**: qualunque errore in `restore` diventa una perdita della partita.
- **Costo**: niente aggiornamenti per abitante per fotogramma, niente `keep()` per voce, niente siti pesanti in `focus()`. `record('run')` arriva ogni secondo: serve un filtro O(1).
- **Determinismo**: usare un hash `(seed, giorno, regione)` come `market-flows.js:17-21` o `npc-conflicts.js:30-34`, mai `Math.random`.
- **Recupero dopo il sonno o lunghe assenze**: serve un limite, perché `sleep` chiama i passi una sola volta.
- **Coordinamento**: `trade-economy.js` e `engine.js` sono condivisi. La rinomina del laboratorio di Codex agisce solo sulle stringhe dentro `engine.js`.

## Audit A2 — NPC e IA sociale (sola lettura)

Branch `claude/living-world-2` (= `main` 96eb9be). Nessun file del progetto è stato modificato. L'unica esecuzione è una simulazione Node nello scratchpad (`sim-morti.cjs`), che carica i moduli come `tests/verifica-integrazione.cjs`.

### 0. Sintesi

| Sistema | Stato | Nota chiave |
|---|---|---|
| Identità NPC persistenti | 🟡 parziale | Id stabili per 5 NPC di Vela, 18 abitanti, 9 guardie e 95 residenti di Velaris. Quelli di Filoni e Calis sono anonimi. |
| Memoria del giocatore | 🟡 parziale | Esiste solo `chat`, `gift` e `trade`. Mancano ricordi negativi e aiuti, e la memoria non decade. |
| Fiducia / opinione | 🔴 poco visibile o scollegata | Society: numero di tipi distinti di ricordo (max 5). Velaris: somma calcolata ma non usata. |
| Amicizia → matrimonio → figli | 🟡 parziale | Tutto in pochi minuti. Nessuna regressione. La vedovanza blocca tutto per sempre. |
| Personalità | 🔴 assente (meccanica) | Solo testo. L'unico tratto con effetto è `interest`. |
| Reputazione pubblica | 🟡 parziale | Città, regni, gilde, fazioni e titoli. Effetto solo su prezzi (±2) e titoli. Nessun testimone. |
| Testimoni / diffusione notizie | 🔴 assente | Solo `witnessed`, per la negligenza, e il raggio 440 px dei messaggi. |
| Conflitti, ferite, soccorso | ✅ funzionante | Pattuglie, ferite, critico 105 s, soccorso con pozione, erbe o magia. |
| Morte permanente | ✅ funzionante, ma 🐞 sbilanciata | Morti lontane molto frequenti (vedi D-1). |
| Resurrezione rara | ✅ funzionante | Un solo rito, 62% di riuscita, una sola volta. Statue solo per il giocatore. |
| Compagni di gilda | ✅ mortali | 🐞 Spariscono dalla scena quando sono feriti (D-3). |

### 1. Identità persistente degli NPC

| NPC | Id | Origine | Salvato |
|---|---|---|---|
| Nerea, Tessa, Ivo | `elder`, `merchant`, `smith` | Fissi: `world-life.js:42-46` e `npc-conflicts.js:5-11`. Posizioni in `world.js:8`: (389,589), (467,585), (519,661). | Solo lo stato fisico in `s.conflicts.people[id]`. Nessuna memoria sociale. |
| Mira, Selce | `guard-valley`, `hound-valley` | `npc-conflicts.js:9-15` | Come sopra. |
| Guardie | `guard:<region>` | Generate dal nome dell'insediamento: `npc-conflicts.js:50-53`. | Come sopra. |
| 18 abitanti | `<region>-0` (avventuriero), `<region>-1` (migrante) | Tabella fissa in `society.js:4-20`. Solo `interest` deriva dal seme (`:34`). | `s.society.people[id]` |
| Figli | `ward-1` e `ward-2` (Rin e Telia) | `society.js:171-174`. La razza deriva dal seme (`:90`). | `s.society.children` |
| Residenti di Velaris | `velaris-<race>-<0/1>` (88) e `velaris-staff-<kind>` (7) | Generati con il seme: nome, mestiere e personalità in `urban-life.js:76-89`, personale in `:11-19`. | Solo i ricordi in `s.urban.people[id]`, max 8. |
| Filoni (3) e Calis (4) | **nessuno** | `urban-profiles.js:42-45` e `:117-121`: hanno soltanto `skin`, `tempo` e `agenda`. Vengono disegnati in `urban-districts.js:341-368`. | Nulla. Non si può interagire con loro. |
| Corriere della scorta | nessuno | `guild.js:110` e `:255-257` | Solo `hp` e il tragitto. |

Rischio: i nomi visualizzati dei residenti di Velaris usano un suffisso anti-collisione che dipende dall'ordine della lista delle razze (`urban-life.js:91-96`). Se si aggiunge una stirpe, un nome visualizzato può cambiare. L'id resta stabile.

### 2. Sistema per sistema

#### 2.1 Society (`society.js`)
1. **Dati:** per ogni abitante `region`, `enrolled`, `career`, `bond`, `changedAt`, `memories` (max 16), `interest`, `training` e `transfer`. Per ogni città `level`, `stock`, `trade` e `accord`. In più `partner`, `home` e `children`.
2. **Eventi ricevuti:** solo i comandi del giocatore (`command`, `:152`), `tick` e `register`/`train` dalla gilda.
3. **Eventi prodotti:** `trade` con +6 XP (`:163`). Il bus di `engine.js:164-171` lo inoltra a Reputazione, Gilda, Daily e Growth.
4. **Effetti permanenti:** legame (non torna mai indietro), migrazione (`:191-194`), livello della città e accordo (`:184-187`).
5. **Effetti temporanei:** blocco giornaliero di `chat` e `gift` (`recent`, `:76`).
6. **Salvataggio:** la validazione rigida in `:40-68` rifiuta l'intero salvataggio se il numero di abitanti è diverso (`:49`) o se un ricordo non è di tipo `chat`, `trade` o `gift` (`:55`). Migrazione `bornMinute` e `day` per v<5 (`:63-66`).
7. **Dipendenze:** `World.regions[].settlement.npcSpots`, `Calendar`, `Build.home`, `Game.races` e `Growth.biology`, oltre a `Conflicts` in modo pigro.

**Crescita della relazione.** La fiducia è `new Set(kinds).size + 2` se c'è un legame, max 5 (`:107`).
- Amicizia: `chat` più un secondo tipo di ricordo (`:140`).
- Corteggiamento: 3 tipi e 60 s di `s.time` (`:141-142`).
- Matrimonio: una casa e 100 s (`:143-144`).
- Adozione: 150 s e 15 Scintille (`:147-148`).

I tempi sono **secondi reali**, non giorni: da sconosciuti a sposati si arriva in circa 3 minuti, in una sola visita. Non esiste alcuna azione che faccia diminuire la fiducia. Spam: `trade` non ha limiti. Ogni scambio dà 6 XP e un ricordo, ma il Set di tipi impedisce di alzare la fiducia ripetendolo. L'espulsione dei ricordi conserva i tipi rari (`:72`).

**Figli.** Si possono solo adottare, al massimo due, con nomi fissi. Diventano adulti in 3 giorni di calendario (`:88`). Possono iscriversi alla gilda, diventare compagni e morire.

**Classificazione:** memoria parziale, fiducia poco visibile (non appare nel pannello), famiglia parziale, personalità assente.

#### 2.2 Conflicts (`npc-conflicts.js`)
1. **Dati:** per ogni persona `status` (sano, ferito, critico, morto), `hp/maxHp`, `experience`, `kills`, `nearDeath`, `raised`, `witnessed`, `point`, `deadline`, `cause` e `last`. Per ogni regione `round`, `next` e lo scontro attivo. In più `events` (≤32), `pulse`, `ritualUsed` e `mourning`.
2. **Eventi ricevuti:** `damageNpc` da pattuglie (`:359`, `:367`, `:400`) e compagni (`guild.js:215`), soccorso (`command`, `:241-248`) e magia (`mend`, `:251-258`, richiamata da `engine.js:610-616`).
3. **Eventi prodotti:** `npcRescue` (meta `npc`, `critical`, `region`), `npcRitual` (ignorato da Reputazione) e `npc-neglect` (`:440`, richiamato da `engine.js:1163-1165`).
4. **Effetti permanenti:**
   - Morte con memoriale (`down`, `:162-169`).
   - Nerea morta apre il percorso del registro (`engine.js:285-286`, `:314-317`, `:773-795`).
   - Tessa o Ivo morti chiudono emporio, forgia e commissione (`engine.js:778-779`, `:386`).
5. **Effetti temporanei:**
   - Le ferite guariscono da sole a scadenza (`:443-445`).
   - Il lutto dura 2 giorni e alza di 1 il prezzo d'acquisto nel mercato della regione (`trade-economy.js:177-178`).
6. **Salvataggio:** validazione completa in `:95-131`. Un `raised` richiede `ritualUsed`, con al massimo un risorto (`:107`). `ritualUsed` richiede `ritualEarned` ed Eco pari a 0 (`:99`). Lo stato `dead` richiede `hp === 0` (`:104`).
7. **Dipendenze:** `Society.entry`, `Life.npcPoint`, `Inventory`, `Legendary.ritualEarned` e `Game.codex`.

**Garanzie contro il ritorno di un morto.** L'unico percorso da `dead` a sano è `recover` dopo un rito riuscito (`:236`). `known()` (`:43-47`) impedisce di scartare il record di un id noto: un record sconosciuto invalida il salvataggio. Le Statue riguardano solo il giocatore (`world-life.js:426-429`, `engine.js:472-485`), e nessun NPC usa `Life.respawn`.

Il rito fallisce o riesce in modo deterministico per `(seed, id)` (`:235`). Con un salvataggio di riserva il giocatore potrebbe scoprire in anticipo su quale NPC riesce.

#### 2.3 Reputation (`reputation.js`)
- **Dati:** `standings` con chiavi `town:`, `realm:`, `guild:` e `faction:`, valori interi ±100. In più `titles`, `medics` (≤3), `visited` e `daily` (`trade`, `kill`, `help` con `{day,count≤4}`), validati in `:28-46`.
- **Eventi:** elenco chiuso in `:15`. L'unico evento negativo è `npc-neglect`, che vale −1 alla città (`:93`).
- **Limiti antispam:** `trade` 4 al giorno, `kill` 3, `help` 3 (`:57-63`).
- **Effetto in gioco:** solo `discount` ±2 Scintille (`:109`), usato in `trade-economy.js:176`. Gli NPC non leggono mai la reputazione: i dialoghi di Nerea e Tessa sono fissi (`panels.js:212-227`).
- **Località dell'evento:** l'evento è attribuito alla regione del giocatore o a `meta.region`, rimappata da `UrbanWorld.localRegion`. Non esistono testimoni né propagazione fra città o fazioni.
- **Classificazione:** funzionante ma poco visibile.

#### 2.4 Gilda e compagni (`guild.js`)
- **Squadra:** `team` (≤2) contiene id di Society, validati da `validMember` (`:22`), che **non controlla se l'NPC è vivo**.
- **Reclutamento:** richiede adulto, iscritto, presente e sano (`:129`). Gli abitanti con indice 0 sono già iscritti (`society.js:33`), quindi sono reclutabili **senza alcun rapporto**.
- **Iscrizione** (`register`): basta fiducia ≥2 (`society.js:222`), cioè una chiacchierata e uno scambio.
- **Danno reale:** `Conflicts.damageNpc` (`:215`). Ferito sotto il 42%, critico a 0 PV.
- **Gilda personale:** `members` (≤8) e `squads` sono validati come team.

#### 2.5 Velaris (`urban-life.js`, solo lettura)
- **Memoria:** `chat` e `gift` per giorno, max 8 (`:456-462`). Validazione rigida dei tipi (`:117`).
- **Fiducia:** somma con `gift` che vale 2 (`:469`), **mai letta da nessun sistema**: scollegata.
- **Commissione di Kaia** (`velaris-staff-guild`, `:485-491`, `:572-588`): produce `trade` verso `town:verdant-canopy`, ma Kaia non la ricorda.
- **Altri sistemi:** i residenti non sono noti a `Conflicts` (non possono essere feriti né morire) e non sono reclutabili.
- **Routine e PERF-003:** non analizzate per modifiche.

#### 2.6 Abitanti di Vela, cronaca e servizi
- **Personalità di Nerea, Tessa e Ivo:** `personality`, `goal` e `schedule` sono solo testo (`world-life.js:42-46`). Si spostano di ±13 px in tre fasce orarie (`:197-209`).
- **Cronaca del borgo:** `life.news` (≤8) contiene eventi a orario fisso, non reazioni al giocatore (`:151-153`, `:174-179`).
- **`urban-restoration`** (`urban-services.js:79`): +8 alla città, nessun NPC lo ricorda.
- **`Daily`:** la richiesta «Scorte di rugiada», attribuita ai «Mercanti del borgo», nasce da una vera carenza del mercato `vela` (`daily-life.js:19`, `:110-121`). È collegata solo a un testo `from`.

### 3. Difetti confermati

| ID | File:riga | Scenario e prova |
|---|---|---|
| **D-1** Morti lontane troppo frequenti | `npc-conflicts.js:296-304`, `:350-370`, `:436-441` | Le pattuglie lontane si attivano circa ogni 150 s per regione, con abitanti e guardia. Un critico lontano muore sempre dopo 105 s, perché nessuno può soccorrerlo. **Simulazione** (`sim-morti.cjs`, giocatore fermo a Vela, `Conflicts.tick` ogni 1,05 s): dopo 2 h, da 4 a 11 morti, di cui da 1 a 7 dei 18 abitanti; dopo 6 h, 20 e 24 morti (semi 19425 e 555), di cui **14 e 16 abitanti su 18**. Il giocatore può trovare morti quasi tutti i candidati a relazioni e compagni prima di incontrarli. Limite della prova: non usa `Game.step` e i mostri lontani vengono dai punti della mappa. |
| **D-2** Vedovanza irreversibile | `society.js:141`, `:143`, `:147` | `s.society.partner` resta l'id del defunto. Corteggiamento e matrimonio richiedono `!partner`. L'adozione richiede il coniuge vivo e raggiungibile (`actions` usa `sites` con `canInteract`). Il giocatore non può più sposarsi né adottare. |
| **D-3** Compagno ferito invisibile | `npc-conflicts.js:488`, `society.js:114`, `guild.js:182` | Un compagno ferito non è disegnato da nessun modulo: Conflicts disegna solo critici e morti, Society esclude la squadra, Guild esclude chi non può combattere. Resta il punto «Cura …» in un luogo vuoto (`npc-conflicts.js:211`) fino alla guarigione automatica dopo 170 s. |
| **D-4** Giorno dei ricordi errato | `panels.js:380` | Il pannello mostra `1+floor(m.at/480)`, mentre il giorno reale è `m.day` (`Calendar.ageDays`, 1800 s al giorno, più il sonno). Esempio: a `s.time=3600` mostra «Giorno 8» invece di «Giorno 3». |
| **D-5** Agenda dei defunti | `world-life.js:418`, `panels.js:517` | «Abitanti del borgo» elenca Tessa e Ivo con l'agenda del giorno anche se sono morti. |
| **D-6** PV dei compagni incoerenti | `guild.js:187`, `:198-199`, `npc-conflicts.js:58` | La barra parte da `55+career*2` e al primo colpo passa a 86 PV massimi dal record. Il valore basato sulla carriera non vale più. |
| **D-7** Membro morto nella squadra | `guild.js:22`, `:29`, `:129` | Il membro morto resta in `team` e nella gilda personale e occupa un posto finché non viene congedato a mano. Non c'è alcun avviso. |

**Sospetti, non verificati in partita:**
- La commissione giornaliera «Ferri per chi parte» di Ivo (`daily-life.js:5`) resta forse disponibile dopo la sua morte.
- L'XP dalle vendite ripetute di minerale agli abitanti (`society.js:161-163`) non ha limiti.
- La cronaca dei conflitti mostra al giocatore ogni morte lontana (`npc-conflicts.js:155-158`, `:285`), quindi il giocatore sa più degli NPC.

### 4. Risposte alle domande

- **Che cosa ricorda un NPC?** Society: fino a 16 episodi `{kind, at, day}`. Velaris: fino a 8 `{kind, day}`. Nerea, Tessa, Ivo e le guardie non ricordano nulla, salvo lo stato fisico.
  - Nessun ricordo del soccorso, della negligenza, delle commissioni o delle imprese.
  - Il valore cresce con la varietà dei tipi, non decresce mai e non decade.
  - Lo spam è limitato a una `chat` e un `gift` al giorno; lo scambio non ha limiti.
- **Testimoni e diffusione.**
  - Solo `witnessed` (raggio 185 px), che porta a −1 alla città se il critico muore (`npc-conflicts.js:181`, `:437-440`).
  - I messaggi nel raggio di 440 px (`:159`).
  - Il lutto regionale, che alza i prezzi.
  - Non esistono voci, propagazione, conoscenza per NPC né memoria di fazione.
- **Personalità.** È solo testo. L'unico tratto con effetto è `interest`, sorteggiato per ~80% dei casi (`society.js:34`), che consente il corteggiamento.
- **Famiglia.** Matrimonio, casa comune, coniuge che rientra a casa di notte (`society.js:78-79`), fino a due figli adottivi con crescita e mestiere.
  - Non esistono figli biologici, crisi, separazioni, rapporti fra NPC né lutto familiare oltre al testo `npc-conflicts.js:286`.

### 5. Opportunità di integrazione

1. **Un solo bus degli eventi.**
   - `engine.js:164-171` (`record`) riceve già `trade`, `kill`, `npcRescue`, `quest-claim`, `urban-restoration`, `visit` ed eventi `Daily`.
   - `engine.js:1163-1165` riceve `npc-neglect`.
   - Un nuovo modulo, ad esempio `ties.js` caricato dopo `reputation.js` e prima di `engine.js`, può osservare entrambi senza toccare le routine.
2. **Testimoni reali.** Al momento dell'evento si interrogano in sola lettura `Society.view(s).local`, `UrbanLife.view(s).local` (raggio 260 px) e `Life.npcPoint` per Nerea, Tessa e Ivo. Solo chi è presente registra un ricordo di prima mano. Gli altri lo apprendono tramite la reputazione della città, con peso minore.
3. **Opinione derivata, non salvata.** Si calcola da episodi datati (`Calendar.ageDays`) con decadimento e rendimenti decrescenti per tipo. Si evita così la deriva e si ottiene la reversibilità.
4. **Agganci per le opportunità.**
   - `society.js:125` (`price`) e `:126-150` (`actions`).
   - `engine.js:796-800`, per pozione e talismano di Tessa.
   - `trade-economy.js:176`, per lo sconto.
   - `panels.js:222-227`, per il dialogo di Tessa.
5. **Correzioni collegate.** D-1: limitare la letalità quando il giocatore è assente, ad esempio con un critico lontano che si stabilizza come ferito, oppure ridurre la frequenza. D-2: liberare `partner` alla morte del coniuge, con la reazione «lutto».

### 6. Rischi tecnici

- **Validazione «tutto o niente».** Basta un errore in un `restore` per rifiutare l'intero salvataggio (`engine.js:1487-1505`).
  - Aggiungere tipi di ricordo in Society (`:55`) o Velaris (`:117`), oppure aggiungere abitanti (`:49`), rompe i salvataggi.
  - Una sezione nuova con `undefined → create()` è la via più sicura.
- **File densi.** `engine.js` e `panels.js` sono densi (RISK-003). Le modifiche vanno tenute minime e confinate.
- **Ordine di caricamento.** Il nuovo modulo può usare `Society`, `Conflicts` e `Reputation` solo se è caricato dopo di loro in `build.py`.
- **Determinismo.** Nessun `Math.random` nelle reazioni: usare `roll` o `hash` con un seme.
- **Morte delle controparti.** Ogni opportunità legata a un NPC deve gestire la sua morte (D-1 la rende probabile) e, per Velaris, l'assenza fuori turno (`serviceAvailable`, `urban-life.js:606-611`).

### 7. Scenario per l'incremento 1

#### Candidato consigliato: Tessa (`merchant`), Borgo di Vela, regione `valley`, (467,585)
**Catena:**
1. Il mercato `vela` è a corto di erbe (`Economy.shortage`, `daily-life.js:110-121`).
2. Il diario propone «Scorte di rugiada» (`daily-life.js:19`).
3. Il giocatore consegna le erbe **di persona** a Tessa durante l'orario dell'emporio. In alternativa la soccorre in una pattuglia (`npc-conflicts.js:241-248`, `meta.npc === 'merchant'`).
4. Tessa registra un ricordo di prima mano, con testimoni come Nerea o Ivo se sono vicini.
5. L'opinione sale, con un massimo per tipo e per giorno.
6. Si apre un'opportunità: una «Linfa di riserva» venduta a prezzo ridotto o messa da parte dopo le 20:00, agganciata a `engine.js:796-800` e `panels.js:222-227`.
7. Salvataggio in una nuova sezione `s.ties.merchant`.

**Catena negativa:** una consegna promessa a lei e lasciata scadere diventa «parola mancata». La fiducia scende e la riserva si chiude. Si recupera con due consegne in giorni diversi.

**Pro:**
- Prima regione, incontro garantito.
- Pressione economica reale.
- Il soccorso è già testato (`tests/verifica-integrazione.cjs:72-77`, su Nerea).
- Effetto visibile su una merce centrale.

**Contro:**
- Tessa non ha memoria: serve una nuova sezione di salvataggio.
- Il ferimento in pattuglia è casuale (dal terzo turno, `npc-conflicts.js:301-303`).
- Va gestita la sua morte (emporio chiuso, `engine.js:778-779`).

#### Alternativa A: Heda (`frost-pass-0`), Borgo dei Filoni (`frost-pass`, `npcSpots[0]`, `continents.js:51`)
È una minatrice dwarf, «Curiosa dei metalli nuovi», con indice 0, quindi **non migra**.

- **Catena:** un dono di minerale o un soccorso diventano un ricordo nuovo in Society. L'opinione viene modulata dalla personalità (il minerale vale di più). L'opportunità può essere `price` più basso o una richiesta di compagnia.
- **Pro:** infrastruttura di memoria e pannello «Ricordi condivisi» già pronti (`society.js:69-76`, `panels.js:380`). È candidata compagna di gilda.
- **Contro:**
  - Va estesa la validazione dei tipi (`society.js:55`).
  - Si trova nella seconda regione.
  - **Rischio D-1:** nella simulazione `frost-pass-0` muore con il seme 555.

#### Alternativa B: Kaia del Ponte (`velaris-staff-guild`), interno della gilda di Velaris
- **Catena:** la commissione giornaliera `velaris-care-<giorno>` (`urban-life.js:572-588`) diventa un ricordo di Kaia. La fiducia, oggi inutilizzata, viene finalmente letta e apre una commissione migliore o un servizio.
- **Pro:** è deterministica e quotidiana. Gli id sono stabili e l'NPC è immortale, quindi non c'è rischio D-1.
- **Contro:**
  - `urban-life.js` è indicato come sola lettura per routine e PERF-003. I ricordi sono separati, ma toccarli richiede cautela.
  - È presente solo durante i turni, al chiuso.
  - Validazione dei tipi rigida (`:117`).

**Raccomandazione:** prototipare con Tessa in un modulo separato e una sezione di salvataggio additiva. In parallelo correggere D-1, senza il quale qualunque «mondo che ricorda» perde i propri testimoni in poche ore di gioco.

## Audit A3 — Economia e professioni (sola lettura)

Base: `Reincarnation-living-world`, branch `claude/living-world-2` (= `main` `96eb9be`). Nessun file del progetto modificato. Metodo: lettura dei sorgenti e due simulazioni Node in scratchpad (`loop.cjs`, `blades.cjs`) che caricano `inventory.js`, `market-flows.js`, `trade-economy.js`, `tradecraft.js` in una sandbox `vm` e chiamano le API reali.

### 0. Sintesi

1. **CRITICO, verificato: denaro infinito.** Il prezzo è calcolato una sola volta per tutta la quantità (`trade-economy.js:245-247`). Si vendono N unità al prezzo della scorta bassa e si ricomprano al prezzo della scorta alta. Allo Scalo di Calis, con scorta di minerale 7: vendo 1000 a 4 e ricompro 1000 a 2, quindi **+2000 Scintille a ciclo**. Cento cicli danno +200 000 Scintille con merce invariata e registro `audit()` in pari.
2. La simulazione dei cinque mercati (`market-flows.js`) è reale, deterministica e conservativa. È però **quasi invisibile**: `quote`, `deliver`, `procure` e `flowReport` non hanno consumatori.
3. Le merci fuori profilo (lame, piatti, attrezzi, equipaggiamento) **non vengono mai consumate**. Una vendita le deprime per sempre (verificato: 20 lame restano 20 dopo 60 giorni).
4. La qualità della forgia **non incide sul prezzo** (verificato: le quattro lame si comprano a 36 e si vendono a 25).
5. Quattro canali di scambio a prezzo fisso aggirano il mercato e creano denaro o merci dal nulla: banco delle sementi, residenti, bottega, fattoria.
6. Ci sono 17 professioni con esperienza. Solo fabbro, pescatore, contadino, allevatore e cuoco hanno effetti meccanici diretti. Il mercante ha soltanto una pratica ibrida. Falegname, sarto, alchimista, erborista e cacciatore sono di fatto solo nomi.
7. **Non esiste una reputazione professionale.** Quella commerciale è una reputazione cittadina generica: +1 per scambio, al massimo 4 al giorno.

### 1. Che cosa è simulato e che cosa è solo mostrato

| Mercato | Luogo (regione, punto) | Merci (obiettivo, prezzo base) | Lavoratori (`market-flows.js:49-55`) |
|---|---|---|---|
| Vela | `valley` 445,627 | erbe 12/3, minerale 6/6, sementi 10/3, grano 8/4, travi 8/5, lana 5/7, pozioni 6/8, pane 7/5, acqua 8/3 | 10 abitanti, contadini 4 |
| Filoni | `frost-pass` 455,409 + botteghe urbane dei Filoni | minerale 16/3, travi 13/4, lana 10/5… (9 merci) | 8 abitanti, minatori 3 |
| Velaris | `verdant-canopy` + `UrbanWorld` «shop» | erbe 14/3, essenza 7/9, pozioni 10/7… (9 merci, niente lana) | 14 abitanti, erbaiuoli 4, alchimisti 3 |
| Namar | `golden-savanna` | grano 16/3, sementi 13/2, lana 12/5… (9 merci) | 10 abitanti, contadini 6 |
| Calis | `dune-port` + Emporio delle Sette Vele | essenza 4/14, travi 11/4… (10 merci) | 16 abitanti, ricchezza 1250 |

Fonte: `trade-economy.js:14-31` (pane e acqua aggiunti a tutti, riga 31). In totale 46 celle mercato×merce.

**Simulato** (un passo per giorno di calendario, `market-flows.js:247-396`):
- arrivo delle spedizioni;
- produzione primaria con raccolto ±10% deterministico (273-283);
- trasformazione: un grano per un pane, due erbe per una pozione (285-298);
- consumo degli abitanti, con domanda fra ×0,4 e ×1,2 (300-307);
- deperimento e distruzione oltre la capacità di 3×obiettivo (309-320);
- 8 rotte con riserva, deficit previsto e margine (328-379);
- ricchezza fra ×0,8 e ×1,4 della base (383-387).

Il prezzo è `nativo × scarsità (×0,4–×1,6) × ricchezza` (231-235, 70-71). Il registro esatto (`audit`, 473-484) copre **solo le merci del profilo**: il ciclo alla riga 250 e la scrittura alle righe 390-395 ignorano tutte le altre.

**Solo mostrato:** il pannello (`economy-panel.js:80-96`) mostra scorta, prezzo di acquisto e prezzo di vendita **del solo mercato del continente corrente**. L'elenco dei cinque mercati (70-79) mostra solo aperto o chiuso. Tendenze, merci in viaggio, ricchezza e prezzi lontani non sono visibili (ECO-003).

### 2. Schede dei sistemi

| Sistema | Classe | Dati posseduti e salvati (validazione) | Eventi ricevuti → prodotti | Effetti permanenti / temporanei | Dipendenze |
|---|---|---|---|---|---|
| **MarketFlows** `market-flows.js` | funzionante, poco visibile | `economy.flows`: schema, seed, day, opening, wealth (500–2000), carry, shipments (≤ max(300, 12×mercati)), ledger (9 campi BigInt in stringa, `external` con segno). `restore` 190-228: **richiede ogni merce del profilo** (203-204); se fallisce, `trade-economy.js:90` lo ricrea e si perdono spedizioni e ricchezza | `advance` dal cambio di giorno, `external` dagli scambi → nessun evento | Scorte, ricchezza, spedizioni / nessuno | profili di `Economy` |
| **Economy** `trade-economy.js` | funzionante con difetto critico | `economy`: `{schema:1, balance:'dec', markets:{5×{day, stock:{id:'dec'}}}, flows}`. `restore` 73-93: esattamente 5 mercati (75, ECO-002), ogni id di scorta deve avere una definizione in `Inventory` (83-84). Se fallisce, **si scarta l'intero salvataggio** (`engine.js:1485-1486`) | comando `economy` (`engine.js:831`), `tick` (751, 1153) → evento `trade` con `{market, item, direction, quantity}` (264) | Scorte, `player.gold`, saldo / nessuno | Inventory, MarketFlows, Reputation (sconto), Conflicts (lutto), UrbanWorld |
| API `quote`/`deliver`/`procure`/`flowReport` (295-351) | **scollegata** | — | nessun chiamante nel codice | — | — |
| **Inventario** `inventory.js` | funzionante | `bag{stock, deposit, definitions}` in decimali; le definizioni non vengono mai cancellate (185-193). Proiezioni legacy: minerale ed erbe in `player.inventory`, grano, travi, lana e sementi in `life.supplies` (34-38) | — | — | — |
| **Forgia e mestieri** `tradecraft.js` + `trades-practice.js` | funzionante; qualità e prezzo scollegati | `workshop{plots, animals, round, recipes, weapon}`, `restore` 83-95. Forgia: 2 minerali danno `blade-<0..3>` (157-160). Il punteggio ≥94/80/59 dà perfetto/ottimo/buono (`trades-practice.js:48`). Un tentativo fallito non costa materiali (148) | `practice` → eventi `forge` / `smithingAttempt` | Lama nell'inventario / nessuno | Life.level (difficoltà `1-livello×0,024`, 138), Calendar |
| **Professioni** `world-life.js` (`Life`) | parziale | `life.xp` per 17 professioni (9-27), soglie 0…160 (53), gradi (125). Guadagni (126-133): `trade` dà mercante +7, `forge` dà fabbro +9 | tutti gli eventi di `record` (`engine.js:164-171`) → avvisi di grado | Esperienza / nessuno | Growth (evoluzione con una professione ≥4) |
| **Equipaggiamento** `gear.js` | funzionante | `gear.items{id:{current, quality 0-4, uses, ascension 0-2, enchant}}` e `slots`. `restore` 112-138: al massimo un esemplare per pezzo (127-130) | comando `gear` → `forge` / `gearWork` (302-305) | Durabilità, qualità; bonus sospesi a durabilità 0 | Life.level('smith'): ricette di livello 1–9 (17-29), corredo a 4, tempra a 3, incanto a 5; qualità del pezzo `1+floor(livello/3)` (321) |
| **Costruzioni** `construction.js` | funzionante; economia scollegata | `build{seq, structures ≤140, districts{funds 0-60, pulse}}` (38-51) | comando `build` → `build`, `field`, `craft`, `trade` | Strutture, fondi / nessuno | Life, player |
| **Residenti** `society.js` | scollegata | `society.towns[r]{level, stock 0-28, trade, accord}` (58-61) | → `trade` (163) | Travi, oro, memorie | — |
| **Banco delle sementi** `world-life.js:322-346` | scollegata | — | → `trade` con xp 11 e **essenza +1** | Oro, essenza | — |
| **Velaris** `urban-life.js`, `urban-services.js` | parziale | `urban.city{stock ≤180, produced, trade}`, `mission{active, claimed, completed}` (105-130) | alba → `supplyVelarisMarket`; consegna → `trade` (587) | Scorte urbane e di mercato, oro | Economy (tetto obiettivo+2, `trade-economy.js:152`) |
| **Incarichi** `daily-life.js` | funzionante | `daily.quests{progress, claimed, regions, day}`, `offerClaimed` (35-45) | `log` sugli eventi → oro alla riscossione | Oro | Economy.shortage (115-116), UrbanWorld |
| **Reputazione** `reputation.js` | parziale | `standings` (±100), `daily.trade{day, count ≤4}` (40-44) | `trade` → città +1, al massimo 4 al giorno (71-73) | Sconto ±2 sull'acquisto (109) | Calendar |

### 3. Difetti confermati

| ID | Gravità | Evidenza | Scenario |
|---|---|---|---|
| **A3-01** | critica | `trade-economy.js:245-247` (un solo `price()` per tutta la quantità), 254-260 | Simulazione `loop.cjs` a Calis, minerale, scorta 7. Con n=1 e n=5 il ciclo perde (−2 e −5); con n=10, 20, 100 e 1000 guadagna +10, +40, +200 e +2000. Cento cicli da 1000 danno +200 000, il minerale resta 1000, `audit=[]`. Le prove esistenti controllavano solo unità singole. Funziona su qualunque merce con banda di scorta ampia; i pulsanti «Vendi 5» e la quantità libera lo rendono accessibile |
| **A3-02** | alta | vendita senza tetto (254-260) contro `deliver` con tetto (331-333); distruzione in `market-flows.js:317-319` | Il giocatore incassa per unità che il giorno dopo vengono distrutte come «deperite» |
| **A3-03** | alta | `market-flows.js:250, 391-394` gestiscono solo le merci del profilo; `addLedger` ignora le righe assenti (239-240) | `blades.cjs`: 20 lame vendute a Calis con prezzi 25→6; dopo 60 giorni la scorta è ancora 20 (sopra la `capacity` 18 riportata da `quote`). L'opportunità non si rinnova mai |
| **A3-04** | media | qualità come stringa `'scarso'…'perfetto'` (`tradecraft.js:23`); la regex di `trade-economy.js:172-173` riconosce solo `eccellente\|pregiat\|magistr\|legend` | `blade-0…3` hanno tutte acquisto 36 e vendita 25 a Calis. Lo stesso vale per i piatti `dish-*` |
| **A3-05** | alta (design) | Banco delle sementi `world-life.js:330-346`: 2 grani danno 8–12, 1 lana dà 9, **+1 essenza** (`engine.js:733`). Fattoria `construction.js:152-155`: le sementi restano invariate (−1 poi +1), 3–5 grani, 1 erba e **1 essenza** ogni 18 s. Bottega 161-162: 2 grani danno 10–12, senza pausa. Residenti `society.js:138,161`: 1 minerale dà 5, senza limite | Fattoria più bottega sono una sorgente infinita di denaro ed essenza fuori dal registro. La lana comprata a Namar (base 5) e venduta al banco a 9 rende anche essenza |
| **A3-06** | media | `trade-economy.js:264` (amount 1 per transazione), `world-life.js:128` | Mercante leggendario (160 esperienza) con circa 23 operazioni da una unità |
| **A3-07** | bassa | `supplyVelarisMarket` ha tetto obiettivo+2 (152), `MarketFlows.capacity` ha 3×obiettivo (72) | Due tetti diversi per lo stesso magazzino |

**Sospetti (non verificati):** `player.gold` è un `Number`, controllato fino a 1e10 al caricamento (`engine.js:1438`). Costruzioni, banco e residenti lo aumentano senza tetto: superare 1e10 renderebbe il salvataggio illeggibile (improbabile senza A3-01). Nella vendita, `tradeAllowed` permette di vendere gli attrezzi di mestiere (martello, canna…) e bloccare il mestiere, che resta ricomprabile solo dove è stato venduto.

### 4. Risposte puntuali

- **Vendita del giocatore.** Sì, cambia la scorta (+q, `trade-economy.js:259`) e la registra come flusso esterno (262). Il prezzo successivo segue `scarsità = clamp(1000+(1000−min(r,2000))×0,6, 400, 1600)`, con r = scorta/obiettivo in millesimi. Limiti: acquisto ≥2, vendita ≥1, vendita ≤ acquisto−1 alla stessa scorta, sconto di reputazione ±2. Non ci sono attrito per unità, tetto di magazzino o limite giornaliero. L'arbitraggio fra mercati è finito, mentre la vendita seguita dal riacquisto è infinita (A3-01).
- **Forgia.** Produce `blade-0…3` con qualità in quattro livelli. Le lame sono vendibili (`listings` include `s.bag.definitions`) come «armi», con prezzo base 20 e scarsità calcolata su un obiettivo fittizio di 6. A Calis la prima lama rende 25 contro circa 6 Scintille di minerale ai Filoni.
- **Commissioni.**
  - Calis: `calis-freight` (`daily-life.js:10-13`), vendita di almeno 3 travi all'Emporio, premio 16. Si accetta una volta sola (160), poi `claimed=true` (169); la riscossione richiede il Registro (168). Protetta dal doppio premio.
  - Velaris: una commissione al giorno (`urban-life.js:485-491, 578-587`, `claimed=day`).
  - Forgia: solo l'incarico una tantum `forge` (38 Scintille, `daily-life.js:5`) e la commissione delle erbe di Ivo (`engine.js:864-869`).
- **Professioni con progressione reale** (consumatori di `Life.level`, ricerca nel codice):
  - fabbro: difficoltà, minerale restituito dal livello 7, ricette e servizi di `gear.js`;
  - pescatore, contadino, allevatore, cuoco: bonus dal livello 7 in `tradecraft.js`;
  - contadino, allevatore, minatore, artigiano, esploratore, costruttore, mercante: solo attraverso le pratiche ibride.
  Falegname, sarto, alchimista, erborista e cacciatore hanno solo esperienza e grado, con effetto indiretto sull'evoluzione oltre il livello 4 (`growth.js:381`).
- **Reputazione commerciale.** Solo `town:<regione>` +1 per scambio (4 al giorno) e uno sconto all'acquisto. Non esiste una reputazione di mestiere.

### 5. Prototipo (a): forgia → lama → mercato → effetto misurabile

**Ciclo proposto.** Minerale (miniere oppure acquisto ai Filoni), poi Banco di Ivo o Incudine di Velaris (`tradecraft.js:41-46, 157-160`), poi vendita a **Filoni e Calis**, poi scorta e prezzo che cambiano, poi la domanda degli abitanti che consuma lentamente le lame, che è la nuova opportunità.

| Passo | Aggancio | Modifica minima proposta |
|---|---|---|
| 1. Lame come merce del profilo | `trade-economy.js:14-31` | In `filoni` e `calis` aggiungere `blade-0…3` con obiettivo 2–3 e prezzo base crescente per livello (per esempio 12/16/22/30). La qualità entra nel prezzo senza toccare la regex (risolve A3-04 per le lame) |
| 2. Domanda e nessun deperimento | `market-flows.js:44, 47` | Bisogno minimo, per esempio 15‰ per abitante, che a Calis fa circa 0,24 unità al giorno; deperimento 0. Nessun produttore: il giocatore è l'unico fornitore, quindi l'effetto è netto e misurabile |
| 3. Migrazione | `market-flows.js:203-211` | Se una merce manca nel salvataggio, inizializzarla da `opening` uguale alla scorta corrente e da un registro a zero, come per un mercato nuovo (199-200). Senza questo passaggio i vecchi salvataggi ricreano i flussi e **perdono le spedizioni** |
| 4. Anti-abuso (A3-01, A3-02) | `trade-economy.js:240-262` | Prezzo **per unità lungo la scorta**: somma di `price` da `stock` a `stock±(q−1)`. Oltre 2×obiettivo il prezzo è costante, quindi il costo è O(min(q, 2·obiettivo)) anche con quantità di 30 cifre. In alternativa minima: vendita al prezzo di `stock+q−1` e acquisto al prezzo di `stock−q+1`. In più, tetto di vendita uguale a `capacityFor − stock`, come in `deliver` |
| 5. Effetto leggibile | `trade` (263) e `economy-panel.js:27-41` | Nel testo dell'esito, il prezzo prima e dopo (`quote` esiste già) e una riga «Domanda: ~0,2/giorno» |
| 6. Persistenza | già presente | `economy.markets.*.stock` e `flows.ledger.*.external`. Test: salvataggio e ricaricamento identici, `audit()==[]`, 30 giorni di recupero |

**Limiti risultanti.** Con il prezzo per unità, vendere N e ricomprare N perde almeno N Scintille, perché a ogni livello di scorta l'acquisto supera la vendita. Va aggiunta un'asserzione su tutte le scorte e merci: `buy(x+1) > sell(x)`. Il caso limite per arrotondamento è l'essenza a Calis, con 7 contro 7. Il tetto per mercato e livello è `capacityOf(3)=9` lame.

Il recupero richiede circa `obiettivo/(abitanti×bisogno)`: per Calis 3/0,24, cioè circa 12 giorni. Il margine resta positivo: lama perfetta a ×1,6 vale circa 30×1,6×1,125×0,72 = **39 Scintille**, contro 2 minerali per circa 6. Il margine si azzera dopo circa 3 lame.

**Da decidere** (Umano): i canali a prezzo fisso di A3-05 superano il ciclo. Proposta conservativa: banco, bottega e residenti vendono tramite `Economy.quote`/`deliver` al mercato del continente, oppure con un tetto giornaliero; l'essenza +1 del banco va eliminata o limitata.

### 6. Due professioni verticali (senza nuove valute né rarità)

#### Fabbro
| Fase | Esistente | Mancante e proposta |
|---|---|---|
| Pratica | minigioco (`trades-practice.js:163-187`), tentativo gratuito che dà +1 | — |
| Esperienza | `forge` +9 (`world-life.js:130`), 18 lame per Leggendario | Esperienza proporzionale alla qualità (×0,5…×1,5), non solo per evento |
| Qualità | livello di qualità, difficoltà da livello, `gear` qualità `1+⌊livello/3⌋` | Prezzo per livello (passo 1 di §5) |
| Commissioni | solo `forge` una tantum | Offerta giornaliera «Ordine dell'armeria» in `daily-life.js` `offers` (con `day`, `offerClaimed`, 157-171): livello minimo, quantità 1–2, consegna con `Inventory.take`, premio = `quote.sell × 1,3`. Protezione già esistente: `offerClaimed[id]=day` |
| Reputazione | nessuna | Contatore di ordini completati, per esempio una nuova chiave `trade:smith` in `reputation.js` `validKey` (20-27); compatibile con i vecchi salvataggi |
| Opportunità | ricette di `gear` per livello | Con la reputazione: ordini di livello superiore e tempra scontata. Nessuna nuova rarità |

#### Mercante
| Fase | Esistente | Mancante e proposta |
|---|---|---|
| Acquisto e vendita | `Economy.trade` | Correzione di A3-01 |
| Trasporto | 5 mercati, prezzi diversi fra regioni (minerale 2 contro 5–7, grano più caro fuori da Namar) | **Registro dei prezzi** visti, aggiornato all'apertura del pannello (`quote`). Nuovo campo `economy.seen{mercato:{day, prezzi}}`. Attenzione: `Economy.restore` ricostruisce l'oggetto e scarta i campi sconosciuti (92), quindi va normalizzato esplicitamente |
| Rapporti | sconto di reputazione ±2 (`reputation.js:109`) | Il grado di mercante alza il fattore di vendita da 0,72 a 0,75/0,78 (Maestro/Leggendario), mantenendo `vendita ≤ acquisto−1` (179) |
| Commissioni | `calis-freight` una tantum, Velaris giornaliera | «Contratto di carico» giornaliero al Registro di Calis: consegnare X unità della merce con il deficit previsto più alto (`MarketFlows.outlook`) a un mercato indicato, tramite `Economy.deliver` (registrato nel registro) |
| Esperienza | +7 per transazione (A3-06) | Esperienza ∝ margine realizzato, con tetto giornaliero come la reputazione (4 al giorno) |
| Espansione | bottega e fondi di insediamento (`construction.js:64-71, 161`) | La bottega vende i propri beni al mercato regionale (`deliver`); i fondi dipendono dal volume registrato |

### 7. Rischi tecnici

- Un errore in `Economy.restore` rende illeggibile **tutto** il salvataggio (`engine.js:1485`). Ogni nuova merce o campo richiede una normalizzazione tollerante e test con le fixture `tests/fixtures/economia-*.json`.
- Aggiungere merci ai profili senza la migrazione del passo 3 elimina le spedizioni in corso: merce sparita fuori dal registro.
- `player.gold` resta un `Number` (regola BigInt di AGENTS §4.6). Non va esteso; ai nuovi premi va applicato il tetto `moneyLimit`.
- Le prove esistenti (`economia-flussi-2.cjs`: «vendere e ricomprare non rende») usano unità singole: vanno estese a lotti di 10, 100 e 1000.
- Il prezzo per unità con quantità BigInt richiede una forma chiusa oltre 2×obiettivo: un ciclo sulla quantità bloccherebbe il gioco.
- Non toccati e da non toccare: `urban-districts.js`, `urban-sector-layout.js`, `urban-lab*.js`, `urban-profiles.js` e le planimetrie. La proposta usa solo i mercati `filoni` e `calis` di `trade-economy.js` e l'Emporio o Registro già esistenti.

## Audit A4 — Progressione RPG, specie, missioni ed eventi

Agente 4/5, sola lettura. Base: `C:\Users\elaro\Downloads\Reincarnation-living-world`, branch `claude/living-world-2` = `main` `96eb9be`. Metodo: lettura del codice. Le probabilità di nascita sono state ricalcolate con `node -e` sui dati di `expansion-species.js` e `continental-species.js`. Nessuna prova in partita. Non ripeto ciò che `RPG_EVOLUTION.md` ha già trattato: avanzamento evolutivo, soglie dell'innata, coda dei messaggi, consigli e avvisi dei boss.

### Sintesi

- Le stirpi sono **44**, tutte raggiungibili. Pesi in `engine.js:78-85`: le 8 originali scalate al 48%, le 35 aggiunte al 51,9%, l'Eclisse fissa allo 0,1%. Il sorteggio usa `Math.random` (`engine.js:174-178`) ed è voluto.
- La specie conta davvero in **sei punti fuori dalle statistiche**: forma dell'attacco naturale, bisogni e temperatura, età per il corteggiamento, doni codificati delle 9 stirpi originali, etichette degli slot e predisposizione. **Quasi nulla è comunicato in numeri.**
- **Volo, nuoto, terreno, mestieri, prezzi e reazioni sociali non dipendono dalla specie.** Molti testi di biologia lo promettono comunque.
- Le missioni sono **sette sistemi indipendenti**, ognuno con stato, salvataggio e protezione dal doppio pagamento propri. Tutti risultano solidi. Il diario però ne mostra solo una parte, e il rombo compare solo sopra Nerea e Ivo.
- Esiste già un embrione di incarichi contestuali: `Daily.offers`, scelti con «pressione» da carenza al mercato, lupi e meteo. Propongo di generalizzarlo in un modulo leggero e tollerante, senza sostituirlo.

---

### Perimetro A — Specie e progressione

#### A.1 Le 44 stirpi reali

Legenda. **%** = probabilità al sorteggio. **El.** = elemento, solo visivo (`combat-fx.js:22-32`). **Pred./terr.** = predisposizione (+13 all'attitudine, `growth.js:172`) e territorio affine (Valle, Cava o Varco). **Att.** = attacco naturale (`growth.js:146`, fattore e portata): Spazz. 1/34, Artig. 1,08/27 (cadenza 0,34 s), Urto 1,19/30 (0,47 s), Balzo 0,94/37, **Dist.** = proiettile 0,76/65. **Bis.** = profilo dei bisogni (`daily-life.js:46-52`): S = Slime, D = drago (fame 1,18, freddo 1,24, caldo 0,30), E = etereo (fame 0,35, sete 0,48, freddo/caldo 0,62/0,68), B = bestia (freddo 0,66, caldo 1,22), — = neutro. **Dono** = per le 9 originali effetto codificato, per le altre bonus fisso (`engine.js:248`).

| id · nome | Rarità | % | El. | Pred./terr. | Att. | Bis. | Dono reale |
|---|---|---|---|---|---|---|---|
| slime · Slime di rugiada | Comune | 14,41 | acqua | Vit/Valle | Balzo | S | pozione cura 67% invece di 48% (`engine.js:688`) |
| goblin · Goblin dei rovi | Comune | 12,01 | fisico | Des/Valle | Spazz. | — | +1 Scintilla per creatura (`:415`) |
| wolf · Lupo runico | Rara | 7,69 | ghiaccio | Res/Valle | Artig. | B | schivata ricarica 0,95 s invece di 1,5 s (`:681`) |
| elf · Elfo del salice | Rara | 6,73 | luce | Mag/Valle | Spazz. | — | mana 2,5/s invece di 1,65/s (`:1117`) |
| spirit · Spirito di lume | Epica | 2,88 | luce | Mag/Varco | Dist. | E | invulnerabilità in schivata 0,55 s invece di 0,34 s (`:681`) |
| vampire · Vampiro del vespro | Epica | 2,26 | oscurità | Int/Varco | Artig. | — | +5 PV per creatura (`:418`) |
| demon · Demone di brace | Leggendaria | 1,20 | fuoco | For/Cava | Urto | — | ×1,2 in mischia su nemici sotto metà vita (`:534`) |
| drake · Draconide d'ambra | Leggendaria | 0,82 | fuoco | Vit/Cava | Dist. | D | −3 danni magici subiti (`:494`); −2 attacco allo stadio 0 (`growth.js:248`); dallo stadio 1 tre proiettili ×0,58 |
| secret · Eclisse nascente | Mitica | 0,10 | oscurità | Mag/Varco | Dist. | — | +4 PM per creatura (`:419`) |
| kobold · Coboldo di selce | Comune | 3,49 | fisico | Des/Cava | Spazz. | — | +1 difesa |
| orc · Orco delle gole | Comune | 2,86 | fisico | For/Cava | Urto | — | +2 attacco |
| gnome · Gnomo cartografo | Comune | 3,18 | fulmine | Int/Valle | Dist. | — | +6 PM |
| satyr · Fauno dei sambuchi | Comune | 2,54 | fisico | Res/Valle | Balzo | — | +6 velocità |
| hare · Leporide lunare | Comune | 2,86 | luce | Des/Valle | Balzo | — | +7 velocità |
| fungus · Micòide del ceppo | Comune | 2,86 | fisico | Agr/Valle | Urto | — | +8 PV |
| fox · Volpe di cenere | Comune | 2,54 | fuoco | Des/Cava | Artig. | — | +5 velocità |
| terrapin · Testuggine corrente | Comune | 2,54 | acqua | Vit/Valle | Urto | — | +2 difesa |
| dryad · Driade di resina | Rara | 1,75 | fisico | Agr/Valle | Dist. | — | +7 PM |
| triton · Tritone del guado | Rara | 1,59 | acqua | Res/Valle | Spazz. | — | +6 PV |
| raven · Corvide di bronzo | Rara | 1,49 | oscurità | Int/Varco | Dist. | — | +5 velocità |
| salamander · Salamandra pezzata | Rara | 1,52 | fuoco | Vit/Cava | Dist. | — | +2 attacco |
| scarabkin · Scarabide d'ocra | Rara | 1,43 | fisico | For/Cava | Urto | — | +2 difesa |
| spider · Aracnide di seta blu | Rara | 1,27 | fisico | Des/Valle | Artig. | — | +4 velocità |
| mimic · Mimico da viaggio | Rara | 1,33 | fisico | Int/Cava | Balzo | — | +6 PV |
| troll · Troll muschioso | Epica | 0,95 | fisico | Vit/Valle | Urto | — | +8 PV |
| harpy · Arpia delle creste | Epica | 0,89 | fulmine | Des/Varco | Artig. | — | +2 attacco |
| golem · Golem di terracotta | Epica | 0,86 | fisico | For/Cava | Urto | E | +2 difesa |
| frostkin · Yeti dalla neve azzurra | Epica | 0,83 | ghiaccio | Vit/Varco | Urto | — | +8 PV |
| sylph · Silfide del ponente | Epica | 0,83 | fulmine | Mag/Varco | Dist. | — | +8 PM |
| naga · Naga di malachite | Epica | 0,73 | acqua | Int/Varco | Spazz. | — | +1 difesa |
| mantis · Mantide d'avorio | Epica | 0,73 | fisico | Des/Valle | Artig. | — | +2 attacco |
| minotaur · Minotauro dei passi | Leggendaria | 0,38 | fisico | Res/Cava | Urto | — | +2 difesa |
| djinn · Genio dell'incenso | Leggendaria | 0,35 | fuoco | Mag/Varco | Dist. | — | +8 PM |
| chimera · Chimera dei germogli | Leggendaria | 0,29 | fisico | Vit/Valle | Balzo | — | +8 PV |
| phoenix · Fenice di zafferano | Mitica | 0,06 | fuoco | Mag/Cava | Dist. | D | +2 attacco |
| leviathan · Leviatano di marea | Mitica | 0,04 | acqua | Res/Varco | Dist. | — | +8 PM |
| human · Umano delle vie | Comune | 3,18 | fisico | Int/Valle* | Spazz.* | — | +4 PV |
| dwarf · Nano dei filoni | Comune | 2,86 | fisico | For/Cava | Urto | — | +2 difesa |
| skeleton · Scheletro errante | Rara | 1,59 | oscurità | Res/Varco* | Spazz.* | E | +2 difesa |
| bear · Orso dei larici | Rara | 1,59 | fisico | Vit/Valle | Urto | B | +7 PV |
| fairy · Fata del polline | Epica | 1,02 | luce | Mag/Varco | Dist. | — | +7 PM |
| elemental · Elementale di scoria | Epica | 0,89 | fuoco | Mag/Cava | Dist. | E | +6 PM |
| wyvern · Viverna di brina | Leggendaria | 0,32 | ghiaccio | Des/Cava | Dist. | D | +5 velocità |
| griffin · Grifone di sabbia | Leggendaria | 0,30 | luce | Des/Varco | Artig. | B | +4 velocità |

\* Per Umano e Scheletro vale la riga di `growth.js:49-50`, che oscura `ContinentalBiology` (`continental-species.js:32,34`). Il fatto è noto e invariato per decisione dell'utente.

Ogni stirpe ha due rami e due stadi. Bonus di forma comuni in `engine.js:53-63`: assalto +5 attacco e +5 velocità; custode +20 PV e +14 PM.

#### A.2 Effetti della specie fuori dal combattimento

| Effetto | Codice | Comunicato? |
|---|---|---|
| Fame, sete, energia, freddo e caldo moltiplicati per profilo. Penalità ad attacco, difesa e velocità; danno da stato critico | `daily-life.js:46-52, 62-87`; `engine.js:1156-1159` | **No**: il pannello N mostra solo i valori |
| La mantella di lana riduce il freddo ×0,7 | `daily-life.js:59-60` | Solo in parte («riduce la perdita di calore») |
| Corteggiamento solo con forma matura o età di nascita ≥ 6570 giorni | `society.js:130-131, 141` | **No**: l'opzione semplicemente non compare |
| Etichette degli slot per forma del corpo | `gear.js:364-374` | Sì, ma è solo testo |
| Predisposizione: influenza innata, talenti latenti e ramo evolutivo (`side` 0 per For/Des/Mag) | `growth.js:177-183, 393` | In parte: «Predisposizione frequente» |
| Territorio affine: pesa solo nell'abitudine «Custodia» dell'evoluzione | `growth.js:387-392` | Mostrato come «Affinità», senza dire a cosa serve |
| Attitudine Agricoltura: nessun effetto su colture, rese o minigiochi | `growth.js:233-242`; nessun lettore in `tradecraft.js` | La statistica è mostrata ma non ha effetto |
| Elemento | `combat-fx.js` | Solo visivo |

Nessun effetto della specie su prezzi, reputazione, PNG, nuoto, volo, velocità per terreno o mestieri. Confermato con grep sui moduli di vita, economia, società e mondo.

#### A.3 Vantaggi presenti ma non comunicati

1. **Forma dell'attacco naturale.** Il pannello mostra solo il nome (`panels.js:290-300`). Le stirpi a distanza (Dist.) colpiscono a 65 px con canale `projectile` (`engine.js:654-663, 1096`). Per questo **non subiscono mai la guardia adattiva ×0,84**, che vale solo in mischia (`adaptive-combat.js:41-43`), e provocano invece la risposta «sidestep».
2. **Valori numerici dei 9 doni originali** (A.1). Il testo è solo qualitativo: «cura più a fondo», «più in fretta».
3. **Il −2 attacco del Draconide allo stadio 0** (`growth.js:248`).
4. **I moltiplicatori dei bisogni**, in tutti i casi.
5. **Il vincolo d'età per il corteggiamento.**

Ci sono anche **promesse testuali senza regola**: planata e volo della Viverna (`continental-species.js:23`), Tritone «scatto breve su terreno asciutto», Salamandra «meno rapida lontano dal caldo», Micòide che «conserva l'acqua e asseconda le colture», Orco «trasporto di carichi», Gnomo «impara strumenti».

#### A.4 Schede di sistema (Perimetro A)

| Sistema | 1 Dati | 2 Eventi ricevuti | 3 Eventi prodotti | 4 Effetti permanenti / 5 temporanei | 6 Salvati | 7 Dipendenze | Stato |
|---|---|---|---|---|---|---|---|
| Stirpi (`engine.js`, `expansion-species.js`, `continental-species.js`) | 44 tuple: statistiche, dono, tecniche, rami | — | — | statistiche e bonus di forma / — | `player.race`, `form`, `evolutionStage` | `EvolutionContent`, `ActorArt` | funzionante |
| Crescita (`growth.js`) | attitudini, pratica, atti, esposizione, talenti, innata, mutazioni | eventi di `engine.record` mappati (`engine.js:164-170`) | messaggi di talento, innata e risonanza | bonus di talento e mutazione / — | `player.growth` (schema 1, validazione rigida) | `World.regions`, `ContinentalBiology` | funzionante; Agricoltura scollegata |
| Bisogni (`daily-life.js`) | profili di specie, clima, meteo | tick, sonno, pasti | danno da stato critico | — / modificatori | `s.daily` | `Calendar`, `Inventory` | funzionante, **poco visibile** |
| Tratti, echi, tecniche (`engine.js:850-855`) | 13 tratti, echi, fusioni | uccisioni | — | massimo 2 tratti / — | `traits`, `echoes`, `skills` | — | funzionante |
| Adattamento dei boss (`adaptive-combat.js`) | memoria per boss | colpi per canale | risposte | — / guardia ×0,84 | `s.adaptive` | — | funzionante; dipendenza dalla specie non visibile |
| Legendary (`legendary.js:202-210`) | registro delle rivendicazioni con stirpe | uccisioni | titoli | dominio / — | `s.legendary` | `Inventory`, `Gear` | funzionante |

#### A.5 Difetti

Confermati nel codice:
- **A-D1 · Viverna di brina tra i draghi di fuoco** (`daily-life.js:48`). La regex `wyvern` le assegna freddo ×1,24 e caldo ×0,30, mentre l'elemento è ghiaccio (`combat-fx.js:31`). Scenario: a Nordharyn (clima alpino −28) supera la soglia di −28 e subisce penalità a velocità e difesa e sete più rapida; nella Cava (+32) non ne subisce. Risolverlo cambia il bilanciamento: **decisione dell'utente**. Lo Yeti, con la sua pelliccia, ha invece il profilo neutro.
- **A-D2 · Corteggiamento nascosto e incoerente** (`society.js:130-131, 141`). Usa l'età di nascita (`Growth.biology().ageDays`), non quella che cresce in `Growth.view` (`growth.js:350`). Con l'oscuramento di `growth.js:49` l'Umano ha 5840 giorni invece di 6570: non può mai corteggiare prima del secondo stadio, mentre il Nano (8400) può da subito. L'opzione manca senza motivo visibile.
- **A-D3 · Refuso** in «una Scintilla aggiuntivo» (`engine.js:70`).
- **A-D4 · Forme del corpo incomplete** (`gear.js:369-371`). Grifone e Fata (alati) e Orso (quadrupede) ricevono «Arma/Armatura/Accessorio». Solo estetico.
- **A-D5 · Campo inutilizzato.** `growth.trainedTerrain` viene salvato e validato ma mai letto (`growth.js:190, 202`).

Sospetti:
- Lo Slime ha «gel che trattiene l'acqua» ma sete ×1,24. È un'incoerenza di testo, non di codice.

#### A.6 Tre specie con profili diversi (esistono tutte)

**Slime di rugiada** (`slime`, Comune 14,4%, acqua, Vit/Valle, Balzo, corpo fluido)
- *Opportunità:* le pozioni curano il 67% (`engine.js:688`). Collegarle alla distillazione di Ivo (2 erbe + 1 minerale = 2 pozioni, `engine.js:805-806`) e mostrare «67% (Corpo poroso)» nella scheda e nell'HUD della pozione.
- *Opportunità:* fame ×0,46 ed energia ×0,71 permettono lunghi viaggi con poche provviste. Andrebbe mostrato in Vita quotidiana con una riga «Metabolismo della stirpe».
- *Difficoltà:* sete ×1,24 e temperatura ×1,13/1,15. Collegarle alla borraccia della fonte (massimo 3, `daily-life.js:152-157`) e alla mantella di lana. Il corteggiamento richiede il secondo stadio: mostrare la ragione.

**Goblin dei rovi** (`goblin`, Comune 12,0%, fisico, Des/Valle, Spazzata ampia)
- *Opportunità:* +1 Scintilla per creatura. Va reso visibile sull'etichetta del colpo e nei compensi di caccia: gilda «Caccia alle creature» (4 creature) e offerta «Impronte vicino a Vela» (2 lupi).
- *Opportunità:* la Destrezza alza la probabilità dei talenti `hand` e `crafter` (`growth.js:183`), e il mestiere `craft` allena la Destrezza, che dà velocità. Collegarlo a «Baratto artigiano» e all'evento E2. La predisposizione spinge verso il ramo Hobgoblin (`growth.js:393`): si può dire nel pannello V.
- *Difficoltà:* bisogni neutri, nessun vantaggio fuori dal combattimento. «Soffre i colpi frontali» non ha una regola: non va promesso. Correggere il refuso.

**Viverna di brina** (`wyvern`, Leggendaria 0,32%, ghiaccio, Des/Cava, a distanza, alata, sprite dedicato)
- *Opportunità:* l'attacco naturale a distanza (65 px) aggira la guardia adattiva dei boss. Va scritto nella scheda.
- *Opportunità:* caldo ×0,30 e affinità con la Cava: lavoro di miniera comodo e mutazione `forge` (`growth.js:367`). Collegarla all'offerta «Minerale per il banco».
- *Difficoltà:* soffre il freddo (A-D1), quindi la mantella di lana è quasi obbligatoria a Nordharyn. Il volo è solo testo. Corteggiamento dopo il secondo stadio (350 giorni di età).

---

### Perimetro B — Missioni ed eventi

#### B.1 Come è rappresentata una missione oggi

| Sistema | Stato salvato | Generazione | Protezione dal doppio pagamento | Dove la vede il giocatore |
|---|---|---|---|---|
| Campagna (`engine.js:340-370, 783-795`) | `s.quest` 0–4, `s.campaign{stage 0–5, completed}`, `bossDefeated` | fissa | macchina a stati con confronto esatto; incrociata con boss e oggetti al caricamento (`:1455-1466`) | diario, freccia sul campo, rombo su Nerea |
| Commissione di Ivo (`:862-869`) | `s.sideQuest` 0–2 | fissa | `sideQuest!==1` rifiuta | diario, rombo su Ivo |
| Incarichi quotidiani (`daily-life.js:3-20`) | `s.daily.quests{id:{progress,claimed,regions,day}}`, `offerClaimed{id:giorno}` | 7 fissi + segreto; **4 offerte contestuali** a pressione (`:110-121`) | `claimed`; `offerClaimed` per giorno; accettazione rifiutata se già attivo | diario (`LifePanels.quests`); nessun rombo |
| Carichi di Calis | dentro `s.daily` (`site:'cargo-board'`) | fisso | come sopra, con riscossione solo sul posto | diario e sito del registro |
| Commissione di Velaris (`urban-life.js:485-491, 556-588`) | `s.urban.mission{active:{day},claimed,completed}` | una al giorno, merce e quantità da `hash(seed,giorno)` | `claimed=giorno`; `Inventory.take` prima del pagamento | **solo** nel pannello dell'abitante |
| Gilda (`guild.js:6-13, 103-122`) | `s.guild.active`, `completed{regione/tipo:tempo}` | 6 modelli; attesa di 95 s per regione e tipo | un solo incarico attivo, azzerato alla riscossione | **solo** nel pannello G |
| Eventi del borgo (`world-life.js:47-52, 151-191`) | `life.news` (massimo 8) | rotazione deterministica ogni blocco di 68 s | — (effetti istantanei) | diario («Cronaca di Lùmora») e avviso in paese |
| Conflitti PNG (`npc-conflicts.js:296-331`) | `s.conflicts{people,regions,events≤32,mourning,ritualUsed}` | nodi per regione con `next` e `roll(seed,…)` | stato per persona; rito una sola volta | pannello dei conflitti, avvisi |
| Lume serale (`lantern.js:25-56`) | `s.lanternFound` | finestra 20–22 | indicatore booleano | suggerimento nel diario |
| Santuario (`legendary.js`) | catena con invarianti | seme 1/128 | invarianti sull'inventario (`:132-140`) | registro del santuario |

Gli eventi arrivano da `engine.record`, che li distribuisce a Growth, Life, Daily, Reputation e Guild (`engine.js:164-170`). I moduli restituiscono `{ok,text,event,xp,essence,panel}` ad `applyLife` (`:727-738`). La reputazione per le riscossioni è aggiunta dal motore: `quest-claim` (`:826-829`) e `guild-*` (`:813-816`). Esistono già tetti giornalieri contro gli abusi (`reputation.js:56-62`).

#### B.2 Difetti

Confermati nel codice:
- **B-D1 · Diario frammentato.** Il diario (`panels.js:70-75`) non mostra l'incarico di gilda attivo né la commissione di Velaris. Il rombo è disegnato solo per Nerea e Ivo (`engine.js:1197-1204`). La freccia segue solo la campagna o una meta scelta a mano, che non viene salvata (`interface.js:124-151`).
- **B-D2 · Offerta del giorno instabile** (`daily-life.js:112-120`). La pressione `patrol` vale 0,4 solo mentre un lupo è ingaggiato, e l'offerta si ricalcola a ogni apertura: nello stesso giorno può cambiare. Non porta a pagamenti doppi.
- **B-D3 · Testo dell'accettazione sbagliato** (`engine.js:783-785`). Dice sempre «Gli echi del sentiero» anche quando `advance()` ha già portato al passo 2 o 3. L'avviso «Cerchio aperto» compare solo se le uccisioni sono esattamente 3 (`:437`).
- **B-D4 · Incarico di gilda «Lettura del patto» ripetibile sulla stessa statua.** `world-life.js:236` restituisce `inscription` a ogni uso, non solo alla prima lettura. Il compenso è di 28 Scintille + 39 XP di gilda + 15 PE ogni 95 s. L'impatto dipende dalla distanza fra statua e bacheca: **da verificare in partita**.

Rischio confermato:
- `Daily.restore` scarta l'intero salvataggio se trova un id di incarico sconosciuto (`daily-life.js:41-44`; catena di caricamento in `engine.js:1466-1507`). Aggiungere modelli a `Daily` rende i salvataggi nuovi illeggibili per le build precedenti.

#### B.3 Architettura proposta: «Richieste del mondo»

L'obiettivo è generalizzare `Daily.offers` e la commissione di Velaris **senza toccarli**.

**Opzione minima.** Aggiungere modelli a `Daily.offers`. Costa zero campi nuovi, ma ha limiti: una sola offerta al giorno, solo Vela, ricompensa fissa, nessuna consegna, e il rischio di compatibilità visto sopra.

**Opzione consigliata.** Un modulo `world-requests.js` (`window.Requests`). In `build.py` va dopo `urban-life.js` e prima di `engine.js`, perché usa `Economy`, `Conflicts`, `Calendar`, `Inventory`, `Life` e `Guild`.

1. **Modello, dati statici con id stabili:**
   `{id, source:{npc|site|board, region}, when(s) → bool, weight(s), goal:{kind:'deliver', item, amount(h)} | {kind:'event', event, target, match(meta)}, days, reward(s,inst), effect(s,inst), rep:'quest-claim'}`.
2. **Condizioni verificabili, solo API esistenti:**
   - `Economy.shortage` e `Economy.quote` (`trade-economy.js:138, 311`);
   - `Calendar.view` (stagione, meteo, `shopOpen`);
   - `Conflicts.condition` e `Conflicts.faction().mourning`;
   - `Life.level` e l'evento del borgo corrente;
   - `s.guild.joined`, `s.sideQuest`.
3. **Istanza deterministica:** quantità e scelta derivano da `hash(seed, giorno, id)`, come `urban-life.js:488`. Nessun `Math.random`.
4. **Offerta congelata per giorno:** si salva `offered{id:giorno}` alla prima valutazione della giornata. Così si evita B-D2.
5. **Stato salvato:** `s.requests = {schema:1, offered:{}, active:{id:{day,progress}}, claimed:{id:giorno}}`. Ha un valore predefinito se manca e non richiede una nuova versione del salvataggio: `parseSave` ignora le chiavi sconosciute (`engine.js:1411-1415`).
6. **Ripristino tollerante:** `restore` **non restituisce mai `null`**. Scarta gli id sconosciuti, i giorni futuri e i progressi oltre il massimo. Il ripristino rigido di Daily bloccherebbe tutto il salvataggio.
7. **Obiettivo:** gli eventi passano da una riga in `engine.record` accanto a `Daily.log`. Le consegne usano `Inventory.take` con quantità BigInt.
8. **Protezione dal doppio pagamento:** un'istanza attiva per modello. Alla riscossione, nell'ordine: verifica del tetto di 1e10 Scintille, `Inventory.take`, scrittura di `claimed[id]=giorno` e azzeramento di `active`, poi pagamento. Riscossione solo vicino alla fonte (`UrbanWorld.access` o distanza dal PNG). Una richiesta di un PNG morto si annulla, come la commissione di Ivo (`engine.js:386`).
9. **Ricompensa bilanciata, nessuna regola nuova:** `quote.sell × quantità + 6–10`, limitata a 15–40 Scintille (gli altri sistemi stanno fra 16 e 60), più 10–16 PE (come Ivo). **Niente essenze né echi**, per non cambiare il ritmo dell'evoluzione.
10. **Conseguenze esistenti:**
    - `Economy.deliver`, che riporta la merce al mercato e la registra nel libro dei flussi;
    - l'evento `trade` con `commission:true` (crescita, mestiere di mercante);
    - `Reputation 'quest-claim'`.
11. **Visibilità:** una sezione «Richieste del mondo» nel diario, insieme a righe di sola lettura per l'incarico di gilda e la commissione di Velaris (risolve B-D1). `Requests.markers(s)` generalizza il rombo di `engine.js:1202`. Un `Requests.sites(s)` aggiunto all'elenco di `trackSite` (`interface.js:129-131`) dà la freccia sul campo.

#### B.4 Tre eventi candidati

**E1 · Bottega che chiede un materiale — «Lana per le mantelle d'inverno»**
- *Fonte:* Ivo, banco nel Borgo di Vela.
- *Condizioni:* stagione autunno o inverno; `s.sideQuest===2`; Ivo vivo; bottega aperta.
- *Obiettivo:* consegnare 2 Lana, dal recinto delle lanose o dal mercato.
- *Durata:* 2 giorni.
- *Ricompensa:* quotazione della lana a Vela × 2 + 6.
- *Conseguenze:* `Economy.deliver(s,'vela','wool',2)` rende la lana più reperibile, e quindi la mantella di lana. Reputazione del borgo.
- *Legame con le specie:* chi soffre il freddo (Slime, Viverna, Draconide).

**E2 · Gilda che cerca un artigiano — «Lame della squadra»**
- *Fonte:* Registro degli avventurieri di qualsiasi insediamento.
- *Condizioni:* iscrizione alla gilda; Fabbro almeno grado 2 (`Life.level`); servizio di forgia raggiungibile.
- *Obiettivo:* 2 eventi `gearWork` (riparazione o tempra, `gear.js:304`), oppure una lama `forge` di qualità almeno buona.
- *Durata:* 3 giorni.
- *Ricompensa:* 19–26 Scintille, la stessa fascia della gilda.
- *Conseguenze:* reputazione `guild-claim` (pubblica +4, borgo +2). Nessun nuovo tipo in `Guild.types`, che romperebbe i salvataggi.
- *Legame con le specie:* Goblin, Coboldo, Nano.

**E3 · Carenza al mercato — «Erbe per la cambusa»**
- *Fonte:* Registro dei Carichi di Calis (sito già collegato al diario, `urban-profiles.js:115`).
- *Condizioni:* `Economy.shortage(s,'calis','herb') ≥ 0,4` (obiettivo di scorta 5).
- *Obiettivo:* vendere 3 erbe all'Emporio delle Sette Vele. È lo stesso controllo di `calis-freight` (`daily-life.js:13`) con un parametro diverso.
- *Durata:* 2 giorni.
- *Ricompensa:* 14–18 Scintille, più il prezzo di vendita.
- *Conseguenze:* la scorta torna a crescere grazie a una vendita normale, che è già registrata. Reputazione di Calis.
- *Legame con le specie:* Driade e Micòide (Agricoltura, raccolta).

#### B.5 Rischi tecnici

- Un ripristino che restituisce `null` cancella l'intera partita (`engine.js:1466-1507`): serve tolleranza e la prova `tests/verifica-salvataggi-incrociati.cjs`.
- Va rispettato l'ordine dei moduli in `build.py`, e vanno aggiornate le tabelle in `LEGGIMI.md` e `GAME_DESIGN.md`.
- Prestazioni: valutare le condizioni al massimo una volta per giorno o per apertura del pannello, mai a ogni fotogramma. `Economy.shortage` chiama `fresh()`.
- Non toccare `urban-profiles.js` e `urban-districts.js` (lavoro di Codex): usare solo fonti e siti già esistenti.
- Il registro dei flussi deve restare in pareggio: le merci entrano nel mercato solo con `Economy.deliver`.

---

### Classificazione finale

| Sistema | Stato |
|---|---|
| Sorteggio delle stirpi e pesi | funzionante |
| Doni delle 9 stirpi originali | funzionante, poco visibile (senza numeri) |
| Forma dell'attacco naturale per specie | funzionante, poco visibile |
| Bisogni e temperatura per specie | funzionante, poco visibile; incoerenza della Viverna |
| Corteggiamento legato all'età | parziale (nascosto, età statica) |
| Attitudine Agricoltura, territorio affine | scollegata |
| Volo, nuoto, terreno, prezzi e reazioni sociali per specie | assente |
| Forme del corpo nell'equipaggiamento | parziale (solo testo, famiglie incomplete) |
| Campagna, commissione di Ivo | funzionante |
| Incarichi quotidiani e offerte contestuali | funzionante, poco visibile (offerta instabile) |
| Commissione di Velaris | funzionante, poco visibile (fuori dal diario) |
| Incarichi di gilda | funzionante, poco visibile; «Lettura del patto» da verificare |
| Eventi del borgo, Lume | funzionante, limitato alla Valle |
| Conflitti PNG, Santuario | funzionante |
| Marcatori e diario unificati | parziale |
| Eventi contestuali generalizzati | assente (embrione in `Daily.offers`) |



## Revisione incrociata finale (incremento 6, 2026-11-23)

Due revisori indipendenti in sola lettura sul diff `96eb9be..6209a1a`, con script di conferma sul motore reale (in `scratchpad/review-eco` e `scratchpad/review-mem`, fuori dal repository).

| Codice | Gravità | Difetto (revisore) | Correzione | Prova |
|---|---|---|---|---|
| rev-LW6-E1 | alta | L'Armeria del Passo accettava la lama **equipaggiata**: dopo la consegna `workshop.weapon` puntava a una lama non più posseduta, `Tradecraft.restore` rifiutava il salvataggio e la partita non si caricava più | `careers.js` usa la stessa regola della vendita al banco (`Economy.tradeAllowed`, ora esportata in sola lettura): una lama equipaggiata non si consegna, con il motivo nel pannello | `verifica-revisione-lw` 1 (con mutazione) |
| rev-LW6-E2 | media | «Erbe per la cambusa» si completava con qualunque vendita di 3 erbe all'Emporio di Calis, anche di erbe appena comprate allo stesso banco (circa +9 Scintille ogni 4 giorni a scorte invariate); un contratto del Registro di erbe completava anche la richiesta | la richiesta chiede ora di **portare 3 erbe al Registro dei Carichi** (consegna vera con `Economy.deliver` nelle scorte del porto), come la lana di Ivo | `verifica-richieste` 8 |
| rev-LW6-E3 | bassa | «Lana per le mantelle»: comprare 2 lane a Vela e consegnarle rendeva da 0 a +9 Scintille ogni 6 giorni | compenso limitato al costo d'acquisto delle stesse merci al mercato della richiesta meno 1 (stessa regola di armeria e carichi), anche per la cambusa | `verifica-richieste` 11 (tre semi) |
| rev-LW6-E4 | bassa | Una richiesta scaduta ma non ancora chiusa dall'impulso (dopo un caricamento o un salto di tempo) si poteva riscuotere | nuovo stato «Scaduta»: niente riscossione, la chiude l'impulso | `verifica-revisione-lw` 2 (con mutazione) |
| rev-LW6-E5 | bassa, latente | L'annullamento di un contratto del Registro per magazzino pieno distruggeva le unità già entrate | si ritirano dal porto le unità entrate e lo zaino torna intero | `verifica-revisione-lw` 3 (magazzino simulato, con mutazione) |
| rev-LW6-E7 | bassa | Il commento sul tetto del compenso dell'armeria non diceva il vero (si confronta con il prezzo alla scorta attuale) | commento corretto; non sfruttabile (le lame sul banco arrivano solo dal giocatore e il banco ne consuma una al giorno) | lettura |
| rev-LW6-M1 | media | Un NPC **morto** sentiva ancora le voci da altri continenti e le «ricordava» | `WorldMemory.note` rifiuta chi è morto | `verifica-revisione-lw` 4 (con mutazione) |
| rev-LW6-M2 | media | Se Ivo moriva durante «Lana per le mantelle», alla scadenza il giocatore riceveva colpa e cattiva fama | la richiesta si scioglie senza colpa («non c'è più nessuno ad attenderla»), come le promesse a Tessa | `verifica-revisione-lw` 5 (con mutazione) |
| rev-LW6-M3 | bassa | Il tetto unico di 60 ricordi faceva sparire i ricordi di una persona sotto quelli di un'altra | al massimo 20 ricordi per persona (60 in tutto), anche al ripristino | `verifica-revisione-lw` 6 (con mutazione) |
| rev-LW6-M5 | bassa | Una promessa a Tessa scaduta mentre era in stato critico (consegna impossibile) dava colpa al giocatore | se alla scadenza Tessa non può riceverti, la promessa si scioglie senza colpa | `verifica-revisione-lw` 7 (con mutazione) |
| rev-LW6-M6 | bassa | Un salvataggio modificato con un'impresa di Vela `heard:false` faceva nascere una «voce» da Vela a Vela | al ripristino le imprese nate a Vela sono già note a Vela | `verifica-revisione-lw` 8 (con mutazione) |
| rev-LW6-M4 | bassa, **decisione** | Fama a buon mercato: a inizio partita Vela ha 10 erbe su 12, quindi una consegna di 1 erba al giorno a Tessa conta come aiuto nella carenza e Vaelthoria arriva a «Rinomato» in circa 2 giorni | **non corretta**: cambia il bilanciamento di regole già approvate (che cosa è una carenza). Alternative in *Problemi rimasti* | — |
| rev-LW6-E6 | bassa | Con il magazzino di Vela quasi pieno la lana di Ivo non torna tutta al mercato | accettato: Ivo la usa per le mantelle (il testo lo dice); il registro dei flussi resta in pari | — |

Controllato e trovato corretto: tratto piatto di `lotPrice` e nessun ciclo vendi/ricompra; nessun ciclo «compro a Calis e consegno al Registro» per nessuna merce, scorta o dimensione; tetto del borsello e del magazzino; una consegna al giorno per armeria e Registro; chiusura delle richieste prima del pagamento; ripristini che scartano voci non valide senza rifiutare il salvataggio (anche `__proto__`, 100 000 voci, giorni futuri); nessun `Math.random` nuovo; testimoni solo vivi, al loro posto, nella regione ed entro 100 px; voci mai prima dei giorni di viaggio; numeri di `lineage.js` uguali al motore; `Society.mature` con la stessa regola; nessun doppio escape; nessuna modifica a `urban-life.js`, alle forme di crescita, a `continental-species.js`, alle statue o a `npc-conflicts.js`.
