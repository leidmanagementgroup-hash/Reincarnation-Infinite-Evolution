# Rapporto — Mega City Overhaul, Fase 3: economia urbana (prima e seconda unità)

Autore: Claude (Sonnet 5.5) · Data: 2026-11-21 · Branch: `claude/mega-city-fase3-economia` · Base: `main` `e67bd18`
Le sezioni 1–6 descrivono la **prima unità** (commit `fc9f98f`, `6bf7317`); la **seconda unità** (bilanciamento, commercio, API, profili per nuove città, compatibilità, prestazioni) è nella sezione 7 e in fondo ne trovi l'integrazione. Dove la seconda unità ha cambiato un'affermazione della prima, la riga è marcata «superato».
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

- **Solo i cinque mercati esistenti.** *(Parzialmente superato, §7.4: il motore dei flussi ora accetta qualsiasi numero di mercati con profili generati; `Economy` nel gioco resta però fissato ai cinque.)*
- **I residenti di Velaris non lavorano ancora davvero per questi flussi.** `UrbanLife` continua a produrre le proprie scorte cittadine (commissioni) e le consegna al mercato con `supplyVelarisMarket`, ora registrata come flusso esterno. Il collegamento fra le professioni degli NPC visibili e `MarketFlows.activity()` richiede di toccare `urban-life.js` (file di Sol): **non fatto**.
- **Nessuna interfaccia nuova.** Il pannello «Mercato e banca» mostra già i nuovi prezzi (passano da `price()`), ma non mostra tendenze, merci in viaggio né ricchezza: serve `economy-panel.js`/`panels.js` (`Economy.flowReport(s)` fornisce i dati).
- Le valute: i prezzi restano in Scintille, i Lunari/Solari/Astrali sono quelli già presenti (nessun cambiamento). La ricchezza è un indice, non un conto in denaro degli NPC.
- La taratura (lavoratori, consumi, rotte, deperimenti) è una prima proposta: i mercati si stabilizzano vicino all'obiettivo con differenze marcate, ma l'equilibrio fine va ritoccato giocando. *(Superato dalla seconda unità, §7.1: il grano di Velaris era scarso per difetti di previsione della domanda nelle spedizioni, non per scelta di design; ora la scorta media è 3,95 su 5.)*
- **Non verificato**: bilanciamento in partita (sensazione del giocatore, margini di guadagno nel rivendere fra mercati), tocco, effetto sul disegno e sulla fluidità (nessuna modifica grafica).

## 6. Come integrare dopo la Fase 2

1. Attendere che Sol unisca la Fase 2 a `main`; poi `git fetch` e `git rebase origin/main` (o merge) di `claude/mega-city-fase3-economia`. I conflitti attesi sono minimi: `build.py` (una riga nella tupla `MODULES`) e, se Sol ha toccato la stessa zona, le tre asserzioni di `tests/verifica-integrazione.cjs`. `trade-economy.js` e gli altri file nuovi non dovrebbero entrare in conflitto.
2. Eseguire `node tests/economia-flussi.cjs`, `node tests/verifica-integrazione.cjs`, `python build.py Reincarnation.html`, `tests/prova-browser.cjs`, `tests/prova-browser-velaris-est.cjs` e `tests/prova-browser-economia.cjs`; ricostruire e committare `Reincarnation.html` (qui non committato).
3. Aggiornare i documenti condivisi: `GAME_DESIGN.md` (§4.5 Economia: flussi, rotte, registro; tabella dei moduli: `market-flows.js` → `MarketFlows`; dati di salvataggio: `economy.flows`), `LEGGIMI.md` (tabella moduli), `PROGRESS.md`, `CHANGELOG.md`, `ROADMAP.md`.
4. Collegamenti ancora da fare, in quest'ordine: (a) `urban-life.js`: far derivare le consegne di Velaris da `MarketFlows.activity()` e usare i mestieri dei residenti come lavoratori; (b) `economy-panel.js`/`panels.js`: mostrare tendenza dei prezzi, merci in viaggio e ricchezza con `Economy.flowReport`; (c) nuovi mercati per le altre città con `traits` propri; (d) eventi e leggi (Fase 4) come modificatori di `traits`/`routes`.

