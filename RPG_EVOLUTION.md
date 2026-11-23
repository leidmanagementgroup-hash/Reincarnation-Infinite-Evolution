# Operazione RPG Evolution — gameplay e qualità

Piano e registro dell'operazione «RPG Evolution» (richiesta dell'utente del 2026-11-22). Branch `claude/rpg-evolution`, worktree `C:\Users\elaro\Downloads\Reincarnation-rpg-evolution`, base `main` `f2febd1` (verificato sul remoto). Nessuna modifica a `main`, nessun merge senza consenso.

Vincoli permanenti di questa operazione:
- Conservare PERF-001 e PERF-002; non toccare `urban-life.js` (PERF-003 resta separato).
- Non modificare il lavoro di Codex sul Generatore Urbano: `urban-districts.js`, `filoni-sprites.js`, la logica del generatore, le planimetrie del Piazzale degli Argani, i cinque interni dei Filoni, l'assegnazione degli edifici, i worktree degli altri agenti. Il branch `codex/generatore-urbano-filoni` tocca anche poche righe di `interface.js` (`atmosphere`), `panels.js` (pannello equipaggiamento), `daily-life.js` (`restPlace`), `gear.js`, `trade-economy.js`, `tradecraft.js`, `urban-world.js`, `build.py`: le modifiche di questa operazione stanno lontane da quelle righe.
- Morte e rinascita: rinascita all'ultima Statua della Rinascita con specie, livello, forma e abilità conservati; gli NPC possono morire definitivamente. Regole invariate.
- Bilanciamento, rarità delle specie, requisiti di evoluzione e logica delle Armi Divine invariati salvo ragione verificata e documentata.

## Incremento 0 — Rapporto tecnico iniziale

Analisi del codice reale (`main` `f2febd1`), in parte con tre revisori in sola lettura con perimetri distinti (evoluzione e abilità; boss e incontri; interfaccia ed esplorazione) e il combattimento seguito direttamente. Dove non c'è stata una prova in partita è scritto.

### Matrice

