# Guida: modificare le mappe di Reincarnation con Tiled

Con **Tiled Map Editor** puoi spostare edifici, piantare alberi, dipingere strade e prati, collocare lanterne e bancarelle e aggiungere ostacoli in una zona del mondo. Poi ricostruisci il gioco e vedi il risultato in `Reincarnation.html`. Il gioco resta un unico file offline: la mappa entra nella build come dati.

Per ora la zona modificabile è **gli Orti dell'Alambicco**, il borgo rurale a sud-est di Velaris (coordinate del mondo 2114–2850 × 752–1488). Il resto del mondo resta generato come sempre.

## 1. Cosa serve

- **Tiled** 1.10 o successivo (provato con 1.12.2). Se non c'è: `winget install Tiled.Tiled` oppure https://www.mapeditor.org.
- **Python 3**, già usato per la build.
- Solo per i controlli automatici: **Node.js**, già usato per i test.

## 2. I file

Tutto sta nella cartella `mappe/`:

| File | A cosa serve |
|---|---|
| `orti-dell-alambicco.tmj` | La mappa da modificare. Consegnata **non attiva**: finché non la attivi il gioco non cambia. |
| `esempi/orti-dimostrazione.tmj` | Un esempio già modificato, usato per la build di prova. |
| `tileset/terreno-velaris.tsj` + `.png` | Le piastrelle del terreno (erba, prato fiorito, strada, selciato, aiuola, terra…). |
| `tileset/oggetti-velaris.tsj` + `oggetti/*.png` | Alberi, alberi da frutto, lanterne, fontane, bancarelle, casse, fioriere, insegne… |
| `tileset/edifici-orti.tsj` + `edifici/*.png` | Gli edifici esistenti, con il loro aspetto esatto, e 9 **modelli** per costruirne di nuovi. |
| `riferimento/orti-dell-alambicco-terreno.png` | Fotografia del suolo attuale: aiuta a orientarsi, il gioco non la usa. |
| `velaris.tiled-project` | Il progetto Tiled (facoltativo). |

Tutte le immagini sono disegnate dal gioco stesso: in Tiled vedi la stessa pixel art del gioco.

## 3. Aprire la mappa

1. Avvia Tiled.
2. *File → Apri file o progetto…* e scegli `mappe/orti-dell-alambicco.tmj`.
3. A destra, nel pannello **Livelli**, trovi i sette livelli descritti sotto. Il primo (*riferimento*) è bloccato: è solo uno sfondo.

Per non perdere il modello originale puoi lavorare su una copia, per esempio `mappe/orti-mia-versione.tmj`, salvata **nella stessa cartella `mappe/`** perché i percorsi dei tileset restino validi. Ricorda però che può esserci **una sola mappa attiva per regione**.

## 4. I livelli

| Livello | Cosa contiene | Effetto nel gioco |
|---|---|---|
| **riferimento** | Immagine del suolo attuale | Nessuno (serve a te) |
| **terreno** | Piastrelle 16×16 | Ridipingono il suolo. Solo aspetto: non bloccano nessuno. Una cella vuota lascia il suolo originale. |
| **decorazioni** | Alberi, alberi da frutto, fioriere | Disegnati come nel gioco. Gli alberi bloccano il passaggio come sempre. |
| **edifici** | Case, fattorie, essiccatoi, la Serra | Edifici veri: collisioni, porte, case per i residenti, finestre accese di notte. |
| **oggetti** | Lanterne, fontane, bancarelle, casse, insegne | Disegnati come nel gioco. Le lanterne si accendono di sera; fontane e bancarelle bloccano il passaggio. |
| **collisioni** | Rettangoli (o ellissi) | Ostacoli invisibili aggiunti: per esempio un'aiuola da non calpestare o il retro di una staccionata. |
| **ingressi** | Punti con `tipo = sosta` o `tipo = porta` | Le soste sono mete dei residenti, come *Piazzetta delle Radici*. Una porta sposta l'ingresso di un edificio. |

## 5. Cosa puoi fare

**Spostare un edificio.** Livello *edifici*, strumento di selezione (S), trascina. La porta segue l'edificio e il vialetto davanti alla porta viene ridisegnato dal gioco.

**Aggiungere un edificio.** Nel pannello *Tileset* scegli `edifici-orti`, poi uno dei modelli in fondo (`modello-longhouse`, `modello-herb-loft`, `modello-cottage`, ciascuno in tre colori). Con lo strumento *Inserisci piastrella* (T) fai clic nel livello *edifici*. Nelle proprietà dell'oggetto scrivi il **Nome** (es. «Casa del Mugnaio»). **Non** aggiungere la proprietà `id`: un edificio senza `id` è nuovo per il gioco. Case, fattorie e torri diventano abitazioni dei residenti; essiccatoi e vetrerie sono laboratori. Per cambiarlo aggiungi la proprietà `tipo` = `residence` oppure `workshop`.

**Eliminare un edificio.** Selezionalo e premi *Canc*. Elimina anche la fioriera o la cassa davanti alla porta, se non vuoi lasciarla.

**Cambiare nome o colore.** Proprietà dell'oggetto: `nome` e `colore` (0, 1 o 2, il colore del tetto del quartiere).

