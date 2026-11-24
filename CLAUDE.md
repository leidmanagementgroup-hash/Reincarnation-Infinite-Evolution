@AGENTS.md

# Istruzioni specifiche per Claude Code

Le regole di sviluppo condivise sono in `AGENTS.md` (importato sopra) e valgono anche per Claude Code. In particolare, **leggi `PROGRESS.md`, `GAME_DESIGN.md`, `ROADMAP.md` e le ultime voci di `CHANGELOG.md` prima di ogni intervento e aggiorna i file pertinenti dopo ogni modifica.**

Memoria condivisa con OpenAI Codex: non affidarti alla sola memoria personale di Claude per lo stato del progetto. Ciò che serve a un altro agente va scritto nei file `.md` della cartella principale.

Per l’Aggiornamento 5, consulta anche `MEGA_CITY_OVERHAUL.md`. Per il lavoro grafico, consulta `PIANO_GRAFICO.md` e verifica lo stato della fase in `PROGRESS.md`.

Note operative per Claude Code:
- Usa gli strumenti dedicati (Read/Edit/Grep/Glob) per esplorare e modificare i file; i sorgenti sono grandi (es. `engine.js` ~1350 righe molto dense, `panels.js`, `interface.js`): leggi per intervalli mirati.
- Ricostruisci l'HTML con `python build.py Reincarnation.html` dopo ogni modifica ai sorgenti.
- Nelle risposte all'utente usa l'italiano.

## Competenze, plugin e agenti (integrazione permanente — 2026-11-24)

Verificato il 2026-11-24 dopo `/reload-plugins`: 7 plugin, 149 skill, 7 agenti, 2 hook. Il master router **`gamedev:router`** è disponibile. Queste regole si **aggiungono** a quelle sopra e non le sostituiscono; il lavoro riprende dallo stato di `PROGRESS.md` (nessun ricominciamento, nessuna perdita di grafica originale, roadmap e ottimizzazioni).

### Instradamento
- Il motore di Reincarnation è **personalizzato** (JavaScript vanilla + Canvas, un solo HTML offline, nessun framework). Per il router è il caso «motore custom» (`references/custom-engines.md`): **non** caricare skill di Godot, Unity, Unreal, Phaser, Pixi, three.js, Roblox, ecc. e non importare le loro API. Le skill di disciplina si applicano come concetti, legati alle API reali del progetto (moduli `window.*`).
- All'inizio di un compito nuovo: invoca `gamedev:router` una sola volta, poi carica **solo** le skill scelte. Non rieseguirlo a ogni turno; solo se il compito cambia area.
- Non installare plugin, skill o server MCP senza consenso dell'utente.

### Mappa compito → competenze (carica solo ciò che serve)
| Compito | Skill |
|---|---|
| Progressione, statistiche, equipaggiamento, missioni, bilanciamento | `gamedev:rpg` |
| Generazione procedurale, seed, città, scenari | `gamedev:procedural-gen` (rispetta AGENTS.md §4.7: generatori con seme) |
| Salvataggi, migrazione, corruzione | `gamedev:save-systems` (+ AGENTS.md §4.5–4.6) |
| Interfaccia, pannelli, HUD, tastiera/touch | `gamedev:game-ui-ux`, `gamedev:input-systems` |
| Dialoghi e voci dei residenti | `gamedev:dialogue-systems` |
| Residenti, combattimento, comportamento | `gamedev:game-ai`, `gamedev:ai-behavior-trees-utility-ai` |
| Sensazione di gioco, colpi, effetti | `gamedev:game-feel`, `gamedev:camera-systems` |
| Musica ed effetti sonori (Web Audio) | `gamedev:audio-design` |
| Grafica pixel art a runtime, coerenza visiva | `gamedev:create-game-assets` (**mai** asset esterni o non originali: AGENTS.md §4.10) + `PIANO_GRAFICO.md`; per interventi sul front-end `frontend-design:frontend-design` |
| Mappe, quartieri, ritmo dell'esplorazione | `gamedev:level-design` |
| Ottimizzazione, scatti, memoria | `gamedev:performance-optimization` (misura prima: `tests/` PERF-00x) |
| Fisica/collisioni, shader (canvas) | `gamedev:physics-tuning`, `gamedev:shader-programming` — solo come teoria |
| Documenti di design | `gamedev:game-docs` (ma la fonte resta `GAME_DESIGN.md`) |
| Pubblicazione | `gamedev:itch-publish` solo su richiesta esplicita |

