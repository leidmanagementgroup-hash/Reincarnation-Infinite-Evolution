# ROADMAP.md — Sviluppi futuri

> Aggiornare quando un obiettivo è completato (spostarlo in `CHANGELOG.md`/`PROGRESS.md`), cambia priorità o ne emergono di nuovi. Le voci con ★ derivano dai limiti dichiarati in `LEGGIMI.md`. L’Aggiornamento 5 segue il piano ufficiale indicato sotto.

## Priorità Alta — Fondamenta del lavoro a più agenti
- [x] **Verificare la build integrata** e registrare l’esito in `PROGRESS.md`.
- [x] **Controllo di versione**: Git + GitHub privato configurati (2026-11-21).
- [x] **Controllo automatico dell’integrazione** con `node tests/verifica-integrazione.cjs`.
- [ ] Ampliare la suite condivisa con casi per i minigiochi e l’intera campagna, e configurarne l’esecuzione automatica.

## Esiti della revisione 2026-11-21

- [x] RISK-006: lo stato incoerente del Santuario ora produce un avviso invece del rifiuto del salvataggio (2026-11-21).
- [x] RISK-007: morte permanente dei compagni di gilda confermata e documentata in `GAME_DESIGN.md` §4.9 (2026-11-21).
- [x] UX-001: affollamento serale ridotto dalle routine per quartiere di Codex (unite a `main` il 2026-11-21).
- [x] Integrazione del lavoro di Codex (quartieri orientali, Serra delle Talee, tipi di insediamento) unita a `main` (2026-11-21, `769d231`).
- [x] **Rifinitura di Velaris.** UX-002 (lanterne e atmosfere dei quartieri orientali) e UX-003 (soste e turni distribuiti nei Portici).
- [x] **Economia urbana, Fase 3 (due unità)**: flussi di produzione, consumo, rotte e prezzi, registro delle merci, API per negozi futuri, profili per nuove città. Unita a `main` il 2026-11-21 (`4763426`).
- [ ] Economia, passi successivi (da approvare): lista dinamica dei mercati in `Economy` (ECO-002), interfaccia di tendenze e merci in viaggio (ECO-003), mestieri dei residenti collegati a `MarketFlows.activity`, profondità dei mercati per dimensione (ECO-001), eventi e leggi come modificatori di `traits`/`routes` (Fase 4).
- [x] **PERF-001**: `path()` medio da 5,9 a 0,78 ms e p95 da 21 a 2 ms, percorsi identici (unito a `main` il 2026-11-21, `a1e4c54`).
- [ ] PERF-002: distribuire su più fotogrammi la pianificazione dei residenti al cambio di giorno (55–63 ms in un fotogramma, una volta per giorno di gioco).
- [ ] **Fase successiva —** Generatore Procedurale Urbano 2.0: generalizzare lotti, vie, confini e oggetti dell'annesso (oggi a coordinate fisse) partendo da `settlementTypes`, cache per settori e routine per quartiere.
- [x] BUG-011: risolto e unito a `main` (2026-11-21).
- [ ] Verificare in partita il bilanciamento dei danni ai compagni (quanto spesso scendono in stato critico).
- [x] Prima prova nel browser con Playwright: `tests/prova-browser.cjs` (menu principali, Atlante, Segna Velaris, salvataggi). Da estendere a combattimento, minigiochi e interni.
- [ ] Estendere il test Node a `panels.js`/`interface.js` con un DOM minimo, e aggiungere casi per evoluzione, boss adattivi e minigiochi. Il mercato di Velaris è già coperto.
- [x] Prova di prestazioni a finestra visibile condivisa: `tests/prova-prestazioni.mjs` (2026-11-21). Resta da integrarla in un'esecuzione automatica.

## Priorità di sviluppo — Aggiornamento 5

- [Piano ufficiale Mega City Overhaul](MEGA_CITY_OVERHAUL.md), con requisiti, fasi, criteri di verifica e passaggio di consegne fra modelli.
- [x] **Fase 0.** Verificare l’integrazione v5/v6 e la base urbana di Velaris.
- [x] Residenti sovrapposti nella piazza di Velaris: soste distribuite (branch `claude/fix-residenti-sovrapposti`). BUG-011 risolto a parte.
- [x] **Passo 2 del piano grafico** (luce e vegetazione): completato e unito a `main` (2026-11-21). I passi 3-5 restano da approvare.
- [x] **Fase 1.** Prima porzione grafica di Velaris fra piazza, ponte e mercato, secondo il [piano artistico e tecnico](PIANO_GRAFICO.md).
- [ ] **Fase 2.** Estendere l’identità dei quartieri, vegetazione, orientamento e varietà degli interni.
- [ ] **Fase 3.** Estendere routine, produzione ed economia urbana. Il primo flusso di merci collega mestieri e commissioni al mercato di Velaris.
- [ ] **Fase 4.** Allacciare eventi al calendario, reputazione, quest e leggi locali.
- [ ] **Fase 5.** Applicare la struttura urbana ad altri insediamenti, con luoghi unici e capitali nei cinque continenti.

