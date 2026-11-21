# CHANGELOG.md

Cronologia delle modifiche. Voci più recenti in alto. Formato e regole in `AGENTS.md` §6. Ogni voce indica l'agente (`Claude`, `Codex`, `Umano`).

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