| Area | Funzionalità | Stato | Evidenza | Intervento proposto | File | Rischio | Test |
|---|---|---|---|---|---|---|---|
| Combattimento | Attacco base a combo (3 colpi entro 1,25 s, terzo ×1,25), tecniche, schivata con invulnerabilità, fusioni | presente e funzionante | `engine.js` `basicAttack`, `registerStrike`, `action('dash')` | conservare le regole | — | — | `verifica-esperienza` 2, 3, 5 |
| Combattimento | Reattività: un tasto premuto durante la ricarica va perso | difetto confermato | `interface.js` keydown → `Game.action` una volta sola, nessuna memoria d'ingresso | memoria d'ingresso di ~0,2 s solo per ricariche quasi finite (non per mana o rifiuti), nell'interfaccia | `interface.js` | basso: le ricariche restano quelle del motore | prova browser: tasto premuto 0,1 s prima della fine della ricarica |
| Combattimento | Chiarezza della portata: l'arco disegnato è al 66–86% della portata reale e copre un angolo diverso dal cono che colpisce (±84°/±101°/±110°, 360° per il pestone finale) | difetto confermato (leggibilità) | `engine.js` `arc()` (cono `dx*vx+dy*vy>width`, portata `reach`) contro `drawEffect`/`combat-fx.js` (raggio `reach*.86`) | disegnare il settore reale per un istante, tenue | `engine.js` (dato visivo), `combat-fx.js` | basso, solo disegno | griglia di punti: colpito ⇔ dentro il settore |
| Combattimento | Combo: nessun segnale del colpo in corso e della finestra di 1,25 s | presente ma incompleta | `engine.js` `combo`, `comboUntil` non esposti | indicatore discreto (tre tacche) vicino al personaggio | `engine.js` `view`, `combat-fx.js` | basso | prova browser |
| Combattimento | Critici | non esistono come meccanica; il «colpo forte» visivo è il terzo colpo (fase 4 C) | `engine.js` | nessuna nuova meccanica senza decisione dell'utente | — | — | — |
| Combattimento | Avvisi dei mostri normali (pestone della guardia: avviso a 25 px, colpo entro 25+5) | presente ma incompleta | `engine.js` `burstEnemy` `stomp`, `drawFX` | un solo raggio per avviso e colpo | `engine.js` | basso | griglia «colpito ⇒ dentro l'avviso» |
| Evoluzione | Requisiti visibili ma senza avanzamento (es. «scontri 2/3») | presente ma incompleta | `growth.js:374-407`, `panels.js:529-539` | esporre soglie e contatori, solo lettura | `growth.js`, `panels.js` | basso | pannello V |
| Evoluzione | Evoluzione bloccata in silenzio durante un boss | presente ma incompleta | `engine.js:265`, `evolveReady` mai mostrato | «Pronta: avverrà a fine scontro» | `panels.js`, `interface.js` | basso | `verifica-esperienza` 4 + pannello |
| Evoluzione | La nuova tecnica dell'evoluzione non è nominata | presente ma incompleta | `engine.js:271-276` | messaggio con nome e tasto | `engine.js` | basso | prova |
| Evoluzione | Sprite, ritratto e stadio coerenti | presente e funzionante | `spriteForm`, `appearance`, `combat-fx`, `panels.js:555` | — | — | — | `prova-browser-creature` |
| Evoluzione | Forme 3–4 delle stirpi originali e Umano/Nano con sprite presi in prestito | presente ma incompleta | `expansion-art.js:540-557`, `continental-species.js` | sprite dedicati col metodo della fase 4 B (incrementi successivi) | `creature-art.js` | basso | `scatti-creature` |
| Evoluzione | Innata: soglie (ramo a 5 usi, livello ogni 4, risonanza a 15) non mostrate | presente ma incompleta | `growth.js:257,299-323`, `panels.js:316-323` | contatori nel pannello | `growth.js`, `panels.js` | basso | pannello K |
| Interfaccia | Messaggi a comparsa: uno solo, il successivo cancella il precedente (livello, talento, evoluzione, oggetti del boss si coprono) | difetto confermato | `interface.js:38`; `engine.js` `kill`/`gainXp`/`announce` | coda breve (max 3–4, ~2,4 s, senza duplicati) | `interface.js` | basso | prova browser con messaggi nello stesso fotogramma |
| Interfaccia | Barra rapida: dopo la tecnica evoluta il nome resta quello vecchio | difetto confermato | `interface.js:290` firma `barSig` | aggiungere i gradi alla firma | `interface.js` | basso | prova |
| Interfaccia | Bisogni (fame, sete, energia, temperatura) penalizzano attacco/difesa/velocità e possono uccidere, ma sono visibili solo nel pannello N | informazione nascosta | `daily-life.js:76-81`, `engine.js` passo giornaliero | indicatore nell'HUD sotto soglia, senza cambiare le regole | `interface.js`, `template.html`, `style.css` | basso | console + screenshot |
| Interfaccia | Suggerimenti per il principiante | assenti | nessun sistema | consigli «prima volta» disattivabili (stessa opzione della guida), memorizzati in `localStorage` separato dal salvataggio | `interface.js` | basso | prova browser |
| Interfaccia | Trappola del fuoco dei pannelli salta i `summary`; schede senza `aria-current`; marcatori che oscillano anche col movimento ridotto | difetti confermati (minori) | `interface.js:199`, `panels.js:31`, `interface.js:350`, `engine.js:1173` | correzioni puntuali | `interface.js`, `panels.js`, `engine.js` | basso | prova da tastiera |
| Boss | Fasi, cicli, adattamento ai comportamenti ripetuti, stabilità degli scontri lunghi | presente e funzionante | `engine.js:879-888,1043-1048`, `adaptive-combat.js:37-53` | tempi e danni invariati | — | — | prove Santuario e Fenditura |
| Boss | Avviso del pestone più piccolo del colpo (Nerav: 25 px contro 49; Orveth: ellisse alta 0,7, ~18 px non segnalati) | difetto confermato | `engine.js:1280-1281` contro `928-929` | un raggio unico, cerchio pieno | `engine.js` | basso, solo disegno | griglia |
| Boss | Linea della carica 55 px, corsa reale ~72 px + 22 di raggio | difetto confermato | `engine.js:1283` contro `923,1023` | lunghezza = velocità × durata + raggio | `engine.js` | basso | griglia |
| Boss | Radici, frantumi, costellazioni e riposizionamenti con lo stesso anellino; ventaglio del prisma di Nadir senza avviso | presente ma incompleta | `engine.js:1280-1287`, `975` | corsie dei proiettili e simboli distinti | `engine.js` | basso | screenshot per pattern |
| Boss | Reazioni adattive spiegate solo con «cosa fa», guardia (mischia ×0,84 per 1,9 s) invisibile, ritorno a vita piena del boss senza messaggio | presente ma incompleta | `engine.js:889,985,1019-1021` | causa nel messaggio, indicatore di guardia, avviso di disimpegno | `engine.js`, `combat-fx.js` | basso | prova |
| Boss | Vittoria su Nadir e Nerav: proiettili e aree restano attivi | difetto confermato (minore) | `engine.js:417-423` | stessa pulizia degli altri boss, ricompense intatte | `engine.js` | medio-basso: non toccare `legendary.js` | prova Santuario |
| Qualità | RISK-011: prova di Velaris intermittente | **diagnosticato (incremento 1)** | vedi sotto | prova resa deterministica | `tests/prova-browser-velaris-est.cjs` | — | 11 esecuzioni |
| Qualità | Prove automatiche: mancavano assegnazione della stirpe, crescita, maestria, evoluzione reale, attacchi nemici e schivata, Orveth, morte e rinascita alla statua, minigiochi dei mestieri, passaggio del tempo | presente ma incompleta | elenco delle prove esistenti | `tests/verifica-esperienza.cjs` (incremento 1) | `tests/` | — | — |
| Documentazione | `GAME_DESIGN.md` §4.2 dice che i parametri d'evoluzione sono in `rules`, ma `evolutionLevel`/`evolutionEssence`/`ascension*` non sono usati: i valori reali sono in `growth.js:376` | difetto confermato (documentazione) | `engine.js:6-11` | correggere il testo, non il codice | `GAME_DESIGN.md` | — | — |
| Dati | Biologia di Umano e Scheletro in `ContinentalBiology` oscurata da `growth.js` | da decidere | `continental-species.js:32,34`, `growth.js:49-53` | **non toccato**: cambierebbe predisposizioni e attacco naturale (bilanciamento) | — | — | — |

