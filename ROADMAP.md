# ROADMAP.md — Sviluppi futuri

> Aggiornare quando un obiettivo è completato (spostarlo in `CHANGELOG.md`/`PROGRESS.md`), cambia priorità o ne emergono di nuovi. Le voci con ★ derivano dai "limiti" dichiarati in `LEGGIMI.md`; le altre sono proposte tecniche da validare con l'utente prima di avviarle.

## Priorità Alta — Fondamenta del lavoro a più agenti
- [ ] **Verificare la build**: ricostruire l'HTML da sorgenti e confermare che coincida con `Reincarnation.html`; giocare una partita di prova e registrare l'esito in `PROGRESS.md`.
- [x] **Controllo di versione**: Git + GitHub privato configurati (2026-11-21).
- [ ] **Test automatici minimi**: script Node che carichi i moduli puri (es. `trades-practice.js`, `inventory.js`, `calendar.js`, `trade-economy.js`) e verifichi invarianti; test di migrazione dei salvataggi v1→v5.
- [ ] **Controllo di coerenza della build**: verifica che l'ordine di `MODULES` e le dipendenze fra globali siano corretti; test "smoke" in browser headless con console priva di errori.

## Priorità Media — Contenuti ★
- [ ] ★ **Metropoli** e **relazioni politiche fra regni** su vasta scala.
- [ ] ★ **Banca avanzata**: prestiti, trasferimenti fra conti, fondazione di banche.
- [ ] ★ **Imprese** oltre le botteghe esistenti.
- [ ] ★ **Grimori scrivibili** e **accademie**.
- [ ] ★ **Dungeon**: generazione procedurale e governo di un dungeon da parte del giocatore.
- [ ] ★ **Leggi locali** con taglie e reputazioni distinte per regione.
- [ ] Ampliare la Cripta delle Soglie e il numero di aree per continente.

## Priorità Bassa — Qualità e rifinitura
- [ ] Bilanciamento di economia, difficoltà dei boss e velocità di evoluzione (richiede sessioni di gioco e dati).
- [ ] Revisione accessibilità (contrasto, navigazione da tastiera nei pannelli, lettori di schermo).
- [ ] Ottimizzazione prestazioni del rendering su dispositivi mobili.
- [ ] Rifattorizzare i file più grandi (`engine.js`, `panels.js`, `interface.js`) in moduli più piccoli, mantenendo l'ordine in `build.py`.
- [ ] Localizzazione in altre lingue (oggi solo italiano).
- [ ] Aggiornare `LEGGIMI.md` a ogni nuova release e numerare gli aggiornamenti ("Aggiornamento 4…").

## Idee da valutare (non pianificate)
- Modalità di gioco aggiuntive o sfide legate alla rinascita.
- Strumenti di sviluppo (pannello debug per salto di regione/tempo).
- Cloud/sincronizzazione salvataggi — in conflitto con la scelta "solo offline"; richiede decisione dell'utente.
