# Piano tecnico: collegare `world-sim.js` a `engine.js` (PERF-005, fase 1) e chiudere RISK-012

> Preparato il 2026-11-24 (Claude, branch `claude/perf-005`) con un'analisi in **sola lettura** di `engine.js`, `build.py`,
> `npc-conflicts.js`, `society.js`, `world-sim.js`, `world-lod.js` e delle modifiche non committate di Codex nel worktree
> `integrazione-urban-scale` (base `b92caef`). **Non è ancora applicato**: `engine.js` e `build.py` restano intatti finché
> Codex non integra Confluenza (decisione dell'utente). Legenda: **[F]** verificato nel codice (righe di `main` `c11c5f5`,
> identiche su `claude/perf-005`); **[D]** dato dai documenti, non rieseguito; **[I]** ipotesi da confermare con una prova.

## 0. Punto di partenza
- [F] Su `claude/perf-005` `engine.js` e `build.py` sono identici a `main`; `world-sim.js` e `world-lod.js` non sono in
  `MODULES` e nessun modulo del gioco usa `s.world`.
- [F] Due orologi: `Calendar.timestamp = 480 + 0,8·s.time + offset` (`calendar.js` 91–94); `offset` cresce solo con
  `Calendar.advance(s.calendar, elapsed − dt)` (`engine.js` 1133). In `interface.js` 431–436 `dt = min(.05, elapsed)` e al
  primo fotogramma dopo una pausa `activeElapsed = dt`; con un pannello aperto o la scheda nascosta `Game.step` non è
  chiamato e **si fermano entrambi gli orologi**. Il sonno fa avanzare `s.time` (754), non `offset`.

## 1. Funzioni da modificare in `engine.js`
Tre aiutanti interni fra `resetTransient` (205–209) e `newGame` (210), lontano dalle righe toccate da Codex:
- `const worldSim = window.WorldSim && window.WorldSimOff !== true ? window.WorldSim : null;` (interruttore letto al caricamento).
- `worldNow = st => Math.floor(Calendar.timestamp(st.calendar, st.time) + 1e-7)`: minuti interi con lo stesso arrotondamento
  di `calendar.js` 97, 101, 135 [I: senza `+1e-7` la sveglia delle 06:00 può cadere appena prima del confine].
- `worldFrame()` → `tick(s, now, {budgetMs: 1})`; `worldSettle()` → `tick(s, now, {budgetMs: Infinity})` (mai compresso);
  `worldResolveAll()` → `resolveAll(s, now)`. Tutti escono subito se `!worldSim || !s?.world` e sono in `try/catch` con un
  solo `console.warn`: `WorldSim` non può mai fermare `step` (lancia solo per una chiamata rientrante [F]).

| Funzione (righe) | Cosa cambia |
|---|---|
| `newGame` 210–245 | dopo 242 e prima di `save()` (244): `if(worldSim) s.world = worldSim.create(worldNow(s));` (`s.calendar` esiste dalla 226) |
| `parseSave` 1434–1537 | dopo 1534 e prima di 1535: `if(worldSim) d.world = worldSim.restore(d.world, worldNow(d));` senza mai restituire `null` |
| `exportSave` 1408 | **nessuna modifica** [F]: `JSON.stringify(s)` include `s.world` (solo interi e `null`), anche con l'`urbanLab` di Codex |
| `activate` 1538–1543 | dopo 1541 e prima di `resetTransient`: `worldResolveAll()` (copre `load` e `importSave`) |
| `step` 1130–1199 | `worldFrame()` dopo il blocco dell'impulso (1185) e prima di `Conflicts.tick` (1186), a ogni fotogramma (a vuoto ≈ 0,2 µs [D]) |
| `sleep` 748–765 | `worldResolveAll()` dopo `Economy.tick` (755) e prima dei Conflitti (756) |
| `changeRegion` 305–314 | dopo il controllo `id===s.region` (306) e prima di `setWorld` (308): `worldSettle()` (chiamata da `arrive` e `recover`) |

**Livelli e caricamento progressivo** (passo C6, facoltativo): `lod = WorldLod.create(WorldLod.places(World), s.region)`
transitorio (i livelli sono una funzione pura, non si salvano), creato in `newGame` e `activate`; in `changeRegion` dopo 312
`WorldLod.travel(lod, places, id, {resolve: worldSettle, promote, demote})`. Caricatore: `prepare` dei luoghi di livello 2 in
`arrive`, `work(…, 0.5)` in `step` dopo `worldFrame`, `ensure` in `changeRegion` prima di `setWorld` come ripiego sincrono.

