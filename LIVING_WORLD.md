# Operazione Living World 2.0 — il mondo vive, ricorda e reagisce

Piano e registro dell'operazione «Living World 2.0» (richiesta dell'utente del 2026-11-23). Branch `claude/living-world-2`, worktree `C:\Users\elaro\Downloads\Reincarnation-living-world`, base `main` `96eb9be` (verificato sul remoto). Nessuna modifica a `main`, nessun merge senza consenso. L'audit dettagliato dei quattro revisori è in [LIVING_WORLD_AUDIT.md](LIVING_WORLD_AUDIT.md).

Vincoli permanenti di questa operazione:
- Non ripetere il lavoro di RPG Evolution (`RPG_EVOLUTION.md`): avvisi, combo, avanzamento evolutivo, soglie dell'innata, coda dei messaggi, consigli, accessibilità.
- Non toccare il lavoro urbano di Codex: `urban-districts.js`, `urban-sector-layout.js`, `urban-lab.js`, `urban-lab-start.js`, `urban-profiles.js`, planimetrie, cache dei settori, worktree di Codex. `urban-life.js` resta in sola lettura (routine, PERF-003).
- Assegnazione casuale delle stirpi, requisiti delle evoluzioni, rarità, bilanciamento, rapporto fra le quattro valute, biologia di Umano e Scheletro: invariati salvo decisione dell'utente.
- Morte permanente degli NPC, resurrezione rara, Statue della Rinascita solo per il giocatore.
- Quantità esatte (BigInt), determinismo (nessun `Math.random` nelle conseguenze), un solo file HTML offline, salvataggi precedenti caricabili.

## Incremento 0 — Rapporto tecnico iniziale

### Stato del repository (verificato il 2026-11-23)
- `origin/main` = `96eb9be` (RPG Evolution unita sopra Calis e Filoni).
- `codex/urban-scale` (laboratorio Confluenza, 25/50/100/250 edifici, commit `b92caef`) **non è integrato** in `main`. Tocca `build.py` (riga 10 di `MODULES`, opzione `--urban-lab`), `urban-world.js` (1 riga), `urban-districts.js`, i nuovi `urban-sector-layout.js`, `urban-lab.js`, `urban-lab-start.js` e i documenti. Il laboratorio rinomina la chiave `reincarnation.lumora.save.` solo dentro `engine.js`: questa operazione non scrive chiavi `localStorage` con quel prefisso fuori da `engine.js`.
- Un nuovo modulo di questa operazione va in `MODULES` dopo `reputation.js` (riga 14): righe diverse da quella di Codex, separate da righe invariate, quindi l'unione futura non entra in conflitto su `build.py`.

### Metodo
Quattro revisori in sola lettura con perimetri distinti (simulazione e salvataggi; NPC e relazioni; economia e professioni; specie, progressione e missioni), poi verifica diretta dei punti decisivi con il motore reale in Node. Dove un'affermazione dei revisori è stata verificata, smentita o ridimensionata è scritto qui sotto; il resto è marcato «dal codice».

### Matrice dei sistemi

Legenda: ✅ funzionante · 👁 funzionante ma poco visibile · 🔌 implementato ma scollegato · 🟡 parziale · ⛔ assente.

