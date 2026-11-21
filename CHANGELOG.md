# CHANGELOG.md

Cronologia delle modifiche. Voci più recenti in alto. Formato e regole in `AGENTS.md` §6. Ogni voce indica l'agente (`Claude`, `Codex`, `Umano`).

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
