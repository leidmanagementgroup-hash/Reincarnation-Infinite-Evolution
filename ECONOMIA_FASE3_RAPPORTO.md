# Rapporto — Mega City Overhaul, Fase 3: economia urbana (prima unità)

Autore: Claude (Sonnet 5.5) · Data: 2026-11-21 · Branch: `claude/mega-city-fase3-economia` · Base: `main` `e67bd18`
Stato: **non unito a `main`**. Questo rapporto è separato di proposito: i documenti condivisi (`PROGRESS.md`, `CHANGELOG.md`, `ROADMAP.md`, `GAME_DESIGN.md`, `LEGGIMI.md`) non sono stati toccati mentre GPT Sol lavora alla Fase 2. Vanno aggiornati al momento dell'integrazione (vedi in fondo).

## 1. Che cosa fa la prima unità

Prima il commercio era statico: cinque mercati (uno per continente) con scorte che tornavano verso un obiettivo fisso di +2 al giorno e un prezzo con una sola correzione di ±1 Scintilla per la scarsità. Ora i mercati hanno un'economia aggregata e deterministica, a passi di un giorno di calendario (nessuna transazione individuale lontana dal giocatore, come chiede `MEGA_CITY_OVERHAUL.md` §9).

| Richiesta | Come è realizzata (`market-flows.js`) |
|---|---|
| 1. Produzione tramite professioni | 9 professioni (contadini, erbaiuoli, minatori, falegnami, pastori, cercatori di essenza, pozzaioli, fornai, alchimisti). Ogni mercato ha lavoratori per professione (`traits`). I produttori accelerano quando manca la merce (fino a +70%) e rallentano quando abbonda (fino a −75%). Raccolto variabile ±10%, deterministico. |
| 2. Domanda e offerta | Gli abitanti consumano ogni giorno acqua, pane, grano, erbe, pozioni, minerale, legno, sementi, lana, essenza. La domanda cala fino al 40% con la scarsità e sale fino al 120% con l'abbondanza. Il fabbisogno non soddisfatto è registrato (`unmet`). |
| 3. Scorte effettive | Fonte unica: le scorte `s.economy.markets[id].stock` di `trade-economy.js`. Il modulo le modifica soltanto; capacità di magazzino 3× l'obiettivo, deperimento per merce (pane 12%/giorno, minerale 0). |
| 4. Differenze fra città e continenti | Ogni mercato ha abitanti, ricchezza e mestieri propri: Filoni (miniera) estrae minerale e legno, Namar (savana) grano e lana, Velaris (città alchemica) erbe, pozioni ed essenza, Calis (scalo ricco) essenza e importa il resto, Vela (valle) è il centro agricolo. Dopo 150 giorni l'erba costa 3 a Vela e 7 a Calis, il minerale 2 ai Filoni e 5–7 altrove. |
| 5. Collegamenti commerciali | 8 rotte (Vela al centro, più un anello esterno) con giorni di viaggio e capacità. Le merci partono solo dove il prezzo di destinazione supera quello di partenza di un margine che copre il viaggio, mai in senso contrario sulla stessa rotta; viaggiano nei giorni previsti, deperiscono e arrivano. Le spedizioni in corso sono salvate. |
| 6. Prezzi da scarsità, ricchezza, disponibilità | `MarketFlows.multiplier()` (permille): curva di scarsità 40%–160% × fattore di ricchezza (pieno sui beni di lusso, dimezzato sulla necessità). `trade-economy.js` lo applica al prezzo di base; qualità, stagione, favore e lutto restano come prima. |
| 7. Attività economiche degli NPC | Aggregata: `MarketFlows.activity(profilo, scorte)` restituisce per ogni mestiere lavoratori, merci e impegno corrente (utile alle routine). **Non ancora collegata agli NPC visibili** (vedi §4). |
| 8. Persistenza | `s.economy.flows` (schema 1) dentro `economy`: giorno, ricchezza, spedizioni, riporti frazionari, registro dei flussi. Normalizzato al caricamento; salvataggi precedenti ricevono i flussi senza recuperi retroattivi. |

