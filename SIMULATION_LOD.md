# PERF-005 — Simulazione del mondo a cinque livelli (Simulation LOD)

> Documento di progetto e piano di attuazione. Stato: **progettazione e prove non invasive** (Claude, 2026-11-24, branch
> `claude/perf-005`, base `main` `c11c5f5`). Nessun sorgente del gioco è modificato. Le modifiche strutturali attendono
> l'approvazione dell'utente e l'integrazione di Confluenza da parte di Codex (vedi *Dipendenze*).

## 1. Punto di partenza (verificato)

### Stato del repository e di Confluenza
- `main` = `origin/main` = `c11c5f5`, cartella pulita. PERF-001…004 su `main`.
- **Confluenza non è integrata**: il worktree di Codex `integrazione-urban-scale` è fermo a `b92caef` (31 ore) con modifiche non
  committate a `engine.js` (isolamento dei salvataggi del laboratorio), `build.py`, documenti e una prova; `codex/urban-scale`
  invariato. Per questo PERF-005 si limita qui a progetto, analisi delle dipendenze e prove che non toccano il gioco.

### Che cosa simula oggi il mondo (mappa delle dipendenze)
| Sistema | Dove | Quando | Fuori dalla regione del giocatore | Stato salvato |
|---|---|---|---|---|
| Residenti di Velaris | `urban-life.js` | per fotogramma (`tick`, lavoro di fondo) e al disegno | piani anticipati se la città è già stata visitata (PERF-003); nessuno stato per persona | `s.urban`: ricordi ≤8 per chi ha interagito, scorte della città |
| Lavoratori dei quartieri (Filoni, Calis) | `urban-districts.js` | al disegno | no (decorativi, dal minuto) | nessuno |
| Abitanti dei borghi | `society.js` | impulso a blocchi di 65 s di `s.time`, ≤12 blocchi | sì, globale e aggregato | `s.society` (18 persone, 9 borghi) |
| NPC di Vela | `world-life.js` (`npcPoint`) | dal minuto | — | nessuno |
| Conflitti e morte degli NPC | `npc-conflicts.js` | per fotogramma (vicino) e `remotePulse` (lontano) | sì, un impulso astratto per chiamata | `s.conflicts` |
| Mostri | `engine.js` `updateMonster` | per fotogramma, solo regione corrente, fermi oltre 250 px | **no**: istantanee congelate in `s.regions[id]` | sì, ~27 campi per mostro |
| Economia, carovane | `trade-economy.js`, `market-flows.js` | per giorno di calendario, anche alla prima lettura | sì, aggregata; recupero ≤120 giorni | `s.economy` |
| Costruzioni | `construction.js` | blocchi da 125 s, recupero senza tetto | sì | `s.build` |
| Voci, memoria, richieste | `world-renown.js`, `world-memory.js`, `world-requests.js` | impulso, forme chiuse sulle date | sì (arrivi per rotte) | `s.renown`, `s.memory`, `s.requests` |

