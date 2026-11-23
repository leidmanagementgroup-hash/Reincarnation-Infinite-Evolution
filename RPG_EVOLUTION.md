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
| 1 | RISK-011 diagnosticato e corretto nella prova; `verifica-esperienza.cjs` (10 scenari) | in corso |
| 2 | Combattimento: memoria d'ingresso, settore reale del colpo, tacche della combo, avvisi dei mostri normali coerenti col colpo | da fare |
| 3 | Evoluzione e abilità: coda dei messaggi, messaggio d'evoluzione con la tecnica, avanzamento verso lo stadio, «pronta dopo lo scontro», soglie dell'innata, barra rapida aggiornata | da fare |
| 4 | Boss: Orveth e Nerav per primi (pestone, carica, radici), poi prisma di Nadir, guardia visibile, reazioni spiegate, disimpegno segnalato, pulizia alla vittoria | da fare |
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

## Benchmark di riferimento (`main` `f2febd1`)
Strumenti: `tests/sonda-sessione.cjs` (nuovo: sessione lunga con combattimento a più nemici, tecniche, schivate e passaggi Valle ↔ Vaelthoria; ogni minuto di gioco misura fotogramma intero, memoria JS, salvataggio, ingresso in regione), `tests/scatti-combattimento.cjs BENCH=1` (mischia e boss con aura, fase 4 C), `tests/scatti-mondo.cjs BENCH=1`. Edge visibile con GPU, stessa macchina e finestra 1280×720.

`sonda-sessione.cjs` su `main` `f2febd1`, 12 minuti di gioco (43 200 fotogrammi):

| Minuti | Fotogramma mediana / p95 / p99 / massimo | > 33 ms | Memoria JS | Salvataggio | Ingresso in regione |
|---|---|---|---|---|---|
| Combattimento (pari) | 0,4 / 1,1–4,7 / 5,8–7,4 / 7,6–29,1 ms | 0 | 10–32 MB | 0,2–0,5 ms | — |
| Esplorazione (dispari) | 0,2–0,3 / 0,6–0,9 / 5,2–5,6 / 6,7–18,1 ms | 0 | 10–32 MB | 0,1–0,5 ms | 77,6 ms la prima volta, poi 1,1–2,7 ms |

Memoria a dente di sega (raccolta dei rifiuti), nessuna crescita costante in 12 minuti; salvataggio da 28 a 44 KB per i registri della partita. Dalla fase 4 C: `drawFX` medio 0,032 ms in mischia e 0,028 ms con il boss in fase II (`scatti-combattimento.cjs BENCH=1`).