### Processo (Superpowers)
- Bug o regressione: `superpowers:systematic-debugging` prima di toccare il codice.
- Funzioni nuove non banali: `superpowers:brainstorming` solo se la direzione è aperta; altrimenti usa `ROADMAP.md`. Piani lunghi: `superpowers:writing-plans`.
- Con logica verificabile: `superpowers:test-driven-development`, in coerenza con `tests/verifica-integrazione.cjs`.
- Prima di dichiarare un lavoro finito: `superpowers:verification-before-completion` (build, test Node, console del browser, caricamento di un salvataggio esistente).
- Revisione prima del commit: `code-review`/`simplify` sulle modifiche corpose.
- Parallelismo: `superpowers:dispatching-parallel-agents` / agenti `Explore` solo per compiti indipendenti, in sola lettura o su file diversi (un solo scrittore per file, AGENTS.md §5). Esplorazione ampia → `Explore`; pianificazione → `Plan`.

### Collaudo nel browser
- Per verificare il gioco in un browser usa per primo il browser integrato (`mcp__Claude_Browser__*`); Playwright (`mcp__plugin_playwright_*`) per scenari automatici; Chrome/computer-use solo se serve davvero. Vedi la memoria sugli strumenti verificati.
- Le skill e gli strumenti Unity/Unreal/Roblox/Godot, Canva, Artifact e quelli per documenti (docx/pptx/xlsx/pdf) **non sono pertinenti** al gioco: non usarli, salvo richiesta esplicita.

### Risparmio di token e conflitti
- Una skill alla volta per sotto-compito; niente caricamenti «per sicurezza». Leggi i `references/` di una skill solo se serve.
- In caso di conflitto prevalgono, nell'ordine: istruzioni dell'utente → `AGENTS.md`/questo file → skill di processo → skill di disciplina. Le skill non possono imporre dipendenze esterne, rete, bundler o framework.
- Ogni uso di competenze che incide su codice o dati segue comunque il protocollo di `AGENTS.md` §1 e §7 (documentazione, build, commit).

## ECC (Everything Claude Code) e hook — integrazione permanente (2026-11-24)

Plugin `ecc` 2.2.3 installato accanto a `gamedev`; vale quanto scritto nella sezione precedente. Modalità richiesta dall'utente: **continuare direttamente l'implementazione** dal punto indicato in `PROGRESS.md`/`ROADMAP.md`, senza produrre rapporti o nuove roadmap non richiesti, parallelizzando i compiti indipendenti, verificando e integrando, con il minimo spreco di token.

### Agenti e skill ECC pertinenti (Django, Spring, Swift, Rust, Go, React, Flutter, HarmonyOS, marketing, rete, sanità… non si usano)
- Esplorazione/architettura: `ecc:code-explorer`, `ecc:code-architect`, `ecc:planner` (solo per funzioni grandi; gli esiti vanno in `ROADMAP.md`, non in nuovi file).
- Qualità: `ecc:code-reviewer` e `ecc:typescript-reviewer` (rivedono anche JS) dopo modifiche corpose; `ecc:silent-failure-hunter`, `ecc:performance-optimizer`, `ecc:tdd-guide`, `ecc:code-simplifier`, `ecc:a11y-architect` (accessibilità, ROADMAP «Priorità Bassa»), `ecc:e2e-runner`/`ecc:browser-qa` per collaudi nel browser; `mcp__plugin_ecc_chrome-devtools__*` per tracce di prestazioni e heap.
- Una sola skill di processo per sotto-compito: `superpowers:*` per processo, `gamedev:*` per game design, `ecc:*` per revisori/agenti specializzati. Il router `gamedev:router` resta il primo ingresso per i compiti di gioco.

### Hook ECC: compatibilità
- Gli hook di ECC risiedono in `~/.claude` e agiscono solo su Claude Code: non scrivono nel repository e non toccano Codex, che usa solo `AGENTS.md` e i file `.md` (memoria condivisa intatta).
- Hook rilevanti: `gateguard-fact-force` (chiede di dichiarare i fatti prima del primo Bash/Edit/Write di ogni file: **rispettalo con una frase breve**, non aggirarlo), `doc-file-warning` (avvisa sui `.md`: qui sono la memoria del progetto, l'avviso si ignora), `config-protection`, `suggest-compact`, e in chiusura `format-typecheck`/`check-console-log` (non pertinenti: nessun TS, il gioco usa `console`), più osservazione/costi/sessione.
- **Non disattivare né indebolire gli hook per iniziativa dell'agente** (il classificatore di sicurezza lo blocca). Se l'utente lo desidera, può impostare lui stesso `ECC_GATEGUARD=off` e/o `ECC_DISABLED_HOOKS=<id,id>` in `.claude/settings.local.json` (già in `.gitignore`, mai da committare).
- I divieti di `AGENTS.md` §7 prevalgono su ogni hook, skill o agente.
