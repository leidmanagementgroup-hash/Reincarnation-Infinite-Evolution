# ECONOMIA_VIVA.md — Economia viva (PERF-005, modulo in ombra)

> Progetto e misure del modulo `living-economy.js` (Claude, 2026-11-24, branch `claude/perf-005`). **Non integrato nel gioco**: non è in `build.py` né collegato al motore; il collegamento segue `PIANO_INTEGRAZIONE_WORLDSIM.md`. Parametri provvisori, da approvare dall'utente.

File: `living-economy.js` (`window.LivingEconomy`), prove `tests/verifica-economia-viva.cjs` (21 prove, ~3,5 s). Il modulo
**non** è nella build né collegato al motore. Nessun file esistente è stato modificato.

> Correzione (2026-11-24): l'utile in sospeso `wp` non era salvato e la continuazione dopo un ripristino poteva divergere; ora è nel salvataggio (prova 21).

## 1. Modello
- **Tempo**: passo canonico di una settimana (`WEEK = 10080` minuti). `eco.week` = prossima settimana da risolvere;
  `create(seed, places, now)` parte da `ceil(now / WEEK)`, come l'origine di `WorldSim`. Il passo non conosce il livello.
- **Stato per luogo** (aggregato): 11 tipi di attività (`farm, herbary, mine, workshop, pasture, sanctum, well, bakery,
  apothecary, smithy, trade`), ciascuno con numero di attività aperte, cassa, debito, deposito, settimane in perdita, utile medio
  (media mobile 1/4), occupati e scorte per merce; indice dei prezzi per merce, domanda stimata, indice dei salari, calamità in
  corso, segnali, crisi. **Banca per continente**, **tesoreria per regno** (`place.realm`, se assente il continente).
- **Settimana**, in ordine fisso: guerre e saccheggi per continente → calamità per luogo → carovane (rischio, arrivi, ritorni)
  → luoghi in ordine di id: occupazione (`min(lavoratori della professione, posti)`), produzione primaria (stagione, guerra,
  calamità, raccolto ±10% con seme, sforzo che cala con le scorte alte), trasformazione (pane da grano, pozioni da erbe, manufatti
  da minerale: le materie prime si comprano dagli altri detentori), salari e dividendi delle attività, salari pubblici della
  tesoreria, paniere delle famiglie (domanda elastica al prezzo, priorità ai beni di prima necessità), **un solo
  `transfer`** con salari, spesa e imposta, regolamento con gli importi applicati, interessi, licenze, imposta sugli utili,
  rimborsi e depositi, deperimento, banchi delle carovane, partenze, chiusure e aperture → banche (insolvenza o utili alle
  tesorerie) → prezzi, salari e segnali per la settimana dopo → registro delle merci.
- **Prezzi**: copertura = scorte (più le merci vendute dai banchi delle carovane) / domanda settimanale, relativa alla copertura
  obiettivo della merce (pane 0,3 settimane, erbe 0,8, acqua 1, pozioni 1,5, il resto 2). Sotto l'obiettivo l'indice sale fino a
  2500‰, sopra scende fino a 600‰; inerzia 1/2 a settimana. Prezzo = base × indice (base = `referencePrice` di market-flows).
- **Salari**: base per professione × indice del luogo, che segue posti vacanti − lavoratori inattivi e l'indice dei prezzi.
- **Carovane**: una per collegamento e settimana, solo merci trasportabili e solo se il prezzo a destinazione copre margine (10%)
  e costo (4% a settimana). Viaggio: 1 settimana nello stesso continente, 2–4 fra continenti (fisso per rotta). Merci
  **conservate** (non deperiscono) e contate «in viaggio»; rischio settimanale (0,3% / 1% oceanico, +8% in guerra, +2% con
  calamità): perdita totale o razzia di un terzo, sempre registrate (merci perdute per causa, borsa distrutta, evento). All'arrivo
  la carovana apre un **banco** nel mercato per una settimana (famiglie e botteghe comprano da lei); l'invenduto si offre alla
  casa mercantile locale, il dazio (5%) va alla tesoreria se cambia regno, poi torna a casa con borsa e resto. Credito
  commerciale: la banca anticipa il carico entro il limite di credito.