**Spostare la porta.** Proprietà `portaDx` (distanza dal bordo sinistro dell'edificio) e `portaDy` (distanza sotto la facciata, normalmente 12). In alternativa, nel livello *ingressi*, metti un punto con `tipo = porta` ed `edificio` = l'id dell'edificio.

**Alberi e oggetti.** Tileset `oggetti-velaris`, strumento *Inserisci piastrella* (T), livello *decorazioni* o *oggetti*. Il punto d'appoggio è a 8 pixel dal bordo inferiore dell'immagine. Per spostare un oggetto esistente trascinalo; per eliminarlo premi *Canc*.

**Strade e prati.** Livello *terreno*, tileset `terreno-velaris`, strumento *Pennello* (B) o *Riempimento* (F). Per cancellare usa la *Gomma* (E): ricompare il suolo originale.

**Ostacoli.** Livello *collisioni*, strumento *Rettangolo* (R). Usali insieme a qualcosa di visibile, perché nel gioco il rettangolo non si vede.

**Soste.** Livello *ingressi*, strumento *Punto* (I), proprietà `tipo` = `sosta` e `id` (lettere, numeri e trattini). Puoi spostare le soste esistenti: i residenti ci andranno.

## 6. Cosa non si può fare (e il gioco lo segnala)

- **La Serra delle Talee e la sua porta sono bloccate**, perché collegano il suo interno. Non si spostano e non si eliminano.
- **Non ruotare** edifici e oggetti.
- **Non copiare e incollare un edificio esistente** senza cancellare la proprietà `id` della copia: due edifici con lo stesso id vengono rifiutati.
- Gli edifici non devono sovrapporsi e la porta deve restare libera e raggiungibile.
- Tutto deve restare dentro la mappa.
- Piastrelle di 16×16 pixel, mappa ortogonale non infinita, formato JSON (`.tmj` e `.tsj`). La codifica consigliata del livello delle piastrelle è CSV, che è quella del modello (nelle proprietà della mappa, voce *Tile Layer Format*). Anche base64, con o senza zlib o gzip, funziona; zstd no.

Se una regola non è rispettata **la mappa non viene applicata**: la zona resta quella procedurale, il gioco funziona e lo strumento di verifica spiega cosa correggere.

## 7. Attivare la mappa e vederla nel gioco

1. In Tiled: *Mappa → Proprietà della mappa*, proprietà personalizzata **`attiva`** → spunta, poi salva con *Ctrl+S*. Non toccare `regione`, `origineX` e `origineY`: dicono al gioco dove si trova la mappa.
2. Controlla la mappa:
   ```
   node strumenti/verifica-mappe.cjs
   ```
   Vedrai una riga ✓ o ✗ per ogni controllo. Le verifiche sono tre:
   - la mappa viene letta;
   - porte e soste sono raggiungibili dalla piazza, su tre semi;
   - nessun residente resta fermo né attraversa ostacoli, per un giorno intero di gioco.
3. Ricostruisci il gioco:
   ```
   python build.py
   ```
   Il terminale scrive «Mappa di Tiled incorporata: …».
4. Apri `Reincarnation.html`, entra a Velaris e cammina fino agli Orti dell'Alambicco: c'è la tua versione.

**Build di prova separata**, senza toccare `Reincarnation.html`:
```
python build.py Reincarnation-prova.html --mappe mappe/esempi
```
`--mappe` sceglie da quale cartella prendere le mappe attive.

**Tornare al gioco originale:** togli la spunta ad `attiva`, salva e ricostruisci.

## 8. Salvataggi

- Le mappe non aggiungono dati ai salvataggi: le partite vecchie si aprono come prima.
- Se un salvataggio aveva il giocatore in un punto dove ora c'è un edificio o un albero, al caricamento il gioco lo riporta all'ingresso di Velaris.
- Con la mappa attiva gli Orti hanno la **stessa disposizione in ogni partita**. Senza mappa, invece, dimensioni e colori variano leggermente da una partita all'altra.

## 9. Domande frequenti

- **Ho spostato un edificio ma nel gioco non è cambiato nulla.** Controlla che `attiva` sia spuntata, di aver salvato e di aver rieseguito `python build.py`. Poi esegui `node strumenti/verifica-mappe.cjs`: se c'è un errore, la mappa non viene applicata.
- **«tileset non trovato».** La mappa o la cartella `tileset/` sono state spostate fuori da Tiled e i percorsi relativi non valgono più. Usa *File → Salva con nome* in Tiled (aggiorna i percorsi da solo) e tieni le mappe in `mappe/` o in una sua sottocartella, come `mappe/esempi/`.
- **Il vialetto vecchio si vede ancora nella foto di riferimento.** È normale: la foto non si aggiorna. Nel gioco i vialetti seguono le porte.
- **Voglio rigenerare il modello e le immagini** (dopo cambiamenti alla grafica del gioco). Serve `playwright-core` come per le prove nel browser:
  ```
  node strumenti/esporta-mappa-tiled.cjs --sovrascrivi
  ```
  Attenzione: sostituisce `orti-dell-alambicco.tmj`. Salva prima una copia delle tue modifiche.

## 10. Per chi sviluppa

- `tiled-maps.js` (`TiledMaps`): legge e controlla le mappe, traduce le coordinate, disegna le piastrelle di terreno, crea il modello e fa le verifiche.
- `urban-exterior.js`: applica le modifiche all'area dopo la generazione procedurale e prima di collisioni, porte, soste e luci. Usa chiavi stabili per gli elementi esistenti (`annesso-<riga>-<colonna>` per gli edifici, `<tipo>@x,y` per gli oggetti, `planter@<edificio>` per le fioriere delle porte, id delle soste e dei servizi).
- `build.py`: incorpora le mappe attive (`window.TILED_MAPS`) e risolve tileset, gruppi e codifiche.
- Test: `node tests/verifica-mappe-tiled.cjs`. Copre modello senza effetti, dimostrazione, residenti, mappe errate, salvataggi e il giro completo con Tiled se è installato.
- Altre regioni (i borghi dei continenti) potranno usare lo stesso formato dopo il World Art Overhaul. Servirà un punto d'aggancio in `continents.js` simile a quello di `urban-exterior.js`.
