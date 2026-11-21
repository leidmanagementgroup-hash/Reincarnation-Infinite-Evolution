# PROGRESS.md — Stato del progetto

> Ultimo aggiornamento 2026-11-21, Claude, passo 2 del piano grafico unito a `main` (fast-forward).

## In corso
_Nessuna modifica in corso._

## Prossimo passo
0. **Piano grafico**: passi 1 e 2 (luce e vegetazione) completati e uniti a `main` (approvazione dell'utente 2026-11-21; prestazioni: vedi *Prestazioni, verifica finale*). **Passi 3-5 non iniziati: attendono una nuova conferma dell'utente.** Problemi aperti da tenere presenti: **BUG-011** (percorsi scartati, residenti fermi nel punto di partenza) e **UX-001** (affollamento serale degli NPC).
1. Aprire un branch dalla versione corrente di `main` per la **fase 2** del [piano ufficiale](MEGA_CITY_OVERHAUL.md). Estendere il contrasto visivo tra il Mercato dei Venti e i Giardini delle Lanterne e facilitare l’orientamento con segnaletica e mappa. Partire da `urban-exterior.js`, `urban-world.js` e dal [piano grafico](PIANO_GRAFICO.md).
2. ~~Sovrapposizione dei residenti~~ risolta (vedi *Test e verifiche → Residenti di Velaris*, unita a `main`). Restano **BUG-011** e **UX-001** (sotto), da decidere prima di ampliare la popolazione.
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
| Velaris, quattro quartieri, sette interni e servizi interattivi | ✅ | `urban-exterior.js`, `urban-interiors.js`, `urban-world.js`, `urban-services.js`, `urban-life.js` |
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
BUG-011 aperto (vedi sotto). La revisione del 2026-11-21 ha aggiunto i rilievi RISK-006…RISK-010. Rischi e debiti noti:

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

### BUG-011 🐞 Residenti fermi nel punto di partenza (preesistente, scoperto 2026-11-21)
Circa il 2,7% delle tratte (768 su 27 072 campioni su 4 semi, già prima della correzione) non produce un percorso: `route()` in `urban-life.js` scarta la tratta perché un segmento di circa 122 px del grafo `ext.path` non supera il controllo a passi di 3 px con raggio 5 (es. da `house` a `plaza`, da `velaris-building-101` a `forge`). Il residente resta fermo nel punto di partenza e non raggiunge mai la destinazione; occasionalmente si sovrappone a un altro. Non corretto perché richiede di rilassare la validazione o il grafo stradale (`urban-exterior.js`), cioè collisioni/mappe: serve decisione. Passi: `node tests/sonda-residenti.cjs 2024 10` mostra le coppie rimaste.

### UX-001 🟡 Affollamento serale degli NPC a Velaris (aperto, scoperto 2026-11-21)
La sera (circa 19:00–23:00) molti residenti convergono su piazza delle Quattro Lenti e ponte (passeggiata serale/commissioni verso `plaza`), fino a 70+ visibili contemporaneamente in un'area di pochi metri. Le soste sono ora distribuite (≥15 px fra residenti fermi, nessuna sovrapposizione sotto i 10 px), ma gli sprite sono circa 16 px: il gruppo resta fitto e copre il ponte. Non è un errore di rendering né di luce; deriva da `dailyPlan()`/`spread()` in `urban-life.js` e dalla scelta di soste condivise (`plaza` per la passeggiata serale). Possibili vie, da decidere con l'utente (modifica di design, non fatta): aumentare la distanza minima, ripartire la passeggiata serale su più punti (mercato, giardini, ponte, locanda), sfasare gli orari. Riproduzione: `node tests/prova-prestazioni.mjs shot Reincarnation.html` (scena ponte 21:00) oppure aprire Velaris alle 21:00.

Per ogni nuovo bug: aggiungi `BUG-NNN` con passi per riprodurlo, file sospetti e stato.

## Decisioni di design registrate
- Quantità di oggetti e denaro: `BigInt` internamente, decimali in JSON.
- Progressione delle squadre di gilda personale e dei processi lontani: avanza **solo con il gioco attivo**, su intervalli di calendario.
- Un solo file HTML autonomo offline come prodotto finale.