**Riuso e non duplicazione.** I cinque mercati, i beni e i prezzi base vengono da `trade-economy.js` (esposto come `Economy.profiles`); le valute, la banca, l'inventario, il magazzino e la fornitura di Velaris (`supplyVelarisMarket`) restano quelli esistenti. Il vecchio riassortimento fisso si applica soltanto quando i flussi non ci sono (build vecchie o parziali).

## 2. Conservazione delle merci (nessuna duplicazione)

Ogni mercato ha un registro esatto (BigInt in stringhe) con: prodotto, usato (materie prime), consumato, insoddisfatto, deperito, perso in viaggio, esterno (acquisti, vendite e forniture di Velaris), importato, esportato. Vale sempre `scorta = apertura + prodotto − usato − consumato − deperito + esterno + importato − esportato`, e `MarketFlows.audit()` lo verifica. Un acquisto o una vendita del giocatore e la fornitura di Velaris sono dichiarati con `MarketFlows.external()`; una scorta modificata fuori dal registro viene segnalata e, al caricamento, il registro riparte dal presente (`rebase`) senza perdere ricchezza e spedizioni. Ogni pane consuma esattamente un grano e ogni pozione due erbe (verificato).

## 3. File

Nuovi: `market-flows.js` (322 righe), `tests/economia-flussi.cjs`, `tests/prova-browser-economia.cjs`, questo rapporto.
Modificati: `trade-economy.js` (+58/−15: avvio e ripristino dei flussi, `sync`/`fresh` al posto del riassortimento fisso, prezzo scalato, flussi esterni, `Economy.flowReport` e `Economy.profiles`), `build.py` (una riga: `market-flows.js` prima di `trade-economy.js`), `tests/verifica-integrazione.cjs` (3 asserzioni).
**Non toccati** (elenco dell'incarico): `urban-exterior.js`, `urban-world.js`, `urban-life.js`, `urban-interiors.js`, `panels.js`, `interface.js`, `Reincarnation.html` e tutti i documenti condivisi.

**Unica modifica a un test condiviso**: `tests/verifica-integrazione.cjs`, righe ~111–135. Il test controllava `stock === '7'` dopo un giorno, `stock === '6'` dopo un acquisto e che il mercato di Vela fosse identico: cifre che dipendono dal vecchio +2 fisso. Ora controlla `stock ≥ 3` dopo la fornitura, `scorta prima − 1` dopo l'acquisto e che il registro esterno di Vela non cambi. L'intento di ogni controllo è invariato. In caso di conflitto con Sol basta ripetere queste tre sostituzioni.

## 4. Test eseguiti

| Prova | Esito |
|---|---|
| `node tests/economia-flussi.cjs` (nuovo) | **158 controlli superati**: determinismo (stesso seme/stessi giorni; un salto = passi giornalieri; ripetere un giorno non cambia nulla), conservazione su 365 giorni con acquisti e forniture, produzione e consumo, trasformazioni esatte, differenze fra mercati, curve dei prezzi (monotone, entro limiti, ricchezza lusso > necessità), rotte (solo su corsie esistenti, nessun flusso opposto, partite = arrivate + in viaggio + perdite), salvataggio e ricarica (identici e poi continuano come senza interruzioni), flussi manomessi rigenerati, scorte da 30 cifre, build senza `MarketFlows`, salto di 100 000 giorni, gioco completo (acquisto, vendita, rifiuto, fornitura, 20 giorni, `save`/`load`, `exportSave`/`importSave`, import senza flussi). |
| `node tests/verifica-integrazione.cjs` | superato (dopo le 3 asserzioni aggiornate) |
| `node --check market-flows.js trade-economy.js` | superato |
| `python build.py` in un file separato | riuscito (1,66 MB); `Reincarnation.html` **non** ricostruito né committato |
| `tests/prova-browser.cjs` (Edge, 10 prove) sulla build separata | 10/10 |
| `tests/prova-browser-velaris-est.cjs` (12 prove, con salvataggio della build di `main`) | 12/12 |
| `tests/prova-browser-economia.cjs` (nuovo, Edge) | tutte superate: vecchio salvataggio con scorte identiche e flussi creati al giorno corrente, mercato di Vela (17 righe, acquisto), 30 giorni, ricarica della pagina identica, nessun errore JavaScript |

Il test del gioco completo ha trovato e fatto correggere un difetto vero: il campo esterno del registro può essere negativo (acquisti) e la validazione lo rifiutava, azzerando i flussi a ogni caricamento.

**Prestazioni** (Node, una macchina di sviluppo): 0,46 ms per giorno simulato, 59 ms per il recupero massimo di 120 giorni dopo una lunga assenza (oltre 120 giorni l'equilibrio è già raggiunto e si simulano solo gli ultimi 120). Stato nel salvataggio: circa 10,5 KB. Nessun costo per fotogramma: si aggiorna solo al cambio di giorno. **Non misurato**: frame rate in partita (il disegno non è toccato), dispositivi deboli.

## 5. Limiti e cose non fatte (dichiarati)

- **Solo i cinque mercati esistenti.** Le altre città e gli insediamenti procedurali non hanno ancora un mercato: `traits` e `routes` sono tabelle in `market-flows.js` e un profilo può portare i propri `traits`, ma serve il Generatore Procedurale Urbano 2.0 (e la Fase 5) per crearne di nuovi.
- **I residenti di Velaris non lavorano ancora davvero per questi flussi.** `UrbanLife` continua a produrre le proprie scorte cittadine (commissioni) e le consegna al mercato con `supplyVelarisMarket`, ora registrata come flusso esterno. Il collegamento fra le professioni degli NPC visibili e `MarketFlows.activity()` richiede di toccare `urban-life.js` (file di Sol): **non fatto**.
- **Nessuna interfaccia nuova.** Il pannello «Mercato e banca» mostra già i nuovi prezzi (passano da `price()`), ma non mostra tendenze, merci in viaggio né ricchezza: serve `economy-panel.js`/`panels.js` (`Economy.flowReport(s)` fornisce i dati).
- Le valute: i prezzi restano in Scintille, i Lunari/Solari/Astrali sono quelli già presenti (nessun cambiamento). La ricchezza è un indice, non un conto in denaro degli NPC.
- La taratura (lavoratori, consumi, rotte, deperimenti) è una prima proposta: i mercati si stabilizzano vicino all'obiettivo con differenze marcate, ma l'equilibrio fine va ritoccato giocando. Il grano resta cronicamente scarso a Velaris (prezzo ~10 contro 5 di base, scorta spesso a 0–2): la città non lo produce e le rotte non bastano a coprirlo del tutto. È un effetto voluto per una città importatrice, ma va validato con il design (altrimenti basta un contadino in più o una rotta più capace).
- **Non verificato**: bilanciamento in partita (sensazione del giocatore, margini di guadagno nel rivendere fra mercati), tocco, effetto sul disegno e sulla fluidità (nessuna modifica grafica).

## 6. Come integrare dopo la Fase 2

1. Attendere che Sol unisca la Fase 2 a `main`; poi `git fetch` e `git rebase origin/main` (o merge) di `claude/mega-city-fase3-economia`. I conflitti attesi sono minimi: `build.py` (una riga nella tupla `MODULES`) e, se Sol ha toccato la stessa zona, le tre asserzioni di `tests/verifica-integrazione.cjs`. `trade-economy.js` e gli altri file nuovi non dovrebbero entrare in conflitto.
2. Eseguire `node tests/economia-flussi.cjs`, `node tests/verifica-integrazione.cjs`, `python build.py Reincarnation.html`, `tests/prova-browser.cjs`, `tests/prova-browser-velaris-est.cjs` e `tests/prova-browser-economia.cjs`; ricostruire e committare `Reincarnation.html` (qui non committato).
3. Aggiornare i documenti condivisi: `GAME_DESIGN.md` (§4.5 Economia: flussi, rotte, registro; tabella dei moduli: `market-flows.js` → `MarketFlows`; dati di salvataggio: `economy.flows`), `LEGGIMI.md` (tabella moduli), `PROGRESS.md`, `CHANGELOG.md`, `ROADMAP.md`.
4. Collegamenti ancora da fare, in quest'ordine: (a) `urban-life.js`: far derivare le consegne di Velaris da `MarketFlows.activity()` e usare i mestieri dei residenti come lavoratori; (b) `economy-panel.js`/`panels.js`: mostrare tendenza dei prezzi, merci in viaggio e ricchezza con `Economy.flowReport`; (c) nuovi mercati per le altre città con `traits` propri; (d) eventi e leggi (Fase 4) come modificatori di `traits`/`routes`.