Punti di aggancio senza riscrivere il motore: il blocco dell'impulso (`engine.js` ~1169–1185), gli aggiornamenti per fotogramma
(~1186–1195), il sonno (~748–758, l'unico salto di tempo, che oggi richiama a mano otto sistemi), il cambio di regione
(`changeRegion` ~305–314, `arrive` ~297) e il caricamento (`activate` ~1538). Due orologi: `s.time` (secondi simulati) e il
calendario (`Calendar.timestamp`), che assorbe i ritardi dei fotogrammi e il sonno: i sistemi a impulso su `s.time` non
vedono questa deriva.

### Continuità misurata (`tests/sonda-continuita.cjs`)
Nove ore vissute fotogramma per fotogramma (40 500 fotogrammi) contro le stesse ore saltate dormendo, dalle 21:00 alla
locanda di Vela; poi quattro ore vissute a Velaris contro un salto del calendario.

| Sistema | Notte vissuta = notte dormita? |
|---|---|
| Calendario, economia (mercati, flussi, carovane), costruzioni, scorte di Velaris, Living World, mostri congelati | **sì** |
| Borghi (Society) | **no, per un impulso**: l'«accordo» di un borgo legge il livello degli altri borghi nello stesso giro, quindi dopo un solo impulso (il sonno) è in ritardo di 65 s |
| Conflitti degli NPC | **no**: vivendo la notte una guardia viene ferita e guadagna esperienza; dormendo il mondo lontano fa un solo impulso e non succede nulla |
| Posizioni dei residenti di Velaris (95 e 500) | **sì**: identiche fra tempo vissuto e salto; il livello vicino è già «puro nel tempo» |

Nessun sistema del mondo usa `Math.random` (sono tutti deterministici): un recupero del tempo esatto per intervalli è possibile.

### Limiti misurati della simulazione completa (`tests/banco-lod.cjs`)
Node 24, seme 19425; tutti i residenti sintetici nella stessa città (Velaris), quindi oltre il migliaio si misura il limite
dell'algoritmo, non una città reale. L1 = residenti vicini con percorso vero (media/massimo per fotogramma: il massimo
comprende i primi percorsi calcolati); L2 = posizione dagli orari per tutti.

| Residenti | Profili | Piani di un giorno | Memoria dei piani | L1 vicini (media / massimo) | L2 tutti (media / massimo) | Salvataggio |
|---:|---:|---:|---:|---:|---:|---:|
| 95 | 1,4 ms | 18,5 ms | 306 KB | 29: 0,06 / 0,8 ms | 0,007 / 0,08 ms | 32,6 KB |
| 500 | 5,2 ms | 356 ms | 944 KB | 173: 1,1 / 105 ms | 0,03 / 0,12 ms | 32,6 KB |
| 1 000 | 10,7 ms | 1,1 s | 1,7 MB | 324: 2,8 / 229 ms | 0,05 / 0,19 ms | 32,6 KB |
| 5 000 | 44,9 ms | 14,2 s | 7,6 MB | 1 526: 14 / 1 143 ms | 0,23 / 0,54 ms | 32,6 KB |
| 10 000 | 87,5 ms | 51,4 s | 14,4 MB | 3 125: 24 / 1 841 ms | 0,57 / 1,34 ms | 32,6 KB |

Conclusioni che guidano il progetto: (1) la posizione dagli orari (L2) costa pochissimo anche per 10 000 residenti; (2) il costo
vero sono i **piani individuali** (crescono circa come n^1,7 nella stessa città, ~2 KB a testa) e il **dettaglio pieno** quando
troppi residenti sono vicini; quindi piani individuali solo per la città corrente (e per quella in cui si sta per entrare), un
tetto al numero di entità in L1 qualunque sia la densità, e tutto il resto aggregato; (3) il salvataggio non dipende dalla
popolazione, perché i residenti si ricavano dal seme: va conservato questo principio.

## 2. Architettura proposta

### Principi
1. **Un solo orologio del mondo**: il tempo di calendario (`Calendar.timestamp`, minuti). Ogni livello risolve intervalli
   `[ultimo minuto risolto, adesso)`; `s.time` resta l'orologio del giocatore e del combattimento.
2. **Stato derivato più registro delle variazioni**: le entità nascono dal seme (come oggi i residenti); si salva solo ciò che
   il seme non può ricostruire (nascite, morti, trasferimenti, relazioni cambiate, ricordi), con tetti e compattazione. Il
   salvataggio non cresce con la popolazione ma con la storia, entro un limite fisso.
3. **Funzioni pure del tempo ai livelli vicini**: ciò che si vede (posizione, attività) è una funzione di (seme, registro,
   minuto), come oggi a Velaris. Promuovere o declassare un'entità non cambia nulla di ciò che il mondo ricorda.
4. **Risoluzione per intervalli deterministica ai livelli lontani**: gli eventi (scontri, nascite, scambi, migrazioni) di un
   intervallo si ricavano da un generatore con seme `(seme, entità, giorno)`, indipendente dal numero di fotogrammi e
   dall'osservazione del giocatore. Contratto: **una notte vissuta e una notte dormita producono lo stesso mondo**.