## 7. Seconda unità: bilanciamento, commercio, API e profili per nuove città

Commit: vedi la fine del paragrafo «Consegna» di questa sezione. Non è stata modificata nessuna interfaccia, nessun file `urban-*.js`, `panels.js`, `interface.js`, `Reincarnation.html` né alcun documento condiviso.

### 7.1 Analisi del bilanciamento (30, 150 e 365 giorni, semi 19425, 555 e 2024)
Strumento: `node tests/analisi-economia.cjs [semi] [orizzonti]` (diagnosi, non test): per ogni merce di ogni mercato stampa scorta media, minimo e massimo, giorni a scaffale vuoto, giorni sotto il 50% e sopra il 200% dell'obiettivo, prezzo minimo/medio/massimo, fabbisogno insoddisfatto, produzione, consumo, importazioni ed esportazioni.

| Sul commit `6bf7317` | 30 gg | 150 gg | 365 gg |
|---|---|---|---|
| Scorte croniche (vuote >25% dei giorni o sotto il 50% per >60%) su 138 celle | 3 (`velaris:grain`) | 4 (`velaris:grain`, `calis:grain`) | 6 (`velaris:grain`, `calis:grain`) |
| Eccessi cronici (sopra il 200% per >60%) | 0 | 3 (`namar:wool`) | 6 (`filoni:work`, `namar:wool`) |
| Fabbisogno insoddisfatto / consumato | 0,2% | 0,1% | 0,1% |

| Dopo la seconda unità | 30 gg | 150 gg | 365 gg |
|---|---|---|---|
| Scorte croniche | **0** | **0** | **0** |
| Eccessi cronici | **0** | **0** | **0** |
| Fabbisogno insoddisfatto / consumato | 0,1% | 0,0% | 0,0% |

**Grano a Velaris** (365 giorni, seme 19425, misurato sul commit `6bf7317`): prima scorta media 1,5 su 5, scaffale vuoto il 22% dei giorni e sotto il 50% dell'obiettivo il 79%, prezzo medio ×1,5 (Calis: 3,1 su 8, sotto il 50% per il 64% dei giorni). Ora 3,95 su 5, vuoto lo 0,8% dei giorni, prezzo medio ×1,21 (Calis 5,3 su 8). Il grano resta **più caro nelle città che non lo producono** (differenza regionale mantenuta); non è più cronicamente assente.

**Cause trovate** (non erano scelte di design):
1. *La domanda prevista alla destinazione ignorava i trasformatori.* Il consumo stimato durante il viaggio contava solo il grano mangiato dagli abitanti, ma a Velaris e Calis circa due terzi del grano li usano i fornai. Le spedizioni arrivavano sottodimensionate. Ora la previsione (`MarketFlows.outlook`) somma abitanti e materie prime dei trasformatori.
2. *Il margine di prezzo all'arrivo ignorava il consumo in viaggio*, e quindi non spediva quando la merce sarebbe arrivata a un mercato già vuoto. Ora si prezza la scorta prevista all'arrivo (attuale + in viaggio − deficit × giorni).
3. *Sovracapacità produttiva.* Legno, lana, essenza, sementi e minerale avevano da 2 a 4 volte la capacità necessaria al mondo e si accumulavano oltre il doppio dell'obiettivo (i produttori non si fermavano mai: minimo 25%). Capacità ritarate (rapporto capacità/domanda del mondo 1,2–1,4 per quasi tutte le merci) e produttori che si fermano del tutto quando la scorta raggiunge il doppio dell'obiettivo.
4. *Pane ai Filoni* (un solo fornaio per 8 abitanti, scorta media 54%): secondo fornaio. Il grano extra richiesto è coperto da un contadino in più a Namar.
5. *Spedizioni scartate al tetto di 300* (latente nella prima unità): oltre il tetto le spedizioni in eccesso venivano troncate e la merce spariva senza passare dal registro delle perdite. Con 5 mercati non succede (circa 30 in viaggio), con 100 o più sì. Ora il tetto cresce con i mercati (12 per mercato, minimo 300) e, raggiunto, non partono nuove spedizioni: quelle partite non si scartano mai.