- **Banche**: depositi dell'eccedenza di cassa (con tetto), prestiti per i salari, per il carico e d'avvio (riserva obbligatoria
  20%, stretta del credito di 6 settimane dopo un'insolvenza), interessi sui prestiti pagati o capitalizzati, interessi sui
  depositi proporzionali all'impiego in prestiti. Fallimento di un'attività → prestito svalutato. Patrimonio negativo →
  **insolvenza**: depositi ridotti in proporzione, crisi nei luoghi del continente. Utili oltre il capitale → tesorerie.
- **Tesorerie**: imposta sul reddito (10% dei salari richiesti; sospesa per tutto il regno se la cassa supera 8 settimane di
  salari pubblici attesi), imposta sugli utili (15%), licenze, dazi, beni vacanti delle attività chiuse senza titolari; pagano
  guardie, studiosi, guaritori e manovali. In guerra guardie raddoppiate e pagate una volta e mezza; la **zecca** emette solo per
  coprire i salari pubblici di guerra (tetto 2 Scintille per abitante a settimana).
- **Attività**: chiudono dopo 12 settimane di utile medio negativo (una alla volta; settimane in perdita che calano di una alla
  volta = isteresi); all'ultima chiusura il debito non coperto si svaluta («fallimento»). Aprono (massimo 3 a settimana, con un
  prestito d'avvio di 4 settimane di salari) se ci sono lavoratori inattivi della professione e il prodotto scarseggia (indice
  ≥ 1100) o l'attività rende più del 10% dei salari in un mercato non saturo; case mercantili solo se il margine stimato per
  settimana di viaggio copre i salari di una casa.
- **Eventi** (seme, tipo, continente/luogo, settimana): guerra 0,5% a settimana per continente (4–16 settimane, produzione −20%,
  saccheggio di un luogo: −3% delle casse, −5% delle scorte); calamità 0,3% per luogo (incendio, alluvione, siccità, epidemia,
  terremoto) con perdite immediate e produzione ridotta per alcune settimane. `env.world.war(c, w)` e
  `env.world.disaster(id, w)` (facoltativi) permettono al coordinatore di imporre eventi esterni (politica futura).
- **Crisi** (segnale e evento, con fine registrata): cibo mancante ≥ 30%, banca insolvente di recente, disoccupazione ≥ 35%,
  chiusure recenti oltre una soglia proporzionale alle attività aperte.

## 2. Conti e invarianti (verificati da `audit(eco)` e dalle prove)
- **Denaro** (BigInt di Scintille): Σ casse + Σ riserve bancarie + Σ tesorerie + Σ borse delle carovane = apertura + emesso −
  distrutto + ricevuto dalle famiglie − pagato alle famiglie. Emissioni con causa: `zecca`, `nuovo luogo`; distruzioni:
  `saccheggio`, `calamita`, `carovana`, `luogo scomparso`. Con lo stub della popolazione: famiglie + conti = iniziale + emesso −
  distrutto, esatto a ogni settimana per 520 settimane.
- **Crediti**: per ogni banca, depositi = Σ depositi delle attività del continente; prestiti = Σ debiti. Svalutazioni e
  riduzioni dei depositi sono totali registrati (`writtenOff`, `haircut`).
- **Merci** (millesimi interi): scorte + in viaggio = apertura + prodotte + aggiunte(causa) − consumate − usate − deperite −
  perdute(causa). Nessun saldo negativo (casse, riserve, tesorerie, borse, scorte, carichi).
- **Determinismo e indipendenza dalla suddivisione**: nessun `Math.random`/`Date`; ordine fisso; stesso risultato con passo
  settimanale, `WorldSim.resolveAll` e `WorldSim.tick` a budget minimo; salvataggio → ripristino → continuazione identica.
- **Interfaccia popolazione**: si legge `summary` all'inizio della settimana; si usano solo gli importi **applicati** dal
  `transfer` (limitati a `[0, richiesto]`; se la popolazione ne restituisse di più li si limita: violazione del contratto).
  Salari applicati inferiori ai richiesti si ripartiscono fra i pagatori con i resti maggiori. Spesa applicata inferiore:
  si compra in ordine di priorità finché basta il denaro.

