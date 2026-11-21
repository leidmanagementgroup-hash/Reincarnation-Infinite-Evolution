# ROADMAP.md — Sviluppi futuri

> Aggiornare quando un obiettivo è completato (spostarlo in `CHANGELOG.md`/`PROGRESS.md`), cambia priorità o ne emergono di nuovi. Le voci con ★ derivano dai limiti dichiarati in `LEGGIMI.md`. L’Aggiornamento 5 segue il piano ufficiale indicato sotto.

## Priorità Alta — Fondamenta del lavoro a più agenti
- [x] **Verificare la build integrata** e registrare l’esito in `PROGRESS.md`.
- [x] **Controllo di versione**: Git + GitHub privato configurati (2026-11-21).
- [x] **Controllo automatico dell’integrazione** con `node tests/verifica-integrazione.cjs`.
- [ ] Ampliare la suite condivisa con casi per i minigiochi e l’intera campagna, e configurarne l’esecuzione automatica.

## Priorità di sviluppo — Aggiornamento 5

- [Piano ufficiale Mega City Overhaul](MEGA_CITY_OVERHAUL.md), con requisiti, fasi, criteri di verifica e passaggio di consegne fra modelli.
- [x] **Fase 0.** Verificare l’integrazione v5/v6 e la base urbana di Velaris.
- [x] **Fase 1.** Prima porzione grafica di Velaris fra piazza, ponte e mercato, secondo il [piano artistico e tecnico](PIANO_GRAFICO.md).
- [ ] **Fase 2.** Estendere l’identità dei quartieri, vegetazione, orientamento e varietà degli interni.
- [ ] **Fase 3.** Estendere routine, produzione ed economia urbana. Il primo flusso di merci collega mestieri e commissioni al mercato di Velaris.
- [ ] **Fase 4.** Allacciare eventi al calendario, reputazione, quest e leggi locali.
- [ ] **Fase 5.** Applicare la struttura urbana ad altri insediamenti, con luoghi unici e capitali nei cinque continenti.

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

## Idee da valutare (non pianificate)
- Modalità di gioco aggiuntive o sfide legate alla rinascita.
- Strumenti di sviluppo (pannello debug per salto di regione/tempo).
- Cloud/sincronizzazione salvataggi — in conflitto con la scelta "solo offline"; richiede decisione dell'utente.