## 2. Dipendenze e ordine di inizializzazione
- [F] `world-sim.js` non dipende da nulla (`performance` facoltativo). Posizione in `MODULES` (`build.py` riga 14):
  `… "lineage.js", "world-renown.js", "world-sim.js", "world-lod.js", "living-economy.js", "world-population.js",
  "urban-services.js", "urban-life.js", "engine.js", …` — tutti prima di `engine.js`, che legge `window.WorldSim` al caricamento.
- `living-economy` si registra prima di `world-population` (stesso livello 3: a parità di intervallo vince l'ordine di
  registrazione [F]). Le registrazioni avvengono prima di `newGame`/`load`. `world-lod.js` richiede `World.regions` [F].
- [I] Per le fasi successive: un modulo-facciata (`world-systems.js`, prima di `engine.js`) che registra i sistemi e crea e
  ripristina i loro campi, così `engine.js` (file conteso, RISK-003) non va più toccato.

## 3. Ciclo di gioco
- `WorldSim` riceve minuti di calendario interi; `s.time` resta l'orologio del giocatore, del combattimento e dei sistemi
  esistenti (Life 1,15 s, Society 65 s, Build 125 s, Conflitti 1,05 s [F]).
- **Deriva** (fotogrammi oltre 50 ms): il calendario avanza di `elapsed`, `s.time` al massimo di 0,05 s; i sistemi di
  `WorldSim` vedono i minuti in più (come oggi l'Economia sui giorni di calendario), `tick` non comprime e smaltisce il ritardo
  a 1 ms per fotogramma (misurabile con `WorldSim.lag`).
- **Budget** 1 ms per fotogramma (criterio p95 ≤ 8 ms, massimo ≤ 16,7 ms); il budget si controlla dopo ogni intervallo, quindi
  ogni `resolve` deve essere breve. **Pausa**: nulla da fare, entrambi gli orologi si fermano e `save()` salva anche `s.world`.
  **Caricamento**: a gioco chiuso il calendario non scorre; `resolveAll` recupera solo il ritardo rimasto al salvataggio.

## 4. Compatibilità dei salvataggi
- [F] `version = 7`, chiave `reincarnation.lumora.save.v7` e `saveKeys` invariati; `s.world` facoltativo. Salvataggi senza
  `world`: mondo nuovo con origine al caricamento, senza storia retroattiva. Dati danneggiati: scartati campo per campo, mai
  rifiutati (un JSON illeggibile resta rifiutato come oggi).
- [F] **Build vecchia con un salvataggio che contiene `world`**: `parseSave` valida i campi noti e restituisce lo stesso
  oggetto, senza cancellare i campi sconosciuti; `world` viene **ignorato e conservato intatto, ma fermo**.
- **Ritorno alla build nuova**: `restore` conserva i minuti ≤ adesso e `resolveAll` copre il periodo giocato con la vecchia.
  Regola per i sistemi futuri: ogni `resolve` è idempotente rispetto a un marcatore nel proprio stato (es. ultima settimana
  risolta), così non si applica mai due volte lo stesso intervallo.
- Prove da adattare: `tests/verifica-perf-004.cjs` (confronto del salvataggio con `main`: aggiungere `delete d.world`);
  `verifica-salvataggi-incrociati` dovrebbe passare in entrambi i sensi [I].

## 5. RISK-012 (nel sonno i borghi si aggiornano prima della ripetizione degli impulsi dei conflitti)
**Causa** [F]: `sleep` chiama `Society.tick(s)` (755) con `s.time` già alla sveglia; un abitante di frost-pass cambia borgo
al blocco 10 (`society.js` 206–208); poi `Conflicts.tick` (756) ripete gli impulsi `k·1,05` leggendo
`s.society.people[*].region` (`candidates` 304–311) già cambiato. Nel tempo vissuto `Society.tick` scatta nell'impulso di
Life (1172) ogni 1,15 s. Il legame è anche inverso: `Society.tick` legge `Conflicts.canInteract` (204).
**Perché `WorldSim` da solo non basta** [F]: i passi sono minuti interi del calendario, mentre la griglia dei conflitti
(1,05 s) e i blocchi di Society (65 s) sono su `s.time`; portarli sul calendario cambierebbe le cadenze (bilanciamento) e i
salvataggi (`soc.pulse`, `conflicts.pulse`).
**Proposta minima (consigliata)**: Society avanza all'istante di ogni impulso dei conflitti.
1. `npc-conflicts.js`, ciclo degli impulsi: dopo `s.time=k*PULSE;` e prima di `pulse(...)`, `helpers.beforePulse?.(s);`
   (`state.pulse` è già registrato prima: un guasto non fa ripetere l'impulso).
2. `engine.js`: passare `beforePulse: st => Society.tick(st)` ai `helpers` di `Conflicts.tick` in `step` (1186) e in `sleep`
   (756); togliere `Society.tick(s)` dall'impulso (1172) e dal sonno (755).
Effetto atteso [I fino alla prova]: Society cambia stato al primo impulso ≥ 65·b vivendo, dormendo e a ogni frequenza di
fotogrammi; `Society.tick` è in forma chiusa e idempotente nel blocco, quindi scorte, livelli e accordo restano quelli di oggi;
la cadenza vissuta passa da 1,15 a 1,05 s. Residuo: `Build.tick` nel sonno resta prima della ripetizione (i conflitti lo
leggono solo per la casa del partner di notte); se serve, stesso aggancio.
**Prova (scritta prima del codice)**: in `tests/verifica-continuita.cjs` la prova 12 (mondo appena creato, calendario saltato
alle 21:00 come nella sonda, notte vissuta contro dormita: conflitti lontani identici; oggi deve fallire con 5 differenze a
frost-pass) e la prova 13 (stessa notte a 1/60 e a 1/20 s). Mutazioni: togliere `beforePulse`, rimettere `Society.tick`
prima dei Conflitti nel sonno. `sonda-continuita`: «conflitti delle regioni lontane» da DIVERSO a uguale.

## 6. Possibili conflitti con Codex
[F] `codex/integrazione-urban-scale` (HEAD `b92caef`, merge-base con `main` `7488642`): modifiche a `engine.js` (+13/−4:
chiave e `saveKeys` 132–133, `exportSave` 1408, firma di `parseSave` e controllo `urbanLab` 1434–1438, `savedCandidate`
1544–1549), `build.py` (riga 10 `urban-sector-layout.js`, ciclo di `build()`), documenti, `Reincarnation.html`,
`tests/verifica-calis.cjs`, nuovo `tests/prova-browser-isolamento-salvataggi.cjs`.

| Zona | Questo piano | Codex | Esito atteso [I] |
|---|---|---|---|
| `engine.js` 132–133 | — | chiave e `saveKeys` | pulito |
| 205–245 aiutanti, `newGame` | +4 / +1 | — | pulito |
| 305–314 `changeRegion` | +1 (C2), +1 (C6) | — | pulito |
| 748–765 `sleep` | −1 e +1, aggancio (C4) | — | pulito |
| 1130–1199 `step` | +1, −1, aggancio (C4) | — | pulito |
| 1408 `exportSave` | nessuna | riscrive | pulito |
| 1434–1438 / 1531–1535 `parseSave` | +1 in fondo | inizio funzione | pulito (≈ 95 righe di distanza) |
| 1538–1543 `activate` | +1 dopo 1541 | `savedCandidate` 1546 | pulito ma vicino: non toccare 1543–1549 |
| `build.py` | + moduli in riga 14 | riga 10 e `build()` | pulito |
| `Reincarnation.html` | rigenerato | rigenerato | conflitto certo: **rigenerare**, mai unire a mano |
| documenti | voci nuove | voci nuove | da conciliare |

**Ordine consigliato**: (1) Codex committa e integra `main`, l'utente unisce; (2) `claude/perf-005` fa `git merge main`
(senza rebase: il branch è pubblicato); (3) si applicano C1–C6 sull'`engine.js` definitivo. Se Codex tarda e l'utente lo
chiede: C1–C6 su `perf-005` toccando solo le zone della tabella, poi unione simulata in un worktree temporaneo
(`perf-005` + `main` + Codex) con la serie completa sulla build unita; mai modificare i file di Codex.

## 7. Rollback
- Ogni passo è un commit separato; si annulla con `git revert <hash>` (mai `reset --hard` né `push --force`). C4 (RISK-012)
  e C2 (collegamento) sono indipendenti: annullare prima C4, poi C2; dopo un'unione su `main`, stessi `revert` su `main`.
- **Interruttore**: togliere i moduli da `MODULES` (`engine.js` gestisce l'assenza di `window.WorldSim`) oppure
  `window.WorldSimOff = true` prima di `engine.js`; spento, nessun `create`/`restore`/`tick` e `s.world` passa intatto.
- Salvataggi della build nuova riaperti con la vecchia: accettati, `world` conservato intatto (§4). C4 non cambia schemi.
  Prova: `node tests/verifica-salvataggi-incrociati.cjs ../Reincarnation .`.

## 8. Commit, prove e criteri di accettazione
| Passo | Contenuto |
|---|---|
| C0 | prerequisito: lavoro in ombra committato (fatto su `claude/perf-005`); Codex integra (§6) |
| C1 `test:` | `tests/verifica-collegamento-mondo.cjs` scritta prima e vista fallire: `s.world` dopo `newGame`; esportazione → importazione; `world` mancante, `null`, `'x'`, `{schema:2}` o con minuti assurdi accettato; vecchi salvataggi (`tests/fixtures/*.json`); sistema sonda con intervalli identici fra notte vissuta e dormita; budget con orologio finto; `changeRegion` che risolve prima di `setWorld`; interruttore spento; **prova di identità** (stessa partita con interruttore acceso e spento → `exportSave` identici tolto `world`); mutazioni |
| C2 `feat:` | `build.py` e `engine.js` §1 (senza C6); `delete d.world` in `verifica-perf-004`; HTML ricostruito; tabelle dei moduli in `LEGGIMI.md` e `GAME_DESIGN.md`; campo `s.world` nel formato dei salvataggi; documenti |
| C3 `docs:` | hash di C2 |
| C4 `fix:` | RISK-012 (§5): prove 12–13 prima; `npc-conflicts.js` (1 riga), `engine.js` (755, 756, 1172, 1186); RISK-012 chiuso |
| C5 `docs:` | hash di C4 |
| C6 `feat:` | facoltativo: `WorldLod` e caricatore con gestori vuoti; prova di identità di C1 |

**Prove a ogni passo** (dopo `python build.py Reincarnation.html`): Node — `verifica-collegamento-mondo`, `verifica-world-sim`,
`verifica-world-lod`, `verifica-integrazione`, `verifica-continuita`, `sonda-continuita`, `verifica-tempo-mondo`,
`verifica-perf-002/003/004` (`--expose-gc`, riferimento `../Reincarnation`), `verifica-salvataggi-incrociati`,
`verifica-esperienza/avvisi/memoria/mestieri/richieste/stirpi/voci/revisione-lw/calis/filoni`, `economia-integrazione`,
`economia-flussi`, `economia-flussi-2`, `verifica-popolazione` e `verifica-economia-viva` (in ombra, invariate), `banco-lod`.
Edge — `prova-browser`, `-interfaccia`, `-scenario`, `-progressione`, `-combattimento`, `-famiglie`, `-memoria`, `-voci`,
`-velaris-est`, `-mondo`, `-interni`, poi `-economia`, `-creature`, `-santuario`, `-stirpi`, `-richieste`, `-mestieri`,
`-cava`, `-calis`, `-calis-lw`, `-filoni`, `-gilda-lw`; `banco-popolazione.cjs <main.html> <branch.html>`; a mano: salvataggio
di `main` caricato nella build nuova, sonno dal pannello N, console senza errori.
**Criteri**: C2 — identità con interruttore acceso e spento; `sonda-continuita` e `verifica-continuita` invariate; salvataggi
v7 invariati, vecchi e danneggiati mai rifiutati, incrociati 2/2; costo per fotogramma ≤ 1 ms (a vuoto ≈ 0,2 µs); in Edge p95 e
massimo invariati entro il rumore e console pulita. C4 — prove 12–13 e mutazioni; «conflitti delle regioni lontane» uguale;
nessuna regressione; RISK-012 chiuso con l'hash. Sempre: nessuna unione su `main` senza l'autorizzazione dell'utente.