**Differenze regionali mantenute** (test): per minerale, lana, essenza, grano e pozioni il prezzo medio massimo è almeno 1,3 volte il minimo; il minerale costa meno ai Filoni, il grano a Namar, l'essenza a Velaris; la ricchezza ordina i mercati come prima (Calis > Velaris > Vela > Namar ≥ Filoni). Produzione per abitante al giorno: Vela 1,2, Filoni 0,9, Velaris 0,8, Namar 1,5, Calis 0,5 (lo scalo importa). Prezzi (moltiplicatore) fra ×0,62 e ×1,80 su 365 giorni; scorte di acqua e pane mai esaurite e ≥ 60% dell'obiettivo in media in tutti i mercati.

### 7.2 Commercio più intelligente (`market-flows.js`, passo «rotte»)
Una merce parte solo se **tutte** queste condizioni valgono:
- **Scorta alla partenza**: restano almeno il 60% dell'obiettivo più due giorni di deficit locale (riserva); sotto la soglia nulla parte.
- **Domanda prevista all'arrivo**: obiettivo + deficit strutturale × (giorni di viaggio + 1) − scorta − merci già in viaggio > 0. Il deficit strutturale è domanda (abitanti più trasformatori) meno capacità produttiva, senza le reazioni momentanee ai livelli di scorta.
- **Redditività sostenibile**: la quantità è la massima per cui, dopo la spedizione, il prezzo all'arrivo (sulla scorta prevista, al netto del deperimento) copre il prezzo di partenza × (1,05 + 0,04 × giorni) + 0,1 × giorni. Il commercio si spegne da solo quando i prezzi si avvicinano e non può oscillare.
- **Deperimento**: perdite in viaggio per merce, registrate; **tempi e capacità** della rotta.
- **Nessuna corsia opposta** (una merce non viaggia in entrambi i sensi sulla stessa rotta) e, nel test, **nessun ciclo** fra spedizioni in corso della stessa merce.
Misure su 3 anni simulati (3 semi): 9 133 partenze, 0 inversioni di flusso, 0 corsie opposte, meno del 70% della produzione di ogni merce viaggia, nessuna spedizione con tutte le destinazioni abbondanti, nessuna esportazione da un mercato a corto di scorta. *(Un divieto di rispedire merci in arrivo, provato e scartato, bloccava i collegamenti passando da Vela e peggiorava il grano.)*

### 7.3 Economia e attività del giocatore (API e dati, nessuna interfaccia)
Nuove funzioni di `Economy` (`trade-economy.js`), tutte registrate nel registro come flussi esterni:
- `Economy.quote(s, mercato, merce, [scorta])` → `{buy, sell, stock, target, index, capacity, listed}`: quotazione di qualunque mercato, anche lontano, e ipotetica con una scorta diversa (utile per negozi e rotte del giocatore).
- `Economy.deliver(s, mercato, merce, quantità)` / `Economy.procure(...)` → quantità effettivamente spostata (BigInt): un negozio, un mercante o un residente porta merce al mercato o la preleva. Limiti: capacità del magazzino, scorta presente, oggetti di missione esclusi, quantità non valide e quantità da 30 cifre gestite.
- `Economy.flowReport(s)` ora include `outlook` (domanda e produzione previste per merce, per mercato) e `routes`.
Verifiche sul gioco completo (40 giorni di partita): per ogni mercato, merce e scorta (1 077 coppie di prezzi) vendere è sempre meno che comprare, **vendere e ricomprare non rende, comprare e rivendere non rende**; 120 giri compra-rivendi non creano denaro né merce; l'arbitraggio immediato fra mercati senza viaggio esaurisce le opportunità dopo 18 trasferimenti per un guadagno massimo di 23 Scintille, e la somma dei flussi esterni resta zero; un commerciante simulato per 60 giorni lascia il registro in pari.
**Limite emerso**: i mercati sono *poco profondi* (scorte obiettivo da 4 a 16 unità) e i prezzi sono numeri interi piccoli (2–14 Scintille): i margini relativi fra regioni sono grandi (minerale 2 ai Filoni, 5–6 altrove; essenza 7 a Velaris, 10–14 a Calis) ma il guadagno assoluto di un giocatore che trasporta merce è di poche Scintille per unità e si esaurisce in poche decine di unità. Per un commercio di giocatore più ricco servono scorte obiettivo proporzionali alla dimensione della città (vedi §7.4) o merci di maggior valore: decisione di design, non fatta.
**Scoperta**: nel pannello esistente solo le merci con una definizione in `Inventory` appaiono; nel gioco completo pane e acqua sono definite, nelle prove isolate no.

