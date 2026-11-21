# PROGRESS.md — Stato del progetto

> Ultimo aggiornamento 2026-11-21, Codex, rifinitura dei quartieri orientali.

## In corso
_Nessuna modifica in corso._

## Prossimo passo
1. La rifinitura orientale chiude UX-002 e UX-003. Il prossimo intervento previsto è il **Generatore Procedurale Urbano 2.0**, da avviare con approvazione. Partire dai lotti orientali, da `settlementTypes` e dalle cache del terreno. Conservare porte, seed e compatibilità dei salvataggi.
2. I passi grafici 3–5 attendono una nuova conferma. I branch precedenti `velaris-city-expansion` e `velaris-city-verified` restano come copie di lavoro. Ripartire da `main`.
3. Per la **fase 3** il banco di Velaris riceve già prodotti locali e merci di commissione. Riutilizzare le scorte persistenti e il mercato condiviso con la Selva. Restano da collegare altre filiere, richieste individuali, eventi e servizi.
4. La morte dei compagni di gilda (RISK-007) è confermata dall'utente e documentata in `GAME_DESIGN.md` §4.9; resta da verificarne il bilanciamento in partita. La misura grafica comparativa è disponibile in questo registro. Lo script per ripeterla resta da integrare nella suite condivisa.

## Versione e stato generale
- **Aggiornamento 5 · Velaris**, salvataggio **v7** con migrazione da v1 a v6.
- `Reincarnation.html` è il prodotto offline. La build integrata coincide byte per byte con una ricostruzione indipendente dei sorgenti.
- Il commit iniziale di GitHub `3f72b69` usava il formato v5 e includeva parti dell’Aggiornamento 4. L’integrazione è partita da quel commit in un branch separato. Prima dell’intervento sono stati conservati un bundle Git e un archivio della v6 e di Velaris.
- La fase 1 parte da `875ac74` sul branch `codex/mega-city-fase-1` e include la revisione `c3f3b04` e la correzione salvataggi `3ec9819` arrivate da Claude. Il piano ufficiale conserva il brief originale in 18 sezioni e aggiunge criteri di verifica e passaggio di consegne fra modelli.

## Funzionalità implementate
La tabella elenca i sistemi disponibili. La sezione seguente indica le verifiche eseguite sulla build integrata.

