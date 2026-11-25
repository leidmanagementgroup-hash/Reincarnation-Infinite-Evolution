# RESIDENTI_AUTONOMI.md — Residenti autonomi (PERF-005, modulo in ombra)

> Progetto e misure del modulo `world-population.js` (Claude con un subagente, 2026-11-24, branch `claude/perf-005`), con le prove `tests/verifica-popolazione.cjs`
> (20, circa 8 s; `ONLY=3,9` per alcune). **Non integrato nel gioco**: non è in `build.py` né collegato al motore; il collegamento segue `PIANO_INTEGRAZIONE_WORLDSIM.md`.
> Parametri provvisori, da approvare dall'utente. I file scritti dal subagente sono stati rieseguiti e verificati dal coordinatore.

## 1. Modello
- **Cella** = (luogo, stirpe, fascia d'età, professione, coniugato). Il bit «coniugato» è un'estensione della cella richiesta
  (luogo, stirpe, stadio, professione): senza di esso morti, vedovanze e nascite non sono decidibili in modo identico nelle
  due rappresentazioni (verificato a tavolino: ogni stato del coniuge fuori dalla cella rompe l'equivalenza).
- **Fasce d'età** per stirpe: infanzia in B ≤ 10 secchi di Lb settimane che avanzano tutti insieme su una griglia assoluta
  (`settimana % Lb === 0`; umani Lb = 94 settimane), poi adulti A1–A3 e anziani E1–E2 con transizioni a riporto (Erlang:
  durata dispersa ma limitata). Bambini e anziani senza professione; i nuovi adulti entrano «senza lavoro».
- **Coorti** (luoghi non materializzati): `anon: Map(chiave → conteggio)` e `pool` (cassa del luogo, BigInt di Scintille).
- **Record** (luoghi materializzati e immigrati noti): colonne typed array (luogo, origine, serie, stirpe, fascia, mestiere,
  stato civile 0/1/2, vivo, notabile, causa, ferite, obiettivi, spostamenti, nascita, morte, coniuge, genitori, esperienza,
  figli, 5 tratti, 4 bisogni) + `BigInt64Array` per la ricchezza. Strutture sparse con tetto: memoria (8 ricordi) e relazioni
  (6 legami, forza 1–1000; le conoscenze deboli lasciano posto alle nuove). Identità `idLuogo:n` (n = contatore di conio del
  luogo; tratti e nome derivano da `hash(seme, luogo, n)`).
- **Luoghi misti**: un luogo non materializzato può ospitare record (immigrati da luoghi materializzati). Conteggio di cella =
  anonimi + record. I record **non tornano mai coorti**; `materialize` converte tutti gli anonimi (idempotente).

## 2. Passo settimanale canonico (`step(pop, w, env)`, uguale a ogni livello)
Ordine fisso: secchi dell'infanzia → fasce adulte/anziane → morti → spedizioni → mestieri → matrimoni → nascite → migrazioni
(due fasi: decisioni di tutti i luoghi, poi arrivi) → vita dei record (bisogni, obiettivi, ferite, esperienza, relazioni,
cassa comune). Il censimento dei record si ricostruisce fra una fase e l'altra. `system(get, envOf)` dà a `WorldSim` livello 3,
passo `WEEK`, `maxChunks` 520; anche l'intervallo compresso si risolve settimana per settimana (esatto).

## 3. Regola dei quanti (cuore dell'equivalenza)
1. Per luogo e meccanismo: X = Σ celle (n × tasso in ppm/settimana) in micro-unità intere; K = ⌊(X + riporto)/10⁶⌋;
   il **riporto** (intero, per luogo e meccanismo, `age, death, depart, career, migrate, marry:L, birth:L`) si salva.
   Il riporto iniziale è una fase con seme, così i luoghi non scattano tutti insieme.
2. K si distribuisce fra le celle in ordine di chiave: parte intera di ciascuna, poi estrazioni con seme
   `hash(seme, luogo, meccanismo, settimana, j)` pesate sui resti (o sulla capienza). Mai `Math.random`, mai `Date`.
3. Cella mista: quanti fra anonimi e record con arrotondamento a seme; fra i record **chi** agisce = utilità decrescente,
   spareggio a hash (mai l'ordine di creazione). Le destinazioni (migrazione) e gli esiti (spedizioni) dipendono solo da
   cella e indice j; gli esiti migliori vanno ai più esperti della cella.
4. Mestieri: obiettivi di quota per tipo di luogo e segnali; ogni mossa estrae mestiere di partenza (eccedenza), di arrivo
   (carenza) e cella. Matrimoni: coppie per (luogo, stirpe); per ogni coppia metà delle volte il partner viene dalla stessa
   cella (omogamia), poi nei record prima le coppie già legate dentro le quote, poi il resto per desiderio di famiglia.

| Decisione | Utilità individuale (record) |
|---|---|
| morte | età + ferite×20 + fame×2 (notabili **senza** esenzione) |
| invecchiamento | il più anziano |
| spedizione | audacia×3 + ambizione×2 + bisogno di denaro×2 − ferite×4 + obiettivo gloria/fortuna |
| mestiere | bisogno di denaro, ambizione, «senza lavoro» +300; obiettivo maestria trattiene; audacia verso «avventuriero» |
| matrimonio | legame (corteggiamento) ×3, socievolezza, bisogno di compagnia, obiettivo famiglia |
| migrazione | voglia di viaggiare×3 + bisogni (denaro, sicurezza×2, cibo) + obiettivo viaggio/fortuna − legami nel luogo |
| genitori | obiettivo famiglia, socievolezza, compagnia − 30 per figlio |

Obiettivi a lungo termine (famiglia, maestria, fortuna, gloria, viaggio) scelti dai tratti, realizzati e sostituiti (ricordo
e voce nel registro); a breve termine dal bisogno più urgente (mangiare, sicurezza, guarire, lavoro, guadagno, compagnia).

## 4. Ricchezza (Scintille, BigInt esatti)
- `summary.wealth` = cassa + Σ ricchezza dei record vivi del luogo. Nessuna scintilla creata o persa: unica fonte esterna il
  **bottino** delle spedizioni (registrato in `totals.loot`); uscite/entrate solo da `transfer`.
- `transfer`: salari divisi in parti uguali fra i lavoratori della professione (resto ai primi per indice, quota anonima alla
  cassa; professione senza lavoratori → 0 applicato); spesa e tassa limitate alla ricchezza, prelevate in proporzione (cassa
  e record), mai sotto zero.
- **Borsa del migrante = quota pro capite del luogo** (⌊ricchezza/vivi⌋), uguale in entrambe le rappresentazioni: il record
  lascia l'eccedenza alla cassa o riceve la differenza (cassa, poi i più ricchi). Eredità: coniuge nello stesso luogo, poi
  figli nel luogo, poi cassa. Cassa comune ridistribuita agli adulti dei luoghi senza anonimi.
- Saturazione: oltre 2⁶³−1 l'eccedenza resta nella cassa del luogo (prova 13 con 2⁶⁶ Scintille).

## 5. Invarianti verificate dalle prove
Determinismo (2); equivalenza a 60 settimane con 5 piani di materializzazione, luoghi misti compresi (3; a parte: 10 anni
identici fra «tutto coorti» e «tutto record»); idempotenza e identità stabili (4); vivi = iniziali + nascite − morti,
partenze = arrivi, id unici, nessuna resurrezione, un solo luogo per vivo, Scintille esatte (5); salvataggio → ripristino →
continuazione identica (6); passo diretto = WorldSim a piccoli passi = `resolveAll` = intervallo compresso (7); tutti gli
iniziali muoiono, notabili compresi (8); autonomia (9); spedizioni con tutti gli esiti (10); ripristino senza eccezioni su
21 casi danneggiati (11); registro e tetti (12); trasferimenti esatti e saturazione (13); prestazioni (14); biologia (15).
Mutazioni rilevate (16–20): esenzione dei notabili, borsa dalla ricchezza personale, resto perso alla materializzazione,
scelta per indice, riporto non salvato.

## 6. API (`window.WorldPopulation`)
`create(seed, places, now)` · `restore(raw, places, now)` (non lancia; dati non validi → ricreata dal seme, `pop.note`;
luoghi nuovi aggiunti dal seme) · `serialize(pop)` · `step(pop, week, env)` · `system(get, envOf)` · `summary` · `transfer`
· `materialize` · `residents` · `person` · `events` (tetto 300) · `decisions` (chi ha agito nell'ultima settimana) · `stats`
· `cells` · `influence(pop, id, {traits, needs, goals})` (prove e future azioni del giocatore) · `biology`, `limits`.
`places` accetta il campo facoltativo `lineages: {stirpe: peso}`; senza, il miscuglio deriva dal continente.

## 7. Parametri
**Dal gioco**: età adulta (giorni) da `ContinentalBiology` (umani 6570 = regola di `society.js`, nani 8400, scheletri 3,
orsi 280, fate 820, elementali 10, viverne 350, grifoni 390). Nota: `growth.js` ha per gli umani 5840 (`biologyRows`), che
prevale su `ContinentalBiology` nel gioco: si è seguita la consegna (6570). Da chiarire con l'utente.

**PROVVISORI, DA APPROVARE DALL'UTENTE** (tabella unica `PROVISIONAL` nel modulo):

| Stirpe | anni da adulto | anni da anziano | nascite/coppia/anno |
|---|---:|---:|---:|
| umano | 42 | 16 | 0,12 |
| nano | 100 | 40 | 0,035 |
| scheletro | 60 | 20 | 0,02 («risvegli») |
| orso | 18 | 6 | 0,35 |
| fata | 50 | 20 | 0,06 |
| elementale | 80 | 20 | 0,02 |
| viverna / grifone | 40 | 15 | 0,10 |

Altri tassi provvisori (ppm a settimana salvo indicazione): morte bambini 25, A1 30, A2 50, A3 120, E1 0,5·10⁶/vecchiaia,
E2 2·10⁶/vecchiaia (× fame, calamità, guerra); matrimoni A1/A2/A3 3500/2500/800 (× prosperità, crisi, guerra); fertilità
A1/A2/A3 ×1/0,8/0,25 con tetto di affollamento (zero a 1,5× la capienza); migrazione 500 + fame×3 + crisi 4000 + guerra 8000 +
calamità 6000 + richiamo dei vicini; spedizioni 40 000 (4 %); mestieri 25 000 della carenza; esiti: morte 1,2 %×pericolo,
ferita 6 %×pericolo, successo 50 % (bottino pericolo×400–2000 Scintille); quote dei mestieri per villaggio/borgo/città;
ricchezza iniziale pro capite 800/1500/2500/4000 Scintille; distribuzione iniziale 24 % bambini, 60 % adulti, 16 % anziani.

## 8. Misure (Node 24, questa macchina)
- 100 000 residenti in coorti (200 luoghi): ~49 000 celle, **32–42 ms per settimana**, salvataggio 380 KB.
- 10 000 record (20 luoghi materializzati): materializzazione 66–77 ms, **22–26 ms per settimana**, memoria stimata 4,7 MB,
  salvataggio ~1,4 MB.
- Mondo di prova 1040 abitanti, 10 anni: coorti 361 ms totali, salvataggio 8 KB; tutto in record 1,5 s, 233 KB (1221 record,
  165 morti conservati). Popolazione stabile (1040 → 1056).

## 9. Limiti e cose non fatte
- **Granularità delle celle**: con molti mestieri le celle dei single hanno spesso 1–2 persone, quindi la regola di cella
  decide già chi agisce; i record scelgono solo dove c'è margine. Matrimoni da relazione misurati 13/31 (80 settimane) e
  95/166 (10 anni) contro una base casuale ~13 %; la soglia della prova (≥ 30 % e ≥ 3× il caso) è stata fissata dopo la misura.
- Solo i single adulti migrano (le famiglie non si spostano insieme); i vedovi non si risposano e contano ancora nella
  fertilità; matrimoni solo nella stessa stirpe; spedizioni di una settimana verso luoghi selvaggi collegati (altrimenti
  «terre selvagge»).
- I record dei morti restano (memoria storica): il salvataggio cresce con la storia; compattazione non fatta.
- Una settimana con 100 000 residenti costa ~35 ms: in gioco va spezzata per luogo o a quote (non fatto); misure solo in Node.
- Economia: le prove del modulo usano uno stub; la prova con `living-economy` vera è `tests/verifica-mondo-livelli.cjs` (7/7). Segnali non validi → neutri.
- Solo le 8 stirpi di `ContinentalBiology` (non le 44 del gioco); nomi da sillabe; testi al maschile generico.
- `restore` conserva i luoghi spariti dal mondo; limiti tecnici: 65 535 luoghi, serie a 32 bit.

---

# Seconda fase (2026-11-25): riscrittura dopo la revisione indipendente

> Le sezioni precedenti descrivono la prima stesura (schema 1), che la revisione ha trovato difettosa (12 difetti, 10 mutazioni su 16 non rilevate). Dove differiscono vale quanto segue. Prove: 65/65. Il coordinatore ha poi allineato `maxChunks` a quello dell'economia e adattato `tests/verifica-mondo-livelli.cjs` (8/8).

## F2. Soglie fissate PRIMA di scrivere il codice e di misurare (non modificate)
- S1 Neutro, 100 anni di calendario (686 settimane), luogo isolato da 400 di una sola stirpe, 44 stirpi × 2 semi: finale 70–115 %
  della capienza, mai oltre 125 %. — **Esito: 92–110 %.**
- S2 Villaggio isolato da 60, 100 anni: mai sotto 20 (8 stirpi base). — **Minimo 52.**
- S3 Umani, città 5000: un anno (7 sett.) di carestia 1000 uccide 8–25 %, di guerra 2–12 %, 4 settimane di epidemia 3–15 %; dopo
  2 anni < 97 % di prima; dopo 50 anni ≥ 80 %. — **18,4 %, 3,7 %, 5,8 % in più del neutro; recupero ≥ 100 %.**
- S4 Scelte forzate ≤ 35 % in un luogo da 500; nessun tipo > 60 %. — **Prima (v1) 38,9 % (matrimonio 60, spedizione 55, migrazione 48);
  dopo 0,3 % (massimo: migrazione 3 %).**
- S5 55 000 record vivi ≤ 2,5 MB, appena materializzati e dopo 100 anni; righe di morti 0. — **1,48 MB; dopo 100 anni 2,58 MB per
  58 978 vivi = 2,41 MB per 55 000. Margine stretto.**
- S6 Parte più lunga a budget 1 ms: massimo ≤ 16 ms, p99 ≤ 4 ms. — **Rispettata** per 100 000 in coorti (1,17 ms), 10 000 record in 20
  luoghi (1,46), 50 000 in 100 luoghi (3,0), 10 000 in UN luogo (4,1; p99 3,6). **NON rispettata per 50 000 in un solo luogo (79 ms, p99 46).**
- S7 Consanguinei sposati 0; ripiego «adozione» ≤ 1 % dei matrimoni; minori separati ≤ 15 %. — **0; 0/858; 0 su 25.** Nei mondi casuali del
  fuzz (luoghi da pochi abitanti e molte stirpi) il ripiego è ~1–1,5 % (117/8011): fuori dallo scenario della soglia, dichiarato.
- S8 Bottino netto in 100 anni ≤ 5 % della moneta. — **1,1 %.**

## F2. Cosa cambia rispetto alla v1
1. **Due strati.** Aggregato (autorità): per luogo e stirpe `h` (istogramma d'età) e `c` (8 classi: adulto/anziano × celibe, sposato con
   adulto, sposato con anziano, vedovo); per luogo `jobs` (18) e `wealth`. I record scelgono soltanto chi agisce.
2. **Equivalenza sui margini, non più per cella congiunta (stirpe × fascia × mestiere × coniugato).** Motivo tecnico: se il mestiere sta nella
   cella, chi agisce è quasi imposto (celle da 1–2 persone) e ogni scelta libera cambierebbe lo stato delle regole. I margini sono lo stato
   sufficiente: nessuna regola legge altro e nessuna legge i record (generatori separati `ar`/`rr`). Dimostrazione: per costruzione +
   `audit` (proiezione esatta) + prove 3, 3b (12 mondi × 200 settimane × 4 piani) + fuzz esterno 39 mondi × 300–400 settimane: 0 rotture.
   `cells()` restituisce i margini, quindi l'impronta di `verifica-mondo-livelli` resta valida.
3. **Mestieri.** Lo strato aggregato sposta i posti; una volta a settimana i record si riallineano: chi subentra lo decide l'utilità fra tutti
   i lavoratori dei mestieri in eccesso.
4. **Ricchezza.** `wealth` del luogo è l'autorità; la cassa è derivata (wealth − record). `transfer` è immediato ed esatto sull'aggregato; ai
   record arriva all'inizio del passo seguente (importi in sospeso `due`, salvati).
5. **Età.** Bambini: fascia esatta dalla nascita su griglia assoluta, mai adulti in anticipo (umani 18,6–19,3 anni). Adulti e anziani:
   istogramma del luogo; vanno in pensione i più vecchi della classe.
6. **Matrimoni** fra celibi della stessa stirpe senza consanguinei né rivali; **lutto** poi nuova disponibilità; **famiglie** che migrano coi figli;
   **fondazioni/ripopolamento** (luogo adatto con < 12 abitanti, senza crisi; gruppo di una stirpe da un luogo collegato ≥ 80 abitanti).
   Nei luoghi misti il coniuge anonimo di un residente noto diventa a sua volta noto.
7. **Azioni personali** (amicizia, corteggiamento, rivalità, aiuto, riconciliazione, progetto): nessun effetto sui margini, contano nelle utilità
   (matrimonio, migrazione, spedizione, mestiere). Legami con segno −60…60.
8. **Passo divisibile**: generatore; `resolve` restituisce `false` quando `info.due()`. A metà settimana `serialize`, `materialize`, `transfer`,
   `influence`, `know` completano prima la settimana (segnali congelati): nulla si perde. Le viste non la completano.
9. **Settimane arretrate** (cursore avanti): segnali neutri, oppure `env` come funzione della settimana.
10. **Salvataggio**: record per luogo in base64 con controllo; riga dei morti liberata; nomi e tratti ricavati dall'identità; bisogni ricalcolati.
    Memoria/legami: 2/3 per i comuni, 4/4 notabili, 8/6 conosciuti o influenzati. Lapidi (≤ 2000) solo per notabili e per chi è legato a un
    conosciuto. `person(id)` di un morto comune restituisce `null` (il nome resta leggibile nei ricordi altrui).
    Guasti: si ripara il campo o il singolo luogo (torna aggregato con le stesse persone, nuove identità), con `pop.note`.
11. **Segnali** `labor` (quote × 0,25…2, spostamento 4 % a settimana dello scarto) e `totals.upkeep` (viveri ≈ bottino atteso).

## F2. Integrazione (per il coordinatore)
- `tests/verifica-mondo-livelli.cjs`: le prove 1 e 5 richiedono `… + loot − upkeep` (provato in copia: 7/7).
- Passare `kind: 'interior'` per gli interni (la prova 7 li passa come `wild`: verrebbero colonizzati).
- `places` accetta `lineages: {id: peso}` (max 12 per luogo) e `capacity`. `configureBiology(tabella)` prima di create/restore.
- `residents().wealth` è quello di inizio settimana fino al passo seguente.
- Schema 1 non si migra (era in ombra): ricreato dal seme con nota.

## F2. Parametri provvisori (da approvare)
Tabella `TABLE` (44 stirpi: adulta, anziana, durata, figli per coppia, sopravvivenza infantile, origine). Carestia 2,5 %/sett. a scarsità 1000
(quadratica sopra 200; bambini ×1,3, anziani ×1,5); guerra 0,7 %/sett. adulti, 0,35 % gli altri; calamità 1,2 %/sett. (×1,4 bambini, ×1,8 anziani).
Nascite: piene sotto 75 % dell'affollamento, zero a 125 % (metà luogo, metà quota della stirpe). Guerra perenne → declino: voluto.

## F2. Limiti noti
- Età dei bambini non conosciuti approssimata: quando una famiglia migra, alcuni bambini si spostano di una fascia (Lk, ~0,9 anni umani).
- Pensionamenti umani 53–92 anni (mediana 60), morti fino a 104; 2,3 % degli adulti lavora oltre 1,15 × l'età anziana.
- Coppie lontane d'età possibili (p95 40 anni umani, vedovi compresi).
- Comunità con meno di 20 coppie della stirpe: migrano solo coppie senza figli al seguito.
- Nascite miste solo nella stessa stirpe; nessun matrimonio fra stirpi.
- `stats.choices` e `decisions` sono diagnostica: non si salvano.
