# PROGRESS.md — Stato del progetto

> Aggiornare **dopo ogni intervento**. Ultimo aggiornamento: 2026-11-21 (Claude, creazione del sistema di documentazione condivisa).

## In corso
_Nessun lavoro in corso._ (Se avvii un intervento lungo, scrivi qui: agente, obiettivo, file toccati.)

## Prossimo passo
1. Nessuna modifica al codice è stata fatta nella sessione di creazione della documentazione.
2. Prima verifica consigliata a chiunque riprenda: eseguire `python build.py` in una cartella temporanea e confrontare con `Reincarnation.html` per accertare che l'HTML consegnato corrisponda ai sorgenti; poi aprire il gioco e controllare la console del browser.
3. Poi scegliere dalla `ROADMAP.md` (priorità *Alta*).

## Versione e stato generale
- Versione documentata: **Aggiornamento 3 · "Vita e mestieri"** (da `LEGGIMI.md`).
- Formato salvataggio: **v5** (migrazione da v1–v4).
- File HTML generato: `Reincarnation.html` (~1,5 MB, modificato 2026-11-21 00:37 insieme a `LEGGIMI.md`).
- Controllo di versione: **Git inizializzato il 2026-11-21** (branch `main`); remoto GitHub privato `Reincarnation-Infinite-Evolution` (vedi `AGENTS.md` §7). Verificato il 2026-11-21: `Reincarnation.html` è byte-identico alla build dei sorgenti correnti; la cartella è più recente di `Reincarnation_backup_2026-11-21` e degli zip in Downloads (gli 8 file di codice aggiornati rispetto al backup sono `engine.js`, `interface.js`, `inventory.js`, `life-panels.js`, `npc-conflicts.js`, `panels.js`, `society.js`, `build.py`).

## Funzionalità implementate
Stato desunto dai moduli presenti e da `LEGGIMI.md`. "✅" = il modulo esiste ed è descritto come funzionante; **non è stata eseguita una verifica in gioco** durante la creazione di questo file.

| Area | Stato | Moduli |
|---|---|---|
| Mondo: Valle di Vela, 5 continenti, 13 aree, Cripta delle Soglie, Fenditura Astrale, Cava delle Braci | ✅ | `world.js`, `expansion-world.js`, `continents.js` |
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
- **Test automatici**: nessuno presente. 🔴
- **Verifica manuale/browser**: non eseguita nella sessione di documentazione. Esito di verifiche precedenti non registrato.
- **Strumenti disponibili in locale** (verificati 2026-11-21): Python 3.13, Node.js 24.
- Come verificare un intervento (procedura minima, vedi `AGENTS.md`): `node --check <file>.js` sui moduli toccati → `python build.py Reincarnation.html` → aprire l'HTML, console senza errori, provare la funzione modificata e il caricamento di un salvataggio esistente.

## Problemi conosciuti
_Nessun bug confermato è stato registrato finora._ Rischi e debiti noti (non bug verificati):

| ID | Tipo | Descrizione |
|---|---|---|
| RISK-001 | ~~Debito~~ Risolto 2026-11-21 | Git inizializzato; la cronologia ufficiale è `git log`. |
| RISK-002 | Debito | Nessun test automatico; regressioni possibili su salvataggi e sistemi accoppiati. |
| RISK-003 | Debito | File molto grandi/densi (`engine.js` ~81 KB in ~1350 righe, `panels.js`, `interface.js`) difficili da modificare in sicurezza. |
| RISK-004 | Design | `World`/`ActorArt`/`EvolutionContent` sono ridefiniti da più moduli: l'ordine in `build.py` è critico. |
| RISK-005 | Contenuto | I limiti di fase elencati in `GAME_DESIGN.md` §7 (banche, prestiti, metropoli, ecc.) non sono implementati. |

Per ogni nuovo bug: aggiungi `BUG-NNN` con passi per riprodurlo, file sospetti e stato.

## Decisioni di design registrate
- Quantità di oggetti e denaro: `BigInt` internamente, decimali in JSON.
- Progressione delle squadre di gilda personale e dei processi lontani: avanza **solo con il gioco attivo**, su intervalli di calendario.
- Un solo file HTML autonomo offline come prodotto finale.