### 7.4 Espandibilità (Generatore Procedurale Urbano 2.0)
- `MarketFlows.settlementProfile({id, name, size, focus, seed, world, region, continent})` genera un profilo completo e deterministico: abitanti dalla dimensione (`village`, `town`, `city`, `capital`), mestieri dalla vocazione (`farming`, `pastoral`, `mining`, `crafts`, `alchemy`, `port`, `capital`) con acqua e pane sempre coperti, grano quasi autosufficiente, medicina di base nelle città, obiettivi di scorta dalla domanda e prezzi più bassi per le specialità (merci prodotte ≥ 1,6 volte il consumo). Nessuna condizione speciale per insediamento.
- `MarketFlows.routesFor(profili)`: usa le rotte dichiarate (tabella o `profile.routes`), collega ogni nuovo mercato ai 2 più vicini (`world:{x,y}`) e ai grandi centri (≥ 16 abitanti), e garantisce un grafo connesso. Le rotte dei cinque mercati originali restano **identiche** (verificato). Risultato in cache finché la lista non cambia.
- Un mercato nato dopo un salvataggio si aggiunge senza perdere il registro degli altri (`MarketFlows.restore` accetta mercati nuovi, che partono dalle scorte attuali).
- Il recupero dopo una lunga assenza è limitato in base al numero di mercati (120 giorni con 5, 85 con 35, 30 con 100, 10 con 300), non al tempo reale, quindi resta deterministico.
Mondi di prova generati (sopra i 5 originali): **35 mercati**, 365 giorni → 4 celle su 329 sotto il 50% a fine anno, mancato 0,00%; **100 mercati** (diagnosi, 150 gg) 9 celle croniche su 948 (1%); **300 mercati** (60 gg) 56 su 2 849 (2%), mancato 0,12%, registro in pari sempre. Le carenze residue sono pozioni, lana ed erbe nei luoghi remoti, non beni essenziali.
**Non fatto di proposito**: nessuna città creata; `Economy` (nel gioco) mantiene i 5 mercati e la validazione del salvataggio che li richiede (`Object.keys(raw.markets).length !== profiles.length`). Per usare più mercati in partita serve rendere dinamica la lista `profiles` in `trade-economy.js` e `Economy.restore` — modifica piccola, ma coinvolge il formato `economy.markets` e va fatta insieme al Generatore.

### 7.5 Prestazioni (Node, macchina di sviluppo)
| Mercati | ms per giorno simulato | Recupero massimo | Stato nel salvataggio |
|---|---|---|---|
| 5 (gioco) | 0,39 | 120 giorni, 46 ms | 10 KB |
| 35 | 2,8 | 85 giorni, 237 ms | 65 KB |
| 100 | 8,0 | 30 giorni, 235 ms | 183 KB |
| 300 | 24,6 | 10 giorni, 248 ms | 543 KB |
Ottimizzazioni: dati statici dei profili in cache, previsioni calcolate solo quando servono, controllo economico prima dei costosi, rotte in cache, raccolto con hash numerico. Il costo si paga una sola volta al cambio di giorno di calendario, non per fotogramma. **Non misurato**: effetto sul frame rate nel browser con centinaia di mercati, dispositivi deboli.