### Mappa dei rischi

| Rischio | Dove | Mitigazione |
|---|---|---|
| Conflitti con il branch di Codex | `interface.js`, `panels.js`, `daily-life.js`, `build.py` | righe diverse, modifiche piccole; nessuna modifica a `daily-life.js`; ordine dei moduli in `build.py` invariato |
| Salvataggi | `engine.js` `parseSave`/`validateRegionState` | nessun nuovo campo nel salvataggio; preferenze nuove in chiavi `localStorage` separate |
| Bilanciamento | combattimento, boss, evoluzione | solo disegno e informazioni; tempi, danni, ricariche e requisiti invariati; prove «stessa logica con e senza modifica» dove possibile |
| Prestazioni | `combat-fx.js`, `drawFX`, interfaccia | benchmark prima/dopo con `scatti-combattimento.cjs BENCH=1` e `sonda-sessione.cjs` |
| File grandi e densi | `engine.js` | modifiche mirate con sostituzioni esatte e controllo dei conteggi |

### Piano degli incrementi

| Incremento | Contenuto | Stato |
|---|---|---|
| 0 | Rapporto, matrice, rischi, benchmark di riferimento, sonda di sessione lunga | ✅ |
| 1 | RISK-011 diagnosticato e corretto nella prova; `verifica-esperienza.cjs` (10 scenari) | ✅ |
| 2 | Combattimento: memoria d'ingresso, settore reale del colpo, tacche della combo, avvisi coerenti col colpo (pestone, maglio, contrattacco, carica) | ✅ |
| 3 | Evoluzione e abilità: coda dei messaggi, messaggio d'evoluzione con la tecnica, avanzamento verso lo stadio, «pronta dopo lo scontro», soglie dell'innata, barra rapida aggiornata | ✅ |
| 4 | Boss: Orveth e Nerav per primi (pestone, carica, radici), poi prisma di Nadir, guardia visibile, reazioni spiegate, disimpegno segnalato, pulizia alla vittoria | ✅ (pestone e carica nell'incremento 2) |
| 5 | Interfaccia ed esplorazione: bisogni nell'HUD, consigli «prima volta» disattivabili, fuoco dei pannelli, schede ARIA, movimento ridotto dei marcatori | da fare |
| 6 | Revisione incrociata, regressioni complete, benchmark finali | da fare |

## Incremento 1 — RISK-011 e prove critiche

### RISK-011: diagnosi verificabile
- **Riprodotto**: 1 fallimento su 12 esecuzioni (`A piedi fino agli Orti dell'Alambicco` → `{"ok":false,"why":"nessun percorso"}`).
- **Escluso** con sonde deterministiche: velocità del personaggio variabile con l'ora (87–99), punto d'arrivo del cammino precedente (49 punti distinti), stanchezza e sete: 268 combinazioni, percorso sempre presente.
- **Causa**: la prova creava ogni partita con **seme casuale** («Nuova incarnazione» dopo aver svuotato i salvataggi), ma la meta degli Orti era una **coordinata fissa** (2516,1260). La pianta di Velaris dipende dal seme: su 200 semi, in 15 (7,5%) in quel punto sorge un edificio e non esiste alcun percorso. È un **difetto della prova**, non del gioco: le soste della città (`arcades-court`, `orchards-court` e le altre cinque soste orientali) sono percorribili e collegate con tutti i 200 semi.
- **Correzione**: seme fisso (`SEED`, predefinito 19425) e mete prese dalla pianta (`__stop('orchards-court')`). Tempi d'attesa invariati, nessuna ripetizione automatica.
- **Verifica**: 8/8 esecuzioni col seme predefinito e 3/3 con semi che prima fallivano (1161830751, 1549107668, 922480359).
- **Residuo noto**: la prova usa ancora il ciclo di disegno reale fra un passaggio e l'altro, quindi l'ora di gioco (e la durata dei cammini, 7,4–9,5 s) varia con la macchina; non incide più sugli esiti perché le mete sono valide per ogni seme.

### Nuova prova `tests/verifica-esperienza.cjs`
Motore reale in Node, numeri casuali con seme, salvataggi in memoria. Dieci scenari con esiti controllati: assegnazione della stirpe secondo i pesi (1000 nascite, ogni stirpe raggiungibile, anche la mitica); crescita di livello con vitalità e mana pieni; maestria della tecnica di stirpe; evoluzione bloccata durante un boss e completata subito dopo con forma e tecnica nuove; lupo che ferisce e schivata che evita il colpo; Orveth con fase II al 50% e vittoria con Corona e missione avanzata; morte e rinascita all'ultima statua con specie, livello, forma e abilità conservati e perdita di Scintille entro le regole; minigioco della forgia che termina e registra il tentativo senza perdere materiali; passaggio del tempo (giorno e bisogni); salvataggio della partita avanzata. Durante la scrittura tre «errori» si sono rivelati stati impossibili creati dalla prova (casa di un mostro spostata, stadio di campagna forzato): il validatore dei salvataggi li rifiuta correttamente; la prova ora usa solo vie di gioco reali.

## Incremento 2 — Combattimento

**Memoria d'ingresso** (`interface.js`): un comando (attacco, schivata, tecniche, innata) premuto negli ultimi 0,2 s di ricarica parte appena la ricarica finisce invece di andare perso; non vale per mana insufficiente o altri rifiuti; ricariche e tempi restano quelli del motore. **Settore reale del colpo** (`combat-fx.js`, dati `reach` e `cone` sull'effetto dell'arco in `engine.js`): per un istante, tenue, la portata e il cono che il motore usa davvero (prima l'arco era al 66–86% della portata e con un angolo diverso). **Tacche della combo**: tre punti ai piedi del personaggio, pieni per i colpi messi a segno, il terzo pulsa quando arriva il colpo forte; spariscono con la finestra di 1,25 s. **Avvisi uguali al colpo** (`engine.js`): pestone (prima un'ellisse più piccola; per i boss diversi da Orveth il raggio dei mostri normali), maglio e contrattacco (3–4 px più piccoli) ora disegnano esattamente l'area che colpisce; la carica ha una corsia lunga quanto la corsa reale e larga quanto il contatto (prima una linea di 55 px). Misure condivise fra colpo e avviso (`stompRadius`, `hammerRadius`, `dashTime`, `dashSpeedOf`, `dashReach`) con gli stessi valori di prima: danni, tempi e ricariche invariati.

Verifiche: build `2a1fe847…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 4/4, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico (contro il `main` attuale differiscono solo le regioni dei Filoni aggiunte da Codex). Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6. `scatti-combattimento` PRIMA (`main` `f2febd1`) / DOPO: stato di gioco identico in tutte le 16 scene. Benchmark in Edge visibile (3 giri × 600 fotogrammi): mischia fotogramma medio 0,93 → 0,92 ms e `drawFX` 0,043 → 0,044 ms; boss con aura fotogramma 0,59 → 0,73 ms e `drawFX` 0,033 → 0,048 ms (+0,015 ms per settore e tacche); `sonda-sessione` 12 minuti come prima (p95 fino a 4,8 ms, memoria 9–30 MB senza crescita), con un solo fotogramma oltre 33 ms (35,5 ms nel primo minuto, all'avvio; su `main` il massimo del primo minuto era 29,1 ms).

## Incremento 3 — Evoluzione e abilità

**Coda dei messaggi** (`interface.js`): prima un messaggio cancellava il precedente nello stesso istante (livello, talento, evoluzione, oggetti del boss si coprivano); ora si vedono in fila, al massimo tre in attesa, senza doppioni, con precedenza ai messaggi di progressione. **Evoluzione annunciata per intero** (`engine.js`): «Evoluzione · forma · Nuova tecnica · nome · tasto N» (o «assegnala con K»); l'avviso in basso dice «Nuova forma · nome · V». **Avanzamento verso lo stadio** (pannello V, `panels.js`; contatori di sola lettura in `growth.js`): sotto la condizione, «Basta una di queste vie» con scontri x/3, pratiche x/5 e le due vie insieme x/3 (dal livello 3); al secondo stadio Kharun sconfitto, mestiere migliore al grado g/4, pratiche x/32. **Evoluzione in attesa**: con i requisiti completi e un boss ingaggiato il pannello dice «Pronta: avverrà alla fine dello scontro» (prima il blocco era silenzioso). **Soglie dell'innata** (pannello K): utilizzi efficaci, ramo a 5 utilizzi, prossima maestria ogni 4, risonanza dai 15 con i talenti in armonia. **Barra rapida**: si aggiorna quando una tecnica evolve alla maestria 4 (prima restava il nome vecchio). Requisiti, soglie, rarità e bilanciamento invariati.

Verifiche: build `b780f181…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 4/4, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico. Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7. Scatti PRIMA/DOPO dei pannelli V (primo e secondo stadio) e K. `sonda-sessione` 6 minuti in Edge visibile: fotogramma mediana 0,2–0,5 ms, p95 fino a 4,7 ms, nessun fotogramma oltre 33 ms, memoria 9–20 MB, salvataggio 0,2–0,4 ms, primo ingresso in Vaelthoria 65,8 ms (come prima).

## Incremento 4 — Boss e incontri

**Corsie dei proiettili** (`engine.js`): radici, frantumi, costellazioni, schegge, forgia, tiri e il ventaglio del prisma di Nadir mostrano durante il preavviso una corsia tratteggiata con la freccia per ogni proiettile, nelle direzioni in cui partirà (prima un anellino uguale per tutti; il ventaglio del prisma non era segnalato). Lancio e avviso usano le stesse funzioni d'angolo (`fanAngles`, `spreadAngles`, `volleyAngles`) con gli stessi numeri di prima. **Riposizionamenti** (schivata laterale, cambio di linea): frecce laterali o all'indietro invece dell'anellino. **Guardia adattiva visibile**: ellisse tratteggiata azzurra e scudo sul nemico finché i colpi ravvicinati sono ridotti (×0,84 per 1,9 s; `Adaptive.guardLeft`, sola lettura). **Reazioni spiegate**: oltre all'etichetta, un messaggio dice perché il nemico reagisce e come rispondere (es. «ha letto i tuoi colpi ravvicinati · esci dal cerchio o cambia ritmo»). **Disimpegno segnalato**: se ci si allontana e il boss torna a vita piena, un messaggio lo dice. **Vittoria su Nadir e Nerav**: come per gli altri boss, i loro proiettili e le aree non feriscono più dopo la vittoria; ricompense, `legendary.js`, trono e Armi Divine invariati. Preavvisi, danni, fasi e soglie adattive invariati.

Verifiche: build `8dafb966…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico. Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7 (vittoria su Nadir), interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7. `scatti-combattimento` PRIMA (`main` `f2febd1`) / DOPO: stato di gioco identico in tutte le 19 scene. Benchmark in Edge visibile (3 giri × 600 fotogrammi): mischia fotogramma medio 0,77 → 0,83 ms, `drawFX` 0,036 → 0,039 ms; boss con aura 0,47 → 0,56 ms, `drawFX` 0,028 → 0,040 ms; `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 fino a 4,4 ms, nessun fotogramma oltre 33 ms, memoria 9–25 MB.

Non verificato in partita: la pulizia alla vittoria su Nadir e Nerav (solo lettura del codice e `prova-browser-santuario`, che vince contro Nadir senza errori); il contrasto delle corsie della forgia sul pavimento della Cava è leggibile ma basso.

## Benchmark di riferimento (`main` `f2febd1`)
Strumenti: `tests/sonda-sessione.cjs` (nuovo: sessione lunga con combattimento a più nemici, tecniche, schivate e passaggi Valle ↔ Vaelthoria; ogni minuto di gioco misura fotogramma intero, memoria JS, salvataggio, ingresso in regione), `tests/scatti-combattimento.cjs BENCH=1` (mischia e boss con aura, fase 4 C), `tests/scatti-mondo.cjs BENCH=1`. Edge visibile con GPU, stessa macchina e finestra 1280×720.

`sonda-sessione.cjs` su `main` `f2febd1`, 12 minuti di gioco (43 200 fotogrammi):

| Minuti | Fotogramma mediana / p95 / p99 / massimo | > 33 ms | Memoria JS | Salvataggio | Ingresso in regione |
|---|---|---|---|---|---|
| Combattimento (pari) | 0,4 / 1,1–4,7 / 5,8–7,4 / 7,6–29,1 ms | 0 | 10–32 MB | 0,2–0,5 ms | — |
| Esplorazione (dispari) | 0,2–0,3 / 0,6–0,9 / 5,2–5,6 / 6,7–18,1 ms | 0 | 10–32 MB | 0,1–0,5 ms | 77,6 ms la prima volta, poi 1,1–2,7 ms |

Memoria a dente di sega (raccolta dei rifiuti), nessuna crescita costante in 12 minuti; salvataggio da 28 a 44 KB per i registri della partita. Dalla fase 4 C: `drawFX` medio 0,032 ms in mischia e 0,028 ms con il boss in fase II (`scatti-combattimento.cjs BENCH=1`).