## World Art Overhaul

- [Piano artistico e tecnico dei cinque continenti](WORLD_ART_OVERHAUL.md), con standard di scala, composizione, materiali e illuminazione e criteri di verifica per regione.
- [x] Pilota della Selva degli Alambicchi verificato sul branch `codex/world-art-myrathen`, con confronto in Edge.
- [ ] Rivedere il pilota prima del merge.
- [x] Stesse regole estese alle otto regioni continentali, alla luce notturna del mondo aperto (anche Valle di Vela) e alla Cripta: branch `claude/world-art-overhaul` (Claude), unito a `main` il 2026-11-22 (`ad6daa4`).
- [x] ART-001: lavoro non committato di Codex copiato e verificato, confrontato con `main` file per file e recuperato dove aggiunge qualcosa (branch `claude/world-art-cava-fenditura`, Claude, 2026-11-22).
- [x] Cava delle Braci e Fenditura Astrale: profondità, lava, isole sospese, luce notturna (branch `claude/world-art-cava-fenditura`, unito a `main` il 2026-11-22, `8da2400`).
- [ ] Santuario della Marea Muta, varchi e pilastri dei monumenti per bioma, interni di Velaris.
- [ ] Collegare materiali, vegetazione e famiglie architettoniche ai profili del Generatore Procedurale Urbano 2.0.

## Priorità Media — Contenuti ★
- [x] ★ **Primo ampliamento di Velaris** con quattro quartieri, sette interni e servizi integrati.
- [ ] ★ **Altre città, metropoli e relazioni politiche fra regni** su vasta scala.
- [ ] ★ **Banca avanzata**: prestiti, trasferimenti fra conti, fondazione di banche.
- [ ] ★ **Imprese** oltre le botteghe esistenti.
- [ ] ★ **Grimori scrivibili** e gestione di accademie da parte del giocatore.
- [ ] ★ **Dungeon** con nuove planimetrie procedurali e gestione di guardiani. Il Santuario attuale consente la conquista del trono.
- [ ] ★ **Leggi locali** con crimini e taglie. Le reputazioni distinte sono già presenti.
- [ ] Ampliare la Cripta delle Soglie e il numero di aree per continente.

## Priorità Bassa — Qualità e rifinitura
- [ ] Bilanciamento di economia, difficoltà dei boss e velocità di evoluzione (richiede sessioni di gioco e dati).
- [ ] Revisione accessibilità (contrasto, navigazione da tastiera nei pannelli, lettori di schermo).
- [ ] Ottimizzazione prestazioni del rendering su dispositivi mobili.
- [ ] Rifattorizzare i file più grandi (`engine.js`, `panels.js`, `interface.js`) in moduli più piccoli, mantenendo l'ordine in `build.py`.
- [ ] Localizzazione in altre lingue (oggi solo italiano).
- [ ] Continuare ad aggiornare `LEGGIMI.md` a ogni nuova release.

## Strumenti e plugin valutati (2026-11-21, Claude) — nulla installato
Ricerca nel catalogo plugin (Anthropic Directory) per JS/Canvas, pixel art, generazione procedurale, IA degli NPC, pathfinding, prestazioni, test nel browser, Unity e Unreal. **Per generazione procedurale di città, IA degli NPC e pathfinding non esiste alcun plugin pertinente nel catalogo**: restano soluzioni interne (`urban-exterior.js`, `urban-life.js`, sonde in `tests/`). Valutati e scartati per ora: Unity (Unity Technologies) e Unreal Engine Skills (Epic Games) — richiedono il rispettivo editor/engine e non portano vantaggi senza migrare; SpriteCook (invia richieste a un servizio esterno, contrasta con la regola degli asset originali e offline); PlayCanvas (motore 3D WebGL); Agent Protocols, Shipwright, bee (flussi generici con hook privilegiati che duplicano e confliggono con `AGENTS.md`); E2E Test Generator (presuppone rotte e form, assenti qui); Bundle Size Sentinel (pensato per bundle npm). Unico candidato utile e opzionale: **Playwright (Microsoft, server MCP)** per test automatici dell'HTML in Chromium/Firefox/WebKit, utile a RISK-008 e RISK-002; da installare solo su approvazione dell'utente. Gli strumenti già disponibili senza installare nulla: browser integrato, `tests/prova-prestazioni.mjs`, `tests/sonda-residenti.cjs`, skill `code-review`, `simplify`, `security-review`.

## Idee da valutare (non pianificate)
- Modalità di gioco aggiuntive o sfide legate alla rinascita.
- Strumenti di sviluppo (pannello debug per salto di regione/tempo).
- Cloud/sincronizzazione salvataggi — in conflitto con la scelta "solo offline"; richiede decisione dell'utente.