| Sistema | File | Dati salvati | Stato | Note verificate |
|---|---|---|---|---|
| Calendario e meteo | `calendar.js` | `calendar{seed,offset}` | ✅ | nessun evento di «cambio giorno»: i sistemi giornalieri confrontano il giorno da soli |
| Passo del mondo | `engine.js` `step` | — | ✅ | impulso ogni ~1,15 s (`life.nextPulse`): `Life`, `Society`, `Build`, `Economy`, `Legendary`, `Daily`; `Conflicts` e `UrbanLife` per fotogramma |
| Azioni del giocatore → sistemi | `engine.js` `record()` | — | ✅ | chiama in modo fisso `Growth`, `Life`, `Daily`, `Reputation`, `Guild`; `Game.onEvent` ha un solo ascoltatore (l'interfaccia). Non esiste un bus degli eventi |
| Registro delle azioni del giocatore | — | — | ⛔ | solo frammenti: `conflicts.events` (≤32), `life.news` (≤8), memorie per abitante |
| Cronaca di Lùmora (diario) | `world-life.js` | `life.news` | 🔌 | eventi a orario fisso a rotazione, non legati al giocatore |
| Mestieri (17) | `world-life.js` | `life.xp` | 🟡 | effetti meccanici solo per fabbro, pescatore, contadino, allevatore, cuoco; il mercante ha solo esperienza; falegname, sarto, alchimista, erborista, cacciatore sono nomi con esperienza |
| Incarichi quotidiani e offerta del giorno | `daily-life.js` | `daily.quests`, `offerClaimed` | 👁 | l'offerta nasce da carenze reali (`Economy.shortage`), lupi e meteo: unico precedente di evento contestuale; protetta dal doppio pagamento |
| Commissioni di Ivo, Calis, Velaris, gilda | `engine.js`, `daily-life.js`, `urban-life.js`, `guild.js` | stato proprio | 👁 | doppio pagamento impedito; il diario non mostra gilda e Velaris |
| Abitanti con memoria (Society) | `society.js` | `society.people[id].memories` (≤16) | 🟡 | ricordi solo `chat`/`trade`/`gift`; fiducia = numero di tipi distinti (≤5), non scende mai; tempi in secondi reali; personalità solo testo salvo `interest` |
| Nerea, Tessa, Ivo | `world-life.js`, `engine.js` | solo stato fisico (`conflicts`) | 🟡 | identità stabile (`elder`, `merchant`, `smith`), nessuna memoria del giocatore |
| Residenti di Velaris | `urban-life.js` (sola lettura) | `urban.people` (≤8 ricordi) | 🟡 | fiducia calcolata ma mai usata |
| Reputazione | `reputation.js` | `reputation.standings` (±100), titoli, limiti giornalieri | 👁 | effetto solo su prezzi (±2) e titoli; nessun NPC la legge |
| Testimoni e diffusione delle notizie | `npc-conflicts.js` | `witnessed` | ⛔ | solo la negligenza vista dal giocatore (−1 alla città); nessuna conoscenza per NPC |
| Conflitti, morte, soccorso, rito | `npc-conflicts.js` | `conflicts` | ✅ | morte permanente protetta dalla validazione; rito unico (62%, un solo risorto) |
| Famiglia (corteggiamento, matrimonio, adozione) | `society.js` | `society.partner`, figli | 🟡 | da sconosciuti a sposati in ~3 minuti reali; dopo la morte del coniuge non ci si può più sposare (D-2, dal codice) |
| Gilda e compagni | `guild.js` | `guild` | ✅ | compagni mortali (GAME_DESIGN §4.9); membro morto resta in squadra (D-7, dal codice) |
| Mercati e flussi | `trade-economy.js`, `market-flows.js` | `economy` (BigInt in stringa) | 👁 | produzione, consumo, deperimento, 8 rotte, registro esatto: simulati davvero; tendenze e merci in viaggio invisibili (ECO-003) |
| API `Economy.quote/deliver/procure/flowReport` | `trade-economy.js` | — | 🔌 | nessun chiamante nel gioco |
| Prezzo degli scambi del giocatore | `trade-economy.js` `trade` | — | ⚠️ | **difetto critico verificato (LW-ECO-01)** |
| Forgia e qualità | `tradecraft.js`, `trades-practice.js` | `workshop` | 🟡 | lame `blade-0…3` per qualità; la qualità non cambia il prezzo (dal codice e dalla prova del revisore) |
| Economia dei borghi | `society.js` | `society.towns` | 🔌 | i nove borghi arrivano al livello massimo col solo passare del tempo (dal codice) |
| Canali a prezzo fisso | `world-life.js`, `construction.js`, `society.js` | — | 🔌 | banco delle sementi (+1 essenza), bottega della fattoria, residenti che comprano minerale: aggirano il mercato (decisione dell'utente) |
| Stirpi (44) e predisposizioni | `growth.js`, `continental-species.js`, `expansion-species.js` | `player.race`, `growth` | ✅ | sorteggio pesato: Slime 14,4%, Goblin 12,0%, Viverna di brina 0,32% |
| Identità della specie fuori dal combattimento | `daily-life.js`, `society.js`, `gear.js` | — | 👁 | bisogni e temperatura per specie, età di corteggiamento, etichette di slot: presenti ma senza numeri visibili; volo, nuoto, terreno, prezzi e reazioni sociali per specie assenti |
| Missioni contestuali generalizzate | — | — | ⛔ | embrione in `Daily.offers` |
| Regole per continente | — | — | ⛔ | dati per regione sparsi; i cinque mercati corrispondono già ai cinque continenti |
| Persistenza | `engine.js` `parseSave` | v7, `saveKeys` v7…v1 | ✅ / ⚠️ | ogni sezione che non supera il ripristino fa scartare tutto il salvataggio: il gioco ripiega sulla chiave più vecchia (verificato in `savedCandidate`) |

### Interconnessioni attuali

```
azione del giocatore ──► engine.record() ──► Growth (evoluzione) · Life (mestieri) · Daily (incarichi) · Reputation · Guild
scambio al mercato ──► Economy.trade ──► scorte del mercato ──► MarketFlows (registro, flussi esterni)
giorno di calendario ──► MarketFlows (produzione, consumo, rotte) ──► prezzi ──► Daily.dailyOffer (carenze)
pattuglie e mostri ──► Conflicts (ferite, morte) ──► Reputation (negligenza vista) · lutto ──► prezzi +1
Society (memorie per abitante) ──┐
UrbanLife (memorie di Velaris) ──┼─► nessun sistema le legge per cambiare opportunità o prezzi
Reputation ──────────────────────┘   (solo sconto ±2 e titoli)
```
Mancano: chi ha visto un'azione, che cosa ne ricorda un NPC preciso, conseguenze che cambiano le opportunità, effetti differiti nel tempo.

### Difetti confermati e rilievi

| ID | Sistema | Descrizione | Verifica |
|---|---|---|---|
| **LW-ECO-01** | Economia | Il prezzo di uno scambio è calcolato una sola volta sulla scorta di partenza e moltiplicato per tutta la quantità: vendendo un lotto a scorta bassa e ricomprandolo subito a scorta alta si guadagna a ogni ciclo. Calis, minerale: da 10 unità il ciclo rende; con 1000 unità +2000 Scintille a ciclo, 100 cicli +200 000, merce invariata, registro in pari | **verificato** (simulazione con le API reali) |
| LW-ECO-02 | Economia | Le vendite del giocatore non hanno il tetto di magazzino che `deliver` rispetta: le unità oltre la capacità vengono pagate e poi distrutte all'alba | dal codice e dalla prova del revisore |
| LW-ECO-03 | Economia | Merci fuori dal profilo del mercato (lame, piatti, attrezzi) non si consumano mai: un mercato invaso resta depresso per sempre | dal codice e dalla prova del revisore |
| LW-ECO-04 | Forgia | La qualità della lama non cambia il prezzo (la regola riconosce solo «eccellente/pregiato/magistrale/leggendario») | dal codice |
| LW-ECO-05 | Mestieri | L'esperienza del mercante conta le transazioni, non quantità o margine: grado massimo in ~23 scambi da una unità | dal codice |
| LW-SOC-01 | Società | Vedovanza irreversibile: dopo la morte del coniuge non ci si risposa né si adotta (D-2) | dal codice |
| LW-SOC-02 | Società | Giorno dei ricordi errato nel pannello (`panels.js`, `m.at/480` invece di `m.day`) (D-4) | dal codice |
| LW-SOC-03 | Gilda | Membro morto resta nella squadra (D-7); compagno ferito non disegnato (D-3); punti vita dei compagni incoerenti (D-6) | dal codice |
| LW-SOC-04 | Borgo | L'agenda di Tessa e Ivo resta visibile dopo la loro morte (D-5) | dal codice |
| LW-NPC-01 | Conflitti | **Ridimensionato.** Il revisore stimava 14–16 abitanti su 18 morti in 6 ore senza `Game.step`. Con il motore reale (`Game.step`, giocatore fermo al borgo, seme 19425): 1 morto in 6 ore; in 48 ore 4 morti (tre guardie e Nerea), nessuno dei 18 abitanti. Le morti lontane esistono e sono volute; resta da misurare in partita quanto pesino sui legami | **verificato** (ridimensionato) |
| LW-LIFE-01 | Cronaca | La «Cronaca di Lùmora» mostra quattro eventi a rotazione, non ciò che accade | dal codice |
| LW-SOC-05 | Borghi | L'economia dei nove borghi raggiunge il livello massimo col solo tempo | dal codice |
| LW-QST-01 | Diario | Il diario non mostra incarico di gilda e commissione di Velaris; l'offerta del giorno può cambiare nella stessa giornata; il messaggio di accettazione della missione di Nerea nomina sempre il primo passo | dal codice |
| LW-SPC-01 | Specie | La Viverna di brina usa il profilo dei draghi di fuoco: soffre il freddo (×1,24) e quasi non sente il caldo. **Correggerla cambia il bilanciamento: decisione dell'utente** | dal codice |
| LW-SPC-02 | Specie | Corteggiamento nascosto finché non c'è la forma matura, senza spiegazione; refuso «una Scintilla aggiuntivo» (`engine.js:70`); etichette di slot generiche per Grifone, Fata e Orso; `trainedTerrain` salvato e mai letto | dal codice |
| LW-SAV-01 | Salvataggi | Ogni sezione nuova che non supera il ripristino fa scartare l'intero salvataggio e il gioco carica la chiave precedente: i dati nuovi devono sempre normalizzarsi, mai rifiutare | **verificato** (`savedCandidate`) |

Problemi già registrati, classificati come richiesto (nessun sistema riscritto per affrontarli):

| ID | Classe | Decisione |
|---|---|---|
| RPG-001 messaggi tardivi | interfaccia, minore | da affrontare solo se un incremento aggiunge messaggi: i nuovi avvisi di questa operazione usano frasi brevi e non si sommano a ogni fotogramma |
| RPG-002 settore del colpo più stretto del colpo reale | leggibilità, a favore del giocatore | fuori perimetro |
| RPG-003 avvisi dei boss sopra gli ostacoli | leggibilità, preesistente | fuori perimetro |
| RPG-004 verifiche manuali e accessibilità | verifica | le nuove interfacce di questa operazione usano `esc()`, pulsanti con testo e la stessa trappola del fuoco |
| PERF-003 picchi nei salti di calendario | prestazioni, lavoro futuro | non toccato (`urban-life.js` in sola lettura); le nuove conseguenze differite lavorano solo al cambio di giorno e con costo limitato |

Decisioni lasciate all'utente: profilo termico della Viverna di brina (LW-SPC-01); se instradare nel mercato o limitare i canali a prezzo fisso (banco delle sementi con +1 essenza, bottega della fattoria, residenti che comprano minerale); biologia di Umano e Scheletro (invariata).

### Architettura delle nuove interconnessioni

```
                 ┌──────────────── WorldMemory (world-memory.js, s.memory) ────────────────┐
azione ─► engine ┤ episodi {npc, tipo, giorno, fonte: diretta | testimone}                    │
                 │ conoscenza: solo chi partecipa o è presente (raggio d'ascolto, vivo,      │
                 │   al suo posto); il resto passa solo dalla reputazione pubblica esistente │
                 │ opinione derivata (non salvata): pesi per tipo, decadimento nel tempo,    │
                 │   al massimo un episodio per tipo e giorno, al massimo tre per tipo        │
                 │ promesse con scadenza; opportunità aperte/chiuse dall'opinione            │
                 └──► dialoghi e pannelli · Economy.deliver/quote · Reputation · Daily      ┘
impulso (~1,15 s) ─► WorldMemory.tick: solo scadenze, lavoro solo al cambio di giorno
```
Principi: dati nuovi in un campo nuovo di primo livello (`s.memory`, `schema:1`), mai nei registri esistenti (Society, Velaris, Conflicts, Reputation), così i salvataggi nuovi restano leggibili anche dalle versioni precedenti; ripristino che normalizza e scarta le voci invalide, mai il salvataggio; nessun lavoro per fotogramma; nessun NPC onnisciente.

### Piano degli incrementi

| Incremento | Contenuto | Stato |
|---|---|---|
| 0 | Audit, matrice, interconnessioni, difetti, benchmark e piano | ✅ |
| 1 | Memoria e conseguenze: Tessa ricorda l'aiuto durante una carenza reale di erbe, con testimoni (Nerea, Ivo) solo se presenti; promessa con scadenza; opportunità che si apre e si chiude; salvataggio e ripristino | ✅ |
| 2 | Economia e professioni: correzione di LW-ECO-01/02 (prezzo per unità, tetto di magazzino), ciclo forgia → lama → mercato → effetto misurabile → opportunità; percorsi verticali di fabbro e mercante con `Economy.quote/deliver` e reputazione | ✅ (anche LW-ECO-03/04) |
| 3 | Missioni ed eventi: modulo leggero di richieste contestuali che generalizza l'offerta del giorno; tre eventi integrati, senza doppie ricompense | ✅ |
| 4 | Specie e progressione: Slime, Goblin, Viverna di brina; vantaggi e limiti già presenti resi visibili e collegati ad attività, senza nuove regole | ✅ |
| 5 | Mondo simulato: conseguenze nel tempo, regole regionali parametrizzate sui cinque continenti, attività lontane risolte al cambio di giorno | ✅ |
| 6 | Revisione incrociata, prove complete, sessione lunga, salvataggi, benchmark, rapporto finale | ✅ |

### Prove e benchmark di riferimento (`main` `96eb9be`)
- Serie completa nel worktree di questa operazione, tutto superato: `verifica-integrazione`, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, economia 158 e 147, `economia-flussi-2`, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` (34 regioni) identico, PERF-002 181 scene, salvataggi incrociati; Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, Filoni (15 visite), Calis (12 visite).
- `sonda-sessione` 6 minuti in Edge visibile: fotogramma mediana 0,2–0,4 ms, p95 0,5–4,2 ms, massimo 5,3–26,5 ms, nessun fotogramma oltre 33 ms, memoria JS 10,3–18,6 MB, salvataggio 0,2–0,3 ms (28–40 KB), primo ingresso in Vaelthoria 54,3 ms.
- Prove che mancano e verranno aggiunte: conseguenze del giocatore (stesso seme e stato → stesso esito; ripristino; nessun doppio pagamento; nessuna merce infinita; nessun NPC che ricorda ciò che non ha potuto sapere; NPC morto che non torna), percorso end-to-end in Edge con azioni reali.

## Incremento 1 — Memoria e conseguenze

Nuovo modulo `world-memory.js` (`WorldMemory`, dopo `reputation.js`) e campo di salvataggio `s.memory` (`schema:1`: `episodes` ≤60 `{npc, kind, day, source}`, `promise`, `reserveDay`). **Catena giocabile al Borgo di Vela**: quando il mercato di Vela è davvero a corto di erbe di rugiada (`Economy.shortage`), dal dialogo di Tessa si possono consegnare fino a 3 erbe di persona: entrano nella scorta del mercato con `Economy.deliver` (registro esatto, tetto di magazzino) e sono pagate al prezzo di vendita del mercato unità per unità, quindi nessuna merce o moneta nasce dal nulla. Tessa ricorda l'aiuto (fonte diretta); Nerea e Ivo lo ricordano solo se in quel momento sono vivi, al loro posto (non in pattuglia né critici) ed entro 100 px (testimoni); nessun altro NPC lo sa, e gli abitanti di Society e Velaris non vengono toccati. L'opinione si ricava dagli episodi (aiuto +2, promessa mantenuta +3, promessa mancata −5, testimone +1), dimezza ogni 10 giorni, conta un episodio per tipo e giorno e i tre più recenti per tipo: ripetere la stessa azione non la fa salire senza fine. Con «Ti stima» (≥1,5) Tessa tiene da parte una pozione al giorno, allo stesso prezzo, ritirabile solo a emporio chiuso. Durante una carenza si può **promettere** 3 erbe entro la sera del giorno dopo: mantenuta rafforza la fiducia, mancata fa scattare un ricordo negativo (avviso «ha atteso invano»), chiude la riserva e Tessa rifiuta nuove promesse finché l'opinione non risale con aiuti in giorni diversi. Se Tessa muore la promessa decade senza colpa, la riserva e le consegne si chiudono, i ricordi restano; non torna in vita da sola. I dialoghi di Tessa, Ivo e Nerea mostrano che cosa ricordano e da quale fonte. Scadenze controllate nell'impulso a bassa frequenza; nessun lavoro per fotogramma.

**Catena verificata**: azione (consegna durante la carenza) → conseguenza locale (scorta di Vela +3, borsello + prezzo di mercato) → relazione (Tessa «Ti stima», Ivo e Nerea testimoni) → opportunità (pozione messa da parte a emporio chiuso) → salvataggio e ripristino (anche ricaricando la pagina) → tempo che passa (sonno fino alle 06:00, riserva ritirata il giorno dopo).

Distinzione richiesta: **implementato** nel gioco (modulo, dialoghi, salvataggio); **simulato in prova** in `tests/verifica-memoria.cjs` (scorte prelevate da altri compratori con `Economy.procure`, erbe aggiunte al borsello, ferite con `Conflicts.damageNpc`, giorni fatti passare dal motore); **verificato con azioni reali** in Edge da `tests/prova-browser-memoria.cjs` (tasti e pulsanti: vendita e acquisto al mercato, consegna, dialogo di Ivo, ricarica della pagina, sonno alla locanda, ritiro della pozione). Non ancora giocato a mano dall'utente.

Verifiche: build `b02a1bb8…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be` (34 regioni), PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2 fra `main` e il branch (il branch aggiunge `memory` vuoto ai salvataggi vecchi; `main` conserva `memory` senza toccarlo). Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, `prova-browser-memoria` 7/7 (nuova), Filoni (15 visite), Calis (12 visite). Mutazione: togliendo il controllo di presenza dei testimoni la prova 3 fallisce («Ivo ricorda senza esserci»). `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,2 ms, massimo 6,9–24,7 ms, nessun fotogramma oltre 33 ms, memoria 9,3–16 MB, salvataggio 0,3–0,4 ms (28–41 KB) — come `main` (p95 0,5–4,2 ms, massimo 5,3–26,5 ms, 28–40 KB).

## Incremento 2 — Economia e professioni

**Correzioni dell'economia** (`trade-economy.js`): LW-ECO-01, ogni unità di un lotto si paga alla scorta di quel momento, come scambiando una unità alla volta (il prezzo di una unità non cambia); oltre il doppio della scorta obiettivo il prezzo è costante e quel tratto si calcola in un passo, così anche quantità di 30 cifre si valutano subito; vendere e ricomprare un lotto non rende più. LW-ECO-02, il mercato accoglie merce solo fino al tetto del magazzino, come `Economy.deliver` («Il mercato può accogliere ancora N unità»). LW-ECO-03, i manufatti fuori dal profilo del mercato (lame, piatti, attrezzi venduti dal giocatore) trovano compratori fra gli abitanti, una unità al giorno per merce, invece di restare per sempre sul banco. LW-ECO-04, la qualità di forgia e cucina entra nel prezzo (buono +1, ottimo +2, perfetto +3, come le altre qualità già previste dalla formula).

**Mestieri con un futuro** (`careers.js`, `Careers`, campo `s.careers` `schema:1`): **fabbro**, pratica e qualità della forgia → qualità nel prezzo → **ordini dell'Armeria del Passo** al mercato dei Filoni: solo per fabbri almeno Praticanti, solo quando sul banco ci sono meno di 2 lame, una consegna al giorno, lama almeno buona; la lama entra nel banco con `Economy.deliver`, gli abitanti la comprano nei giorni seguenti e l'armeria torna a ordinare; da 3 ordini il fabbro è «fornitore di fiducia» e l'armeria chiede lame ottime pagando ×1,4 invece di ×1,25 il prezzo di vendita, mai oltre il prezzo d'acquisto della stessa lama meno 1. **Mercante**, acquisti e vendite → **taccuino dei prezzi** annotati solo al banco aperto dei mercati visitati di persona (nessun prezzo lontano senza esserci stati), che mostra fino a quattro merci di qui pagate meglio altrove → **contratti del Registro dei Carichi** di Calis: per mercanti almeno Praticanti, sulla merce con la carenza più forte del porto, 3 unità (6 da «socio del Registro», dopo 3 contratti), una consegna al giorno, ogni unità pagata al prezzo di vendita ×1,2 mai oltre il suo prezzo d'acquisto meno 1, consegnata con `Economy.deliver`. Nessuna nuova valuta né rarità; il registro dei flussi resta in pari.

**Ciclo verificato** (azioni reali in Edge, `tests/prova-browser-mestieri.cjs`): minerale comprato a Vela → due lame forgiate al Banco di Ivo con il minigioco vero (mouse premuto per scaldare, colpi nel ritmo, tempra: due lame «perfetto» 97/100) → viaggio Valle → Valle degli Antichi → Borgo dei Filoni → ordine dell'armeria (+30 Scintille, lame sul banco 0→1, «Fabbro conosciuto ai Filoni») → taccuino con i prezzi di Vela (minerale: qui 3, a Vela si vendeva a 7) → ricarica della pagina: tutto resta. In Node (`tests/verifica-mestieri.cjs`, con esperienza e merci preparate e viaggi veri da varco a varco): lame vendute ai Filoni 3→2→1→0 in tre giorni; compensi dell'armeria 29, 26, 26 e poi 32 per la lama ottima; primo contratto di Calis 3 essenze per 50 Scintille; registro dei flussi in pari.

**Bilanciamento**: cambiano solo gli scambi a lotti (prezzo per unità invece che unico), le vendite oltre la capacità (rifiutate), il prezzo delle lame e dei piatti per qualità (+1…+3) e il ritorno dei manufatti venduti (consumati una unità al giorno). Sono correzioni di difetti verificati; il prezzo di una singola unità, i prezzi di base, le valute e i flussi delle merci del profilo non cambiano.

**Distinzione**: implementato nel gioco (correzioni, modulo, pannello del mercato); simulato in prova in Node (esperienza di mestiere impostata, merci aggiunte); verificato con azioni reali in Edge (forgia, mercati, viaggio, ordine, ricarica). Non verificati in Edge: il contratto di Calis e il passaggio a fornitore di fiducia (solo Node). Resta aperto A3-06 (esperienza del mercante per transazione) e la decisione dell'utente sui canali a prezzo fisso.

Verifiche: build `71ef5ba6…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10 (nuova), economia 158 e 147, `economia-flussi-2` codice 0 (vendere 1 e ricomprarlo non rende, per ogni scorta), percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2 (il branch aggiunge `memory` e `careers` vuoti ai salvataggi vecchi). Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, `prova-browser-mestieri` 6/6 (nuova, forgia reale), Filoni (15 visite), Calis (12 visite). Mutazione: rimettendo il prezzo unico per lotto la prova 1 fallisce («minerale ×5: vendita e riacquisto rendono 5»). `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,2 ms, massimo 6,5–27,1 ms, nessun fotogramma oltre 33 ms, memoria 9,1–15,4 MB, salvataggio 0,2–0,5 ms (28–41 KB), come `main`.

## Incremento 3 — Missioni ed eventi contestuali

Nuovo modulo `world-requests.js` (`Requests`, dopo `careers.js`) e campo `s.requests` (`schema:1`: `offered`, `active`, `claimed`, `done`). Affianca campagna, incarichi giornalieri, commissioni e gilda senza sostituirli. Ogni modello ha condizioni verificabili sulle API esistenti, una fonte, un obiettivo, una durata, una ricompensa entro 15–40 Scintille (niente essenze né echi), conseguenze reali, protezione dal doppio pagamento (prima si chiude la richiesta, poi si paga) e una pausa prima di ripresentarsi; l'offerta, una volta comparsa, resta valida per tutta la giornata. Accettazione e riscossione solo presso la fonte; gli obiettivi a evento avanzano dalla stessa chiamata `record()` degli incarichi giornalieri; le scadenze si controllano nell'impulso a bassa frequenza; la riscossione dà la reputazione `quest-claim` come gli altri incarichi. **Lana per le mantelle d'inverno** (Ivo, Borgo di Vela): in autunno o inverno oppure quando la lana manca davvero al mercato di Vela (≥40%), con Ivo vivo; 2 lana in 2 giorni; compenso 2×vendita+6 (15–40); la lana torna al mercato di Vela con `Economy.deliver`, Ivo ricorda l'aiuto e i presenti lo vedono (memoria del mondo); se scade, Ivo ricorda la richiesta mancata; pausa 6 giorni. **Gli attrezzi della squadra** (Registro degli avventurieri): per iscritti alla gilda e fabbri almeno Praticanti; due riparazioni, tempre, ascensioni o incantamenti veri alla forgia in 3 giorni; 24 Scintille; pausa 5 giorni. **Erbe per la cambusa** (Registro dei Carichi di Calis): solo con una carenza reale di erbe al mercato di Calis (≥40%); vendere almeno 3 erbe all'Emporio delle Sette Vele in 2 giorni; 16 Scintille oltre al prezzo di vendita; pausa 4 giorni. Il diario (L) mostra la sezione «Richieste del mondo» con stato, fonte, obiettivo, ricompensa e scadenza; il dialogo di Ivo mostra la sua richiesta. Il ripristino scarta voci non valide e non rifiuta mai il salvataggio.

**Verificato con azioni reali** in Edge (`tests/prova-browser-richieste.cjs`): diario con la richiesta disponibile ma da accettare presso Ivo → «Accetta» dal dialogo di Ivo → lana comprata al mercato di Vela → «Riscuoti» da Ivo (+20 Scintille, lana a Vela 1→3, Ivo ricorda, Tessa presente ha visto) → ricarica della pagina: tutto resta. **In Node** (`tests/verifica-richieste.cjs`): offerta stabile per la giornata, pausa di 6 giorni, scadenza con ricordo negativo, Ivo morto, riparazioni vere alla forgia per la gilda, carenza reale di erbe a Calis (40%) con vendita all'Emporio e riscossione al Registro, registro dei flussi in pari, salvataggi danneggiati. Non verificate in Edge: la richiesta della gilda e quella di Calis.

Non affrontati qui (rilievi dell'audit B-D1…B-D4): diario senza incarico di gilda e commissione di Velaris, offerta del giorno di `Daily` che può cambiare nella stessa giornata (le nuove richieste invece sono stabili), testo d'accettazione della missione di Nerea, «Lettura del patto» ripetibile.

Verifiche: build `b3af9b06…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 10/10 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2. Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, mestieri 6/6, `prova-browser-richieste` 6/6 (nuova), Filoni (15 visite), Calis (12 visite). Mutazione: senza la chiusura della richiesta prima del pagamento la prova 3 fallisce. `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,3 ms, massimo 5,2–26,5 ms, nessun fotogramma oltre 33 ms, memoria 10,9–17 MB, salvataggio 0,2–0,3 ms (28–41 KB), come `main`.

## Incremento 4 — Specie e progressione

Nuovo modulo `lineage.js` (`Lineage`, dopo `world-requests.js`), **senza stato nel salvataggio e senza regole nuove**. Nel pannello del personaggio (C) la sezione «Identità della stirpe» mostra, per ogni stirpe, i valori letti dalle regole che il gioco applica: dono in numeri per le nove stirpi originali (per esempio pozione dello Slime 67% contro 48%, +1 Scintilla per creatura del Goblin, schivata del Lupo 0,95 s, mana dell'Elfo 2,5/s), attacco naturale con portata e forza (`Growth.strike`) e il suo rapporto con la guardia adattiva dei boss (−16% solo ai colpi ravvicinati), fattori dei bisogni (`Daily.racial`, ora esportata in sola lettura) con la mantella di lana che riduce il freddo del 30%, corpo e indole, il ramo evolutivo verso cui pesa la predisposizione e lo stato dei legami. Per **Slime di rugiada**, **Goblin dei rovi** e **Viverna di brina** la sezione «Che cosa ti offre la tua stirpe» elenca opportunità e difficoltà già sostenute dalle regole, collegate ad attività esistenti e allo stato del personaggio: pozioni (distillazione da Ivo, emporio e pozione messa da parte da Tessa), viaggi con poche provviste, sete e temperatura (borraccia, mantella) per lo Slime; cacce («Impronte vicino a Vela», incarichi di caccia della gilda) e Destrezza nei mestieri per il Goblin; soffio a distanza contro i boss, comodità nel caldo («Minerale per il banco») e freddo da affrontare con la mantella (e la richiesta di Ivo per la lana) per la Viverna. Il corteggiamento non sparisce più senza spiegazione: `Society.mature` (stessa regola di prima: forma matura o età adulta) dice perché non è ancora possibile. Le descrizioni delle pozioni di Tessa e Ivo ricordano allo Slime il 67%. Corretto il refuso «una Scintilla aggiuntivo» (LW-SPC-02, in parte). La Viverna resta con il profilo termico attuale (LW-SPC-01, decisione dell'utente); Umano e Scheletro invariati.

**Verificato** che ciò che il profilo mostra è ciò che il gioco fa (`tests/verifica-stirpi.cjs`, motore reale): pozione dello Slime 67% e del Goblin 48% misurate, +1 Scintilla del Goblin in un combattimento vero, schivata del Lupo 0,95 s, mana dell'Elfo 2,5/s, fame dello Slime consumata ×0,46 rispetto al Goblin, attacco della Viverna a distanza (65 px) e guardia adattiva ×0,84 solo in mischia, corteggiamento rifiutato allo Slime con il motivo e non al Nano (viaggio vero ai Filoni), sorteggio invariato (44 stirpi, Slime 14,41%, Goblin 12,01%, Viverna 0,32%), nessun campo nuovo nel salvataggio. **In Edge** (`tests/prova-browser-stirpi.cjs`): tasto C per Slime, Goblin e Viverna con la sezione completa, dialogo di Tessa con la pozione al 67%.

Non affrontati qui: le promesse testuali senza regola (planata e volo della Viverna, scatto del Tritone, colture del Micòide…), che restano testo e non vengono rese meccaniche senza una decisione di bilanciamento; il campo salvato e mai letto `growth.trainedTerrain`; le etichette di slot di Grifone, Fata e Orso.

Verifiche: build `8fb02eff…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 10/10, `verifica-stirpi` 9/9 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2. Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, mestieri 6/6, richieste 6/6, `prova-browser-stirpi` 5/5 (nuova), Filoni (15 visite), Calis (12 visite). `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,3 ms, massimo 5,4–26,9 ms, nessun fotogramma oltre 33 ms, memoria 9,6–15,2 MB, salvataggio 0,2–0,3 ms (28–41 KB), come `main`.

## Incremento 5 — Mondo simulato: tempo, attività lontane e stato regionale

Nuovo modulo `world-renown.js` (`Renown`, dopo `lineage.js`) e campo `s.renown` (`schema:1`: al massimo 40 imprese `{id, kind, sign, market, day, text, heard}`). Le imprese importanti (aiuto a Tessa durante la carenza, parola mancata, ordini dell'Armeria del Passo, contratti del Registro di Calis, richieste del mondo completate o lasciate scadere) diventano notizie che partono dal mercato del luogo e viaggiano lungo le **rotte commerciali esistenti** con i loro giorni di viaggio (da Vela: Filoni e Voryndhal 2 giorni, Velaris e Calis 3; Filoni→Calis 5): nessuno le conosce prima che arrivino. **Regole regionali parametrizzate** per i cinque continenti (che cosa vi è stimato e quanto pesa la parola mancata): Vaelthoria «Borghi della comunità» (comunità 2), Nordharyn «Popolo dei filoni» (forgia 3), Myrathen «Città delle botteghe» (commercio 2), Voryndhal «Savane dei granai» (comunità 2), Azheryon «Porti delle Sette Vele» (commercio 3, parola mancata −3). La fama di ogni continente si ricava dalle notizie arrivate e dimezza in 20 giorni: Sconosciuto, Se ne parla, Rinomato, Malvisto. **Conseguenza nel borgo**: quando una notizia nata in un altro continente arriva a Vela, Tessa (commercio), Ivo (forgia) o Nerea (comunità) la ricordano «per sentito dire» (memoria del mondo, peso ±1), e l'opinione cambia giorni dopo l'impresa. Il diario mostra «Voci dai continenti» con fama, cultura, notizie arrivate (con il giorno d'arrivo e la provenienza) e quelle ancora in viaggio. Tutto si risolve al cambio di giorno nell'impulso a bassa frequenza (cammini minimi fra cinque mercati, calcolati una volta), senza simulare NPC lontani e senza toccare il pianificatore delle routine né PERF-003.

**Verificato** in Node (`tests/verifica-voci.cjs`, azioni vere e viaggi da varco a varco): tempi di viaggio dalle rotte; aiuto a Vela noto subito in Vaelthoria e solo dopo 2 e 3 giorni a Nordharyn e Azheryon; la stessa lama all'armeria vale 2,5 a Nordharyn contro 0,9–1 altrove; la voce da Nordharyn arriva a Ivo il terzo giorno, non prima (mutazione: facendola arrivare subito la prova fallisce); un contratto a Calis alza l'opinione di Tessa tre giorni dopo; parola mancata «Malvisto» a Vaelthoria (−2,9 → −1,4 dopo 20 giorni); limiti di notizie; salvataggi danneggiati; determinismo. **In Edge** (`tests/prova-browser-voci.cjs`, azioni reali): consegna a Tessa → diario con la notizia «in viaggio, arriverà il giorno 3» → due notti alla locanda → Nordharyn «Se ne parla» con la voce da Vaelthoria → ricarica della pagina.

Limiti dichiarati: prototipo di regole regionali, non diplomazia né guerre; le voci raggiungono come NPC solo Tessa, Ivo e Nerea (gli abitanti di Society e Velaris non vengono toccati); la fama regionale per ora è informativa e agisce attraverso la memoria del borgo, non su prezzi o reputazione.

Verifiche: build `8d48e7fb…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 10/10, `verifica-stirpi` 9/9, `verifica-voci` 9/9 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2. Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, mestieri 6/6, richieste 6/6, stirpi 5/5, `prova-browser-voci` 5/5 (nuova), Filoni (15 visite), Calis (12 visite). `sonda-sessione` 6 minuti: mediana 0,2–0,3 ms, p95 0,5–4,3 ms, massimo 5,2–26,9 ms, nessun fotogramma oltre 33 ms, memoria 8,8–24,4 MB a dente di sega (13,7 MB all'ultimo minuto), salvataggio 0,2–0,4 ms (28–41 KB).

## Incremento 6 — Qualità, integrazione e rapporto finale

### Revisione incrociata
Due revisori indipendenti in sola lettura hanno esaminato il diff `96eb9be..HEAD` (economia, mestieri e richieste; memoria, voci, stirpe e salvataggi), con script di conferma sul motore reale. Undici difetti corretti, due accettati o lasciati all'utente. I testi completi sono in `LIVING_WORLD_AUDIT.md`.

| Codice | Gravità | Difetto (revisore) | Correzione | Prova |
|---|---|---|---|---|
| rev-LW6-E1 | alta | L'Armeria del Passo accettava la lama **equipaggiata**: dopo la consegna `workshop.weapon` puntava a una lama non più posseduta, `Tradecraft.restore` rifiutava il salvataggio e la partita non si caricava più | `careers.js` usa la stessa regola della vendita al banco (`Economy.tradeAllowed`, ora esportata in sola lettura): una lama equipaggiata non si consegna, con il motivo nel pannello | `verifica-revisione-lw` 1 (con mutazione) |
| rev-LW6-E2 | media | «Erbe per la cambusa» si completava con qualunque vendita di 3 erbe all'Emporio di Calis, anche di erbe appena comprate allo stesso banco (circa +9 Scintille ogni 4 giorni a scorte invariate); un contratto del Registro di erbe completava anche la richiesta | la richiesta chiede ora di **portare 3 erbe al Registro dei Carichi** (consegna vera con `Economy.deliver` nelle scorte del porto), come la lana di Ivo | `verifica-richieste` 8 |
| rev-LW6-E3 | bassa | «Lana per le mantelle»: comprare 2 lane a Vela e consegnarle rendeva da 0 a +9 Scintille ogni 6 giorni | compenso limitato al costo d'acquisto delle stesse merci al mercato della richiesta meno 1 (stessa regola di armeria e carichi), anche per la cambusa | `verifica-richieste` 11 (tre semi) |
| rev-LW6-E4 | bassa | Una richiesta scaduta ma non ancora chiusa dall'impulso (dopo un caricamento o un salto di tempo) si poteva riscuotere | nuovo stato «Scaduta»: niente riscossione, la chiude l'impulso | `verifica-revisione-lw` 2 (con mutazione) |
| rev-LW6-E5 | bassa, latente | L'annullamento di un contratto del Registro per magazzino pieno distruggeva le unità già entrate | si ritirano dal porto le unità entrate e lo zaino torna intero | `verifica-revisione-lw` 3 (magazzino simulato, con mutazione) |
| rev-LW6-E7 | bassa | Il commento sul tetto del compenso dell'armeria non diceva il vero (si confronta con il prezzo alla scorta attuale) | commento corretto; non sfruttabile (le lame sul banco arrivano solo dal giocatore e il banco ne consuma una al giorno) | lettura |
| rev-LW6-M1 | media | Un NPC **morto** sentiva ancora le voci da altri continenti e le «ricordava» | `WorldMemory.note` rifiuta chi è morto | `verifica-revisione-lw` 4 (con mutazione) |
| rev-LW6-M2 | media | Se Ivo moriva durante «Lana per le mantelle», alla scadenza il giocatore riceveva colpa e cattiva fama | la richiesta si scioglie senza colpa («non c'è più nessuno ad attenderla»), come le promesse a Tessa | `verifica-revisione-lw` 5 (con mutazione) |
| rev-LW6-M3 | bassa | Il tetto unico di 60 ricordi faceva sparire i ricordi di una persona sotto quelli di un'altra | al massimo 20 ricordi per persona (60 in tutto), anche al ripristino | `verifica-revisione-lw` 6 (con mutazione) |
| rev-LW6-M5 | bassa | Una promessa a Tessa scaduta mentre era in stato critico (consegna impossibile) dava colpa al giocatore | se alla scadenza Tessa non può riceverti, la promessa si scioglie senza colpa | `verifica-revisione-lw` 7 (con mutazione) |
| rev-LW6-M6 | bassa | Un salvataggio modificato con un'impresa di Vela `heard:false` faceva nascere una «voce» da Vela a Vela | al ripristino le imprese nate a Vela sono già note a Vela | `verifica-revisione-lw` 8 (con mutazione) |
| rev-LW6-M4 | bassa, **decisione** | Fama a buon mercato: a inizio partita Vela ha 10 erbe su 12, quindi una consegna di 1 erba al giorno a Tessa conta come aiuto nella carenza e Vaelthoria arriva a «Rinomato» in circa 2 giorni | **non corretta**: cambia il bilanciamento di regole già approvate (che cosa è una carenza). Alternative in *Problemi rimasti* | — |
| rev-LW6-E6 | bassa | Con il magazzino di Vela quasi pieno la lana di Ivo non torna tutta al mercato | accettato: Ivo la usa per le mantelle (il testo lo dice); il registro dei flussi resta in pari | — |

Mutazioni: ripristinando a turno ciascuna delle otto correzioni E1, E4, E5, M1, M2, M3, M5, M6 la prova corrispondente fallisce (la M3 dopo aver reso più varia la prova, che prima non la vedeva).

### Scenario finale end-to-end (Edge, azioni reali, seme 19425)
`tests/prova-browser-scenario.cjs`, 9/9, eseguito due volte con lo stesso seme e **lo stesso esito numero per numero** (lame, Scintille, giorni, opinioni, fama):
1. nuova partita: nessun ricordo, nessuna voce, fabbro al livello 0;
2. **mestiere e produzione con meccanica reale**: Cappa venduta e 4 minerali comprati al mercato di Vela, due lame forgiate al banco di Ivo con il minigioco (mouse premuto per scaldare, colpi nel ritmo, tempra) → due lame «perfetto», fabbro livello 4;
3. viaggio ai Filoni varco dopo varco, **consegna all'Armeria del Passo** (+30 Scintille, lame sul banco 0→1); il mondo registra l'ordine e la notizia parte da Nordharyn; un secondo clic nello stesso giorno non paga;
4. ritorno a Vela: **Ivo non sa ancora nulla** (la voce è in viaggio, arriverà il giorno 3);
5. **nuova opportunità e incarico**: Ivo chiede lana per le mantelle → «Accetta» → 2 lane comprate → «Riscuoti» (+19/+20 Scintille, Lanterne 0→2, lana a Vela 1→3, opinione di Ivo 0→2); il pulsante sparisce;
6. due notti alla locanda: il giorno 2 Ivo non sa nulla, il giorno 3 la voce da Nordharyn arriva e Ivo la ricorda «per sentito dire» (opinione 2,7);
7. «Salva partita» dal menu (Esc), ricarica della pagina e «Continua il viaggio»: memoria, mestieri, richieste, voci, reputazione, borsello e zaino identici (42 KB);
8. dieci notti dopo: opinione di Ivo 2,7→1,4, fama a Nordharyn 3,8→2,7, un solo ricordo della voce, nessun ordine o pagamento ripetuto, nessuna Scintilla dal nulla;
9. nessun errore JavaScript.

Catena causale verificata: forgia → armeria → voce lungo le rotte → Ivo. La richiesta della lana **non** nasce dalla consegna all'armeria: nasce dalla stagione fredda o dalla carenza di lana a Vela (condizione dichiarata della richiesta). Ivo arriva a «Ti stima» sommando richiesta e voce. Gli spostamenti fino ai varchi, ai banchi e agli NPC sono teletrasporti dichiarati.

### Sonde di costo (`tests/sonda-costi.cjs`, Node, stessa macchina, uno alla volta)
| Misura | `main` `96eb9be` | `claude/living-world-2` |
|---|---|---|
| Simulazione per fotogramma (`Game.step`), media/p95: Valle 44 attori | 0,019/0,027 ms | 0,019/0,028 ms |
| Filoni, Velaris, Calis (32 attori) | 0,017–0,018/0,022–0,024 ms | 0,017/0,023 ms |
| Impulso: `Economy.tick` | 0,002 ms | 0,002–0,004 ms |
| Impulso: `WorldMemory.tick` + `Requests.tick` + `Renown.tick` (stato saturo: 60 ricordi, 40 voci) | — | 0,0001 + 0,0008 + 0,0011 ms |
| Viste del diario e dei dialoghi (sature): richieste, voci, memoria, Tessa, mestieri | — | 0,03–0,06 ms ciascuna |
| `Game.view(true)` | 0,088 ms | 0,08–0,12 ms |
| Salvataggio a inizio partita / saturo | 29,3 KB | 29,6 KB / 37,6 KB (memoria 3,9 KB + voci 4,5 KB al massimo) |
| `exportSave` media | 0,07 ms | 0,07–0,09 ms |
| 30 giorni simulati con il passo reale, due giri | 365–388 ms, 37,1 KB | 363–370 ms, 37,4 KB |
| Memoria del processo dopo 30 giorni (secondo giro) | +0,2 MB | +0,2 MB |
| Stesso seme → stessa impronta dello stato finale | sì | sì |

Geometria urbana, collisioni e numero di NPC sono **identici** a `main` (`confronto-mondo`, PERF-002, Filoni e Calis): l'operazione non tocca generatore, planimetrie, cache dei settori né `urban-life.js`. Il disegno si misura nel browser.

### Sessione lunga e benchmark prima/dopo (Edge visibile, `tests/sonda-sessione.cjs`, 12 minuti di gioco per build, stessa partita)
| | `main` `96eb9be` | `claude/living-world-2` |
|---|---|---|
| Fotogramma mediana/p95 (Valle) | 0,3/4,2–4,4 ms | 0,3/4,1–4,2 ms |
| Fotogramma mediana/p95 (Vaelthoria) | 0,2/0,4–0,5 ms | 0,2/0,4–0,5 ms |
| Massimo per minuto | 4,9–26,7 ms | 5,0–24,8 ms |
| Fotogrammi oltre 33 ms | 0 | 0 |
| Memoria JS (dente di sega) | 11,9–29,4 MB | 8,8–26,7 MB |
| Salvataggio | 0,1–0,6 ms, 28→44 KB | 0,2–0,3 ms, 28→44 KB |
| Ingresso in Vaelthoria (primo/seguenti) | 54,6 / 1,2–1,4 ms | 55,4 / 1,2–1,4 ms |
Nessuna differenza misurabile; la memoria non cresce nel tempo in nessuna delle due build. Nessun retry automatico: ogni prova è stata eseguita una volta, i numeri sono quelli del primo giro (lo scenario finale è stato ripetuto apposta per il determinismo).

### Unione simulata (nessun merge eseguito)
- con `origin/main` (`96eb9be`): il branch ne discende, avanzamento rapido possibile, nessun conflitto;
- con `codex/urban-scale` (`b92caef`, basato su `7488642`, **non integrato**): il codice si unisce senza conflitti (anche `build.py`, `engine.js`, `panels.js`, `interface.js`); conflitti solo nei registri `CHANGELOG.md` e `PROGRESS.md`. Sulla build unita (albero temporaneo fuori dal repository, nessun branch creato) passano `verifica-integrazione`, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 11/11, `verifica-stirpi` 9/9, `verifica-voci` 9/9, `verifica-revisione-lw` 8/8, `verifica-scala-urbana` (250 edifici, 1 250 percorsi), salvataggi incrociati con `main` 2/2, e in Edge lo scenario finale 9/9, interfaccia 8/8, progressione 7/7 e `prova-browser-scala-urbana` con i laboratori da 25 a 250 edifici (ingresso 10–11 ms, CPU p95 0,4–0,6 ms, rAF p95 4,3 ms, salvataggi del laboratorio isolati). L'unione vera va fatta su un branch separato e conciliando a mano i due registri.

## Rapporto finale (15 punti)
1. **Rapporto iniziale**: incremento 0 di questo documento (stato del repository, metodo con quattro revisori, matrice, difetti LW-*, architettura, piano, benchmark di riferimento).
2. **Matrice**: incremento 0, *Matrice dei sistemi*. Stato finale: memoria del mondo, mestieri e richieste collegano economia, NPC, reputazione e fama; le voci collegano i cinque continenti al borgo; specie e stirpe diventano visibili senza regole nuove.
3. **Architettura**: cinque moduli nuovi dopo `reputation.js` in `build.py` — `world-memory.js` (`s.memory`), `careers.js` (`s.careers`), `world-requests.js` (`s.requests`), `lineage.js` (senza stato), `world-renown.js` (`s.renown`). Ogni stato ha `schema:1`, tetti fissi e un ripristino che scarta le voci non valide senza mai rifiutare il salvataggio. Tutto si aggiorna nell'impulso a bassa frequenza già esistente (`WorldMemory.tick`, `Requests.tick`, `Renown.tick` dopo `Economy.tick`) o all'apertura dei pannelli; nessun secondo pianificatore, PERF-001/002/003 intatti.
4. **Incrementi**: 0 audit `035da20`; 1 memoria e conseguenze `8ceed83`; 2 economia e professioni `ab76ee1`; 3 richieste del mondo `8cbf756`; 4 identità della stirpe `3789647`; 5 voci e fama regionale `6209a1a`; 6 revisione, scenario, sonde e rapporto `091a2dd`.
5. **Funzionalità giocabili**: Tessa ricorda chi l'aiuta nella carenza di erbe (testimoni, promessa, pozione messa da parte a emporio chiuso); prezzi a lotti senza guadagni infiniti e qualità della lama nel prezzo; Armeria del Passo per il fabbro e Registro dei Carichi per il mercante, taccuino dei prezzi visti; tre richieste del mondo (lana per Ivo, attrezzi della squadra, erbe per la cambusa); identità della stirpe nel pannello C; voci e fama nei cinque continenti nel diario (L).
6. **File modificati** (`git diff --stat 96eb9be..claude/living-world-2`): nuovi `world-memory.js`, `careers.js`, `world-requests.js`, `lineage.js`, `world-renown.js`, `LIVING_WORLD.md`, `LIVING_WORLD_AUDIT.md` e 13 prove in `tests/`; modificati `engine.js`, `panels.js`, `economy-panel.js`, `trade-economy.js`, `society.js`, `daily-life.js`, `interface.js`, `build.py`, `tests/verifica-salvataggi-incrociati.cjs`, `Reincarnation.html` e la documentazione condivisa. Non toccati: `urban-districts.js`, `urban-sector-layout.js`, `urban-lab*.js`, `urban-profiles.js`, `urban-life.js`, planimetrie, cache dei settori, worktree di Codex.
7. **Screenshot**: generati dalle prove in Edge fuori dal repository (`scenario-1-forgia`, `scenario-2-armeria`, `scenario-3-ivo`, `scenario-4-voce` e quelli degli incrementi 1–5), inviati all'utente; si rigenerano passando una cartella come secondo argomento alle prove `prova-browser-*.cjs`.
8. **Test automatici (Node)**: `verifica-memoria` 11, `verifica-mestieri` 10, `verifica-richieste` 11, `verifica-stirpi` 9, `verifica-voci` 9, `verifica-revisione-lw` 8, `sonda-costi` (determinismo), più tutta la serie esistente. Mutazioni verificate negli incrementi 1–6.
9. **Test Edge**: `prova-browser-memoria` 7, `-mestieri` 6 (forgia reale), `-richieste` 6, `-stirpi` 5, `-voci` 5, **`-scenario` 9**, più tutta la serie esistente (vedi *Verifiche*).
10. **Benchmark prima/dopo**: tabelle qui sopra; nessuna differenza misurabile per fotogramma, simulazione, salvataggio o memoria.
11. **Compatibilità dei salvataggi**: stessa chiave v7, nessun cambio di `version`. I salvataggi di `main` si caricano e ricevono campi vuoti; quelli del branch si caricano su `main`, che conserva i campi sconosciuti (`verifica-salvataggi-incrociati` 2/2 nei due sensi). Campi danneggiati (null, stringhe, 100 000 voci, giorni futuri, `__proto__`, id duplicati) tornano vuoti o validi senza rifiutare il salvataggio. Il ripristino del salvataggio con una lama equipaggiata consegnata non può più accadere (rev-LW6-E1).
12. **Build**: `python build.py Reincarnation.html`, 52 moduli, 2 084 030 byte, offline in un solo file.
13. **Commit e branch**: branch `claude/living-world-2` su `origin`, base `main` `96eb9be`; `main` non modificato, nessun merge, branch e backup intatti.
14. **Problemi rimasti** (nessuno bloccante):
    - LW-SPC-01 profilo termico della Viverna di brina — decisione dell'utente;
    - canali a prezzo fisso (banco delle sementi, bottega della fattoria, residenti che comprano minerale, LW-ECO-05/A3-05) e esperienza del mercante per transazione (A3-06) — decisione dell'utente;
    - rev-LW6-M4 fama a buon mercato: alternative (a) contare come carenza solo scorte sotto il 60% dell'obiettivo, come le richieste (≥0,4); (b) una sola impresa di comunità per luogo ogni 3 giorni; (c) lasciare così, perché la fama oggi è informativa e agisce solo come voce al borgo — decisione dell'utente;
    - B-D1…B-D4 (diario senza incarico di gilda e commissione di Velaris, offerta di `Daily` che cambia nella giornata, testo di Nerea, «Lettura del patto» ripetibile) e RPG-001 (messaggi in ritardo, visibile nelle prove a tempo compresso);
    - verificati solo in Node, non in Edge: contratti del Registro di Calis, «Gli attrezzi della squadra» e «Erbe per la cambusa»;
    - le voci raggiungono come NPC solo Tessa, Ivo e Nerea; la fama non agisce su prezzi o reputazione; le promesse testuali delle stirpi restano senza regola nuova; nessuna prova con centinaia di residenti (l'operazione non aggiunge NPC: i numeri valgono per le scene esistenti, 32–44 attori).
15. **Raccomandazioni**: il branch è pronto per l'integrazione su `main` **solo con la tua autorizzazione**: avanzamento rapido possibile da `96eb9be`. Per `codex/urban-scale` fare l'unione su un branch separato (`claude/integrazione-living-world`) quando Codex lo considera pronto: il codice si unisce senza conflitti e le prove passano sulla build unita; restano da conciliare solo `CHANGELOG.md` e `PROGRESS.md`. Poi, in ordine: decidere M4, LW-SPC-01 e i canali a prezzo fisso; estendere le voci agli abitanti di Society e Velaris; aggiungere le prove Edge mancanti per Calis e gilda.

Verifiche: Build `59818db6…` (2 084 030 byte). Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 11/11, `verifica-stirpi` 9/9, `verifica-voci` 9/9, `verifica-revisione-lw` 8/8 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti fermi sovrapposti 0, Filoni (55 semi, 715 itinerari) e Calis (55 semi, 770 percorsi) OK, `confronto-mondo` contro `main` `96eb9be` identico (34 regioni, 10 490 088 campioni), PERF-002 181 scene equivalenti. Edge: `prova-browser` 10/10, Velaris est 12/12, economia OK, mondo 15/15, cava 6/6, santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, salvataggi incrociati 2/2, memoria 7/7, mestieri 6/6, richieste 6/6, stirpi 5/5, voci 5/5, **scenario finale 9/9** (nuovo), Filoni e Calis nel browser OK (fotogramma p95 0,4 ms come `main`).
