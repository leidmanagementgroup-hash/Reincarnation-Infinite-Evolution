# ROADMAP.md — Sviluppi futuri

> Aggiornare quando un obiettivo è completato (spostarlo in `CHANGELOG.md`/`PROGRESS.md`), cambia priorità o ne emergono di nuovi. Le voci con ★ derivano dai "limiti" dichiarati in `LEGGIMI.md`; le altre sono proposte tecniche da validare con l'utente prima di avviarle.

## Priorità Alta — Fondamenta del lavoro a più agenti
- [x] **Verificare la build integrata** e registrare l’esito in `PROGRESS.md`.
- [x] **Controllo di versione**: Git + GitHub privato configurati (2026-11-21).
- [x] **Controllo automatico dell’integrazione** con `node tests/verifica-integrazione.cjs`.
- [ ] Ampliare la suite condivisa con casi per i minigiochi e l’intera campagna, e configurarne l’esecuzione automatica.

## Esiti della revisione 2026-11-21 (da decidere)
- [ ] RISK-006: decidere se un salvataggio con stato del Santuario incoerente debba essere riparato o segnalato invece di essere rifiutato.
- [ ] RISK-007: confermare la morte permanente dei compagni di gilda e documentarla in `GAME_DESIGN.md`.
- [ ] Estendere il test Node a `panels.js`/`interface.js` con un DOM minimo, e aggiungere casi per evoluzione, boss adattivi, minigiochi e mercato.
- [ ] Creare un harness ripetibile di misura prestazioni (percorso fisso, finestra visibile) come baseline per la grafica.

## Prossima priorità — Grafica
- Prima dell'approvazione considerare le sette proposte di miglioramento in `PROGRESS.md` → *Revisione tecnica indipendente*.

- [ ] Ottenere l’approvazione del [piano artistico e tecnico](PIANO_GRAFICO.md). La prima prova riguarda la piazza di Velaris e il confronto giorno/notte.

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
