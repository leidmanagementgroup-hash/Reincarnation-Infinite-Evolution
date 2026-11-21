# CHANGELOG.md

Cronologia delle modifiche. Voci più recenti in alto. Formato e regole in `AGENTS.md` §6. Ogni voce indica l'agente (`Claude`, `Codex`, `Umano`).

## [2026-11-21] Integrazione dell'economia dinamica (Fase 3, due unità) con Velaris rifinita — Claude
Branch `claude/integrazione-economia-fase3` (unito a `main` per fast-forward il 2026-11-21, `07e42e9` → `4763426`, su approvazione dell'utente), da `main` `07e42e9`; merge senza conflitti di `claude/mega-city-fase3-economia` (`26893c5`, intatto). Rapporto dettagliato: `ECONOMIA_FASE3_RAPPORTO.md`.
### Aggiunto
- **`market-flows.js`** (`MarketFlows`): economia aggregata e deterministica a passi di un giorno di calendario. Nove professioni (con pane e pozioni come trasformazioni), consumo e deperimento, otto rotte commerciali con riserva alla partenza, deficit previsto all'arrivo (abitanti e trasformatori) e margine sostenibile, prezzi da scarsità e ricchezza, registro esatto delle merci (BigInt), profili e rotte automatiche per nuove città (`settlementProfile`, `routesFor`).
- `Economy.quote`, `Economy.deliver`, `Economy.procure`, `Economy.flowReport` (con previsione e rotte), `Economy.profiles` (file: `trade-economy.js`). Salvataggio: campo facoltativo `economy.flows` (`schema: 1`); i salvataggi precedenti lo ricevono al giorno corrente, senza recuperi retroattivi.
- Test: `tests/economia-flussi.cjs` (158), `tests/economia-flussi-2.cjs`, `tests/economia-integrazione.cjs`, `tests/analisi-economia.cjs` (diagnosi), `tests/prova-browser-economia.cjs`, fixture in `tests/fixtures/`.
### Modificato
- `trade-economy.js`: con i flussi attivi il vecchio riassortimento fisso (+2 al giorno) non si applica più; il prezzo di base è scalato da scarsità e ricchezza; acquisti, vendite e forniture di Velaris sono flussi esterni del registro. `build.py`: `market-flows.js` prima di `trade-economy.js`. `tests/verifica-integrazione.cjs`: tre asserzioni che codificavano il vecchio +2 fisso ora verificano lo stesso intento. `Reincarnation.html` ricostruito.
### Corretto
- Carenze croniche di grano a Velaris e Calis, eccessi di legno e lana, spedizioni troncate al tetto di 300 con perdita di merce (latente con più di 5 mercati) e previsioni di domanda che ignoravano i trasformatori: vedi `ECONOMIA_FASE3_RAPPORTO.md` §7.1.
### Verifica
- Tutte le prove superate (dettagli in `PROGRESS.md`). Nessun file `urban-*.js`, `panels.js`, `interface.js` modificato. Dopo il merge: test di integrazione, economici, di percorsi e nel browser rieseguiti su `main`, HTML allineato ai sorgenti, stato remoto verificato. Problemi aperti: ECO-001, ECO-002, ECO-003 e **PERF-001 (prioritario, intervento separato)**.

## [2026-11-21] Rifinitura dei quartieri orientali di Velaris — Codex

Commit della rifinitura `b0d570b`.

### Aggiunto
- Diciotto lanterne sulle vie orientali e lungo l’accesso alla Serra delle Talee. Riflessi freddi nei Portici del Vetro, luce verde e lucciole ambrate negli Orti dell’Alambicco. Le luci riusano la cache e il limite di otto aloni visibili (file `urban-exterior.js`).

### Modificato
- Turni, soste e passeggiate dei Portici distribuiti fra la Corte dei Soffiatori, la Loggia delle Vetrerie, il Passaggio delle Vetrate e il Crocevia dei Carrettieri (file `urban-life.js`, `urban-exterior.js`).
- Esteso il test delle luci ai due quartieri orientali. Ricostruito `Reincarnation.html` e aggiornati `PROGRESS.md`, `ROADMAP.md`, `GAME_DESIGN.md` e `LEGGIMI.md`.

## [2026-11-21] Integrazione del lavoro di Codex: quartieri orientali, Serra delle Talee, tipi di insediamento — Claude
Unito a `main` per fast-forward su approvazione dell'utente (`16b6129` → `769d231`, branch `claude/integrazione-codex-velaris`). Dopo l'unione: test di integrazione, sonde dei percorsi e dei residenti (0 bloccati, 0 tratte illegali, 0 sovrapposizioni), prove nel browser 10/10 e 12/12, build identica ai sorgenti; cartelle di Codex e backup intatti. Fonte: `velaris-city-verified` di Codex (backup in `Downloads/Codex-backup-2026-11-21`).
### Aggiunto (lavoro di Codex)
- Mappa di Velaris 2144 → 2864 px con **Portici del Vetro** e **Orti dell'Alambicco** (130–135 edifici secondo il seme, 32 nei quartieri nuovi), strade, piazzette, oggetti e cache del terreno separata; minimappa estesa (file: `urban-exterior.js`).
- **Serra delle Talee**, ottavo interno: semina, irrigazione, 80 minuti, raccolta di due erbe; campo di salvataggio facoltativo `cityWorks.seedbedAt` (v7 invariata) (file: `urban-interiors.js`, `urban-services.js`, `urban-world.js`, `panels.js`).
- `UrbanWorld.settlementTypes` (borgo, villaggio, cittadina, grande città, capitale); Velaris è una cittadina (file: `urban-world.js`, `panels.js`).
- Routine per quartiere: case nel quartiere del lavoro, passeggiata serale verso la piazza del proprio quartiere (UX-001 in gran parte risolto) (file: `urban-life.js`).
### Corretto (integrazione)
- Conflitti con il passo 2 risolti tenendo entrambe le parti; atmosfere del passo 2 limitate ai quartieri storici; finestre notturne degli edifici orientali (file: `urban-exterior.js`).
- `tests/prova-prestazioni.mjs` chiude tutti i processi di Edge della prova e accetta scene per luogo e ora (anche tramonto).
### Aggiunto (prove)
- `tests/prova-browser-velaris-est.cjs` (camminata nei nuovi quartieri, serra completa, vecchio salvataggio, errori JS); test di integrazione di Codex per serra e sei quartieri.
### Verifica
- Tutte le prove superate; prestazioni invariate nei quartieri storici e uguali o inferiori nei nuovi (dettagli in `PROGRESS.md`). Restano UX-002 (notte dei quartieri orientali) e UX-003 (Corte dei Soffiatori affollata), da affrontare nella rifinitura di Velaris.

## [2026-11-21] BUG-011: percorsi dei residenti di Velaris senza sfioramenti — Claude
Unito a `main` per fast-forward su approvazione dell'utente (commit `fbdba49`). Dopo l'unione: test di integrazione, sonde dei percorsi e dei residenti (0 e 0), prova nel browser 10/10, build identica.
### Corretto
- `path()` verificava i tratti a campioni ogni 4 px e accettava segmenti che sfioravano di 0,03–1,0 px ponti, spigoli di edifici e oggetti solidi; `urban-life.js` li scartava e il residente restava fermo. Nuova verifica esatta `segmentClear()` per tutti i tratti e i passi della griglia, con memoria dei passi (file: `urban-exterior.js`). Residenti fermi: 709/27 072 (2,62%) → 0; tratte senza percorso 116 → 0 e tratte con segmenti illegali 75 → 0 su 3 330 (6 semi, inclusi 555 e 2024); sovrapposizioni 4 → 0.
### Aggiunto
- Caso di regressione in `tests/verifica-integrazione.cjs` e sonda `tests/sonda-percorsi.cjs`.
### Modificato
- `Reincarnation.html` ricostruito. Nessuna modifica a mappe, collisioni, salvataggi, movimento del giocatore o routine.

## [2026-11-21] Prova nel browser con Playwright — Claude
### Aggiunto
- `tests/prova-browser.cjs`: 10 prove nel browser (avvio, Atlante, «Segna Velaris», ingresso a Velaris, menu, salvataggi, nessun errore JS) con `playwright-core` esterno al progetto. Nessun codice del gioco modificato, nessuna dipendenza aggiunta.

## [2026-11-21] Valutazione di plugin e skill — Claude
### Documentazione
- Registrata in `ROADMAP.md` la ricerca di plugin/skill per il Mega City Overhaul (nulla installato, nessun codice toccato).

## [2026-11-21] Passo 2 del piano grafico: luce e vegetazione di Velaris — Claude
Unito a `main` per fast-forward su approvazione dell'utente (ultimo commit del passo: `1f77511`). BUG-011 e UX-001 (affollamento serale) restano documentati in `PROGRESS.md`.
### Aggiunto
- Luce dal calendario: ombre a terra di edifici e alberi con direzione e lunghezza legate all'ora; lanterne, cristalli e fucine come sorgenti con sprite precalcolati (tre toni), **al massimo otto luci attive**; finestre accese di sera con quota che cala a notte fonda (decalcomanie senza gradienti).
- Cristalli luminosi (9, solo decorazione, senza collisione) con bagliori turchesi e scintille.
- Riflessi dei lumi sul canale e riflessi d'acqua che passano da verde-azzurro a rosa al tramonto e blu di notte.
- Alberi con chiome oscillanti e foglie che cadono; stendardi che sventolano.
- Atmosfere: Mercato dei Venti caldo e polveroso, Giardini delle Lanterne freschi e verdi con lucciole di sera (file: `urban-exterior.js`).
- Movimento ridotto: tutte le animazioni nuove si fermano con l'opzione effetti spenta **oppure** con `prefers-reduced-motion`, mantenendo luci e contrasto; anche il fuoco degli interni (file: `urban-exterior.js`, `urban-interiors.js`).
- Test: disegno diurno e notturno con e senza movimento ridotto, tetto di otto luci (file: `tests/verifica-integrazione.cjs`).
### Verifica
- Verifica finale su Edge con finestra visibile e GPU (driver CDP, 3 ripetizioni alternate da 30 s su 4 scene, stress ×16, profilatore): nessun calo di fluidità; sovracosto del branch localizzato in alberi e cristalli e rimosso con sprite precalcolati (resa invariata: ≤12 pixel su 129 600, 1 livello di colore); sotto stress da −42% a 0% rispetto a `main` (dettagli in `PROGRESS.md`).
- Browser: movimento, dialogo, interno, salvataggio/ricarica, disegno notturno con effetti di combattimento, 2400 passi in valle senza errori.
### Aggiunto (verifica finale)
- `tests/prova-prestazioni.mjs` e `tests/prova-prestazioni-pagina.js`: prova di prestazioni con Edge a finestra visibile (rAF reale, stress, profilatore, screenshot).
### Modificato (verifica finale)
- Alberi e cristalli come sprite precalcolati (`propSprite`) in `urban-exterior.js`; `Reincarnation.html` ricostruito.
### Non modificato
- BUG-011, collisioni, mappe, salvataggi, meccaniche e disegno degli avvisi di combattimento (`Game.drawFX` resta dopo lo strato di luce della città).

## [2026-11-21] Residenti di Velaris: soste distribuite — Claude
### Corretto
- I residenti non si sovrappongono più nelle soste: `spread()` assegna a ogni sosta del giorno un posto libero (≥15 px dagli altri presenti nello stesso intervallo), in modo deterministico e senza toccare orari, case, mestieri, mappe, collisioni o salvataggi (file: `urban-life.js`).
### Aggiunto
- Test di regressione a mezzogiorno, sera e notte in `tests/verifica-integrazione.cjs` e sonda multi-seme `tests/sonda-residenti.cjs`.
### Modificato
- `Reincarnation.html` ricostruito. Prima: oltre 100 coppie ferme <10 px su 5 semi; dopo: 0 (Node) e 0 salvo BUG-011 (browser, 10 semi). Documentato BUG-011 in `PROGRESS.md`. Branch `claude/fix-residenti-sovrapposti`.

## [2026-11-21] Approvazione del piano grafico, passi 1-2 — Claude
### Documentazione
- Registrata l'approvazione dell'utente per i passi 1 e 2 del piano grafico, con le condizioni della revisione. Verificato il passo 1: test Node OK, build identica, confronto visivo giorno/notte della piazza di Velaris in browser. Nessun codice modificato.

## [2026-11-21] Compagni di gilda mortali: decisione confermata (RISK-007) — Claude
### Documentazione
- Su scelta dell'utente il comportamento resta com'è: i compagni di gilda possono morire in modo permanente se non soccorsi. Regola in `GAME_DESIGN.md` §4.9; `PROGRESS.md` e `ROADMAP.md` aggiornati. Nessun codice modificato.

## [2026-11-21] Piazza, ponte e mercato di Velaris — Codex

Commit della fase `84c1ff4`. Integrata anche la correzione del Santuario `3ec9819` con i relativi test.

### Aggiunto
- Piazza delle Quattro Lenti con intarsi in pietra e rame, ponte con parapetti e lanterne a prisma, riflessi del canale, accesso al Mercato dei Venti e locanda con copertura in rame (file `urban-exterior.js`).
- L’ora del calendario regola le luci di Velaris. L’opzione effetti ridotti ferma il movimento di acqua e bagliori (file `urban-exterior.js`).
- I mestieri e le consegne della città riforniscono il mercato di Velaris, con effetto su disponibilità e prezzi (file `urban-life.js`, `trade-economy.js`, `economy-panel.js`).

### Verifica
- Esteso il test a consegne, prezzi, riserve, ricaricamento del mercato e mancanza di duplicazioni. Ricostruito `Reincarnation.html` (file `tests/verifica-integrazione.cjs`, `Reincarnation.html`).

### Documentazione
- Aggiunto il [piano ufficiale Mega City Overhaul](MEGA_CITY_OVERHAUL.md). Collegati fasi, criteri di verifica e consegne al resto della memoria condivisa (file `ROADMAP.md`, `PROGRESS.md`, `AGENTS.md`, `CLAUDE.md`, `PIANO_GRAFICO.md`, `GAME_DESIGN.md`, `LEGGIMI.md`).

## [2026-11-21] Salvataggi: il Santuario incoerente non fa più perdere la partita (RISK-006) — Claude
### Corretto
- `parseSave` torna a segnalare con un avviso in console l'incoerenza rilevata da `Legendary.validateRegions` invece di rifiutare il salvataggio (file: `engine.js`). Le sezioni strutturali mancanti restano motivo di rifiuto.
### Aggiunto
- Test di regressione: salvataggio con vittorie incoerenti caricabile con avviso; salvataggio senza `urban` rifiutato (file: `tests/verifica-integrazione.cjs`).
### Modificato
- `Reincarnation.html` ricostruito. Verifiche: `node tests/verifica-integrazione.cjs` OK (il nuovo caso fallisce senza la correzione), `node --check engine.js`, build ripetuta identica.

## [2026-11-21] Revisione tecnica indipendente dell'integrazione di Velaris — Claude
### Documentazione
- Revisione dei commit `7f182be` e `875ac74` di Codex: test e build ripetuti, compatibilità v5→v7 provata, fuzz di 60 partite, controllo in browser. Nessuna regressione bloccante. Rilievi RISK-006…RISK-010, valutazione e proposte per il piano grafico e istruzioni di avvio in `PROGRESS.md`; `ROADMAP.md` aggiornata.
- **Nessun file del videogioco modificato**; `Reincarnation.html` ricostruito identico (nessun cambiamento da committare nel file). Commit della revisione: vedi `git log`.

## [2026-11-21] Versione integrata e città di Velaris — Codex

Commit di integrazione `7f182be`.

### Aggiunto
- Collegata Velaris alla Selva degli Alambicchi. Quattro quartieri, sette interni, residenti, commissioni, mappa e restauro persistente (file `urban-exterior.js`, `urban-interiors.js`, `urban-world.js`, `urban-services.js`, `urban-life.js`).
- Riutilizzati mercato, deposito, riparazione, fucina e incarichi della Gilda nei servizi della città (file `trade-economy.js`, `gear.js`, `guild.js`, `tradecraft.js`, `daily-life.js`).

### Modificato
- Integrate le versioni v5 di GitHub e v6 locale. Restano disponibili soccorso magico, memoriale di Nerea, durabilità, scontri e Santuario. Il formato v7 legge i salvataggi precedenti e aggiunge lo stato urbano (file `engine.js`, `build.py`, `calendar.js`, `inventory.js`, `life-panels.js`, `society.js`, `world-life.js`, `reputation.js`).
- Ricostruito `Reincarnation.html` e aggiunta la verifica automatica senza dipendenze (`tests/verifica-integrazione.cjs`).

### Corretto
- Orientamento nei quartieri e interazioni secondarie degli interni. Conservate le indicazioni e i pannelli di reputazione, Santuario ed equipaggiamento (file `panels.js`, `interface.js`, `urban-exterior.js`, `urban-world.js`, `urban-services.js`).

### Documentazione
- Allineate regole, guida, stato, roadmap e architettura. Presentato il [piano grafico da approvare](PIANO_GRAFICO.md).

## [2026-11-21] Git e GitHub — Claude
### Aggiunto
- Repository Git (`main`) e `.gitignore` (segreti, impostazioni locali degli assistenti, zip, backup, salvataggi).
- Scansione di credenziali/dati personali sui file versionati: nessuna trovata.
### Documentazione
- `AGENTS.md` §7: protocollo Git/GitHub condiviso da Claude Code e Codex (pull a inizio sessione, commit per intervento, hash nel changelog, divieti). `PROGRESS.md` aggiornato. Nessun file del videogioco modificato.

## [2026-11-21] Sistema di documentazione e memoria condivisa — Claude
### Documentazione
- Creati `AGENTS.md` (regole condivise, protocollo leggi-prima/aggiorna-dopo), `CLAUDE.md` (importa `@AGENTS.md`; nessuna istruzione preesistente da conservare, il file non esisteva), `GAME_DESIGN.md`, `PROGRESS.md`, `ROADMAP.md`, `CHANGELOG.md`.
- **Nessun file del videogioco è stato modificato** (sorgenti `*.js`, `template.html`, `style.css`, `build.py`, `cover.webp`, `Reincarnation.html`, `LEGGIMI.md` invariati).

## [2026-11-21 e precedenti] Stato ereditato — Aggiornamento 3 "Vita e mestieri"
Cronologia dettagliata non disponibile (nessun Git, nessun registro precedente). Dai timestamp dei file: moduli creati/aggiornati tra il 2026-11-20 e il 2026-11-21; ultime modifiche a `engine.js`, `interface.js`, `panels.js`, `inventory.js`, `life-panels.js`, `npc-conflicts.js`, `society.js` (2026-11-21 00:27–00:33), `build.py` (00:33), `Reincarnation.html` e `LEGGIMI.md` (00:37). Il contenuto di quello stato è descritto in `PROGRESS.md` e `LEGGIMI.md`.
