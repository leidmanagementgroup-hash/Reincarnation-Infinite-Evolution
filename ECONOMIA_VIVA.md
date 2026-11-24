# ECONOMIA_VIVA.md — Economia viva (PERF-005, modulo in ombra)

> Progetto e misure del modulo `living-economy.js` (Claude, 2026-11-24, branch `claude/perf-005`). **Non integrato nel gioco**: non è in `build.py` né collegato al motore; il collegamento segue `PIANO_INTEGRAZIONE_WORLDSIM.md`. Parametri provvisori, da approvare dall'utente.

File: `living-economy.js` (`window.LivingEconomy`), prove `tests/verifica-economia-viva.cjs` (21 prove, ~3,5 s). Il modulo
**non** è nella build né collegato al motore. Nessun file esistente è stato modificato.

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