5. **Il livello grossolano è la verità, il dettaglio la rappresenta**: un fatto persistente nasce solo dalla risoluzione del
   livello di appartenenza o da un'azione del giocatore (che scrive nel registro). Il dettaglio non inventa fatti che il
   livello aggregato non conosce.
6. **Budget espliciti**: per fotogramma (lavoro di fondo a quote, generalizzando `backgroundWork` di PERF-003) e per giorno.

### I cinque livelli
| Livello | Ambito | Rappresentazione | Aggiornamento | Esiste già |
|---|---|---|---|---|
| **L1 Completo** | entità entro ~480 px dal giocatore nella regione corrente, **con un tetto** (es. 200 residenti, i più vicini) | posizione sul percorso vero, combattimento, interazioni, mostri `updateMonster` | ogni fotogramma | sì (Velaris `localActors`, mostri, `Conflicts.localTick`) |
| **L2 Semplificato** | resto della regione o della città corrente | posizione dagli orari senza percorso (`samplePlan`/`coarse`), mostri fermi | a richiesta (disegno, promozione), mai per fotogramma per tutti | in parte (filtro grossolano di Velaris, mostri fermi oltre 250 px) |
| **L3 Aggregato** | quartieri e città non correnti | per quartiere e ora: conteggi per attività e professione, produzione e consumo, eventi del giorno; nessun piano individuale | per intervallo (impulso), recupero in forma chiusa | in parte (scorte di Velaris, Society) |
| **L4 Strategico** | regioni e regni non visitati o lontani | insediamenti, nodi dei conflitti, popolazioni di creature (ecosistemi a conteggi), dungeon | per giorno, recupero limitato poi a settimane | in parte (Society, `remotePulse`, Build) |
| **L5 Globale** | altri continenti | economia (MarketFlows), voci (Renown), in futuro politica, guerre, migrazioni | per giorno o settimana | in parte (MarketFlows, Renown) |

**Promozione e declassamento**: al cambio di regione (`changeRegion`/`arrive`), alla distanza (L1↔L2 con isteresi: entrata a
480 px, uscita a 560 px) e in **anticipo** quando il giocatore si avvicina a un varco: il livello di destinazione prepara i
piani a quote (come `backgroundWork`) prima dell'ingresso, così i residenti sono già al loro posto quando entrano nella vista
(caricamento progressivo **senza apparizioni visibili**, come approvato). Prima di promuovere si risolve l'intervallo mancante
al livello di partenza.

**Mostri**: le istantanee congelate restano per le regioni visitate (stesso gioco di oggi); i livelli L4 aggiungono
popolazioni a conteggi solo per regioni mai visitate, materializzate dal seme alla prima visita.

**Persistenza**: un nuovo campo facoltativo `s.world` (`schema: 1`, salvataggi v7 invariati): ultimo minuto risolto per
città/regione/continente, registro delle variazioni con tetti. Salvataggi senza `s.world`: il mondo parte da «adesso», senza
storia retroattiva; dati danneggiati si ricreano vuoti senza rifiutare il salvataggio (stessa regola di Living World).

### Cosa abilita (in futuro, ognuno con approvazione)
Famiglie e relazioni (grafo sparso nel registro, pochi legami per persona) · nascite, crescita, invecchiamento e morte (rischio
giornaliero con seme al livello L3+, visibile in L1) · professioni e botteghe (profili e scorte per quartiere) · migrazioni
(flussi L4/L5 con identità stabili materializzate a richiesta) · avventurieri autonomi (agenti L3–L4 con esiti di incarico) ·
guerre fra regni (stato L4/L5) · economia (MarketFlows esteso) · evoluzione delle specie ed ecosistemi (popolazioni L4) ·
dungeon indipendenti dal giocatore (stato L4).