| Area | Stato | Moduli |
|---|---|---|
| Mondo di Lùmora, cinque continenti, Cripta delle Soglie e campagna | ✅ | `world.js`, `expansion-world.js`, `continents.js` |
| Velaris (cittadina), sei quartieri (quattro storici più Portici del Vetro e Orti dell'Alambicco), otto interni con la Serra delle Talee e servizi interattivi | ✅ | `urban-exterior.js`, `urban-interiors.js`, `urban-world.js`, `urban-services.js`, `urban-life.js` |
| Piazza e ponte centrale di Velaris con intarsi, riflessi e lanterne governate dal calendario | ✅ | `urban-exterior.js` |
| Rifornimento del Mercato di Velaris dai mestieri all’alba e dalle commissioni consegnate | ✅ | `urban-life.js`, `trade-economy.js`, `economy-panel.js` |
| 44 stirpi, rami evolutivi, predisposizioni, innate, metamorfosi | ✅ | `engine.js`, `expansion-species.js`, `continental-species.js`, `growth.js` |
| Arte pixel procedurale (sprite, forme evolute, ritratti, icone) | ✅ | `sprites.js`, `expansion-art.js`, `legendary-land.js` |
| Combattimento, tecniche, fusioni (K), boss a fasi | ✅ | `engine.js` |
| Combattimento adattivo dei boss | ✅ | `adaptive-combat.js` |
| Campagna "Dal Borgo al Varco" (Orveth, Cava, 3 guardiani, epilogo) | ✅ | `engine.js`, `world-life.js` |
| Inventario esatto (BigInt), deposito | ✅ | `inventory.js`, `life-panels.js` |
| Calendario persistente, sonno, stagioni, bisogni | ✅ | `calendar.js`, `daily-life.js` |
| Mestieri con minigiochi (pesca, forgia, agricoltura, allevamento, cucina) e ricettario | ✅ | `trades-practice.js`, `tradecraft.js`, `practice-panel.js` |
| Mercati regionali, 4 valute, banca (5 sportelli) | ✅ | `trade-economy.js`, `economy-panel.js` |
| Abitanti, memorie, accordi, famiglia | ✅ | `society.js` |
| Costruzione su lotti, proprietà | ✅ | `construction.js` |
| Gilda pubblica (rango F–S) e personale | ✅ | `guild.js` |
| Reputazione e titoli | ✅ | `reputation.js` |
| Equipaggiamento (rarità, durabilità, tempra, ascensione, incantamento) | ✅ | `gear.js`, `gear-panel.js` |
| Conflitti NPC, ferite, morte permanente, memoriali | ✅ | `npc-conflicts.js`, `npc-conflict-panel.js` |
| Santuario della Marea Muta, Nadir, Arma Divina, Eco della Rinascita | ✅ | `legendary-land.js`, `legendary.js` |
| Evento serale delle lanterne | ✅ | `lantern.js` |
| Audio sintetizzato dinamico | ✅ | `audio.js` |
| UI: HUD, pannelli, minimappa, touch, export/import salvataggi | ✅ | `interface.js`, `panels.js`, `template.html`, `style.css` |
| Build a file singolo | ✅ | `build.py` |

## Test e verifiche

### Rifinitura dei quartieri orientali

- `node tests/verifica-integrazione.cjs` include ora gli aloni nei due quartieri orientali, il limite di otto luci, la luce di mezzogiorno e gli effetti ridotti. Verificati anche la cancelliera della Gilda e la coltivazione persistente.
- `node tests/sonda-percorsi.cjs 555,2024,19425,18420,42`: zero residenti bloccati e zero tratte scartate in 34.200 campioni. Le tre nuove mete sono raggiungibili dalla Corte su cinque semi.
- Edge, otto orari per tre semi. Entro 120 pixel dalla Corte il massimo osservato è sceso da 20 a 6. Al seme `19425`, alle 12:15, la Corte è passata da 18 a 4 e l’intero quartiere da 21 a 23 residenti nel censimento.
- Edge, seme `19425`: cancelliera presente alle 11:03, commissione accettata e consegnata, salvataggio ricaricato. Verificati illuminazione di entrambi i quartieri e vista della serra con effetti attivi e movimento ridotto, senza errori o richieste di rete.
- Edge: `tests/prova-browser.cjs` 10/10 e `tests/prova-browser-velaris-est.cjs` 12/12. Provati gli spostamenti a piedi, la semina e la raccolta dopo il caricamento. Un salvataggio v7 della build precedente ha conservato posizione, regione e inventario.
- Edge visibile, `SCENES=portici21,orti21`, `SECS=12` con `tests/prova-prestazioni.mjs`: 95º percentile degli intervalli fra fotogrammi di 4,3 ms in entrambe le build. Il 95º percentile del tempo CPU è rimasto 0,3 ms nei Portici e 0,2 ms negli Orti. Prova locale, limitata alle due scene e all’hardware usato.
- Sintassi Node e ricostruzione indipendente dell’HTML identica byte per byte. Il tocco su dispositivo reale resta da verificare.
### Integrazione del lavoro di Codex: quartieri orientali, serra, tipi di insediamento (Claude, 2026-11-21, unita a `main`)
**Unione su `main`** (approvazione dell'utente): prima dell'unione `main` e `origin/main` fermi a `16b6129`, cartella di lavoro pulita, cartelle di Codex identiche al backup (SHA-256 dei 15 file originali e delle copie, `git status` e HEAD `daa1a06`/`4ca3d8d` invariati). Fast-forward `16b6129` → `769d231`. **Verifiche ripetute su `main` dopo l'unione, tutte superate**: sintassi dei sei moduli toccati; `node tests/verifica-integrazione.cjs`; `tests/sonda-percorsi.cjs 555,2024,1,77,3,19425` → 0 bloccati su 41 040; controllo indipendente dei tratti → 3 351 tratte, 0 senza percorso, 0 illegali, `path()` medio 6,6 ms, p95 21,9 ms, max 43 ms; `tests/sonda-residenti.cjs` su 10 semi → 0 coppie sotto 10 px; `tests/prova-browser.cjs` 10/10; `tests/prova-browser-velaris-est.cjs` 12/12 (con un salvataggio creato dalla build di `16b6129`); nessun processo di Edge rimasto aperto; `python build.py` su file separato identico byte per byte al `Reincarnation.html` committato (SHA-256 `7E146D76…A797EB`). Affollamento ripetuto (stessi tre semi, entro 120 px): piazza 12/8/12 a mezzogiorno, 3/8/12 alle 19:30, 4/3/2 alle 21; Corte dei Soffiatori 18/14/19, 15/16/14, 11/8/12; Piazzetta delle Radici al massimo 11. Il numero di edifici dipende dal seme: 130–135 (131–135 su 8 semi in Node, 130 nella partita della prova nel browser), sempre 32 nei quartieri nuovi (la cifra «134» scritta prima valeva solo per alcuni semi).
**Fonte**: solo `velaris-city-verified` (Codex, base `daa1a06`); copia di sicurezza in `C:\Users\elaro\Downloads\Codex-backup-2026-11-21` (con `RAPPORTO.md`). Cartelle di Codex non toccate (SHA-256 e `git status` verificati). `velaris-city-expansion` non usata (bozza precedente).
**Commit**: blocco 1 logica/serra/tipi/routine `5f338bc`; blocco 2 quartieri orientali `93cfee1` (conflitti con il passo 2 risolti tenendo entrambe le parti, atmosfere del passo 2 limitate ai quartieri storici); finestre notturne dell'annesso e scene della prova di prestazioni `fec1482`; prove e documenti nel commit successivo.
**Verifiche** (tutte superate):
- `node tests/verifica-integrazione.cjs`: migrazioni v5/v6→v7, BUG-011, passo 2 (≤8 luci, movimento ridotto), sei quartieri, otto interni, serra con salvataggi v7 senza `seedbedAt`.
- Percorsi: `tests/sonda-percorsi.cjs` su 6 semi (555, 2024, 1, 77, 3, 19425) → 0 residenti bloccati su 41 040 campioni; 3 351 tratte distinte, 0 senza percorso, 0 con segmenti illegali (controllo a 0,05 px). `path()` medio 7,2 ms, p95 23,9 ms, max 47 ms (città più grande del 34%; su `main` 6,4 / 16,1 / 63 ms).
- Sovrapposizioni: `tests/sonda-residenti.cjs` 10 semi × 3 orari → 0 coppie sotto 10 px.
- Affollamento (residenti entro 120 px, semi 555/2024/19425): piazza alle 19:30 e alle 21:00 da 40–49 (`main`) a 2–12; nuova punta alla Corte dei Soffiatori 14–19 a mezzogiorno e la sera; Piazzetta delle Radici 3–11.
- Browser (`tests/prova-browser-velaris-est.cjs`, 12/12, Edge): ingresso a Velaris; carta con «Cittadina di Velaris» e nuovi quartieri; **a piedi** con `Game.step` fino ai Portici (29,7 s di gioco, 0 blocchi), agli Orti (9 s), alla porta della Serra e ingresso; semina, irrigazione, salvataggio con ricarica della pagina; niente raccolto a 79 minuti, raccolto a 80+ con due erbe e aiuola vuota; uscita verso la porta; ritorno a piedi alla piazza (22,4 s); **salvataggio v7 creato con la build di `main`** vicino al vecchio confine (2080,726) caricato nella nuova build con posizione, regione e inventario conservati e aiuola vuota, poi a piedi fino ai Portici; nessun errore JavaScript. `tests/prova-browser.cjs` 10/10.
- Prestazioni (`tests/prova-prestazioni.mjs`, Edge visibile, GPU attiva, 3 ripetizioni alternate, 30 s per scena, nessuna lettura di pixel, ~21 000 fotogrammi per cella): intervallo fra fotogrammi p95 4,3 ms ovunque (refresh 240 Hz), 0 fotogrammi oltre 20 ms. Tempo CPU di disegno mediana/p95 (ms) `main` → integrazione: piazza 12 0,2/0,3 → 0,2/0,3; ponte 21 0,3/0,4 → 0,2/0,3; mercato 21 0,1/0,2 → 0,1/0,2; giardini 21 0,1/0,2 → 0,1/0,2. Nuove zone: Portici 12 e 21, Orti 19:30 e 21, Serra 12 → 0,1/0,2. **Sotto stress** (×16, 10 s, 3 ripetizioni, mediana): piazza 1,8 → 1,7; ponte 2,9 → 1,7 (meno residenti sul ponte la sera); mercato 1,2 → 1,2; giardini 1,1 → 1,2; Portici 1,3; Orti 0,8; Serra 0,7. Primo disegno del terreno dell'annesso (una volta per partita): 4–5 ms contro 11–14 ms del terreno storico.
- Screenshot di giorno, al tramonto e di notte (`prova-prestazioni.mjs shot`): quartieri storici invariati; finestre dell'annesso accese di notte dopo la correzione e identiche di giorno (confronto byte per byte).
**Problemi rimasti** (vedi UX-001 e UX-002): Corte dei Soffiatori affollata (14–19 residenti); Orti molto scuri di notte (nessuna lanterna stradale nell'annesso, solo le 4 della Corte dei Soffiatori); nessuna atmosfera locale per i due quartieri nuovi; vie, lotti e oggetti dell'annesso a coordinate fisse (da generalizzare nel Generatore Procedurale Urbano 2.0). **Non verificato**: tocco, meteo diverso da quello del seme, dispositivi meno potenti.

### Passo 2 grafico: luce e vegetazione (Claude, 2026-11-21, branch `claude/passo2-luce-vegetazione`)
- **Realizzato** in `urban-exterior.js` (più un ritocco in `urban-interiors.js`): vedi `CHANGELOG.md`. Condizioni di `PIANO_GRAFICO.md`: ≤8 luci attive ✅ (test), sprite precalcolati ✅ (tre sprite, nessun gradiente per fotogramma; i gradienti di sfondo restano solo nel primo uso), luce propria degli interni ✅ (già presente, ora rispetta il movimento ridotto; `atmosphere()` non agisce negli interni), `prefers-reduced-motion` ✅, avvisi di combattimento 🟡 (non toccati; `Game.drawFX` si disegna dopo lo strato di luce, ma renderli distinguibili per forma è il passo 4).
- **Verificato davvero**: `node tests/verifica-integrazione.cjs` OK (nuovo caso: giorno/notte, effetti off, matchMedia ridotto, ≤8 luci); sonda residenti ancora a 0. In browser (build reale, stesso seme, ora e camera): confronto prima/dopo di ponte di notte, giardini e mercato di sera; con `prefers-reduced-motion` simulato due fotogrammi a tempi diversi hanno 0 pixel diversi (ponte, giardini, mercato; 12:00 e 22:00).
- **Prestazioni, verifica finale (Claude, 2026-11-21, Edge con finestra visibile e GPU attiva).** Edge 'headed', 2D canvas e composizione accelerati (`SystemInfo`: `2d_canvas`, `gpu_compositing`, `rasterization` abilitati; GPU Intel con RTX 5080 Laptop presente). Schermo a circa 240 Hz (intervallo 4,2 ms): **la misura precedente di Codex (mediana 4,2 ms) era limitata dal refresh e non distingueva le build**; le misure headless senza GPU del passo precedente sono superate da questa. Metodo: driver CDP (`requestAnimationFrame` reale, nessuna lettura di pixel nella misura), stessi seme 19425, ora, camera 480×270 ingrandita a tutta finestra, percorso orizzontale ±60 px, residenti inclusi; 4 scene (piazza 12:00, ponte 21:00, mercato 21:00, giardini 21:00); 3 ripetizioni alternate **main / branch `3e17d01` / branch ottimizzato**, 30 s per scena e ripetizione (circa 21 000 fotogrammi per cella).
  - *Fluidità*: p95 dell'intervallo fra fotogrammi 4,3 ms ovunque; fotogrammi >20 ms: 0 su tutte le build, salvo 5 e 4 su ~21 000 nel branch `3e17d01` (mercato, giardini; rumore, non riprodotto in una prova isolata). Nessun calo di fluidità misurabile.
  - *Tempo CPU di disegno per fotogramma* (ms, mediana delle ripetizioni, 1 disegno): mediana 0,2–0,6 e p95 0,3–0,9 su tutte le build; le differenze (±0,1–0,3 ms) sono dell'ordine della risoluzione del timer (0,1 ms) e non sono interpretabili in percentuale.
  - *Sotto stress* (16 disegni per fotogramma, 10 s, 3 ripetizioni; amplifica la differenza): variazione della mediana rispetto a main per `3e17d01` → ottimizzata: piazza +28% → −8%; ponte +42% → 0%; mercato 0% → −11%; giardini +112% → −42% (p95: +24/+52/0/+55% → −3/−6/−8/−55%).
  - *Profilatore JS* (giardini, stress): il sovracosto del branch `3e17d01` stava quasi tutto in `paintProp` (alberi e cristalli, 4,8 s contro 2,5 s di main nel campione), non in luci (`drawLight` ≈ invariato), particelle (`drawMotes` ≈ 0,14 s), ombre (≈ 0,03 s), atmosfera (≈ 0,02 s) o riflessi (≈ 0,17 s al ponte). Le singole voci spente una alla volta non spiegavano il resto (rumore di misura): la causa verificata è il disegno riga per riga dei dischi delle chiome (`disk()` = decine di `fillRect`) e dei poligoni dei cristalli.
  - *Ottimizzazione* (`urban-exterior.js`): alberi e cristalli come sprite precalcolati (`propSprite`) invece del disegno per primitive. **Resa invariata**: confronto pixel a pari fotogramma, 12 e 9 pixel su 129 600 diversi di un livello su un solo canale (arrotondamento dei bordi dei poligoni). Il resto (luci, finestre, particelle, riflessi, ombre) non è stato tolto né ridotto oltre quanto già fatto.
  - **Obiettivo del 10% di `PIANO_GRAFICO.md`**: per il tempo CPU di disegno, nello scenario più oneroso (stress) la versione ottimizzata è **entro il riferimento in tutte e quattro le scene** (da −42% a 0%); nel carico normale la differenza non è distinguibile dal timer. Il **p95 dell'intervallo fra fotogrammi coincide con quello di main**. Limite dichiarato: la GPU reale non è misurabile direttamente da JS; la prova a 30 s non ha mai portato un fotogramma sopra la cadenza dello schermo.
- **Prova nel browser con Playwright** (`tests/prova-browser.cjs`, 2026-11-21): 10 prove superate su Edge installato, due esecuzioni consecutive: avvio, nuova incarnazione e ingresso nella valle, movimento da tastiera, apertura dell'Atlante, comando «Segna Velaris» (meta su Velaris, regione `city-velaris`), ingresso a Velaris (percorso di passaggi `World.route` + interazione, con il personaggio posizionato sui varchi, non camminato), menu (pausa, mappa, personaggio, inventario, diario, attività), salvataggio con ricarica della pagina e «Continua il viaggio» alla stessa posizione, esporta/importa JSON v7, nessun `pageerror` né `console.error`. Nessun processo Edge rimasto dopo le prove. Setup fuori dal progetto: `mkdir %TEMP%\pw; cd %TEMP%\pw; npm init -y; npm install playwright-core` (Microsoft, Apache-2.0), poi `$env:PW_CORE="$env:TEMP\pw\node_modules\playwright-core"; node tests/prova-browser.cjs` (`PW_HEADED=1` per vedere la finestra). Il progetto non ha `package.json` né nuove dipendenze. Copre in parte RISK-008 (pannelli principali); non copre combattimento, minigiochi, interni e touch.
- **Come ripetere la misura**: `node tests/prova-prestazioni.mjs bench <file.html>` (Edge a finestra visibile; `SECS` durata per scena, `K=16` per lo stress, `profile <file.html> <scena>` per il profilatore, `shot` per gli screenshot, `gpuinfo` per lo stato della GPU). Per il confronto costruire `main` con `git worktree` e alternare le due build; non lanciare due esecuzioni insieme (si falsano a vicenda) né usare lo stesso profilo Edge. Dopo ogni prova controllare che non restino processi Edge di test (profilo `prova-prestazioni`/`cdpprof-`): il driver chiude solo il processo principale e le istanze rimaste possono falsare le misure successive; nella verifica finale erano state ripulite prima delle 18 esecuzioni, ma non è escluso che istanze create durante la serie abbiano aggiunto rumore.
- **Verifica funzionale** (build reale in browser, branch ottimizzato): ingresso in Velaris, movimento, dialogo con un residente, interno (bottega), salvataggio/ricarica dentro l'interno e dopo l'uscita, disegno notturno con `Game.drawFX` dopo lo strato di luce; 2400 passi in valle con attacchi continui e disegno periodico senza errori e console pulita. **Non verificato**: combattimento contro un boss adattivo, tocco, tutte le ore e il meteo, interfaccia in partita completa.
- **Osservazione visiva aperta**: la sera la piazza è molto affollata di residenti (soste distribuite a 15 px, sprite di circa 16 px), soprattutto attorno al ponte; è effetto del passo sui residenti, non della luce. Da valutare se aumentare la distanza o ripartire gli orari di sera.
- **Non verificato**: touch, aspetto in partita con interfaccia completa, interni illuminati dal vivo, tutte le ore e il meteo, combattimento contro un boss adattivo. Nota estetica: le lanterne oltre le otto luci mostrano solo il filamento. Per l'affollamento serale vedi UX-001.

### Residenti di Velaris: soste distribuite (Claude, 2026-11-21)
- **Causa**: `sidestep()` offre solo 8 scostamenti fissi e tutti i residenti con lo stesso ancoraggio (mercato, piazza, case) finivano sugli stessi punti; con >40 residenti per punto la piazza era una macchia. Misurato prima della correzione su 5 semi × 3 orari (tutti i nodi stradali): oltre 100 coppie di residenti fermi a meno di 10 px.
- **Correzione** (`urban-life.js`): `spread()` costruisce una volta al giorno il piano di tutti i residenti. Per ogni sosta cerca il primo posto libero (anelli di 15…88 px, controllo di percorribilità e di raggiungibilità; poi nodi stradali vicini; infine il punto più lontano dagli altri), tenendo almeno 15 px dai residenti presenti nello stesso intervallo. Deterministico (ordine dei profili), nessun movimento casuale, nessuna modifica a mappe, collisioni, salvataggi, orari, case o mestieri.
- **Esito misurato**: Node, 5 semi × 3 orari × tutti i nodi: 0 coppie ferme sotto i 10 px. Browser (build reale), 10 semi × mezzogiorno/sera/notte: 0 coppie salvo il seme 555 di sera (2) e il 2024 di sera (2 coppie distinte), dovute a BUG-011. Dialogo con un residente in piazza (`UrbanLife.sites`/`use`) funzionante; console senza errori.
- **Costo**: calcolo del piano una volta al giorno (~50 ms alla prima chiamata in browser, già incluso nel primo accesso alla città); le chiamate successive non cambiano rispetto a prima. Non misurato con la finestra visibile.
- **Test**: `node tests/verifica-integrazione.cjs` ora controlla mezzogiorno, sera e notte (fallisce senza la correzione). Sonda a parte: `node tests/sonda-residenti.cjs [semi] [soglia]` (codice di uscita 1 se trova sovrapposizioni).
- **Non verificato**: aspetto visivo in finestra (solo misure numeriche), comportamento con una popolazione più grande.

### Mega City Overhaul, fase 1

- ✅ `node tests/verifica-integrazione.cjs`. Il test include ora quantità e prezzi dopo il rifornimento all’alba, acquisto, consegna, mancata duplicazione, riserva cittadina e ricaricamento delle scorte.
- ✅ Edge su Windows. Percorsi a piedi con i semi `18420` e `42`, quattro quartieri, sette interni, commissione, mercato, banca, Gilda, fucina e restauro, senza richieste di rete o errori JavaScript.
- ✅ Confronto geometrico per i semi `18420`, `42` e `4294967295`. Edifici, porte, 21 percorsi piazza-servizi e 582.429 verifiche di percorribilità coincidono con la base.
- ✅ Edge. Importati salvataggi nativi v5 di GitHub, v6 locale e v7 di Velaris. Verificati stirpe, posizione, quantità esatte, equipaggiamento usurato e restauro v7.
- ✅ Edge. Campagna fino all’epilogo, quattro boss della campagna, due evoluzioni Goblin, usura e riparazione di una lama importata dalla v5.
- ✅ Edge. Dopo il sonno in locanda il grano passa da 0 a 7 unità e da 7 a 5 Scintille. Acquisto dal pannello e salvataggio confermano 6 unità residue e 1 unità nello zaino.
- ✅ Giorno e notte su Edge a parità di seme, ora e camera. Nel confronto notturno a 1366×768, con quattro tratte fra piazza e mercato in 30 secondi per build, mediana 4,2 ms e 95º percentile 4,3 ms in entrambe le build. Misura relativa locale in Edge headless.
- ✅ Edge. Con effetti disattivati, luci e scena notturna restano leggibili a entrambe le inquadrature. L’acqua e i bagliori restano fissi.
- ✅ `node --check` su tutti i moduli e build indipendente con `python build.py` identica byte per byte.
- 🟡 Il tocco su dispositivo reale resta da provare.

### Integrazione precedente

- ✅ `node tests/verifica-integrazione.cjs`. Usa un Canvas simulato per verificare migrazione v5/v6, quantità esatte, equipaggiamento usurato, soccorso magico, sette interni e restauro persistente.
- ✅ `node --check` sui moduli JavaScript e ricostruzione indipendente con `python build.py`.
- ✅ Edge su Windows. Importati salvataggi prodotti dalle build archiviate v2, v3, v4, v5 precedente, v5 di GitHub, v6 e v7 di Velaris. Verificato anche un caso v1 ricostruito e il caricamento successivo in v7.
- ✅ Edge. Percorsa la campagna fino all’epilogo. Verificati evoluzioni, boss adattivi, cinque minigiochi, soccorso e morte degli NPC, rito e ricompensa unica del Santuario, successione di Nerav e conquista del trono.
- ✅ Edge. Verificati a piedi i collegamenti ai quattro quartieri e ai sette interni. Provati riposo, mercato, banca, fucina, missione della gilda, consegna cittadina e ricaricamento del restauro. Nessuna richiesta di rete durante la prova urbana.
- 🟡 Il collaudo in Edge è stato eseguito localmente. I test del browser restano da integrare nella suite condivisa.

## Revisione tecnica indipendente (Claude, 2026-11-21)

Oggetto: commit `7f182be` e `875ac74` di Codex rispetto al commit iniziale `3f72b69` (30 file, +5759/−1348 righe; 5 nuovi moduli `urban-*.js`, `engine.js` e `panels.js` rimaneggiati). Albero di lavoro pulito prima dell'inizio; `git pull --ff-only` già aggiornato.

**Esito: nessuna regressione bloccante trovata. Nessun codice modificato.** Rilievi da decidere elencati sotto (RISK-006…RISK-010).

Verificato davvero (eseguito da Claude):
- ✅ `node tests/verifica-integrazione.cjs`: passa (~4 s).
- ✅ `node --check` su tutti i `*.js` e sul test: nessun errore. `build.py`: nessun modulo mancante, orfano o duplicato.
- ✅ `python build.py` in cartella temporanea: `Reincarnation.html` **byte-identico** a quello versionato.
- ✅ Browser (pannello integrato, via `http://127.0.0.1`): il gioco si carica, console priva di errori, "Nuova incarnazione", ingresso a Velaris attraverso i tre passaggi, salvataggio e ricaricamento nella città (`Game.save()/load()` OK, v7, ~26 KB).
- ✅ Compatibilità: generato un salvataggio v5 con la build del commit `3f72b69` (partita avanzata 300 passi) e importato nella build corrente: accettato, convertito a v7, oro e livello conservati, round-trip OK.
- ✅ 60 partite con semi diversi (26 stirpi toccate), 500 passi di simulazione ciascuna con attacchi, abilità e schivate, poi export/import e save/load: 0 errori.
- ✅ Prestazioni (misura grezza, pannello nascosto): disegno + simulazione in Velaris e nella Valle con mediane < 1 ms; picco di 80–290 ms solo al primo disegno di una regione (costruzione della cache del terreno). `newGame` ≈ 90 ms nel browser.

Non verificato da Claude (affidato alle dichiarazioni di Codex nel registro sopra): campagna completa fino all'epilogo, cinque minigiochi, boss adattivi in partita reale, mercato/banca/gilda in interfaccia, tocco su dispositivo reale, assenza di richieste di rete. **Evoluzione**: `growth.js` e `tryEvolution` non sono cambiati rispetto a `3f72b69`; un tentativo di forzarla da script non l'ha attivata (richiede comportamento osservato reale), quindi il percorso resta non provato end-to-end in questa revisione. Frame rate reale: non misurabile con il pannello nascosto (le animazioni sono rallentate dal browser).

Analisi del diff (rilievi):
- **RISK-006 (salvataggi) — RISOLTO 2026-11-21 (Claude, su scelta dell'utente)**: `Legendary.validateRegions` prima produceva solo un avviso in console se lo stato del Santuario era incoerente; l'integrazione lo aveva reso causa di rifiuto dell'intero salvataggio. Ripristinato l'avviso (`engine.js`, `parseSave`). Restano rifiutati, di proposito, i v6 privi di una delle sezioni `gear/adaptive/conflicts/legendary/reputation` e i v7 privi di `urban/cityWorks`, e gli stati che `Legendary.restore` giudica invalidi (esempio: `claimed` vero senza vittoria su Nadir). Nota di correzione: nella revisione iniziale avevo citato quest'ultimo caso come prova del rifiuto da `validateRegions`; in realtà lo rifiutava già `restore`. Il caso che `validateRegions` rifiutava è un'incoerenza fra sezioni (conteggio delle vittorie, mostri del Santuario, oggetti), ora coperto da un test (`tests/verifica-integrazione.cjs`). Il test fallisce senza la correzione e passa con essa.
- **RISK-007 (design) — CONFERMATO e DOCUMENTATO 2026-11-21**: i compagni di gilda subiscono danno reale tramite `Conflicts.damageNpc` (prima avevano un minimo di PV) e possono morire in modo permanente se non soccorsi entro la scadenza dello stato critico. L'utente ha scelto di mantenere il comportamento; regola descritta in `GAME_DESIGN.md` §4.9. Nessuna modifica al codice. Resta da valutare in partita il bilanciamento (frequenza con cui i compagni scendono in stato critico), non misurato.
- **RISK-008 (tecnico, bassa)**: `engine.js` e altri moduli hanno perso le guardie `window.X&&…`: ora presuppongono che tutti i moduli siano caricati nell'ordine di `build.py`. Corretto per la build a file singolo, ma il test Node carica i moduli solo fino a `audio.js` e **non copre** `panels.js`, `interface.js` né i pannelli DOM; la parte di interfaccia è verificata solo a mano.
- **RISK-009 (bilanciamento, bassa)**: `hurtMonster` ora chiama sempre `Adaptive.encounter` quando il mostro non è ingaggiato, anche per i colpi dei compagni (canale `'companion'`, ignorato da `seeHit`/`damageFactor`). Può incrementare il contatore di incontri dei boss leggendari (soglia di reazione 4→3) prima del combattimento diretto. Effetto probabilmente trascurabile; da tenere d'occhio.
- **RISK-010 (processo, bassa)**: i commit di Codex e di Claude hanno lo stesso autore Git (identità locale del repository); l'agente si distingue solo dalla riga `Agente:` nel messaggio. Mantenerla sempre.
- Positivo: migrazione v5/v6→v7 con valori predefiniti, ordine dei moduli coerente, test di integrazione mirato e deterministico, servizi urbani riusano i sistemi esistenti (mercato, gilda, fucina) senza duplicare dati, `UrbanWorld.kind` limita il filtro atmosferico ai soli interni (l'esterno di Velaris mantiene il ciclo giorno/notte).

La revisione ha valutato il [piano grafico](PIANO_GRAFICO.md) prima dell’autorizzazione a migliorare la resa nel gioco esistente. Seguono le proposte della revisione. Per luci precalcolate, confronto di prestazioni e opzione effetti, vedi i risultati della fase 1.
1. **Misura di riferimento ripetibile prima di toccare la grafica**: oggi non esiste. Creare un harness (script o parametro di debug) che riproduca un percorso fisso con `Game.step` e misuri il tempo di disegno per fotogramma, in finestra visibile; il criterio "p95 entro +10%" non è verificabile senza la baseline.
2. **Luci come sprite precalcolati**, non gradienti radiali per luce a ogni fotogramma; riusare la cache del terreno e comporre le luci su una superficie a bassa risoluzione.
3. **Coerenza pixel-art**: palette limitata per quartiere/ora, scala intera e `image-rendering: pixelated`, niente interpolazione.
4. **Accessibilità**: rispettare anche `prefers-reduced-motion`; avvisi di combattimento distinguibili per forma/tratteggio oltre che per colore (daltonismo); contrasto HUD a 390×844.
5. **Interni**: oggi senza maschera atmosferica; prevedere una luce propria per interni (finestre/lanterne) nel passo 2.
6. **Personaggi (passo 3)**: 44 stirpi × 2 rami × stadi sono molte sagome; procedere per livelli (contorno/ombra comune → pose per famiglia) invece di ridisegnare ogni sprite.
7. Considerare un **interruttore "grafica nuova/precedente"** in Opzioni per confronto A/B direttamente in gioco, salvato in `localStorage` (non nel salvataggio).

## Come avviare il gioco aggiornato
File: `C:\Users\elaro\Downloads\Reincarnation\Reincarnation.html` (doppio clic, oppure aprirlo in Edge/Chrome). Se il browser blocca qualcosa con `file://`, servirlo con `python -m http.server 8765 --bind 127.0.0.1` dalla cartella del progetto e aprire `http://127.0.0.1:8765/Reincarnation.html`. Ricostruzione: `python build.py Reincarnation.html`. Il salvataggio vive in `localStorage` per origine: aprire il file da `file://` e da `http://127.0.0.1` produce partite separate (usare export/import JSON per spostarle).

## Problemi conosciuti
BUG-011 risolto e unito a `main` (vedi sotto). La revisione del 2026-11-21 ha aggiunto i rilievi RISK-006…RISK-010. Rischi e debiti noti:

| ID | Tipo | Descrizione |
|---|---|---|
| RISK-001 | ~~Debito~~ Risolto 2026-11-21 | Git inizializzato; la cronologia ufficiale è `git log`. |
| RISK-002 | Debito | Il test Node copre percorsi essenziali. I test in browser non hanno ancora un’esecuzione automatica condivisa. |
| RISK-003 | Debito | File molto grandi/densi (`engine.js` ~81 KB in ~1350 righe, `panels.js`, `interface.js`) difficili da modificare in sicurezza. |
| RISK-004 | Design | `World`/`ActorArt`/`EvolutionContent` sono ridefiniti da più moduli: l'ordine in `build.py` è critico. |
| RISK-005 | Contenuto | La prima espansione urbana riguarda Velaris. Le metropoli e gli altri limiti aperti sono elencati in `GAME_DESIGN.md` §7. |
| RISK-006 | ~~Salvataggi~~ Risolto 2026-11-21 | Incoerenze fra sezioni del Santuario ora solo avviso. Restano rifiutate le sezioni strutturali mancanti. |
| RISK-007 | ~~Design~~ Confermato 2026-11-21 | Compagni di gilda mortali se non soccorsi: voluto e documentato. Bilanciamento da verificare in partita. |
| RISK-008 | Debito | Rimosse le guardie `window.X&&`; il test Node non copre `panels.js`/`interface.js`/DOM. |
| RISK-009 | Bilanciamento | `Adaptive.encounter` ora anche per i colpi dei compagni: contatore di incontri dei boss leggendari può salire in anticipo. |
| RISK-010 | Processo | Stesso autore Git per tutti gli agenti: mantenere la riga `Agente:` nei messaggi di commit. |

### BUG-011 ✅ Residenti fermi nel punto di partenza — risolto e unito a `main` (2026-11-21, approvazione dell'utente, commit `fbdba49`)
**Diagnosi** (sonda `tests/sonda-percorsi.cjs`, semi 555, 1, 77, 3, minuti ogni 20, tutti i residenti = 27 072 campioni):
- Riprodotti esattamente i 768 campioni (2,84%) sul commit `c487713`; su `main` (`552a66d`, dopo la distribuzione delle soste) sono 709 (2,62%), 82 tratte distinte.
- Il grafo restituiva sempre un percorso (0 tratte senza percorso): le 82 tratte erano **scartate** da `route()` in `urban-life.js` perché un segmento, controllato a passi di 3 px con raggio 5, entrava nel raggio di un ostacolo. 33 segmenti distinti; il centro del residente non entra mai nell'ostacolo (spazio libero minimo 4,0 px), ma il corpo di raggio 5 lo **sfiorava di 0,03–1,0 px**: è un attraversamento illegale, non un controllo troppo severo.
- Ostacoli sfiorati (tratte): bordo dei ponti/canale 46 (soprattutto ingressi in diagonale ai ponti y=726 e y=1218, es. (984,696)→(996,708) sconfina di 1,0 px; (888,768)→(1020,744) di 0,54 px), spigoli di edifici 32 (es. (1380,1296)→(1260,1272), Casa Nube, 0,1 px), oggetti solidi 4 (fontana/alberi della piazza, 0,05–0,11 px). Collocazione: 63 tratti interni, 16 raccordi iniziali, 3 finali. Strade, ponti, ingressi e collegamenti alle case sono continui: il difetto è solo nel modo di verificare i tratti.
- **Causa**: `path()` in `urban-exterior.js` (ricerca su griglia di 12 px + semplificazione) verificava i tratti solo con campioni ogni 4 px e i passi della griglia solo su estremi e punto medio: un tratto poteva tagliare uno spigolo o l'imbocco del ponte fra due campioni. Inoltre su `main` 75 tratte *accettate* contenevano comunque segmenti illegali che il controllo a 3 px non vedeva (verifica a 0,05 px).
**Correzione** (`urban-exterior.js`, solo navigazione): nuova `segmentClear()` che verifica in modo esatto (analitico) un tratto per un corpo di raggio r con gli stessi criteri di `canWalk` (limiti, canale fuori dai ponti, edifici e oggetti solidi); usata per tutti i tratti del grafo (linea diretta, raccordi, semplificazione) e per ogni passo della griglia, con memoria dei passi già verificati. `canWalk`, mappe, collisioni, movimento del giocatore, routine, salvataggi e la validazione di `urban-life.js` sono invariati; il risultato è deterministico.
**Risultati prima → dopo**: campioni fermi 709/27 072 (2,62%) → **0** (semi 555, 1, 77, 3) e 382/13 536 → 0 (555, 2024); su 3 330 tratte distinte (semi 555, 2024, 1, 77, 3, 19425): senza percorso 116 → **0**, tratte con segmenti illegali (controllo indipendente a 0,05 px) 75 → **0**. Residenti fermi sovrapposti (<10 px, 10 semi × 3 orari): 4 → **0**. Tempo di `path()` (Node, 3 330 chiamate): medio 9,7 → 6,4 ms, p95 24,6 → 16,1 ms, p99 26,9 → 17,8 ms; chiamate >30 ms 4 → 7 (la prima ricerca per città riempie la memoria dei passi, max 63 ms contro 36 ms). Nessun effetto sul disegno.
**Test**: `node tests/verifica-integrazione.cjs` (nuovo caso: 12 case × 8 destinazioni + ponte principale, fallisce su `main`), `node tests/sonda-percorsi.cjs [semi]` (esce con 1 se trova tratte senza percorso; 382 su `main`, 0 sul branch), `tests/sonda-residenti.cjs`, `tests/prova-browser.cjs` (10/10). **Non verificato**: camminata reale dei residenti osservata a schermo per un giorno intero; la traccia di guida del giocatore (`cityTrail`, raggio 6) usa lo stesso `path()` e ora evita gli stessi sfioramenti (verificati solo i percorsi verso i 7 servizi del test).

### UX-003 ✅ Affollamento della Corte dei Soffiatori — risolto
I turni dei Portici si distribuiscono fra quattro destinazioni. Soste e passeggiate usano un’assegnazione deterministica per residente e giorno. Per la misura, vedi *Rifinitura dei quartieri orientali*. Rilevazione originale:
Con le routine per quartiere di Codex (ora su `main`) la piazza delle Quattro Lenti si è svuotata, ma la piazzetta dei Portici del Vetro (Corte dei Soffiatori, circa 2460,489) raccoglie 14–19 residenti entro 120 px a mezzogiorno e alle 19:30 e 8–12 alle 21 (semi 555, 2024, 19425). Non ci sono sovrapposizioni sotto i 10 px: il gruppo è solo fitto. Origine: le passeggiate e i turni del quartiere Portici puntano agli stessi ancoraggi (`arcades-court`/`arcades-work` in `urban-life.js`). Da affrontare nella **rifinitura di Velaris**, con approvazione: ripartire le soste su più punti del quartiere oppure sfasare gli orari. Riproduzione: misura dei residenti entro 120 px con l'harness di `tests/sonda-percorsi.cjs` (`sampleStreet`), oppure `node tests/prova-prestazioni.mjs shot` con la scena `portici12`.

### UX-002 ✅ Illuminazione e atmosfera dei quartieri orientali — risolto
Aggiunte lanterne decorative e atmosfere dedicate sull’impianto di illuminazione esistente. Rilevazione originale:
Dopo l'integrazione le finestre dell'annesso si accendono (corretto), ma nei Portici del Vetro e negli Orti dell'Alambicco mancano le lanterne stradali agli incroci (nei quartieri storici ce n'è una per incrocio) e le atmosfere locali del passo 2 (tinta, polvere, lucciole). Gli Orti di notte risultano molto scuri. Proposta: intervento grafico separato e piccolo, con lanterne agli incroci dell'annesso (stesso oggetto `lamp`, nessuna collisione) e due atmosfere nuove, da approvare e misurare con `tests/prova-prestazioni.mjs`.

### Lavori di Codex non committati (rilevati 2026-11-21 15:20) — recuperati nel branch `claude/integrazione-codex-velaris` e uniti a `main` (`769d231`)
Le cartelle di Codex restano intatte (verificato prima e dopo l'unione) e con le stesse modifiche non committate, come il backup in `C:\Users\elaro\Downloads\Codex-backup-2026-11-21`. Il loro contenuto è ora su `main`: Codex deve ripartire da `main` e non da quei branch. Testo originale:
Nelle cartelle di lavoro di Codex (`C:\Users\elaro\Documents\Codex\...\work\`) ci sono modifiche **non committate** di circa le 14:20: `velaris-city-expansion` (5 file: `urban-exterior.js`, `urban-life.js`, `urban-interiors.js`, `urban-world.js`, `PROGRESS.md`, base `4ca3d8d`) e `velaris-city-verified` (10 file, fra cui `urban-exterior.js`, `urban-life.js`, `panels.js`, `urban-services.js`, `tests/verifica-integrazione.cjs`, `Reincarnation.html`, base `daa1a06`). Claude non le ha toccate. Partono da basi precedenti al passo 2 e a BUG-011: prima di integrarle va fatto un merge attento di `urban-exterior.js` e `urban-life.js` (le modifiche di Codex non toccano `path()`/`canWalk`, ma toccano zone vicine).

### UX-001 🟡 Affollamento serale degli NPC a Velaris — in gran parte risolto su `main` (routine per quartiere di Codex, unite il 2026-11-21): piazza alla sera da 40–49 a 2–12 residenti; la parte restante è la Corte dei Soffiatori, ora UX-003. Descrizione originale:
La sera (circa 19:00–23:00) molti residenti convergono su piazza delle Quattro Lenti e ponte (passeggiata serale/commissioni verso `plaza`), fino a 70+ visibili contemporaneamente in un'area di pochi metri. Le soste sono ora distribuite (≥15 px fra residenti fermi, nessuna sovrapposizione sotto i 10 px), ma gli sprite sono circa 16 px: il gruppo resta fitto e copre il ponte. Non è un errore di rendering né di luce; deriva da `dailyPlan()`/`spread()` in `urban-life.js` e dalla scelta di soste condivise (`plaza` per la passeggiata serale). Possibili vie, da decidere con l'utente (modifica di design, non fatta): aumentare la distanza minima, ripartire la passeggiata serale su più punti (mercato, giardini, ponte, locanda), sfasare gli orari. Riproduzione: `node tests/prova-prestazioni.mjs shot Reincarnation.html` (scena ponte 21:00) oppure aprire Velaris alle 21:00.

Per ogni nuovo bug: aggiungi `BUG-NNN` con passi per riprodurlo, file sospetti e stato.

## Decisioni di design registrate
- Quantità di oggetti e denaro: `BigInt` internamente, decimali in JSON.
- Progressione delle squadre di gilda personale e dei processi lontani: avanza **solo con il gioco attivo**, su intervalli di calendario.
- Un solo file HTML autonomo offline come prodotto finale.