## 3. API
`create(seed, places, now)`, `restore(raw, places, now)` (stringa o oggetto; non lancia mai: dati danneggiati → economia nuova
con evento; registro incoerente ma ben formato → riallineato con evento; luoghi/continenti/regni nuovi o scomparsi → emissione o
distruzione registrata), `serialize(eco)` (JSON compatto con BigInt in stringhe), `step(eco, week, env)` (false se la settimana è
già passata; un salto in avanti è una pausa dichiarata), `system(get, envOf, {maxChunks=520})` → `{level:3, step:WEEK,
maxChunks, resolve}` per `WorldSim.register`, `signals`, `audit`, `report` (righe in italiano, prezzi, attività, banca,
tesoreria), `events` (tetto 240, contatori completi in `stats().counts`), `stats` (totali, ultima settimana, dimensione),
`caravans`, `wallet` (identico a `Economy.wallet` di trade-economy: verificato).

## 4. Parametri — TUTTI PROVVISORI, DA APPROVARE
Tabelle esportate in `LivingEconomy.params` (`provisional: true`): `goods` (base, fabbisogno settimanale per abitante, deperimento,
copertura obiettivo, trasportabilità), `types` (professione, posti, produzione per lavoratore, materie prime, stagioni),
`wages`, `workforce` (quote attese di lavoratori, ~80% degli adulti), `publicJobs`, `tax`, `bank`, `business`, `prices`,
`events`, `calamities`, `caravans`, `crisis`, `prosperityRef`, `limits`. I valori sono stati tarati solo sul mondo sintetico
delle prove (tre continenti, 12 luoghi abitati, stub con le quote di `workforce`): dopo la taratura prezzi ≈ 1000‰, nessuna
scarsità di cibo, ~1390 attività stabili, famiglie con ~20–30 Scintille a testa, nessuna crisi permanente; in 520 settimane
8 guerre, 14 calamità, 3 insolvenze bancarie, 8 crisi locali. Non cambiano nulla del bilanciamento del gioco attuale (modulo in ombra).

## 5. Compatibilità con MarketFlows (adattatore futuro, NON implementato)
`market-flows.js` resta la verità dei cinque mercati del giocatore (passo giornaliero, unità intere, registro con `external`).
Proposta: (1) i mercati `vela, filoni, velaris, namar, calis` diventano luoghi di `LivingEconomy` (stesso id, `continent-1…5`);
(2) un adattatore settimanale, al confine di settimana, porta in `LivingEconomy` le variazioni nette dei mercati del giocatore
(1 unità = 1000 millesimi) tramite una futura `exchange(eco, placeId, good, qty, money)` con causa `giocatore` (merci aggiunte o
perdute con causa, denaro emesso/distrutto con causa: il giocatore è fuori dai conti), così entrambi i registri restano esatti;
(3) per i mercati del giocatore si sceglie **una** sola fonte di produzione e consumo (proposta: MarketFlows nel luogo corrente,
`LivingEconomy` ovunque altrove), per non simulare due volte; (4) `trade-economy.price()` può leggere l'indice di
`LivingEconomy` per i mercati lontani. Le carovane di market-flows e quelle di `LivingEconomy` non devono coesistere sulle stesse
rotte. Decisione di direzione: all'utente.

