@AGENTS.md

# Istruzioni specifiche per Claude Code

Le regole di sviluppo condivise sono in `AGENTS.md` (importato sopra) e valgono anche per Claude Code. In particolare, **leggi `PROGRESS.md`, `GAME_DESIGN.md`, `ROADMAP.md` e le ultime voci di `CHANGELOG.md` prima di ogni intervento e aggiorna i file pertinenti dopo ogni modifica.**

Memoria condivisa con OpenAI Codex: non affidarti alla sola memoria personale di Claude per lo stato del progetto. Ciò che serve a un altro agente va scritto nei file `.md` della cartella principale.

Per il lavoro grafico, consulta `PIANO_GRAFICO.md` e verifica lo stato dell’approvazione in `PROGRESS.md`.

Note operative per Claude Code:
- Usa gli strumenti dedicati (Read/Edit/Grep/Glob) per esplorare e modificare i file; i sorgenti sono grandi (es. `engine.js` ~1350 righe molto dense, `panels.js`, `interface.js`): leggi per intervalli mirati.
- Ricostruisci l'HTML con `python build.py Reincarnation.html` dopo ogni modifica ai sorgenti.
- Nelle risposte all'utente usa l'italiano.