### 7.6 Test della seconda unità
| Prova | Esito |
|---|---|
| `node tests/economia-flussi-2.cjs` (nuovo) | **superato**; 36 189 asserzioni (la grande maggioranza nei cicli giornalieri, circa 170 affermazioni distinte). Copre: conservazione, determinismo con semi identici (35 mercati ripetuti), bilanciamento a 30/150/365 giorni su 3 semi, scorte essenziali, prezzi, spedizioni e riserve, assenza di inversioni e cicli, acquisti e vendite senza creare merce o denaro, cicli immediati senza profitto, arbitraggio finito, API `quote/deliver/procure` con limiti, profili generati, rotte connesse, mercato aggiunto a una partita salvata, salvataggi veri delle build `e67bd18` (senza flussi) e `6bf7317` (flussi v1), importazione nel gioco completo, prestazioni a 5/35/100/300 mercati |
| `node tests/economia-flussi.cjs` (158 controlli della prima unità) | **158/158 superati**, rieseguiti da `economia-flussi-2.cjs` e da soli, senza modificarli |
| `node tests/verifica-integrazione.cjs` | superato |
| `tests/prova-browser.cjs` 10/10, `prova-browser-velaris-est.cjs` 12/12, `prova-browser-economia.cjs` (Edge, build separata) | tutte superate, nessun errore JavaScript, nessun processo Edge rimasto |
| `python build.py` su file separato | riuscito; `Reincarnation.html` non ricostruito né committato |
Fixture reali in `tests/fixtures/`: `economia-senza-flussi.json` (economia di `main` `e67bd18`) e `economia-flussi-v1.json` (flussi di `6bf7317`, 80 giorni), generate con il codice di quei commit. Il formato salvato (`schema: 1`) **non è cambiato**: i flussi della prima unità si caricano identici.
**Non eseguibile / non verificato**: bilanciamento *giocando* (sensazione, ritmo dei guadagni), frame rate nel browser con molti mercati, touch.

### 7.7 File della seconda unità
Modificati: `market-flows.js` (da 322 a circa 510 righe), `trade-economy.js` (`quote`, `deliver`, `procure`, `flowReport` esteso). Nuovi: `tests/economia-flussi-2.cjs`, `tests/analisi-economia.cjs`, `tests/fixtures/economia-senza-flussi.json`, `tests/fixtures/economia-flussi-v1.json`. Nessun altro file.
**Nota di processo**: durante il lavoro un mio comando PowerShell ha svuotato per errore `market-flows.js` (percorso .NET relativo alla cartella sbagliata). Git ha negato il ripristino automatico da `HEAD`, che non ho aggirato: ho riscritto il file con lo strumento di scrittura a partire dalla versione committata più le modifiche già fatte. Il risultato è verificato dai 158 controlli, dalla seconda suite, dall'analisi e dalle prove nel browser. Nessun dato è andato perso e nessun altro file è stato toccato.

### 7.8 Integrazione ancora necessaria (dopo la Fase 2)
Oltre ai punti del §6: (a) rendere dinamica la lista dei mercati in `Economy` quando arriveranno nuove città (vedi §7.4); (b) mostrare `flowReport.outlook`/`routes`, tendenze e merci in viaggio nel pannello dell'economia (`economy-panel.js`, `panels.js`); (c) collegare i mestieri dei residenti di `urban-life.js` a `MarketFlows.activity`; (d) decidere la profondità dei mercati (scorte obiettivo per dimensione) per il commercio del giocatore; (e) i documenti condivisi (§6, punto 3), aggiungendo `tests/fixtures/` e i nuovi test alla sezione di verifica.