## 6. Compatibilità con i cinque livelli
Il passo è identico a ogni livello (L1–L5 leggono lo stesso stato aggregato). Registrazione: `level: 3`, prima della popolazione
(stesso intervallo → ordine di registrazione). L'economia non crea né distrugge persone: i segnali (`foodScarcity, priceIndex,
wageIndex, unemployment, prosperity, crisis, war, disaster, season`) guidano la popolazione; materializzare un luogo non tocca
l'economia. Intervallo compresso di `WorldSim` (oltre `maxChunks`, default 520 settimane): **pausa dichiarata**, nessuna storia
inventata (`totals.pausedWeeks`): non equivale ai passi singoli (eccezione prevista dal contratto di `WorldSim`).

## 7. Misure (Node 24, questa macchina)
Una settimana: 50 luoghi ≈ 5 ms (mediana), 500 luoghi ≈ 39–41 ms. Salvataggio: 13 luoghi ≈ 27 KB dopo 60 settimane, 50 luoghi
≈ 38 KB, 500 luoghi ≈ 356 KB (cresce con i luoghi, non con il tempo: registro eventi a tetto, totali cumulativi).

## 8. Limiti e cose non fatte
- Nessun collegamento al motore, nessuna interfaccia, nessun adattatore con MarketFlows (solo descritto).
- Taratura solo sintetica; con la popolazione vera (quote di professioni diverse) i valori vanno rivisti e approvati.
- Locandieri, avventurieri e studiosi privati non hanno attività proprie (pagati solo come posti pubblici o fuori modello).
- Le famiglie non hanno depositi bancari (l'interfaccia del contratto prevede solo salari, spesa e imposte).
- Una settimana è un blocco unico: con 500 luoghi ~40 ms non sono divisibili dal budget di `WorldSim` (mitigazione futura:
  un sistema per continente, o passo per gruppi di luoghi con lo stesso ordine).
- 500 luoghi → salvataggio ~356 KB: per mondi grandi serve compattare i luoghi lontani (es. scorte a precisione ridotta).
- Il commercio si spegne quando i prezzi si livellano (corretto), ma con i parametri attuali le case mercantili sopravvivono solo
  dove ci sono squilibri forti; ricambio residuo di fucine e speziali (~1 chiusura ogni 40–50 settimane per luogo e tipo).
- `report().prices[].consumed` vale solo nella sessione (non salvato). Testi degli eventi con gli id dei luoghi (i nomi
  li aggiungerà il pannello).

---

# Seconda fase (2026-11-25): correzioni dopo la revisione indipendente

> Le sezioni precedenti descrivono la prima stesura, che la revisione ha trovato difettosa (secondo caricamento che azzerava il mondo, famiglie prosciugate, carestie croniche, 15 mutazioni su 31 non rilevate). Dove differiscono vale quanto segue.

## F2.1. Soglie di accettazione — FISSATE PRIMA di misurare il codice nuovo (2026-11-24, prima di ogni modifica a living-economy.js)
Orizzonti: 686 settimane (100 anni di calendario da 48 giorni) e 5 214 settimane; semi 1–5. Mondi: S = sintetico con stub
(12 luoghi, 250–3 000); R = residenti veri congelati (6 luoghi, 110–520); G = luoghi del gioco con residenti veri congelati
(12 luoghi, 140–600). In R e G si misura col bottino netto nullo (contratto 2: lo compensa la popolazione nuova); la versione col
bottino della copia congelata si riporta a parte e non è soggetta ad A4. Si scartano le prime 26 settimane (avvio). I luoghi sotto
20 vivi si escludono dalla settimana in cui scendono sotto quel numero (e si contano).
- A1 scarsità di cibo ≥ 300‰: per ogni luogo ≤ 10% delle settimane e mai più di 20 settimane di fila.
- A2 crisi: per ogni luogo ≤ 20% delle settimane e mai più di 40 di fila; nel mondo almeno una crisi ogni 100 anni in media sui semi
  (le crisi devono esistere) e ogni crisi finisce.
- A3 insolvenze bancarie: ≤ 1 per banca per decennio (68,6 settimane) in media.
- A4 moneta totale (famiglie + conti − bottino netto): entro ±10% a 686 settimane, ±15% a 5 214, in ogni punto di controllo.
- A5 prezzi: indice medio di ogni luogo fra 750 e 1 350; settimane con indice > 1 800 al massimo 5% per luogo.
- A6 attività: numero per abitante a fine corsa fra 50% e 200% di quello alla settimana 26; nessun tipo estinto in tutto il mondo per
  più di 104 settimane.
- A7 famiglie: in S almeno il 25% della moneta totale e almeno il 40% della ricchezza iniziale a testa in ogni punto di controllo;
  banche ≤ 40% e tesorerie ≤ 40% del totale. In R e G conti dell'economia a testa fra 0,4 e 2,5 volte il valore alla settimana 52.
- A8 disuguaglianza fra luoghi: indice di Gini della ricchezza a testa (pesato per abitanti) ≤ 0,40 a fine corsa.
- A9 prosperità: media per mondo fra 700 e 1 400; valori saturi (≤ 10 o ≥ 2 900) al massimo il 5% delle settimane-luogo.
- A10 disoccupazione media per luogo ≤ 350‰.
Conti: `audit` in pari a ogni settimana controllata; conservazione d'insieme esatta.
Prestazioni: a budget 1 ms la parte più lunga ≤ 4 ms con 500 luoghi (mediana dei massimi di 5 settimane).

## F2.2. Cosa cambia
- **Salvataggio**: cause `nuovo_luogo`/`luogo_scomparso` (le vecchie con lo spazio si leggono); lettura tollerante campo per campo, un
  solo importo illeggibile si ricava dal registro o dai totali della banca; si ricrea il mondo solo se il testo è illeggibile o di altro
  schema. Cambio di continente: i crediti si spostano con le riserve. `serialize` a metà settimana **lancia** un errore chiaro.
- **Passo divisibile**: `weekParts` (generatore) si ferma dopo ogni riassunto, guerra, calamità, luogo, banca, prezzo; registro merci
  versato a ogni luogo (audit in pari anche a metà). Un guasto chiude la settimana dov'è: niente doppi pagamenti. Nessuna pausa:
  `maxChunks` 1 000 000, intervallo compresso risolto settimana per settimana. **La popolazione deve usare lo stesso maxChunks**,
  altrimenti WorldSim alterna i due moduli in modo diverso.
- **Moneta**: `riconio` delle distruzioni registrate (in 26 settimane), `ritiro` delle emissioni in eccesso dalle tesorerie sopra la
  riserva. Aliquota sul reddito secondo la cassa (0–15%), eccedenze restituite in sussidi; perequazione fra i luoghi dello stesso
  regno (6‰ a settimana dello scarto oltre ±15% dalla media).
- **Credito**: quote settimanali per luogo (nessun ordine alfabetico), aperture solo con margine ≥ 10% del salario, dividendi mai con
  debiti o in perdita, rimborso prima dei depositi, deposito compensato alla chiusura; insolvenza: soccorso pubblico, poi riduzione dei
  depositi; crisi solo se la perdita è ≥ 3%; ricapitalizzazione in 26 settimane dalle tesorerie sopra la riserva. La guerra saccheggia
  anche la banca (2,5% a settimana).
- **Lavoro**: attività fondate sui lavoratori veri alla prima settimana; salari a ore secondo lo sforzo; locande (servizio senza
  scorte), vendita al dettaglio dei mercanti; chi non ha posto (addetti pubblici e locandieri compresi) conta nella disoccupazione;
  segnale `labor` per i 16 mestieri (100–3000). Attività senza addetti chiudono in 12 settimane.
- **Famiglie**: domanda legata alla ricchezza abituale (media mobile di 256 settimane); acqua attinta e pane di casa dal grano,
  registrati; scarsità = la peggiore fra sete e fame in equivalente grano. Prosperità = 50% reddito su paniere, 25% ricchezza
  sull'abituale, 25% paniere ottenuto. Crisi: cibo, banca (perdita grave), salto di disoccupazione, chiusure.
- **Carovane**: si carica prima ciò che rende di più per settimana di viaggio; ordine dei luoghi con seme, diverso ogni settimana.
- **exchange**(eco, luogo, merce, q, denaro, causa, idTransazione): q e denaro con segno (+ entra nel luogo); tutto o niente;
  `externalIn/Out` nel registro; idempotente sulle ultime 256 transazioni (salvate); rifiutato a metà settimana. Non collegato.

## F2.3. Parametri nuovi o cambiati (tutti PROVVISORI, da approvare)
Rese: fattorie 20/3, erbe 12, pascoli 13, essenza 8, pozzi 42, pane 17,5, pozioni 9, fucine 13 con 150‰ di minerale. `workforce`
e `publicJobs` (34/18/22/40‰) ricalibrati; `tax` (incomeMax 150, licenza 1, dazio 100, levy 6, levyBand 150), `coin`, `bank`,
`business` (openMargin, idlePay), `retail`, `home`, `labor`, `prosperity`, `crisis`, `limits.tx`; `riseSlope` 1000; calamità e guerre
più gravi (siccità 6 settimane al 20% del grano, alluvione −50% scorte, epidemia al 60%, guerra al 70%).

## F2.4. Uniche fonti di verità per l'integrazione con MarketFlows/trade-economy (proposta)
| Grandezza | Fonte unica | Gli altri |
|---|---|---|
| Denaro del giocatore | `s.player.gold` (borsello) e `s.economy.balance` (banca) | mai in `eco`; i passaggi sono `exchange` con causa |
| Inventario e deposito del giocatore | `s.bag` | solo lettura |
| Scorte dei cinque mercati (vela, filoni, velaris, namar, calis) | `s.economy.markets[].stock` | `eco` lì sospende produzione, consumo e carovane di merce e ne legge gli indici |
| Scorte altrove, merci in viaggio fra luoghi di `eco` | `eco.places[].b[].s`, `eco.caravans` | MarketFlows non ha rotte su quei luoghi |
| Ricchezza delle famiglie | `s.pop` | `eco` la legge da `summary`, la muove solo con `transfer`; `flows.wealth` diventa indice derivato |
| Casse, depositi, debiti, banche, tesorerie | `eco` | sola lettura nei pannelli |
| Prezzi al giocatore | `Economy.price` nei cinque mercati | indici di `eco` per i luoghi lontani |
| Transazioni | `eco.tx` (idTransazione) | `trade`, `deliver`, `procure` chiamano `exchange` una volta sola, mai un confronto settimanale delle scorte |
Scale diverse (8–16 abitanti nei tratti di MarketFlows, 140–600 nei luoghi): serve un fattore esplicito per mercato, da approvare.

## F2.5. Esiti (popolazione congelata, banco `review-eco2/accetta.cjs`; tarato fino a farcela, soglie invariate)
A1–A10 accettate in 15 corse su 15 a 686 settimane e 15 su 15 a 5 214 (S, R, G, semi 1–5). Crisi medie nel mondo per corsa: 686 w S 5 /
R 4 / G 6,6 (minimo 2); 5 214 w S 55 / R 30 / G 69. Insolvenze per banca per decennio: massimo 0,37. Gini massimo 0,36 (R, 5 214;
il margine più stretto). Col bottino congelato (R e G, 2 semi, 686 w) accettate. Durante la taratura erano fallite A5, A6, A8 e A10
(scarsità di mestieri fissi, fucine estinte, città importatrici prosciugate, trappola dei forni chiusi): corrette nel modello.
Prove 48/48; mutazioni 61/61 rilevate (54 subito, 7 con la prova 47). Salvataggio e ripristino ogni settimana: 3 600 settimane, 0 divergenze.
Misure (stub): 50 / 200 / 500 luoghi: settimana 7,5 / 27,5 / 65,9 ms (prima 5 / – / 46); a budget 1 ms chiamata più lunga 1,1 / 1,8 / 2,9 ms
in 8 / 25 / 70 fotogrammi; parte singola massima 0,5 / 1,3 / 6,4 ms (carovane, fisco o pausa del raccoglitore: non distinte);
salvataggio 61 / 208 / 468 KB (prima 40 / – / 378).

## F2.6. Limiti
- Taratura sulla popolazione congelata (mestieri che non seguono `labor`): da rifare con la popolazione nuova. R e G col bottino
  congelato crescerebbero ancora di moneta (famiglie): il pozzo è compito della popolazione (`upkeep`).
- Nessuna seconda linea di sicurezza fra regni: gli scambi fra continenti possono ancora spostare ricchezza per secoli.
- `exchange` riconosce i doppioni solo fra le ultime 256 transazioni. Le settimane di un'assenza lunghissima si risolvono tutte.
- Nessun collegamento al motore, nessuna prova nel browser.