## 3. Rischi
| Rischio | Mitigazione |
|---|---|
| Conflitto con il lavoro locale di Codex su `engine.js` (salvataggi del laboratorio) | nessuna modifica a `engine.js` finché Codex non integra; gli agganci si riducono a tre chiamate (impulso, sonno, cambio di regione) |
| Divergenza dei due orologi | il mondo usa solo il calendario; prova di continuità su notti vissute e dormite |
| Cambi di bilanciamento (più conflitti durante il sonno, nascite e morti) | ogni sistema nuovo o corretto con l'approvazione dell'utente; la sonda mostra prima e dopo |
| Apparizioni visibili alla promozione | promozione anticipata vicino ai varchi e prove che confrontano la scena al primo fotogramma visibile |
| Crescita del salvataggio con la storia | tetti per registro, compattazione, misura della dimensione a 30/365 giorni |
| Recuperi lunghi dopo assenze | recupero in forma chiusa, a quote nei fotogrammi, con tetto e passo settimanale oltre il tetto |
| Città reali per migliaia di persone | dipendono da Confluenza; i residenti sintetici in un'unica città misurano solo il limite dell'algoritmo |

## 4. Criteri di accettazione (per ogni fase)
1. **Continuità**: `sonda-continuita` tutta «uguale», compresi borghi e conflitti dopo la loro correzione; posizioni di Velaris
   identiche fra tempo vissuto e salto.
2. **Indipendenza dall'osservazione**: con lo stesso seme e le stesse azioni del giocatore, lo stato del mondo dopo N giorni è
   lo stesso qualunque sia l'ordine delle visite (prova: visitare A poi B contro B poi A).
3. **Nessuna apparizione visibile**: al primo fotogramma in cui un residente entra nella vista è già nella posizione che
   avrebbe con la simulazione completa.
4. **Prestazioni (Edge)**: con 10 000 residenti nel mondo, fino a 500 con piani individuali nella città corrente e al massimo 200 in L1, p95 ≤ 8 ms e massimo
   ≤ 16,7 ms per fotogramma; recupero di 30 giorni di assenza distribuito, nessun fotogramma oltre 16,7 ms.
5. **Memoria**: L1/L2 ≈ 2 KB per residente come oggi; L3–L5 per conteggi, non per persona (10 000 residenti ≤ +5 MB).
6. **Salvataggio**: v7 invariato, salvataggi vecchi caricabili, crescita limitata e misurata.
7. **Regressioni**: PERF-001…004, Living World, economia e prove Edge invariate.

## 5. Benchmark riproducibili
- `tests/banco-lod.cjs` (Node): 95, 500, 1 000, 5 000, 10 000 residenti; L1, L2, piani, memoria, salvataggio; L3–L5 da
  riempire a mano a mano che esistono.
- `tests/sonda-continuita.cjs` (Node): contratto di continuità.
- `tests/banco-popolazione.cjs` (Edge): costo per fotogramma per sistema, salti, rientro, caricamento.
Ogni fase aggiunge le sue colonne (costo per giorno e per recupero di ogni livello, entità aggregate contro entità complete).

## 6. Piano di attuazione

> Piano in fasi; ogni fase è un intervento separato con branch, prove e approvazione. Le fasi da 3 in poi avranno un piano
> dettagliato proprio quando le precedenti saranno chiuse (sottosistemi indipendenti).

**Vincoli globali**: JavaScript vanilla, moduli IIFE su `window`, nessuna dipendenza né rete, build `python build.py
Reincarnation.html`, salvataggi v7 con campi nuovi facoltativi, determinismo (generatori con seme, niente `Math.random` nel
mondo), testi in italiano, nessun cambio di regole biologiche, bilanciamento o grafica senza approvazione, nessun file di
Codex modificato.

**Punti d'attenzione**: (1) sonno di più giorni o caricamento dopo lunghe assenze; (2) promozione mentre un residente è in
cammino sul bordo della vista; (3) salvataggi senza `s.world` o con dati danneggiati; (4) regione cambiata più volte nello
stesso giorno; (5) morte di un NPC mentre la sua città è aggregata.

