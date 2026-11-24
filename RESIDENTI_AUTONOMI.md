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