### Fase 0 — Preparazione (questo branch, fatto)
- `tests/sonda-continuita.cjs`, `tests/banco-lod.cjs`, questo documento. Nessun sorgente del gioco modificato.

### Fase 1 — Orchestratore e orologio unico, senza cambiare il comportamento
**File**: nuovo `world-sim.js` (`WorldSim`, dopo `world-renown.js` in `build.py`); `engine.js` (tre chiamate: impulso,
sonno, cambio di regione; più `s.world` in creazione e ripristino); `tests/verifica-world-sim.cjs`. Il collegamento **attende**
l'integrazione di Codex su `engine.js` e `build.py`.
- [x] Nucleo in ombra (2026-11-24): `world-sim.js` (`WorldSim`, **in ombra**: non è nella build né collegato al motore) con `tests/verifica-world-sim.cjs` 15/15, sviluppato con test scritti prima (TDD): intervalli allineati a una griglia assoluta, tempo vissuto = tempo saltato, ordine globale nel tempo indipendente dal budget, budget per fotogramma, recupero compresso solo nella risoluzione completa (sonno, caricamento), nessuna storia retroattiva, ripristino che non rifiuta mai, sistema guasto isolato, salvataggio e caricamento senza perdita di intervalli, chiamate rientranti rifiutate, costo con 200 sistemi: 14 400 intervalli in 14 ms, aggiornamento a vuoto 0,2 µs. Tre mutazioni rilevate (intervalli non allineati, ordine non cronologico, compressione durante il gioco). Revisione indipendente: due difetti alti (compressione dipendente dal budget, sistema guasto che bloccava tutti), quattro medi (perdita di intervalli al caricamento, orologio non valido, recupero senza tetto, costo con molti sistemi) e alcuni minori, tutti corretti con una prova che prima falliva.
- [x] Contratto dell'API: `WorldSim.register(id, {level 1–5, step (minuti), maxChunks (tetto obbligatorio), resolve(s, da, a, info)})`,
  `create(now)`, `restore(raw, now)`, `tick(s, now, {budgetMs, clock})`, `resolveAll(s, now)`, `lag(s, now)`, `failures()`. Eccezione
  dichiarata: l'intervallo compresso (`info.compressed`) equivale ai passi singoli solo per sistemi esatti in forma chiusa.
- [ ] Collegamento: `s.world` in `newGame`/`parseSave` (campo facoltativo, ripristino senza rifiuto), `WorldSim.tick(s, minuto)` nel blocco
  dell'impulso dopo `Life.tick`, `WorldSim.resolveAll` nel sonno e dopo il caricamento; nessun sistema migrato ancora.
- [ ] Il sonno chiama `WorldSim.resolve` invece dell'elenco a mano (stesso ordine, stesso risultato: prova di identità).
- [ ] Commit, prove PERF-001…004, banco in Edge prima/dopo.

### Fase 2 — Continuità dei sistemi esistenti
- [ ] Borghi: calcolo dell'accordo dopo l'aggiornamento di tutti i livelli (ordine indipendente); sonda «uguale».
- [ ] Conflitti lontani: risoluzione per intervalli con seme, così il sonno vive le stesse ore (cambia il gioco durante il
  sonno: **approvazione dell'utente**); sonda «uguale».

### Fase 3 — L3 città aggregate e caricamento progressivo
- [ ] Città non correnti come conteggi per quartiere e ora, produzione e consumo; promozione anticipata vicino ai varchi
  senza apparizioni visibili. **Dipende da Confluenza** per le città grandi.

### Fase 4 — L4 regioni e regni; Fase 5 — L5 continenti
- [ ] Ecosistemi a conteggi per regioni mai visitate, insediamenti, dungeon; politica, guerre e migrazioni a livello globale.

### Fase 6 — Popolazione dinamica
- [ ] Nascite, crescita, invecchiamento, morte, famiglie e migrazioni sul registro delle variazioni (regole biologiche delle 44
  stirpi: **approvazione dell'utente**).
