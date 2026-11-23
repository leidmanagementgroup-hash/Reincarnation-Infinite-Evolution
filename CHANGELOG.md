# CHANGELOG.md

Cronologia delle modifiche. Voci più recenti in alto. Formato e regole in `AGENTS.md` §6. Ogni voce indica l'agente (`Claude`, `Codex`, `Umano`).

## [2026-11-23] Living World 2.0: prove Edge di Calis, cambusa e gilda — Claude
Branch `claude/living-world-prove-edge` (da `main` `beb8bf5`), solo prove e documentazione: nessun sorgente del gioco modificato, `Reincarnation.html` invariato.
### Aggiunto
- `tests/prova-browser-calis-lw.cjs` (6 passi) e `tests/prova-browser-gilda-lw.cjs` (7 passi): colmano le verifiche in Edge che mancavano nel rapporto finale.
### Verifica
- `prova-browser-calis-lw` 6/6: tre scambi veri a Vela (mercante Praticante senza esperienza aggiunta), viaggio fino al Porto di Calis, «Consegna il carico» al Registro dei Carichi (3 Essenza, +50 Scintille, scorta 2→5, voce commercio@calis, secondo contratto disabilitato; l'essenza, troppo cara per il borsello iniziale, arriva come preparazione dichiarata), «Erbe per la cambusa» accettata e riscossa al Registro nel quartiere del porto con 3 erbe comprate a Vela (+16 Scintille, scorta del porto 3→6, nessun secondo pagamento), ricarica della pagina. `prova-browser-gilda-lw` 7/7: «Iscriviti» alla bacheca di Vela, richiesta assente finché il fabbro non è Praticante, minerale comprato vendendo pozioni e travi, due lame forgiate con il minigioco, «Accetta» alla bacheca, due «Ripara» veri da Ivo (durabilità consumata come preparazione dichiarata), «Riscuoti» +24 Scintille e voce craft@vela, nessun doppio pagamento, ricarica della pagina. Nessun errore JavaScript.

## [2026-11-23] Living World 2.0 unita a main — Claude
Avanzamento rapido di `main` da `96eb9be` a `8a868a1` (branch `claude/living-world-2`), su autorizzazione dell'utente. Nessun commit di unione, nessun conflitto; branch, worktree e backup conservati. `codex/urban-scale` resta non integrato: l'unione va fatta su un branch separato.
### Verifica
- Verifiche sulla cartella di `main` dopo l'avanzamento rapido (build `59818db6…`, identica a quella del branch): `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 11/11, `verifica-stirpi` 9/9, `verifica-voci` 9/9, `verifica-revisione-lw` 8/8, economia 158 e 147; Edge: `prova-browser` 10/10, scenario finale 9/9, interfaccia 8/8, memoria 7/7, voci 5/5. La serie completa era già stata superata sullo stesso commit nel worktree.

## [2026-11-23] Operazione Living World 2.0, incremento 6: revisione incrociata, scenario finale e rapporto — Claude
Branch `claude/living-world-2` (`careers.js`, `world-requests.js`, `world-memory.js`, `world-renown.js`, `trade-economy.js`, `panels.js`, prove, documentazione). Commit dell'incremento 5: `6209a1a`; di questo incremento: `091a2dd`.
### Corretto
- rev-LW6-E1 (alta): l'Armeria del Passo non accetta più la lama equipaggiata, che rendeva il salvataggio non più caricabile (`careers.js`; `Economy.tradeAllowed` esportata in sola lettura da `trade-economy.js`).
- rev-LW6-E2/E3: «Erbe per la cambusa» chiede ora 3 erbe portate al Registro dei Carichi (non basta rivendere all'Emporio); compenso di lana e cambusa sotto il costo d'acquisto delle stesse merci (`world-requests.js`).
- rev-LW6-E4: richiesta scaduta non più riscuotibile prima dell'impulso (stato «Scaduta», `world-requests.js`, `panels.js`); compenso non mostrato per le richieste in pausa.
- rev-LW6-E5: annullare un contratto del Registro restituisce tutta la merce (`careers.js`).
- rev-LW6-M1/M2/M5: un NPC morto non ricorda più voci; se Ivo muore la richiesta si scioglie senza colpa; promessa a Tessa sciolta se alla scadenza non poteva riceverti (`world-memory.js`, `world-requests.js`).
- rev-LW6-M3/M6: al massimo 20 ricordi per persona, anche al ripristino; le imprese nate a Vela non tornano a Vela come voce (`world-memory.js`, `world-renown.js`).
### Aggiunto
- `tests/prova-browser-scenario.cjs` (scenario finale in Edge, 9 passi), `tests/verifica-revisione-lw.cjs` (8 regressioni con mutazioni), `tests/sonda-costi.cjs` (simulazione, impulso, serializzazione, sessione lunga simulata, determinismo); `verifica-richieste` 8 riscritta e 11 nuova.
### Documentazione
- Rapporto finale in 15 punti, benchmark prima/dopo, sessione lunga e unione simulata in `LIVING_WORLD.md`; revisione in `LIVING_WORLD_AUDIT.md`.
### Verifica
- Build `59818db6…` (2 084 030 byte). Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 11/11, `verifica-stirpi` 9/9, `verifica-voci` 9/9, `verifica-revisione-lw` 8/8 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti fermi sovrapposti 0, Filoni (55 semi, 715 itinerari) e Calis (55 semi, 770 percorsi) OK, `confronto-mondo` contro `main` `96eb9be` identico (34 regioni, 10 490 088 campioni), PERF-002 181 scene equivalenti. Edge: `prova-browser` 10/10, Velaris est 12/12, economia OK, mondo 15/15, cava 6/6, santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, salvataggi incrociati 2/2, memoria 7/7, mestieri 6/6, richieste 6/6, stirpi 5/5, voci 5/5, **scenario finale 9/9** (nuovo), Filoni e Calis nel browser OK (fotogramma p95 0,4 ms come `main`). Sonda di costo e sessione di 12 minuti in Edge senza differenze misurabili rispetto a `main`. Unione simulata con `codex/urban-scale`: il codice si unisce senza conflitti (anche `build.py`, `engine.js`, `panels.js`, `interface.js`); conflitti solo nei registri `CHANGELOG.md` e `PROGRESS.md`. Sulla build unita (albero temporaneo fuori dal repository, nessun branch creato) passano `verifica-integrazione`, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 11/11, `verifica-stirpi` 9/9, `verifica-voci` 9/9, `verifica-revisione-lw` 8/8, `verifica-scala-urbana` (250 edifici, 1 250 percorsi), salvataggi incrociati con `main` 2/2, e in Edge lo scenario finale 9/9, interfaccia 8/8, progressione 7/7 e `prova-browser-scala-urbana` con i laboratori da 25 a 250 edifici (ingresso 10–11 ms, CPU p95 0,4–0,6 ms, rAF p95 4,3 ms, salvataggi del laboratorio isolati). L'unione vera va fatta su un branch separato e conciliando a mano i due registri.

## [2026-11-23] Operazione Living World 2.0, incremento 5: voci e fama regionale — Claude
Branch `claude/living-world-2` (`world-renown.js` nuovo, `world-memory.js`, `careers.js`, `world-requests.js`, `engine.js`, `panels.js`, `build.py`, prove). Commit dell'incremento 4: `3789647`.
### Aggiunto
- Nuovo modulo `world-renown.js` (`Renown`, dopo `lineage.js`) e campo `s.renown` (`schema:1`: al massimo 40 imprese `{id, kind, sign, market, day, text, heard}`). Le imprese importanti (aiuto a Tessa durante la carenza, parola mancata, ordini dell'Armeria del Passo, contratti del Registro di Calis, richieste del mondo completate o lasciate scadere) diventano notizie che partono dal mercato del luogo e viaggiano lungo le **rotte commerciali esistenti** con i loro giorni di viaggio (da Vela: Filoni e Voryndhal 2 giorni, Velaris e Calis 3; Filoni→Calis 5): nessuno le conosce prima che arrivino. **Regole regionali parametrizzate** per i cinque continenti (che cosa vi è stimato e quanto pesa la parola mancata): Vaelthoria «Borghi della comunità» (comunità 2), Nordharyn «Popolo dei filoni» (forgia 3), Myrathen «Città delle botteghe» (commercio 2), Voryndhal «Savane dei granai» (comunità 2), Azheryon «Porti delle Sette Vele» (commercio 3, parola mancata −3). La fama di ogni continente si ricava dalle notizie arrivate e dimezza in 20 giorni: Sconosciuto, Se ne parla, Rinomato, Malvisto. **Conseguenza nel borgo**: quando una notizia nata in un altro continente arriva a Vela, Tessa (commercio), Ivo (forgia) o Nerea (comunità) la ricordano «per sentito dire» (memoria del mondo, peso ±1), e l'opinione cambia giorni dopo l'impresa. Il diario mostra «Voci dai continenti» con fama, cultura, notizie arrivate (con il giorno d'arrivo e la provenienza) e quelle ancora in viaggio. Tutto si risolve al cambio di giorno nell'impulso a bassa frequenza (cammini minimi fra cinque mercati, calcolati una volta), senza simulare NPC lontani e senza toccare il pianificatore delle routine né PERF-003.
- `tests/verifica-voci.cjs` (9 prove Node) e `tests/prova-browser-voci.cjs` (5 passi in Edge con azioni reali).
### Verifica
- build `8d48e7fb…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 10/10, `verifica-stirpi` 9/9, `verifica-voci` 9/9 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2. Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, mestieri 6/6, richieste 6/6, stirpi 5/5, `prova-browser-voci` 5/5 (nuova), Filoni (15 visite), Calis (12 visite). `sonda-sessione` 6 minuti: mediana 0,2–0,3 ms, p95 0,5–4,3 ms, massimo 5,2–26,9 ms, nessun fotogramma oltre 33 ms, memoria 8,8–24,4 MB a dente di sega (13,7 MB all'ultimo minuto), salvataggio 0,2–0,4 ms (28–41 KB).

## [2026-11-23] Operazione Living World 2.0, incremento 4: identità della stirpe — Claude
Branch `claude/living-world-2` (`lineage.js` nuovo, `panels.js`, `society.js`, `daily-life.js`, `engine.js`, `build.py`, prove). Commit dell'incremento 3: `8cbf756`.
### Aggiunto
- Nuovo modulo `lineage.js` (`Lineage`, dopo `world-requests.js`), **senza stato nel salvataggio e senza regole nuove**. Nel pannello del personaggio (C) la sezione «Identità della stirpe» mostra, per ogni stirpe, i valori letti dalle regole che il gioco applica: dono in numeri per le nove stirpi originali (per esempio pozione dello Slime 67% contro 48%, +1 Scintilla per creatura del Goblin, schivata del Lupo 0,95 s, mana dell'Elfo 2,5/s), attacco naturale con portata e forza (`Growth.strike`) e il suo rapporto con la guardia adattiva dei boss (−16% solo ai colpi ravvicinati), fattori dei bisogni (`Daily.racial`, ora esportata in sola lettura) con la mantella di lana che riduce il freddo del 30%, corpo e indole, il ramo evolutivo verso cui pesa la predisposizione e lo stato dei legami. Per **Slime di rugiada**, **Goblin dei rovi** e **Viverna di brina** la sezione «Che cosa ti offre la tua stirpe» elenca opportunità e difficoltà già sostenute dalle regole, collegate ad attività esistenti e allo stato del personaggio: pozioni (distillazione da Ivo, emporio e pozione messa da parte da Tessa), viaggi con poche provviste, sete e temperatura (borraccia, mantella) per lo Slime; cacce («Impronte vicino a Vela», incarichi di caccia della gilda) e Destrezza nei mestieri per il Goblin; soffio a distanza contro i boss, comodità nel caldo («Minerale per il banco») e freddo da affrontare con la mantella (e la richiesta di Ivo per la lana) per la Viverna. Il corteggiamento non sparisce più senza spiegazione: `Society.mature` (stessa regola di prima: forma matura o età adulta) dice perché non è ancora possibile. Le descrizioni delle pozioni di Tessa e Ivo ricordano allo Slime il 67%. Corretto il refuso «una Scintilla aggiuntivo» (LW-SPC-02, in parte). La Viverna resta con il profilo termico attuale (LW-SPC-01, decisione dell'utente); Umano e Scheletro invariati.
- `tests/verifica-stirpi.cjs` (9 prove Node) e `tests/prova-browser-stirpi.cjs` (5 passi in Edge).
### Corretto
- Refuso «una Scintilla aggiuntivo» nel dono del Goblin (`engine.js`).
### Verifica
- build `8fb02eff…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 10/10, `verifica-stirpi` 9/9 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2. Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, mestieri 6/6, richieste 6/6, `prova-browser-stirpi` 5/5 (nuova), Filoni (15 visite), Calis (12 visite). `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,3 ms, massimo 5,4–26,9 ms, nessun fotogramma oltre 33 ms, memoria 9,6–15,2 MB, salvataggio 0,2–0,3 ms (28–41 KB), come `main`.

## [2026-11-23] Operazione Living World 2.0, incremento 3: richieste del mondo — Claude
Branch `claude/living-world-2` (`world-requests.js` nuovo, `world-memory.js`, `engine.js`, `panels.js`, `interface.js`, `build.py`, prove). Commit precedenti dell'operazione: incremento 0 `035da20`, 1 `8ceed83`, 2 `ab76ee1`.
### Aggiunto
- Nuovo modulo `world-requests.js` (`Requests`, dopo `careers.js`) e campo `s.requests` (`schema:1`: `offered`, `active`, `claimed`, `done`). Affianca campagna, incarichi giornalieri, commissioni e gilda senza sostituirli. Ogni modello ha condizioni verificabili sulle API esistenti, una fonte, un obiettivo, una durata, una ricompensa entro 15–40 Scintille (niente essenze né echi), conseguenze reali, protezione dal doppio pagamento (prima si chiude la richiesta, poi si paga) e una pausa prima di ripresentarsi; l'offerta, una volta comparsa, resta valida per tutta la giornata. Accettazione e riscossione solo presso la fonte; gli obiettivi a evento avanzano dalla stessa chiamata `record()` degli incarichi giornalieri; le scadenze si controllano nell'impulso a bassa frequenza; la riscossione dà la reputazione `quest-claim` come gli altri incarichi. **Lana per le mantelle d'inverno** (Ivo, Borgo di Vela): in autunno o inverno oppure quando la lana manca davvero al mercato di Vela (≥40%), con Ivo vivo; 2 lana in 2 giorni; compenso 2×vendita+6 (15–40); la lana torna al mercato di Vela con `Economy.deliver`, Ivo ricorda l'aiuto e i presenti lo vedono (memoria del mondo); se scade, Ivo ricorda la richiesta mancata; pausa 6 giorni. **Gli attrezzi della squadra** (Registro degli avventurieri): per iscritti alla gilda e fabbri almeno Praticanti; due riparazioni, tempre, ascensioni o incantamenti veri alla forgia in 3 giorni; 24 Scintille; pausa 5 giorni. **Erbe per la cambusa** (Registro dei Carichi di Calis): solo con una carenza reale di erbe al mercato di Calis (≥40%); vendere almeno 3 erbe all'Emporio delle Sette Vele in 2 giorni; 16 Scintille oltre al prezzo di vendita; pausa 4 giorni. Il diario (L) mostra la sezione «Richieste del mondo» con stato, fonte, obiettivo, ricompensa e scadenza; il dialogo di Ivo mostra la sua richiesta. Il ripristino scarta voci non valide e non rifiuta mai il salvataggio.
- `tests/verifica-richieste.cjs` (10 prove Node) e `tests/prova-browser-richieste.cjs` (6 passi in Edge con azioni reali).
### Verifica
- build `b3af9b06…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10, `verifica-richieste` 10/10 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2. Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, mestieri 6/6, `prova-browser-richieste` 6/6 (nuova), Filoni (15 visite), Calis (12 visite). Mutazione: senza la chiusura della richiesta prima del pagamento la prova 3 fallisce. `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,3 ms, massimo 5,2–26,5 ms, nessun fotogramma oltre 33 ms, memoria 10,9–17 MB, salvataggio 0,2–0,3 ms (28–41 KB), come `main`.

## [2026-11-23] Operazione Living World 2.0, incremento 2: economia e professioni — Claude
Branch `claude/living-world-2` (`trade-economy.js`, `careers.js` nuovo, `economy-panel.js`, `engine.js`, `build.py`, prove).
### Corretto
- **Correzioni dell'economia** (`trade-economy.js`): LW-ECO-01, ogni unità di un lotto si paga alla scorta di quel momento, come scambiando una unità alla volta (il prezzo di una unità non cambia); oltre il doppio della scorta obiettivo il prezzo è costante e quel tratto si calcola in un passo, così anche quantità di 30 cifre si valutano subito; vendere e ricomprare un lotto non rende più. LW-ECO-02, il mercato accoglie merce solo fino al tetto del magazzino, come `Economy.deliver` («Il mercato può accogliere ancora N unità»). LW-ECO-03, i manufatti fuori dal profilo del mercato (lame, piatti, attrezzi venduti dal giocatore) trovano compratori fra gli abitanti, una unità al giorno per merce, invece di restare per sempre sul banco. LW-ECO-04, la qualità di forgia e cucina entra nel prezzo (buono +1, ottimo +2, perfetto +3, come le altre qualità già previste dalla formula).
### Aggiunto
- **Mestieri con un futuro** (`careers.js`, `Careers`, campo `s.careers` `schema:1`): **fabbro**, pratica e qualità della forgia → qualità nel prezzo → **ordini dell'Armeria del Passo** al mercato dei Filoni: solo per fabbri almeno Praticanti, solo quando sul banco ci sono meno di 2 lame, una consegna al giorno, lama almeno buona; la lama entra nel banco con `Economy.deliver`, gli abitanti la comprano nei giorni seguenti e l'armeria torna a ordinare; da 3 ordini il fabbro è «fornitore di fiducia» e l'armeria chiede lame ottime pagando ×1,4 invece di ×1,25 il prezzo di vendita, mai oltre il prezzo d'acquisto della stessa lama meno 1. **Mercante**, acquisti e vendite → **taccuino dei prezzi** annotati solo al banco aperto dei mercati visitati di persona (nessun prezzo lontano senza esserci stati), che mostra fino a quattro merci di qui pagate meglio altrove → **contratti del Registro dei Carichi** di Calis: per mercanti almeno Praticanti, sulla merce con la carenza più forte del porto, 3 unità (6 da «socio del Registro», dopo 3 contratti), una consegna al giorno, ogni unità pagata al prezzo di vendita ×1,2 mai oltre il suo prezzo d'acquisto meno 1, consegnata con `Economy.deliver`. Nessuna nuova valuta né rarità; il registro dei flussi resta in pari.
- `tests/verifica-mestieri.cjs` (10 prove Node) e `tests/prova-browser-mestieri.cjs` (6 passi in Edge con forgia reale).
### Verifica
- build `71ef5ba6…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11, `verifica-mestieri` 10/10 (nuova), economia 158 e 147, `economia-flussi-2` codice 0 (vendere 1 e ricomprarlo non rende, per ogni scorta), percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be`, PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2 (il branch aggiunge `memory` e `careers` vuoti ai salvataggi vecchi). Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, memoria 7/7, `prova-browser-mestieri` 6/6 (nuova, forgia reale), Filoni (15 visite), Calis (12 visite). Mutazione: rimettendo il prezzo unico per lotto la prova 1 fallisce («minerale ×5: vendita e riacquisto rendono 5»). `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,2 ms, massimo 6,5–27,1 ms, nessun fotogramma oltre 33 ms, memoria 9,1–15,4 MB, salvataggio 0,2–0,5 ms (28–41 KB), come `main`.

## [2026-11-23] Operazione Living World 2.0, incremento 1: il borgo ricorda — Claude
Branch `claude/living-world-2` (`world-memory.js` nuovo, `engine.js`, `panels.js`, `build.py`, prove).
### Aggiunto
- Nuovo modulo `world-memory.js` (`WorldMemory`, dopo `reputation.js`) e campo di salvataggio `s.memory` (`schema:1`: `episodes` ≤60 `{npc, kind, day, source}`, `promise`, `reserveDay`). **Catena giocabile al Borgo di Vela**: quando il mercato di Vela è davvero a corto di erbe di rugiada (`Economy.shortage`), dal dialogo di Tessa si possono consegnare fino a 3 erbe di persona: entrano nella scorta del mercato con `Economy.deliver` (registro esatto, tetto di magazzino) e sono pagate al prezzo di vendita del mercato unità per unità, quindi nessuna merce o moneta nasce dal nulla. Tessa ricorda l'aiuto (fonte diretta); Nerea e Ivo lo ricordano solo se in quel momento sono vivi, al loro posto (non in pattuglia né critici) ed entro 100 px (testimoni); nessun altro NPC lo sa, e gli abitanti di Society e Velaris non vengono toccati. L'opinione si ricava dagli episodi (aiuto +2, promessa mantenuta +3, promessa mancata −5, testimone +1), dimezza ogni 10 giorni, conta un episodio per tipo e giorno e i tre più recenti per tipo: ripetere la stessa azione non la fa salire senza fine. Con «Ti stima» (≥1,5) Tessa tiene da parte una pozione al giorno, allo stesso prezzo, ritirabile solo a emporio chiuso. Durante una carenza si può **promettere** 3 erbe entro la sera del giorno dopo: mantenuta rafforza la fiducia, mancata fa scattare un ricordo negativo (avviso «ha atteso invano»), chiude la riserva e Tessa rifiuta nuove promesse finché l'opinione non risale con aiuti in giorni diversi. Se Tessa muore la promessa decade senza colpa, la riserva e le consegne si chiudono, i ricordi restano; non torna in vita da sola. I dialoghi di Tessa, Ivo e Nerea mostrano che cosa ricordano e da quale fonte. Scadenze controllate nell'impulso a bassa frequenza; nessun lavoro per fotogramma.
- `tests/verifica-memoria.cjs` (11 prove Node) e `tests/prova-browser-memoria.cjs` (7 passi in Edge con azioni reali).
### Verifica
- build `b02a1bb8…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-memoria` 11/11 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-filoni` e `verifica-calis` 55 semi, `confronto-mondo` identico a `main` `96eb9be` (34 regioni), PERF-002 181 scene equivalenti, `verifica-salvataggi-incrociati` 2/2 fra `main` e il branch (il branch aggiunge `memory` vuoto ai salvataggi vecchi; `main` conserva `memory` senza toccarlo). Edge: `prova-browser` 10/10, Velaris 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8, `prova-browser-memoria` 7/7 (nuova), Filoni (15 visite), Calis (12 visite). Mutazione: togliendo il controllo di presenza dei testimoni la prova 3 fallisce («Ivo ricorda senza esserci»). `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 0,5–4,2 ms, massimo 6,9–24,7 ms, nessun fotogramma oltre 33 ms, memoria 9,3–16 MB, salvataggio 0,3–0,4 ms (28–41 KB) — come `main` (p95 0,5–4,2 ms, massimo 5,3–26,5 ms, 28–40 KB).

## [2026-11-23] Operazione Living World 2.0, incremento 0: audit e piano — Claude
Branch `claude/living-world-2` da `main` `96eb9be` (worktree `Reincarnation-living-world`).
### Documentazione
- `LIVING_WORLD.md`: stato del repository (`codex/urban-scale` non integrato, file toccati da Codex e punto sicuro per un nuovo modulo in `build.py`), matrice dei sistemi con classificazione, interconnessioni attuali, difetti con ID stabili (LW-ECO-01…, LW-SOC-01…, LW-NPC-01, LW-SPC-01…, LW-SAV-01), classificazione di RPG-001…004 e PERF-003, decisioni lasciate all'utente, architettura di `WorldMemory`, piano degli incrementi 0–6, benchmark di riferimento.
- `LIVING_WORLD_AUDIT.md`: rapporti integrali dei quattro revisori in sola lettura (simulazione e salvataggi; NPC e relazioni; economia e professioni; specie, progressione e missioni).
- `AGENTS.md`: nuovi documenti nell'elenco.
### Verifica
- **LW-ECO-01 confermato** con le API reali: vendere e ricomprare subito un lotto rende a ogni ciclo (Calis, minerale: +2000 Scintille per 1000 unità, +200 000 in 100 cicli, merce invariata).
- **D-1 ridimensionato** con `Game.step` (giocatore fermo al borgo, seme 19425): 1 morto in 6 ore, 4 in 48 ore (tre guardie e Nerea), nessuno dei 18 abitanti (il revisore ne stimava 14–16 in 6 ore senza il motore reale).
- Rischio dei salvataggi confermato in `savedCandidate`: una sezione che non supera il ripristino fa ripiegare sulla chiave precedente.
- Serie completa su `96eb9be` nel nuovo worktree superata; `sonda-sessione` 6 minuti: nessun fotogramma oltre 33 ms, salvataggio 28–40 KB.

## [2026-11-23] Unione dell'operazione RPG Evolution su `main` — Claude
Autorizzata dall'utente («Sì, unisci»). Commit di unione `b1dc116`, fast-forward di `main` `7488642` → `b1dc116`, pubblicato. Verificato sulla build unita: serie completa Node ed Edge, comprese `verifica-filoni`, `verifica-calis`, `prova-browser-filoni` e `prova-browser-calis`; `confronto-mondo` identico a `7488642`; salvataggi incrociati 6/6 fra `f2febd1`, `7488642` e la build unita. Branch `claude/integrazione-rpg-evolution` da `main` `7488642` (Calis e Filoni di Codex), merge di `claude/rpg-evolution` (`1feec7f`). Codice unito senza conflitti (anche `interface.js` e `panels.js`); conflitti solo nei registri: in `CHANGELOG.md` tenute entrambe le serie di voci, in `PROGRESS.md` tenute le note di entrambi e la riga RISK-011 combinata (osservazioni di Codex dopo `24d33eb`/`fff2484` più la risoluzione dell'incremento 1). `Reincarnation.html` ricostruito.

## [2026-11-23] Operazione RPG Evolution, incremento 6: revisione incrociata e rapporto finale — Claude
Commit `544e6cd`. Albero unito con `main` `7488642` sul commit finale: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-salvataggi-incrociati` 2/2 contro `main` `7488642`, `verifica-filoni` 55 semi, `verifica-calis` 55 semi, `confronto-mondo` identico a `7488642`; Edge: `prova-browser` 10/10, combattimento 9/9, interfaccia 8/8, progressione 7/7, `prova-browser-filoni` (15 visite) e `prova-browser-calis` (12 visite) superate.
Branch `claude/rpg-evolution` (`engine.js`, `interface.js`, prove, documenti). Commit degli incrementi precedenti: 0 `c9e2390`, 1 `a76cf70`, 2 `cc34b10`, 3 `654f1cf`, 4 `a43b6da`, 5 `7f7baf8`.
### Corretto
- Corsia della carica disegnata come capsula completa: prima mancava il semicerchio posteriore e si veniva colpiti fino a ~12 px dietro il lupo fuori dall'area mostrata (`engine.js` `dashLane`).
- Lunghezza della corsia con il passo reale del motore: a ~20 fps la corsa superava la punta disegnata di 5–7 px (`engine.js`, `stepDt` non salvato).
- Consiglio «prima volta» registrato come visto solo quando compare; prima, se la fila piena lo scartava, era perso (`interface.js` `hintShown`).
- Fila dei messaggi svuotata a ogni nuova partita o caricamento (`interface.js`).
### Aggiunto
- `tests/verifica-salvataggi-incrociati.cjs`: salvataggi giocati in una versione, importati in un'altra e confrontati campo per campo, in entrambe le direzioni.
- `verifica-avvisi` 4: capsula della corsia, punti dietro il mostro, passo di 0,05 s; `prova-browser-interfaccia` 5b: consiglio scartato dalla fila piena.
### Documentazione
- `RPG_EVOLUTION.md` «Incremento 6»: revisione incrociata, unione simulata con `main` `7488642`, compatibilità dei salvataggi, benchmark finali, stato di RISK-011, problemi aperti RPG-001…004, raccomandazione sul merge.
### Verifica
- build `bc390b3e…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, `verifica-salvataggi-incrociati` 2/2 (nuova), economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico. Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 8/8. `scatti-combattimento` PRIMA (`main` `f2febd1`) / DOPO: stato di gioco identico in tutte le 19 scene. Albero unito con `main` `7488642` (cartella temporanea): tutte le prove, comprese quelle di Filoni e Calis; mondo identico a `7488642`. Benchmark finali in `RPG_EVOLUTION.md`.

## [2026-11-23] Operazione RPG Evolution, incremento 5: interfaccia ed esplorazione più chiare — Claude
Branch `claude/rpg-evolution` (`interface.js`, `panels.js`, `engine.js`, `template.html`, `style.css`, prove).
### Modificato
- **Bisogni nell'HUD** (`interface.js`, `template.html`, `style.css`): accanto al ritratto compaiono le etichette «Fame», «Sete», «Stanchezza», «Caldo» o «Freddo» solo quando il bisogno penalizza (sotto 32, la stessa soglia di `daily-life.js`; temperatura oltre ±28), in rosso quando è grave (≤10, oltre ±46); prima le penalità erano visibili solo nel pannello N. **Barra PE accessibile**: `role="img"` con etichetta e suggerimento «Esperienza x su y». **Consigli «prima volta»**: sei consigli brevi (interagire, bisogni, mana, Statue della Rinascita, albero delle evoluzioni, echi da legare) compaiono una sola volta, solo con la Guida attiva (la stessa opzione dei segnali di direzione); quelli già visti restano in `lumora-hints`, fuori dal salvataggio. **Fuoco dei pannelli**: la trappola del fuoco include i `<summary>`, così Maiusc+Tab da un riquadro richiudibile non salta in fondo. **Scheda attiva annunciata**: `aria-current="page"` sulla scheda aperta. **Movimento ridotto**: il rombo delle missioni sopra i personaggi (`engine.js`, `stillMarks`) e il marcatore dell'obiettivo restano fermi con gli effetti ridotti o con `prefers-reduced-motion`. Nessuna regola di gioco cambiata; salvataggio invariato.
### Aggiunto
- `tests/prova-browser-interfaccia.cjs` (7 prove): bisogni e PE, consigli spenti senza Guida, Maiusc+Tab da un `<summary>`, `aria-current`, consigli una sola volta e fuori dal salvataggio, nessun errore, rombo fermo con il movimento ridotto.
### Verifica
- build `49751893…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico (contro il `main` locale `7488642` differiscono solo le regioni dei Filoni di Codex, attese). Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7, interfaccia 7/7 (nuova). Scatto HUD PRIMA (`main` `f2febd1`) / DOPO con sete e stanchezza. `sonda-sessione` 6 minuti in Edge visibile: mediana 0,2–0,4 ms, p95 fino a 4,5 ms (main 4,7), massimo 28 ms, nessun fotogramma oltre 33 ms, memoria 9,7–20,9 MB, salvataggio 0,2–0,3 ms.

## [2026-11-23] Operazione RPG Evolution, incremento 4: boss comprensibili — Claude
Branch `claude/rpg-evolution` (`engine.js`, `adaptive-combat.js`, prove).
### Modificato
- **Corsie dei proiettili** (`engine.js`): radici, frantumi, costellazioni, schegge, forgia, tiri e il ventaglio del prisma di Nadir mostrano durante il preavviso una corsia tratteggiata con la freccia per ogni proiettile, nelle direzioni in cui partirà (prima un anellino uguale per tutti; il ventaglio del prisma non era segnalato). Lancio e avviso usano le stesse funzioni d'angolo (`fanAngles`, `spreadAngles`, `volleyAngles`) con gli stessi numeri di prima. **Riposizionamenti** (schivata laterale, cambio di linea): frecce laterali o all'indietro invece dell'anellino. **Guardia adattiva visibile**: ellisse tratteggiata azzurra e scudo sul nemico finché i colpi ravvicinati sono ridotti (×0,84 per 1,9 s; `Adaptive.guardLeft`, sola lettura). **Reazioni spiegate**: oltre all'etichetta, un messaggio dice perché il nemico reagisce e come rispondere (es. «ha letto i tuoi colpi ravvicinati · esci dal cerchio o cambia ritmo»). **Disimpegno segnalato**: se ci si allontana e il boss torna a vita piena, un messaggio lo dice. **Vittoria su Nadir e Nerav**: come per gli altri boss, i loro proiettili e le aree non feriscono più dopo la vittoria; ricompense, `legendary.js`, trono e Armi Divine invariati. Preavvisi, danni, fasi e soglie adattive invariati.
### Aggiunto
- `tests/verifica-avvisi.cjs` 5–8: corsie = proiettili reali (radici di Orveth fasi I e II, forgia di Kharun, schegge e frantumi di Syrava), guardia visibile finché dura, reazione spiegata, disimpegno segnalato.
- `scatti-combattimento.cjs`: scene `avviso-radici`, `avviso-forgia`, `guardia`.
### Verifica
- build `8dafb966…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 8/8, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico. Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7 (vittoria su Nadir), interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7. `scatti-combattimento` PRIMA (`main` `f2febd1`) / DOPO: stato di gioco identico in tutte le 19 scene. Benchmark in Edge visibile (3 giri × 600 fotogrammi): mischia fotogramma medio 0,77 → 0,83 ms, `drawFX` 0,036 → 0,039 ms; boss con aura 0,47 → 0,56 ms, `drawFX` 0,028 → 0,040 ms; `sonda-sessione` 6 minuti: mediana 0,2–0,4 ms, p95 fino a 4,4 ms, nessun fotogramma oltre 33 ms, memoria 9–25 MB.

## [2026-11-23] Operazione RPG Evolution, incremento 3: evoluzione e abilità più chiare — Claude
Branch `claude/rpg-evolution` (`interface.js`, `engine.js`, `growth.js`, `panels.js`, prove).
### Modificato
- **Coda dei messaggi** (`interface.js`): prima un messaggio cancellava il precedente nello stesso istante (livello, talento, evoluzione, oggetti del boss si coprivano); ora si vedono in fila, al massimo tre in attesa, senza doppioni, con precedenza ai messaggi di progressione. **Evoluzione annunciata per intero** (`engine.js`): «Evoluzione · forma · Nuova tecnica · nome · tasto N» (o «assegnala con K»); l'avviso in basso dice «Nuova forma · nome · V». **Avanzamento verso lo stadio** (pannello V, `panels.js`; contatori di sola lettura in `growth.js`): sotto la condizione, «Basta una di queste vie» con scontri x/3, pratiche x/5 e le due vie insieme x/3 (dal livello 3); al secondo stadio Kharun sconfitto, mestiere migliore al grado g/4, pratiche x/32. **Evoluzione in attesa**: con i requisiti completi e un boss ingaggiato il pannello dice «Pronta: avverrà alla fine dello scontro» (prima il blocco era silenzioso). **Soglie dell'innata** (pannello K): utilizzi efficaci, ramo a 5 utilizzi, prossima maestria ogni 4, risonanza dai 15 con i talenti in armonia. **Barra rapida**: si aggiorna quando una tecnica evolve alla maestria 4 (prima restava il nome vecchio). Requisiti, soglie, rarità e bilanciamento invariati.
### Aggiunto
- `tests/prova-browser-progressione.cjs` (7 prove): coda dei messaggi, pannello V con le vie, evoluzione in attesa durante un boss, evoluzione per la via reale con messaggio e avviso, soglie dell'innata, barra rapida, nessun errore.
### Documentazione
- `GAME_DESIGN.md` §4.2: i parametri `evolutionLevel`, `evolutionEssence`, `ascensionLevel`, `ascensionEssence` di `rules` non sono usati; le soglie reali sono in `growth.js` → `evolution()`.
### Verifica
- build `b780f181…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 4/4, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico. Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6, progressione 7/7. Scatti PRIMA/DOPO dei pannelli V (primo e secondo stadio) e K. `sonda-sessione` 6 minuti in Edge visibile: fotogramma mediana 0,2–0,5 ms, p95 fino a 4,7 ms, nessun fotogramma oltre 33 ms, memoria 9–20 MB, salvataggio 0,2–0,4 ms, primo ingresso in Vaelthoria 65,8 ms (come prima).

## [2026-11-23] Operazione RPG Evolution, incremento 2: combattimento più reattivo e leggibile — Claude
Branch `claude/rpg-evolution` (`engine.js`, `combat-fx.js`, `interface.js`, prove).
### Modificato
- **Memoria d'ingresso** (`interface.js`): un comando (attacco, schivata, tecniche, innata) premuto negli ultimi 0,2 s di ricarica parte appena la ricarica finisce invece di andare perso; non vale per mana insufficiente o altri rifiuti; ricariche e tempi restano quelli del motore. **Settore reale del colpo** (`combat-fx.js`, dati `reach` e `cone` sull'effetto dell'arco in `engine.js`): per un istante, tenue, la portata e il cono che il motore usa davvero (prima l'arco era al 66–86% della portata e con un angolo diverso). **Tacche della combo**: tre punti ai piedi del personaggio, pieni per i colpi messi a segno, il terzo pulsa quando arriva il colpo forte; spariscono con la finestra di 1,25 s. **Avvisi uguali al colpo** (`engine.js`): pestone (prima un'ellisse più piccola; per i boss diversi da Orveth il raggio dei mostri normali), maglio e contrattacco (3–4 px più piccoli) ora disegnano esattamente l'area che colpisce; la carica ha una corsia lunga quanto la corsa reale e larga quanto il contatto (prima una linea di 55 px). Misure condivise fra colpo e avviso (`stompRadius`, `hammerRadius`, `dashTime`, `dashSpeedOf`, `dashReach`) con gli stessi valori di prima: danni, tempi e ricariche invariati.
### Aggiunto
- `tests/verifica-avvisi.cjs` (Node): su una griglia di punti, l'area disegnata da `drawFX` (letta dalle istruzioni di disegno) coincide con chi viene colpito per pestone del Germoglio e di Orveth (fasi I e II) e contrattacco, e contiene ogni colpo della carica di lupo e Orveth.
- `prova-browser-combattimento.cjs` 8 e 9: memoria d'ingresso con il tasto reale (a 0,1 s dalla fine parte, a 0,5 s no), settore con la portata reale e tacca della combo disegnati.
- `scatti-combattimento.cjs`: scene `avviso-pestone`, `avviso-carica`, `avviso-orveth`.
### Verifica
- build `2a1fe847…`. Node: `verifica-integrazione` OK, `verifica-esperienza` 10/10, `verifica-avvisi` 4/4, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0, `verifica-perf-002` 181 scene equivalenti; `confronto-mondo` contro la base `f2febd1` identico (contro il `main` attuale differiscono solo le regioni dei Filoni aggiunte da Codex). Edge: `prova-browser` 10/10, `velaris-est` 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 9/9, famiglie 6/6. `scatti-combattimento` PRIMA (`main` `f2febd1`) / DOPO: stato di gioco identico in tutte le 16 scene. Benchmark in Edge visibile (3 giri × 600 fotogrammi): mischia fotogramma medio 0,93 → 0,92 ms e `drawFX` 0,043 → 0,044 ms; boss con aura fotogramma 0,59 → 0,73 ms e `drawFX` 0,033 → 0,048 ms (+0,015 ms per settore e tacche); `sonda-sessione` 12 minuti come prima (p95 fino a 4,8 ms, memoria 9–30 MB senza crescita), con un solo fotogramma oltre 33 ms (35,5 ms nel primo minuto, all'avvio; su `main` il massimo del primo minuto era 29,1 ms).

## [2026-11-23] Operazione RPG Evolution, incremento 1: RISK-011 e prove dell'esperienza — Claude
Branch `claude/rpg-evolution`. Nessun sorgente del gioco modificato.
### Corretto
- RISK-011: `tests/prova-browser-velaris-est.cjs` falliva circa una volta su dodici perché creava la partita con seme casuale e usava per gli Orti dell'Alambicco la coordinata fissa (2516,1260), occupata da un edificio con il 7,5% dei semi. Ora seme fisso (`SEED`, predefinito 19425) e mete prese dalla pianta della città (`arcades-court`, `orchards-court`). Diagnosi con sonde deterministiche su ore, velocità, punti d'arrivo (268 combinazioni) e su 200 semi; verifica 11/11 esecuzioni, anche con i semi che prima fallivano. Nessun aumento dei tempi d'attesa, nessuna ripetizione.
### Aggiunto
- `tests/verifica-esperienza.cjs`: dieci scenari sul motore reale in Node (stirpe, crescita, maestria, evoluzione e blocco durante un boss, attacchi nemici e schivata, Orveth, morte e rinascita alla statua, minigioco della forgia, passaggio del tempo, salvataggio della partita avanzata). 10/10.

## [2026-11-23] Operazione RPG Evolution, incremento 0: rapporto, matrice, rischi e benchmark — Claude
Branch `claude/rpg-evolution` da `main` `f2febd1`; commit `c9e2390` (documento e sonda) e registrazione successiva.
### Documentazione
- `RPG_EVOLUTION.md` nuovo: rapporto tecnico iniziale con matrice delle funzionalità (presenti, incomplete, difetti confermati con righe di codice), mappa dei rischi (anche le righe toccate dal branch `codex/generatore-urbano-filoni`), piano degli incrementi 1–6 e benchmark di riferimento. Analisi in parte con tre revisori in sola lettura (evoluzione, boss, interfaccia), combattimento seguito direttamente. `AGENTS.md`: documento aggiunto all'elenco dei file.
### Aggiunto
- `tests/sonda-sessione.cjs`: sessione lunga nel browser con orologio manuale (combattimento a più nemici, tecniche, schivate, passaggi di regione) che misura per minuto fotogramma, memoria JS, salvataggio e ingresso in regione.
- Benchmark su `main`: fotogramma mediana 0,2–0,4 ms, p95 fino a 4,7 ms in combattimento, nessun fotogramma oltre 33 ms in 12 minuti, memoria 10–32 MB senza crescita costante, salvataggio 0,1–0,5 ms.

## [2026-11-23] Registra il collaudo di Calis e Filoni su main — Codex

- Fast-forward autorizzato da `df21ad7` a `fff2484`. L'HTML offline ricostruito coincide con la build approvata. Entrambi i quartieri sono visitabili nella stessa partita.
- Rieseguiti 55 semi per quartiere, 27 visite nei nove interni, attività, vecchi salvataggi, PERF-001/002 e regressioni di economia e grafica. RISK-011 resta aperto.
- Aggiunte le misure CPU e degli intervalli tra fotogrammi con simulazione attiva, distinte dalla prova grafica precedente. [Registro e dati di collaudo](PROGRESS.md#porto-di-calis-e-filoni-su-main)

## [2026-11-22] Apri la Baia del Carico al Porto di Calis — Codex

- Secondo profilo urbano da `df21ad7` sul branch `codex/porto-di-calis`, commit `a8c2ee2`. `urban-profiles.js` separa i dati dei due quartieri dal generatore e `urban-world.js` gestisce più ingressi regionali.
- 11 edifici, quattro interni, quattro residenti, banchina e due pontili percorribili. Famiglia di Azheryon e costa derivata dalla Baia del Carico esistente.
- Emporio collegato a `calis` e commissione commerciale persistente con ricompensa una tantum nel diario. Compatibilità di Filoni, salvataggi, grafica e prestazioni registrata nel [collaudo](PROGRESS.md#porto-di-calis--secondo-profilo-urbano).

## [2026-11-22] Pubblica il Piazzale degli Argani su main — Codex

- Fast-forward autorizzato da `f2febd1` a `24d33eb` (`codex/integrazione-filoni-fase4`). Disponibili 13 edifici, cinque interni, tre residenti e servizi collegati al mercato dei Filoni, con la famiglia architettonica di Nordharyn già in uso.
- `Reincarnation.html` ricostruito e verificato byte per byte. Ripetuti il collaudo su 55 semi, le attività nei cinque interni, le migrazioni dei salvataggi e le regressioni di economia, NPC, combattimento e grafica. PERF-001 e PERF-002 confermati. RISK-011 rimane aperto. [Registro dei test](PROGRESS.md#piazzale-degli-argani-su-main)

## [2026-11-22] Integra il Piazzale degli Argani con la Fase 4 — Codex

Branch `codex/integrazione-filoni-fase4`, commit di integrazione `5982895`, prototipo `56886ab`. La base `1f684e1` con la Fase 4 è stata aggiornata a `main` `f2febd1` sul branch di prova.

### Modificato

- `urban-districts.js` adotta facciate, soglie e arredi della famiglia di Nordharyn per i 13 edifici del Piazzale. Le finestre e le lanterne usano i metadati del catalogo per l'illuminazione notturna. `filoni-sprites.js` conserva terreno e vegetazione locali.
- `build.py` include entrambi gli aggiornamenti nell'HTML offline. La struttura del prototipo conserva le impronte dei lotti, gli identificatori delle cinque porte e i tre residenti con turni.
- `tests/verifica-filoni.cjs` confronta 55 semi con il prototipo. `tests/prova-browser-filoni.cjs` verifica i servizi e ricarica salvataggi effettivi dai cinque interni della build precedente. Esiti in [PROGRESS.md](PROGRESS.md#integrazione-filoni-e-fase-4).

## [2026-11-22] Apri il Piazzale degli Argani al Borgo dei Filoni — Codex
Branch `codex/generatore-urbano-filoni`, base `3ff458b`, commit `6f025a7`.
### Aggiunto
- Quartiere di Nordharyn con 13 lotti, piazza d'autore, strade e soglie connesse, cinque interni e tre residenti con turni diurni. Il nuovo passaggio parte dal borgo esistente senza spostare il mercato o i varchi storici.
- Planimetria deterministica, collisioni e superfici per settore, cache a capienza limitata e mappa semplificata. L'atlante del quartiere riusa 14 sprite effettivi del World Art Overhaul e le sorgenti di illuminazione del motore.
- Riposo, commercio sul mercato `filoni` e forgia attraverso i sistemi già presenti. Salvataggi v7 con ID separati per ciascuna porta e interno. HTML offline ricostruito, test e misure in `PROGRESS.md`.
## [2026-11-22] Integrazione: fase 4 del World Art Overhaul su `main` dopo PERF-002 — Claude
Branch `claude/integrazione-fase4` da `main` `3ff458b` (PERF-002 di Codex): merge di `claude/world-art-fase4` (`16b6317`), poi fast-forward di `main` con l'approvazione dell'utente. Branch originali `claude/world-art-fase4` e `codex/perf-002-npc` conservati, come le build di prova.
- Fast-forward di `main` da `3ff458b` a `1f684e1` (merge `claude/integrazione-fase4`); `Reincarnation.html` ricostruito su `main` identico al commit (SHA-256 `0c49851c…`). Verifiche ripetute su `main`: `verifica-integrazione`, economia 158, `sonda-percorsi` 0 bloccati su 41 040, `verifica-perf-002` 181 scene equivalenti rispetto a prima di PERF-002 (worktree della fase 4), Edge `prova-browser` 10/10, `velaris-est` 12/12, mondo 15/15, creature 7/7, combattimento 7/7, famiglie 6/6.
### Integrazione
- Nessun file di codice in comune: PERF-002 tocca `urban-life.js` e tre prove; la fase 4 `continents.js`, `world-light.js`, `engine.js`, `build.py`, `tests/scatti-mondo.cjs` e quattro moduli nuovi (`creature-art.js`, `combat-fx.js`, `city-families.js` e i loro strumenti di prova). Conflitti solo in `CHANGELOG.md` e `PROGRESS.md`, conciliati tenendo entrambe le storie.
### Verifica
- Build unita `Reincarnation.html` ricostruita dai sorgenti (SHA-256 `0c49851c…`). `confronto-mondo.cjs` contro `main` `3ff458b` (semi 19425/1116, 23 regioni, 8,6 milioni di campioni `canWalk`, 1587 rotte): identici. Node: `verifica-integrazione`, economia 158 e 147, `economia-flussi-2` codice 0, `sonda-percorsi` 0 bloccati su 41 040, `sonda-residenti` 0, `verifica-perf-002` 181 scene equivalenti (2631 posizioni percorribili, orari, sonno, salvataggi, commissioni, reputazione ed economia). Edge: `prova-browser` 10/10, `velaris-est` 12/12 (salvataggio della build `3ff458b`), economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 7/7, famiglie 6/6; nessun errore JavaScript.
- RISK-011 resta aperto: `velaris-est` aveva dato 11/12 nella serie completa per le fasi 4 C e 4 D e 12/12 in sei esecuzioni separate (anche con la build di `main`); sulla build unita ha dato 12/12. Prova intermittente, non attribuita alla fase 4 e non chiusa.

## [2026-11-22] World Art Overhaul, fase 4: Cripta, creature, combattimento e città — Claude
Branch `claude/world-art-fase4` da `main` `972e31c`, unito a `main` dopo PERF-002 con l'approvazione dell'utente (vedi la voce d'integrazione). Incrementi separati e verificati uno per uno. Nessun file di `urban-life.js` o del pathfinding toccato (lavoro PERF-002 di Codex in corso nel worktree `perf-002-npc`).
### Fase A · Cripta delle Soglie (`continents.js`, `world-light.js`)
- Materiali diversi per sala: lastre d'arenaria con sentiero consumato e mosaico del patto (Anticamera), mattoni a spina di pesce con passatoia (corridoi), scacchiera di basalto e marmo a contrasto contenuto con la rosa delle otto chiavi d'oro (Sala delle Chiavi), lastre d'ardesia con un nome inciso su ciascuna e altare ad anello con il libro dei nomi e otto candele (Camera dei Nomi), basalto levigato con anelli e raggi d'oro e il cerchio della Soglia con due archi che si cercano (Ultima Soglia).
- Pareti alte 20 px in arenaria con nicchie e urne, tavole incise e la porta sigillata in rilievo dell'Ultima Soglia; roccia viva con venature; ombre di contatto delle pareti; pavimenti ritagliati sul perimetro delle sale, corridoi sotto le sale.
- Bracieri di bronzo al posto delle lampade (stessi punti), luce dei bracieri, dei tre pezzi centrali e del mosaico, strato emissivo di rune e intarsi; penombra calda e violacea (`crypt`) con pulviscolo dorato, distinta dalla penombra marina del Santuario.
- Sale, oggetti, varco e punti invariati: la percorribilità resta «dentro una sala».
- Commit `6d9f79a`. Verificato: `confronto-mondo.cjs` contro `main` con semi 19425/555 e 19425/1116 (identici), `verifica-integrazione`, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0; browser 10/10, 12/12, economia, mondo 15/15 (Cripta: importazione, camminata, ricarica), Cava 6/6, Santuario 7/7, interni 12/12; scatti PRIMA/DOPO delle quattro sale (fuori dalla Cripta identici byte per byte); prestazioni in Edge visibile: fotogramma e disegno invariati (mediana 0,1–0,2 ms, p95 0,2–0,4 ms), primo ingresso nella Cripta da 26 a 35 ms (una volta per ingresso, disegno in cache).
### Fase B · Stirpi con sprite dedicato (`creature-art.js` nuovo, `build.py`)
- Scheletro errante, Orso dei larici e Viverna di brina avevano lo sprite di un'altra specie (fuoco fatuo, lupo, drago) con qualche rettangolo sopra, visibile anche di spalle e uguale in tutte le forme. Ora hanno un piano corporeo proprio (bipede d'ossa, quadrupede con la gobba delle spalle, rettile alato con ali a tre dita), volto, vista di fronte, di spalle e di lato, passo a due tempi, attesa animata (occhi, fiammelle, battito d'ali), posa d'attacco e lampo del colpo.
- Cinque forme per stirpe con sagome diverse, non solo colori: Scheletro con armatura di lamiera e mannaia, con cappuccio, lanterna e lumino, cavaliere d'ossa chiare con elmo crestato, scudo, spada e mantello, custode delle veglie con veste incisa, bastone ad anello e aureola di candele; Orso con il ramo di larice, creste di pietra, muschio e rivoli, cristalli di ghiaccio e taglia maggiore, canne, fiori, sassi e ruscello; Viverna con aculei e coda a lama, ali sfrangiate e nebbia, ali grandi, corona di corni e coda a mazza, ali a velo con bordo d'aurora.
- Ramo offensivo con accento caldo, ramo di sostegno con accento freddo; secondo stadio con sagoma più grande e un elemento nuovo. Il metodo è documentato in `GAME_DESIGN.md` §4.2 per estenderlo alle altre stirpi.
- Requisiti, statistiche, alberi, tecniche, colpi, tempi e ingombri invariati: il modulo cambia solo `ActorArt.draw` e `ActorArt.portrait` per le tre stirpi (coordinate ai piedi, ombra, fotogrammi in memoria). Anche i residenti di Velaris di queste stirpi cambiano aspetto, non posizione.
- Strumenti: `tests/scatti-creature.cjs` (tavole per forma, direzione e posa, PRIMA/DOPO, misure dei riquadri), `tests/prova-browser-creature.cjs` (7 prove), `tests/scatti-mondo.cjs` con `RACE`/`FORM` per scegliere stirpe e forma negli scatti.
- Commit `86f5900`. Build di prova offline: `Reincarnation.html` del branch (SHA-256 `adf233dd…`). Al commit di B le fasi C e D non erano iniziate; sono descritte qui sotto.
### Fase C · Effetti di combattimento (`combat-fx.js` nuovo, `engine.js`, `build.py`)
- Sette elementi visivi con palette e forme proprie: **fisico** (lampo, linee d'urto, schegge), **fuoco** (lingue di fiamma, braci che salgono e diventano fumo), **acqua** (corona di gocce, spruzzi, increspatura a terra), **ghiaccio** (schegge a rombo, raggiera di brina, scintillii), **fulmine** (saette spezzate, scintille veloci), **oscurità** (ombre risucchiate, nucleo scuro, onda viola), **luce** (raggi, stelle). Ogni impatto ha un lampo di contatto con contorno scuro che si stacca da ogni terreno.
- Tabelle complete: elemento per ognuna delle 44 stirpi e per i 17 tipi di mostro (boss e leggendari compresi). Le tecniche della stirpe ne prendono l'elemento; Scintilla e Spira di tempesta sono fulmine, Aurora ed Egida di linfa luce, Schegge del varco oscurità; le cure restano verdi. Il colpo base è fisico con un accento dell'elemento della stirpe; i soffi (`spit`) sono dell'elemento.
- Proiettili con la forma dell'elemento (palla di fuoco, bolla, scheggia orientata, scintilla, sfera d'ombra, stella); quelli nemici con bordo scuro, più leggibili di prima. Anelli d'urto e archi dei colpi con decorazioni dell'elemento lungo il bordo; aree persistenti dei boss con particelle dell'elemento.
- Colpo forte: il gioco non ha colpi critici casuali e aggiungerli cambierebbe i danni, quindi il «critico» visivo è il terzo colpo della combo (già ×1,25 nel motore): onda d'urto, linee d'impatto e numero più grande e dorato.
- Schivata riuscita: scia di sagome azzurre lungo lo scatto, scintilla e due archi di vento. Colpo subito: particelle dell'elemento dell'attacco dal bordo della figura; colpo assorbito dallo scudo: ellisse tratteggiata.
- Boss: aura che cresce con la fase (fase II sigillo a terra con decorazioni dell'elemento, fase III più particelle, stelle dorate per i leggendari); cambio di fase come trasformazione (sigillo che si apre, colonna di luce, onda d'urto, particelle); sconfitta con dissoluzione e colonna. Evoluzione del personaggio: cerchio, colonne e scintille intorno alla figura.
- Leggibilità: `Game.drawFX` disegna le decorazioni prima degli avvisi di pericolo, dei proiettili e dei numeri; ciò che tocca la figura del personaggio resta al 25%; i numeri hanno il contorno su tutti i lati e salgono di una riga se ne toccano un altro (prima «Combo ×3» e il danno si sovrapponevano).
- Effetti ridotti (Opzioni) e `prefers-reduced-motion`: niente particelle, scie, aure animate, colonne o tremolii; restano un simbolo fermo dell'impatto e i sigilli statici.
- Motore (`engine.js`): un'etichetta visiva `fxTag` copiata su effetti, proiettili e aree, e i segnali `hit`, `hurt`, `dodge`, `dash`, `phase`, `defeat`, `evolve` inviati a `CombatFX` dentro `try`. Nessun numero casuale in più (`combat-fx.js` usa una funzione hash), niente nei salvataggi; danni, ingombri, ricariche, tempi e velocità invariati. Senza `combat-fx.js` il disegno torna quello di prima (salvo l'ordine degli strati).
- Strumenti: `tests/scatti-combattimento.cjs` (13 scene PRIMA/DOPO con lo stato di gioco confrontato, `REDUCED=1`, `BENCH=1`), `tests/prova-browser-combattimento.cjs` (7 prove).
- Commit `f82168d`. Build di prova `fase4-C.html` (SHA-256 `b88f2ae5…`). Verificato: `confronto-mondo` contro `main` (semi 19425/1116) identico; Node `verifica-integrazione`, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0; browser (Edge) 10/10, `velaris-est` 12/12 (11/12 nella serie lanciata insieme agli scatti, che caricavano la macchina: la prova cammina in tempo reale; poi 12/12 due volte da sola), economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, `prova-browser-combattimento` 7/7 (tabelle, sette elementi con le vere azioni, fase, sconfitta, schivata ed evoluzione, logica identica con e senza effetti per Demone, Vampiro, Spirito e Slime con la stessa quantità di numeri casuali consumati, ordine di disegno, salvataggio e ricarica, effetti ridotti); `scatti-combattimento` PRIMA (`fase4-B`) / DOPO in 13 scene con stato di gioco identico, anche con `REDUCED=1`; prestazioni in Edge visibile (3 giri × 600 fotogrammi, tempo CPU): `drawFX` medio da 0,013 a 0,032 ms nella mischia e da 0,006 a 0,028 ms con il boss in fase II, fotogramma medio da 0,54 a 0,57 ms e da 0,43 a 0,46 ms.
### Fase D · Famiglie architettoniche per continente (`city-families.js` nuovo, `continents.js`, `build.py`)
- Catalogo separato di componenti urbani per i cinque continenti, pensato per il Generatore Procedurale Urbano 2.0 senza implementarlo: **Vaelthoria** pietra chiara e legno caldo (travertino squadrato, piani a graticcio, coppi, persiane, sala a colonne con frontone, colonnato, pergolato, fontana); **Nordharyn** pietra robusta e tetti ripidi (granito irregolare, tavole scure, frontoni d'ardesia con neve, casaforte a torre, castelletto di miniera con ruota e carrello, torre di guardia); **Myrathen** legno scuro, vetro e rame ossidato (vetrate a piombo, coperture verderame, lucernari, accademia con cupola costolonata e lanterna, laboratorio con alambicco e serra, rampicanti); **Voryndhal** architettura naturale (corteccia, porte e finestre tonde, tetti di foglie o paglia, radici monumentali, loggia sotto la grande radice, capanna su palafitte, passerella di corda, piattaforma); **Azheryon** pietra calda, portici e tende (terrazze con parapetto, travi sporgenti, grate, cupole, caravanserraglio a tre archi con piastrelle smaltate, tenda a strisce, molo; variante bianca e azzurra sulla costa).
- Ogni famiglia: materiali in rampe di colore, varianti regionali (Filoni/Rocca, Savana/Fronde, Deserto/Costa), regole per il generatore (muri, tetti, aperture, piani 1–3, larghezze 28–72 px), casa, bottega e sala parametriche, banco, pozzo, lampione e tre elementi caratteristici.
- Contratto: `CityFamilies.render(famiglia, variante, componente, {w, stories, variant, door})` restituisce una tela in memoria con il punto d'appoggio (`ax`, `ay`) al centro della base del fronte, l'impronta `{w, d}`, la soglia della porta `{x, y}`, i vetri da accendere di notte e, per i lampioni, la fiammella animata; stessa richiesta, stessi pixel (generatore con seme, cache con chiave). `CityFamilies.families` descrive materiali, regole (muri, tetti, aperture, piani, larghezze ammesse) e componenti di ogni famiglia senza funzioni; `CityFamilies.familyOf(tavolozza)` dà famiglia e variante; `CityFamilies.catalog(famiglia)` elenca i componenti con richieste d'esempio. Il modulo non genera città, non decide collisioni né lotti e non tocca percorsi, residenti o salvataggi: il Generatore 2.0 sceglie lotti e impronte in dati e chiede il disegno.
- I borghi delle otto regioni continentali usano già le famiglie (casa, bottega al posto della seconda casa, sala, banchi, pozzo, lampioni) con gli stessi oggetti, punti e raggi di collisione; vetri accesi di notte e fiammelle dei lampioni vengono dagli sprite delle famiglie. La Selva degli Alambicchi (pilota di Codex) resta com'era; il piano del generatore (`codex/piano-generatore-urbano-2`) non è toccato.
- Strumenti: `tests/scatti-famiglie.cjs` (tavole del catalogo con appoggio, soglia e vetri, misure), `tests/prova-browser-famiglie.cjs` (6 prove), `tests/scatti-mondo.cjs` con le scene dei borghi `nordharyn-hadrin`, `myrathen-siderea`, `voryndhal-fronde`, `azheryon-damar-borgo`.
- Commit `282cdd9`. Build di prova `fase4-D.html` (SHA-256 `e6601ce2…`). Verificato: `confronto-mondo` contro `main` (semi 19425/1116) identico (collisioni, acqua, punti, luoghi, varchi, rotte); Node `verifica-integrazione`, economia 158 e 147, `economia-flussi-2` codice 0, percorsi 0 bloccati su 41 040, residenti 0; browser (Edge) 10/10, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12, creature 7/7, combattimento 7/7, `prova-browser-famiglie` 6/6 (descrizioni, contratto di 96 componenti con fiammelle dentro le lanterne, stessi pixel, otto borghi con i vetri accesi solo dagli sprite delle famiglie, cammino nella piazza, salvataggio e ricarica in un borgo); `velaris-est` 11/12 nella serie completa e 12/12 in sei esecuzioni separate (anche dopo `prova-browser` e con la build di `main`): prova intermittente, RISK-011. Scatti PRIMA (`fase4-C`) / DOPO degli otto borghi a mezzogiorno e alle 22; fuori dai borghi 18 scene identiche byte per byte (Valle, Cava, Fenditura, Velaris, Cripta, locanda, Selva, pozze e varco di Myrathen, giorno e notte). Prestazioni in Edge visibile (2 giri × 240 fotogrammi): primo ingresso nei borghi 40–62 ms come prima (±3 ms), fotogramma mediana 0,3–0,4 ms e p95 0,5–0,7 ms come prima.

## [2026-11-22] Integra PERF-002 su `main` — Codex
Fast-forward autorizzato da `972e31c` ad `a4a7c20` (`codex/perf-002-npc`). Ricostruito `Reincarnation.html` e verificata l'identità byte per byte con il commit di integrazione e con una build indipendente (SHA-256 `907f4dc6…`).
### Verifica
- Ripetuto il benchmark dei 95 residenti reali. Su `main`, pianificazione totale Node da 64,89 a 19,43 ms (mediana) e picco CPU in Edge a mezzanotte da 11,4 a 2,2 ms. Risultati e regressioni in `PROGRESS.md`.
- Su `main`, test Node e 69 prove Edge superati. BUG-011 e PERF-001 verificati, geometria identica su 23 regioni, 28 confronti grafici identici e salvataggi precedenti caricati.
- Registrato separatamente il salto anticipato a 500 residenti come **PERF-003**, lavoro futuro. Il Generatore Procedurale Urbano 2.0 rimane in attesa.

## [2026-11-22] PERF-002, pianificazione delle routine di Velaris — Codex
Branch `codex/perf-002-npc`, base `972e31c`, commit `d980a80`.
### Corretto
- `urban-life.js` cerca le soste occupate in celle vicine, riusa gli scostamenti e prepara il piano successivo a piccoli passi dalla sera. Al cambio di giorno promuove il piano pronto e aggiorna subito le soste visibili. In caso di caricamento o salto di calendario completa a richiesta il giorno corrente.
- Ricostruito l'HTML offline. Conservati l'ordine dei residenti e delle soste, le destinazioni e le verifiche dei percorsi. Le cache delle routine sono in memoria e non entrano in salvataggi o scorte.
### Aggiunto
- Sonde ripetibili in Node ed Edge e regressione con una build precedente. I profili sintetici da 20 a 500 residenti esistono solo nei test. Misure e limiti in `PROGRESS.md`.

## [2026-11-22] Integrazione: Santuario, statue, varchi e interni di Velaris da Claude e Codex — Claude
Branch `claude/integrazione-santuario-interni` da `main` `ec03eeb`: fast-forward su `claude/world-art-santuario` (`3bd7f6d`), commit di prova `scatti-mondo` per più build, poi merge di `codex/world-art-interni-santuario` (`e9f1146`) con scelta parte per parte (commit di merge `4d3d4c7`). Branch originali non modificati. **Unito a `main` per fast-forward il 2026-11-22 (`ec03eeb` → `ae2b5c7`) su approvazione dell'utente**; dopo l'unione HTML identico ai sorgenti e alla build combinata (SHA-256 `fd4bc3c8…`), sistemi urbani ed economici invariati, test Node e prove nel browser rieseguiti su `main` con esito positivo (verifica-integrazione, economia 158 e 147, percorsi 0 bloccati su 41 040, residenti 0, collisioni identiche a `ec03eeb`, browser 10/10, 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12).
### Provenienza degli elementi
| Parte | Da Claude (`claude/world-art-santuario`) | Da Codex (`codex/world-art-interni-santuario`) |
|---|---|---|
| Santuario · bacino | acqua immobile a mezza risoluzione con riflessi sotto le pareti, alghe, coralli e rovine sommerse | sponde rocciose e segni d'onda |
| Santuario · strutture | ombre nell'acqua, parapetti, pareti frontali che scendono nel bacino | — |
| Santuario · pavimenti e sale | — | una finitura per sala; rosa delle correnti e panche alla Soglia, binari e grate nel Deposito, mosaici a onde nel Chiostro |
| Santuario · arena del Trono | bordo chiaro, solco inciso a onde, raggi, otto glifi | spalliera incassata dietro il trono |
| Santuario · colonne | disegno scanalato con capitello a conchiglia e glifi luminosi | tinte per zona (Deposito, Chiostro, sala regale) e soglia di dissolvenza a 32 px |
| Santuario · arredi interattivi | lapidi incise, trono a conchiglia (`legendary.js`), portale ad arco con velo d'acqua | — |
| Santuario · luce | fornitore unico per `WorldLight`, strato emissivo, cielo `tide` con bolle, alone del portale in superficie | otto lanterne alle pareti (aggiunte al fornitore unico) |
| Statue della Rinascita | Custode delle Origini (Vaelthoria), Oracolo del Velo (Myrathen), Madre delle Radici (Voryndhal) | Sentinella Eterna (Nordharyn), Giudice delle Ere nella nicchia del canyon (Azheryon) |
| Pilastri attorno alle statue | tutti e cinque i continenti | — |
| Varchi | otto varchi per bioma e varco della Valle, con passaggio scuro e luci | — |
| Cripta delle Soglie | — | pilastri e varco reliquiario |
| Interni di Velaris | — | tutti e otto (`urban-interiors.js` per intero): pavimenti, rivestimenti, arredi, luci per tipo |
| Atmosfera | niente pioggia nei sotterranei (`interface.js`) | — |

Scartati, perché doppioni: i tre cerchi di rune di Claude nel Santuario (al loro posto le sale di Codex), il fornitore di luce `under` di Codex (resta quello unico, con le sue lanterne), le statue di Claude per Nordharyn e Azheryon, le statue di Codex per gli altri tre continenti, i varchi e i pilastri di Codex fuori dalla Cripta (restano nel codice per la Cripta e le due statue).
### Aggiunto (prove)
- `tests/prova-browser-interni.cjs`: otto interni raggiunti dalle porte, camminata, servizio della stanza, giorno/notte, uscita, salvataggi della build precedente dentro locanda e forgia.
- `tests/scatti-mondo.cjs`: confronto impilato di più build (es. `main`, Claude, Codex, integrazione) e inquadrature degli otto interni.
### Verifica
- Collisioni, varchi e rotte identici a `main` (21,5 milioni di campioni, 5 semi); integrazione, economia, percorsi, residenti; browser 10/10, 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7, interni 12/12; scatti a quattro vie e attribuzione verificata byte per byte (Cripta e interni identici alla build di Codex; tre statue, varchi e resto del mondo identici alla build di Claude); prestazioni equivalenti alle due build di partenza (dettagli in `PROGRESS.md`).

## [2026-11-22] Santuario della Marea Muta, monumenti e varchi per continente — Claude
Branch `claude/world-art-santuario` da `main` `ec03eeb` (non unito; nessun merge senza approvazione dell'utente). Commit `82f5804` (Santuario), `e54567f` (monumenti e varchi), `ab8a10e` (luce del portale, prove e documenti). File: `legendary-land.js`, `legendary.js`, `continents.js`, `world-light.js`, `interface.js`, `tests/`.
### Modificato
- **Santuario della Marea Muta** (`legendary-land.js`): le sale diventano piattaforme di pietra su un bacino d'acqua immobile (riflessi sotto le pareti, alghe, coralli e rovine sommerse fuori dal calpestabile), parapetti e pareti frontali che scendono nell'acqua, lastre smussate con umidità e fasce a onde, cerchi di rune luminosi attorno ai luoghi di lettura, arena del Trono con bordo chiaro, solco inciso a onde e raggi, colonne scanalate con capitello a conchiglia e glifi (sprite in cache), portale ad arco con velo d'acqua che scorre. Strato emissivo e sorgenti per `WorldLight` (portale, arena, trono, cerchi, colonne); penombra marina costante (`tide`) con bolle che salgono.
- Lapidi incise a onde e trono a conchiglia (`legendary.js`): stessi punti, stessi segnali di lettura e colori dell'erede.
- **Monumenti della rinascita** (`continents.js`): Custode delle Origini in travertino con lanterna (Vaelthoria), Sentinella Eterna in granito innevato con la spada in giù (Nordharyn), Oracolo del Velo con sfera e schegge di cristallo (Myrathen), Madre delle Radici in legno con l'urna (Voryndhal), Giudice delle Ere seduto fra piloni d'arenaria (Azheryon); pilastri attorno per continente (colonne Ardel, menhir runici, obelischi viola, pietre avvolte dalle radici, obelischi incisi).
- **Varchi** per bioma con il passaggio scuro che segnala il cambio di regione: arco Ardel, portale minerario, porta fortificata con grata, arco di cristallo, porta di Namar con stendardi, arco vivo di radici, arco del porto con reti, pilone d'arenaria; anche il varco della Valle verso la Via degli Antichi. Luci dei varchi e del portale del Santuario in superficie (dopo la scoperta).
- `interface.js`: nei sotterranei (Cripta, Santuario) non piove e non nevica.
### Aggiunto (prove)
- `tests/prova-browser-santuario.cjs`: seme 1116, scoperta e ingresso con i comandi del motore nella build precedente, lettura delle lapidi, camminata fra sale e colonne, Nadir sconfitto di notte, trono disponibile, uscita dal portale e rientro, ricarica.
- `tests/scatti-mondo.cjs`: variabile `SEED`, scene del Santuario e dei varchi.
### Verifica
- Collisioni, varchi e rotte identici a `main`; integrazione, economia, percorsi, residenti; browser 10/10, 12/12, economia, mondo 15/15, Cava 6/6, Santuario 7/7; scatti PRIMA/DOPO; prestazioni (dettagli in `PROGRESS.md`). Sale, colonne, punti, varchi e monumenti mantengono posizioni e collisioni; nessun dato di salvataggio nuovo.

## [2026-11-22] Differenzia le sale del Santuario della Marea Muta — Codex
Commit `3c3df4d`, incremento separato da `043b76c` sul branch `codex/world-art-interni-santuario` per facilitare il confronto con `claude/world-art-santuario`.
### Modificato
- Soglia, Deposito degli echi, Chiostro dei flutti e sala del trono hanno lastricati, rilievi, mosaici e sorgenti luminose propri. Il bacino è disegnato fuori dal pavimento percorribile; le colonne sono precalcolate (`legendary-land.js`).
- Ricostruito `Reincarnation.html`. Le prove in Edge e i confronti con geometria e salvataggi precedenti sono registrati in `PROGRESS.md`.

## [2026-11-22] Identità dei monumenti e degli interni di Velaris — Codex
Branch `codex/world-art-interni-santuario`, da `ec03eeb`, commit `043b76c`.
### Modificato
- Le cinque Statue della Rinascita hanno sagome e materiali legati al loro continente. Varchi e pilastri usano la tavolozza e l'architettura della zona; il disegno viene conservato in cache (`continents.js`).
- Gli otto interni di Velaris hanno pavimenti, rivestimenti, arredi e luci riconoscibili. La luce è precalcolata, limitata alla stanza e rispetta il movimento ridotto (`urban-interiors.js`).
- Ricostruito `Reincarnation.html`. Il renderer usa coordinate, collisioni, vie d'accesso, interazioni e dati di salvataggio esistenti.

## [2026-11-22] Cava delle Braci e Fenditura Astrale; ART-001 risolto — Claude (con lavoro recuperato di Codex)
Branch `claude/world-art-cava-fenditura` da `main` `cf86486`; **unito a `main` per fast-forward il 2026-11-22 (`cf86486` → `8da2400`) su approvazione dell'utente**. Dopo l'unione: HTML di `main` identico alla ricostruzione e all'HTML di prova (SHA-256 `9dcc64fb…`), file urbani ed economici invariati, rieseguiti su `main` con esito positivo: `verifica-integrazione.cjs`, `economia-flussi.cjs` (158), `economia-flussi-2.cjs`, `economia-integrazione.cjs` (147), `sonda-percorsi.cjs` (0 bloccati su 41 040), `sonda-residenti.cjs` (0), `confronto-mondo.cjs` contro `cf86486` (8,6 milioni di campioni identici), browser 10/10, 12/12, economia, mondo 15/15, Cava e Fenditura 6/6. Commit `74b74d0` (recupero di `expansion-world.js`), `120ddc9` (recupero di atmosfera prima degli avvisi e bande di duna), `419f9a0` (Cava e Fenditura), `14dd5ba` (ottimizzazione dell'ingresso, prove e documenti).
### ART-001
- Copia completa e verificata del lavoro non committato di Codex (worktree `world-art-wide`, branch `codex/world-art-overhaul`, base `96a03f5`) in `C:\Users\elaro\Downloads\Codex-backup-2026-11-22-world-art-wide`: patch binaria, copie byte per byte dei sei file, `SHA256.txt`, `stato.txt`; la patch riapplicata a un'esportazione pulita di `96a03f5` riproduce esattamente i file del worktree. Il worktree di Codex non è stato modificato (solo comandi in lettura, `--no-optional-locks`).
- Analisi per file contro `main` `cf86486`: `expansion-world.js` recuperato per intero (su `main` non aveva concorrenti); `interface.js` recuperati l'ordine atmosfera → avvisi di combattimento e lo stop delle particelle con `prefers-reduced-motion`, scartate le tinte regionali (superate da `WorldLight.sky`); `continents.js` recuperate solo le bande di duna sui suoli aridi, scartati terreno e acque regionali (superati dal terreno per bioma di `main`, già verificato); `world.js` scartate le pozze di luce delle lanterne (doppione degli aloni di `WorldLight`); `PROGRESS.md` e `WORLD_ART_OVERHAUL.md` di Codex superati dai documenti di `main`. Nessuna funzione o modulo sovrascritto per intero, salvo `expansion-world.js` che su `main` era identico alla base di Codex.
### Recuperato da Codex
- `expansion-world.js`: colori del terreno, pozze di luce sui punti d'interesse, cenge e giunture delle pareti, correnti della lava, nubi del vuoto astrale, crepe e bagliori dei bordi (`paintTerrainRelief`).
- `interface.js`: atmosfera e luci disegnate prima di `Game.drawFX` (aree di pericolo e numeri dei colpi leggibili di notte, condizione di `PIANO_GRAFICO.md`); particelle ferme con `prefers-reduced-motion`.
- `continents.js`: leggere bande di duna sui suoli di Costa e Gola.
### Aggiunto (Claude, `expansion-world.js`, `world-light.js`)
- Profondità: orli delle terrazze illuminati verso chi guarda e in ombra sul lato lontano, pareti con gradiente, fenditure verticali e riflesso rosso della lava alla base, vene di minerale incandescente nelle pareti della Cava.
- Cava: crosta galleggiante e crepe incandescenti sulla lava, calore che arrossa il terreno vicino alla lava.
- Fenditura: sottofondi pendenti sotto le isole sospese (roccia stratificata che si assottiglia, gocce di cristallo in punta), frammenti di roccia lontani nel vuoto; sentieri di nuovo più chiari del suolo illuminato.
- Ombre di contatto a terra sotto castelletti, forgia, osservatorio, archi, guglie, carrelli e lanterne.
- Luce: strato emissivo (lava, crepe, vene, gocce) riacceso di notte sopra il velo; sorgenti per `WorldLight` (lanterne, forgia, nucleo astrale, osservatorio, guglie, varchi); tinte `ember` (Cava) e `astral` (Fenditura). Supporto `emissive` in `WorldLight.draw`.
- Maschera, oggetti, sequenza casuale, boss e arene invariati: collisioni, rotte e salvataggi identici a `main`.
### Verifica
- Tutte le prove superate (dettagli in `PROGRESS.md`): collisioni e rotte identiche a `main` (17,2 milioni di campioni), integrazione, economia, percorsi, residenti, browser 10/10, 12/12, economia, 15/15, Cava e Fenditura 6/6; 42 scatti su 66 identici byte per byte a `main` (gli altri sono Cava, Fenditura e le dune di Azheryon); prestazioni per fotogramma invariate, primo ingresso in Cava e Fenditura +20–35 ms (una volta per partita). HTML di prova SHA-256 `9dcc64fb…`, identico ai sorgenti.
### Aggiunto (prove)
- `tests/prova-browser-cava.cjs`: campagna fatta avanzare con i comandi del motore (missione, tre creature, Orveth, ricompensa, Kharun) per creare salvataggi legittimi nella Cava e nella Fenditura con una build precedente; importazione, camminata, giorno/tramonto/notte, combattimento notturno contro Syrava fino alla vittoria, ricarica, errori JS.
- `tests/scatti-mondo.cjs`: quattro inquadrature in più (ingresso e forgia della Cava, osservatorio e Cuore del Varco) e file `build-usate.json` con SHA-256 delle build fotografate.

## [2026-11-22] World Art Overhaul, continuazione: continenti, luce del mondo aperto, Cripta — Claude
Branch `claude/world-art-overhaul` da `origin/main` `7060f17`; **unito a `main` per fast-forward il 2026-11-22 (`7060f17` → `ad6daa4`) su approvazione dell'utente**. Dopo l'unione: HTML identico ai sorgenti, file urbani ed economici invariati rispetto a `7060f17`, rieseguiti su `main` con esito positivo: `verifica-integrazione.cjs`, `economia-flussi.cjs` (158), `economia-flussi-2.cjs`, `economia-integrazione.cjs` (147), `sonda-percorsi.cjs` (0 bloccati su 41 040), `sonda-residenti.cjs` (0), browser 10/10, 12/12, economia, mondo 15/15, 36 scatti identici byte per byte a quelli del branch. Commit `cce96db` (recupero e strumenti), `1c3e21f` (terreno, vegetazione, architettura), `b541ace` (luce e Cripta), `a9ff3c3` (atmosfere), `5b35516` (prove e documenti). File toccati: `continents.js`, `world.js`, `interface.js`, `build.py`, nuovo `world-light.js`, `tests/`, documenti; nessun file urbano o economico.
### Aggiunto
- Pilota grafico della Selva degli Alambicchi di Codex (commit `4d8b060` del branch `codex/world-art-myrathen`), applicato senza modifiche a `continents.js`; documenti di Codex `WORLD_ART_OVERHAUL.md` e sezioni collegate in `GAME_DESIGN.md`, `PIANO_GRAFICO.md`, `ROADMAP.md`. Le voci di Codex per `CHANGELOG.md` e `PROGRESS.md` erano in conflitto testuale con `main`: il loro contenuto è riassunto qui e in `PROGRESS.md`.
- `tests/scatti-mondo.cjs`: scatti ripetibili della tela di gioco reale (terreno, oggetti, attori, effetti e atmosfera) in 18 luoghi di tutte le regioni, stesso seme, ora, meteo, camera e numero di fotogrammi; con due build salva il confronto PRIMA/DOPO.
- `tests/confronto-mondo.cjs`: confronto esaustivo fra due versioni del mondo (`canWalk` su griglia per tre raggi, acqua, punti, varchi, luoghi, rotte) per tutte le 23 regioni e più semi.
### Modificato (incremento 1–3, `continents.js`)
- Terreno delle otto regioni continentali (la Selva resta il pilota di Codex) a 2 px invece che a blocchi da 4 px: tavolozze a rampe per bioma (suolo, prato umido, zona secca, margine, sentiero, lastricato), rumore su tre scale con retino ai confini, margini dei sentieri irregolari e centro consumato, dettagli per bioma con seme proprio (ciuffi, fiori, aghi, cumuli di neve, increspature, crepe, ciottoli), rive a strati con schiuma e fondale, piazza lastricata del borgo, pavimento radiale del monumento, canale dei lotti bordato in pietra.
- Vegetazione per bioma come sprite in cache: querce a lobi (Vaelthoria), larici verdi e dorati (Nordharyn), abeti innevati (Altopiano), alberi velati con gocce di luce e cristalli di tre taglie (Conca), acacie a ombrello (Savana), alberi a radici aeree (Santuario), palme (Costa), pinnacoli, mese e massi d'arenaria con cactus (Gola); cespugli e rocce per bioma.
- Architettura per continente sulle stesse piante: travertino e coppi con sala Ardel a colonne (Vaelthoria), baite di tronchi (Passo dei Larici), case di pietra innevate e torre merlata (Rocca di Hadrin), cupole con guglie di cristallo (Siderea), capanne rotonde di paglia (Namar), palafitte con tetti di foglie (Fronde), case bianche con cupole e tende (Calis), adobe con travi sporgenti e cupole (Damar); banchi, pozzi, lampioni e rovine per continente.
- La sequenza casuale che colloca oggetti solidi, risorse e varchi non cambia: i dettagli nuovi usano semi propri. Collisioni, acqua, punti, varchi e rotte identici a `main` (17,2 milioni di campioni `canWalk`, 4 semi).
### Aggiunto (incremento 4–5)
- **`world-light.js`** (`WorldLight`, primo modulo in `build.py`): tinte di crepuscolo e notte per continente (notte più profonda, da 0,34 a 0,42–0,52 secondo il bioma), finestre accese di sera (meno nel cuore della notte, scelte dalla posizione) e aloni precalcolati di lanterne, torce, fuochi, cristalli e monumenti, al massimo otto attivi con priorità alle lanterne; nessun gradiente per fotogramma, pulsazione ferma con effetti ridotti o `prefers-reduced-motion`. Sorgenti registrate da `world.js` (Valle di Vela: cinque lanterne, albero delle lanterne, forgia, finestre di nove case) e da `continents.js` (lampioni, cristalli, monumenti e finestre di ogni borgo; Cripta). Cava, Fenditura e Santuario mantengono i valori precedenti; Velaris e gli interni hanno la propria luce.
- `interface.js`: `atmosphere()` usa le tinte di `WorldLight.sky` e chiama `WorldLight.draw` dopo il velo notturno; la Cripta delle Soglie ha una penombra costante con le lanterne sempre accese.
- Atmosfera mobile per bioma (`world-light.js`, `WorldLight.ambient`, chiamata da `interface.js` al posto delle particelle generiche fuori dalla Valle): neve leggera sull'Altopiano, aghi dorati al Passo, spore e lucciole nella Selva e al Santuario, scintille stellari alla Conca, polvere e vento a Savana, Costa e Gola; di giorno, all'aperto, ombre di nuvole che scorrono piano. Spente con effetti ridotti e `prefers-reduced-motion`; la pioggia e la neve del meteo restano quelle di prima.
- Cripta delle Soglie (`continents.js`): roccia scura, bordi e pareti in mattoni con ombra di contatto sul pavimento, giunzioni fra sale senza cuciture, lastre smussate con crepe e muschio, cerchi di rune turchesi. Forma delle sale e collisioni invariate.
### Aggiunto (prove)
- `tests/prova-browser-mondo.cjs`: salvataggi di una build precedente in 11 regioni caricati nella nuova, camminata con il corpo sempre su suolo percorribile, giorno/tramonto/notte, ricarica, effetti ridotti. `tests/scatti-mondo.cjs` con modalità `BENCH` (ingresso, fotogramma e solo disegno, con `requestAnimationFrame` reale fra i fotogrammi).
### Verifica
- Tutte le prove superate (dettagli in `PROGRESS.md`): confronto del mondo identico a `main` (17,2 milioni di campioni `canWalk`, 1 587 rotte), integrazione, economia (158 e 147 controlli), percorsi (0 bloccati su 41 040), residenti (0), browser 10/10, 12/12, economia, 15/15; Cava, Fenditura e Velaris identiche byte per byte a `main` negli scatti; Velaris con prestazioni identiche; regioni continentali da 0,7–1,2 a 0,2–0,3 ms per fotogramma (mediana). Documenti: `PROGRESS.md`, `GAME_DESIGN.md` (§2.1, §3.3), `LEGGIMI.md`, `ROADMAP.md`, `WORLD_ART_OVERHAUL.md`, `PIANO_GRAFICO.md`. Problemi aperti: ART-001 (lavoro non committato di Codex sugli stessi file), ART-002 (branch Tiled: solo conflitti nei documenti).

## [2026-11-21] PERF-001: ricerca dei percorsi di Velaris più veloce, percorsi identici — Claude
Branch `claude/perf-001-pathfinding`, da `main` `96a03f5`; unito a `main` per fast-forward il 2026-11-21 (`96a03f5` → `a1e4c54`) su approvazione dell'utente. Dopo il merge: test di integrazione, percorsi (BUG-011), sovrapposizioni, economia e browser rieseguiti su `main`, percorsi identici a `96a03f5`, HTML allineato, stato remoto verificato.
### Corretto
- `path()` in `urban-exterior.js`: la ricerca in ampiezza ricalcolava `canWalk` a ogni vicino (21,6 milioni di chiamate su 3 350 tratte) e allocava un array per vicino; ora la percorribilità dei nodi è memorizzata per raggio, i buffer si riusano e il ciclo non alloca. `segmentClear` e `segmentBoxDistance2` (verifica esatta di BUG-011) senza array e funzioni temporanee, stesse operazioni nello stesso ordine. Media da 5,9 a 0,78 ms, p95 da 21 a 2 ms, chiamate oltre 16 ms da ~990 a 7–8 su 6 700; in gioco fotogrammi oltre 16 ms da 510 a 21 su 3 456. Percorsi, collisioni e routine identici (verifica esaustiva contro `main`).
### Aggiunto
- `tests/sonda-prestazioni-percorsi.cjs`: misura ripetibile di `path()` sulle tratte reali, confronto fra versioni con le stesse tratte, salvataggio dei percorsi per verificarne l'identità.
### Documentazione
- PERF-001 corretto (causa: costo della ricerca e condizioni del benchmark; la rifinitura di Velaris non aveva aumentato il lavoro); nuovo PERF-002 (pianificazione al cambio di giorno, 55–63 ms, non legata a `path()`). `Reincarnation.html` ricostruito.

## [2026-11-21] Integrazione dell'economia dinamica (Fase 3, due unità) con Velaris rifinita — Claude
Branch `claude/integrazione-economia-fase3` (unito a `main` per fast-forward il 2026-11-21, `07e42e9` → `4763426`, su approvazione dell'utente), da `main` `07e42e9`; merge senza conflitti di `claude/mega-city-fase3-economia` (`26893c5`, intatto). Rapporto dettagliato: `ECONOMIA_FASE3_RAPPORTO.md`.
### Aggiunto
- **`market-flows.js`** (`MarketFlows`): economia aggregata e deterministica a passi di un giorno di calendario. Nove professioni (con pane e pozioni come trasformazioni), consumo e deperimento, otto rotte commerciali con riserva alla partenza, deficit previsto all'arrivo (abitanti e trasformatori) e margine sostenibile, prezzi da scarsità e ricchezza, registro esatto delle merci (BigInt), profili e rotte automatiche per nuove città (`settlementProfile`, `routesFor`).
- `Economy.quote`, `Economy.deliver`, `Economy.procure`, `Economy.flowReport` (con previsione e rotte), `Economy.profiles` (file: `trade-economy.js`). Salvataggio: campo facoltativo `economy.flows` (`schema: 1`); i salvataggi precedenti lo ricevono al giorno corrente, senza recuperi retroattivi.
- Test: `tests/economia-flussi.cjs` (158), `tests/economia-flussi-2.cjs`, `tests/economia-integrazione.cjs`, `tests/analisi-economia.cjs` (diagnosi), `tests/prova-browser-economia.cjs`, fixture in `tests/fixtures/`.
### Modificato
- `trade-economy.js`: con i flussi attivi il vecchio riassortimento fisso (+2 al giorno) non si applica più; il prezzo di base è scalato da scarsità e ricchezza; acquisti, vendite e forniture di Velaris sono flussi esterni del registro. `build.py`: `market-flows.js` prima di `trade-economy.js`. `tests/verifica-integrazione.cjs`: tre asserzioni che codificavano il vecchio +2 fisso ora verificano lo stesso intento. `Reincarnation.html` ricostruito.
### Corretto
- Carenze croniche di grano a Velaris e Calis, eccessi di legno e lana, spedizioni troncate al tetto di 300 con perdita di merce (latente con più di 5 mercati) e previsioni di domanda che ignoravano i trasformatori: vedi `ECONOMIA_FASE3_RAPPORTO.md` §7.1.
### Verifica
- Tutte le prove superate (dettagli in `PROGRESS.md`). Nessun file `urban-*.js`, `panels.js`, `interface.js` modificato. Dopo il merge: test di integrazione, economici, di percorsi e nel browser rieseguiti su `main`, HTML allineato ai sorgenti, stato remoto verificato. Problemi aperti: ECO-001, ECO-002, ECO-003 e **PERF-001 (prioritario, intervento separato)**.

## [2026-11-21] Rifinitura dei quartieri orientali di Velaris — Codex

Commit della rifinitura `b0d570b`.

### Aggiunto
- Diciotto lanterne sulle vie orientali e lungo l’accesso alla Serra delle Talee. Riflessi freddi nei Portici del Vetro, luce verde e lucciole ambrate negli Orti dell’Alambicco. Le luci riusano la cache e il limite di otto aloni visibili (file `urban-exterior.js`).

### Modificato
- Turni, soste e passeggiate dei Portici distribuiti fra la Corte dei Soffiatori, la Loggia delle Vetrerie, il Passaggio delle Vetrate e il Crocevia dei Carrettieri (file `urban-life.js`, `urban-exterior.js`).
- Esteso il test delle luci ai due quartieri orientali. Ricostruito `Reincarnation.html` e aggiornati `PROGRESS.md`, `ROADMAP.md`, `GAME_DESIGN.md` e `LEGGIMI.md`.

## [2026-11-21] Integrazione del lavoro di Codex: quartieri orientali, Serra delle Talee, tipi di insediamento — Claude
Unito a `main` per fast-forward su approvazione dell'utente (`16b6129` → `769d231`, branch `claude/integrazione-codex-velaris`). Dopo l'unione: test di integrazione, sonde dei percorsi e dei residenti (0 bloccati, 0 tratte illegali, 0 sovrapposizioni), prove nel browser 10/10 e 12/12, build identica ai sorgenti; cartelle di Codex e backup intatti. Fonte: `velaris-city-verified` di Codex (backup in `Downloads/Codex-backup-2026-11-21`).
### Aggiunto (lavoro di Codex)
- Mappa di Velaris 2144 → 2864 px con **Portici del Vetro** e **Orti dell'Alambicco** (130–135 edifici secondo il seme, 32 nei quartieri nuovi), strade, piazzette, oggetti e cache del terreno separata; minimappa estesa (file: `urban-exterior.js`).
- **Serra delle Talee**, ottavo interno: semina, irrigazione, 80 minuti, raccolta di due erbe; campo di salvataggio facoltativo `cityWorks.seedbedAt` (v7 invariata) (file: `urban-interiors.js`, `urban-services.js`, `urban-world.js`, `panels.js`).
- `UrbanWorld.settlementTypes` (borgo, villaggio, cittadina, grande città, capitale); Velaris è una cittadina (file: `urban-world.js`, `panels.js`).
- Routine per quartiere: case nel quartiere del lavoro, passeggiata serale verso la piazza del proprio quartiere (UX-001 in gran parte risolto) (file: `urban-life.js`).
### Corretto (integrazione)
- Conflitti con il passo 2 risolti tenendo entrambe le parti; atmosfere del passo 2 limitate ai quartieri storici; finestre notturne degli edifici orientali (file: `urban-exterior.js`).
- `tests/prova-prestazioni.mjs` chiude tutti i processi di Edge della prova e accetta scene per luogo e ora (anche tramonto).
### Aggiunto (prove)
- `tests/prova-browser-velaris-est.cjs` (camminata nei nuovi quartieri, serra completa, vecchio salvataggio, errori JS); test di integrazione di Codex per serra e sei quartieri.
### Verifica
- Tutte le prove superate; prestazioni invariate nei quartieri storici e uguali o inferiori nei nuovi (dettagli in `PROGRESS.md`). Restano UX-002 (notte dei quartieri orientali) e UX-003 (Corte dei Soffiatori affollata), da affrontare nella rifinitura di Velaris.

## [2026-11-21] BUG-011: percorsi dei residenti di Velaris senza sfioramenti — Claude
Unito a `main` per fast-forward su approvazione dell'utente (commit `fbdba49`). Dopo l'unione: test di integrazione, sonde dei percorsi e dei residenti (0 e 0), prova nel browser 10/10, build identica.
### Corretto
- `path()` verificava i tratti a campioni ogni 4 px e accettava segmenti che sfioravano di 0,03–1,0 px ponti, spigoli di edifici e oggetti solidi; `urban-life.js` li scartava e il residente restava fermo. Nuova verifica esatta `segmentClear()` per tutti i tratti e i passi della griglia, con memoria dei passi (file: `urban-exterior.js`). Residenti fermi: 709/27 072 (2,62%) → 0; tratte senza percorso 116 → 0 e tratte con segmenti illegali 75 → 0 su 3 330 (6 semi, inclusi 555 e 2024); sovrapposizioni 4 → 0.
### Aggiunto
- Caso di regressione in `tests/verifica-integrazione.cjs` e sonda `tests/sonda-percorsi.cjs`.
### Modificato
- `Reincarnation.html` ricostruito. Nessuna modifica a mappe, collisioni, salvataggi, movimento del giocatore o routine.

## [2026-11-21] Prova nel browser con Playwright — Claude
### Aggiunto
- `tests/prova-browser.cjs`: 10 prove nel browser (avvio, Atlante, «Segna Velaris», ingresso a Velaris, menu, salvataggi, nessun errore JS) con `playwright-core` esterno al progetto. Nessun codice del gioco modificato, nessuna dipendenza aggiunta.

## [2026-11-21] Valutazione di plugin e skill — Claude
### Documentazione
- Registrata in `ROADMAP.md` la ricerca di plugin/skill per il Mega City Overhaul (nulla installato, nessun codice toccato).

## [2026-11-21] Passo 2 del piano grafico: luce e vegetazione di Velaris — Claude
Unito a `main` per fast-forward su approvazione dell'utente (ultimo commit del passo: `1f77511`). BUG-011 e UX-001 (affollamento serale) restano documentati in `PROGRESS.md`.
### Aggiunto
- Luce dal calendario: ombre a terra di edifici e alberi con direzione e lunghezza legate all'ora; lanterne, cristalli e fucine come sorgenti con sprite precalcolati (tre toni), **al massimo otto luci attive**; finestre accese di sera con quota che cala a notte fonda (decalcomanie senza gradienti).
- Cristalli luminosi (9, solo decorazione, senza collisione) con bagliori turchesi e scintille.
- Riflessi dei lumi sul canale e riflessi d'acqua che passano da verde-azzurro a rosa al tramonto e blu di notte.
- Alberi con chiome oscillanti e foglie che cadono; stendardi che sventolano.
- Atmosfere: Mercato dei Venti caldo e polveroso, Giardini delle Lanterne freschi e verdi con lucciole di sera (file: `urban-exterior.js`).
- Movimento ridotto: tutte le animazioni nuove si fermano con l'opzione effetti spenta **oppure** con `prefers-reduced-motion`, mantenendo luci e contrasto; anche il fuoco degli interni (file: `urban-exterior.js`, `urban-interiors.js`).
- Test: disegno diurno e notturno con e senza movimento ridotto, tetto di otto luci (file: `tests/verifica-integrazione.cjs`).
### Verifica
- Verifica finale su Edge con finestra visibile e GPU (driver CDP, 3 ripetizioni alternate da 30 s su 4 scene, stress ×16, profilatore): nessun calo di fluidità; sovracosto del branch localizzato in alberi e cristalli e rimosso con sprite precalcolati (resa invariata: ≤12 pixel su 129 600, 1 livello di colore); sotto stress da −42% a 0% rispetto a `main` (dettagli in `PROGRESS.md`).
- Browser: movimento, dialogo, interno, salvataggio/ricarica, disegno notturno con effetti di combattimento, 2400 passi in valle senza errori.
### Aggiunto (verifica finale)
- `tests/prova-prestazioni.mjs` e `tests/prova-prestazioni-pagina.js`: prova di prestazioni con Edge a finestra visibile (rAF reale, stress, profilatore, screenshot).
### Modificato (verifica finale)
- Alberi e cristalli come sprite precalcolati (`propSprite`) in `urban-exterior.js`; `Reincarnation.html` ricostruito.
### Non modificato
- BUG-011, collisioni, mappe, salvataggi, meccaniche e disegno degli avvisi di combattimento (`Game.drawFX` resta dopo lo strato di luce della città).

## [2026-11-21] Residenti di Velaris: soste distribuite — Claude
### Corretto
- I residenti non si sovrappongono più nelle soste: `spread()` assegna a ogni sosta del giorno un posto libero (≥15 px dagli altri presenti nello stesso intervallo), in modo deterministico e senza toccare orari, case, mestieri, mappe, collisioni o salvataggi (file: `urban-life.js`).
### Aggiunto
- Test di regressione a mezzogiorno, sera e notte in `tests/verifica-integrazione.cjs` e sonda multi-seme `tests/sonda-residenti.cjs`.
### Modificato
- `Reincarnation.html` ricostruito. Prima: oltre 100 coppie ferme <10 px su 5 semi; dopo: 0 (Node) e 0 salvo BUG-011 (browser, 10 semi). Documentato BUG-011 in `PROGRESS.md`. Branch `claude/fix-residenti-sovrapposti`.

## [2026-11-21] Approvazione del piano grafico, passi 1-2 — Claude
### Documentazione
- Registrata l'approvazione dell'utente per i passi 1 e 2 del piano grafico, con le condizioni della revisione. Verificato il passo 1: test Node OK, build identica, confronto visivo giorno/notte della piazza di Velaris in browser. Nessun codice modificato.

## [2026-11-21] Compagni di gilda mortali: decisione confermata (RISK-007) — Claude
### Documentazione
- Su scelta dell'utente il comportamento resta com'è: i compagni di gilda possono morire in modo permanente se non soccorsi. Regola in `GAME_DESIGN.md` §4.9; `PROGRESS.md` e `ROADMAP.md` aggiornati. Nessun codice modificato.

## [2026-11-21] Piazza, ponte e mercato di Velaris — Codex

Commit della fase `84c1ff4`. Integrata anche la correzione del Santuario `3ec9819` con i relativi test.

### Aggiunto
- Piazza delle Quattro Lenti con intarsi in pietra e rame, ponte con parapetti e lanterne a prisma, riflessi del canale, accesso al Mercato dei Venti e locanda con copertura in rame (file `urban-exterior.js`).
- L’ora del calendario regola le luci di Velaris. L’opzione effetti ridotti ferma il movimento di acqua e bagliori (file `urban-exterior.js`).
- I mestieri e le consegne della città riforniscono il mercato di Velaris, con effetto su disponibilità e prezzi (file `urban-life.js`, `trade-economy.js`, `economy-panel.js`).

### Verifica
- Esteso il test a consegne, prezzi, riserve, ricaricamento del mercato e mancanza di duplicazioni. Ricostruito `Reincarnation.html` (file `tests/verifica-integrazione.cjs`, `Reincarnation.html`).

### Documentazione
- Aggiunto il [piano ufficiale Mega City Overhaul](MEGA_CITY_OVERHAUL.md). Collegati fasi, criteri di verifica e consegne al resto della memoria condivisa (file `ROADMAP.md`, `PROGRESS.md`, `AGENTS.md`, `CLAUDE.md`, `PIANO_GRAFICO.md`, `GAME_DESIGN.md`, `LEGGIMI.md`).

## [2026-11-21] Salvataggi: il Santuario incoerente non fa più perdere la partita (RISK-006) — Claude
### Corretto
- `parseSave` torna a segnalare con un avviso in console l'incoerenza rilevata da `Legendary.validateRegions` invece di rifiutare il salvataggio (file: `engine.js`). Le sezioni strutturali mancanti restano motivo di rifiuto.
### Aggiunto
- Test di regressione: salvataggio con vittorie incoerenti caricabile con avviso; salvataggio senza `urban` rifiutato (file: `tests/verifica-integrazione.cjs`).
### Modificato
- `Reincarnation.html` ricostruito. Verifiche: `node tests/verifica-integrazione.cjs` OK (il nuovo caso fallisce senza la correzione), `node --check engine.js`, build ripetuta identica.

## [2026-11-21] Revisione tecnica indipendente dell'integrazione di Velaris — Claude
### Documentazione
- Revisione dei commit `7f182be` e `875ac74` di Codex: test e build ripetuti, compatibilità v5→v7 provata, fuzz di 60 partite, controllo in browser. Nessuna regressione bloccante. Rilievi RISK-006…RISK-010, valutazione e proposte per il piano grafico e istruzioni di avvio in `PROGRESS.md`; `ROADMAP.md` aggiornata.
- **Nessun file del videogioco modificato**; `Reincarnation.html` ricostruito identico (nessun cambiamento da committare nel file). Commit della revisione: vedi `git log`.

## [2026-11-21] Versione integrata e città di Velaris — Codex

Commit di integrazione `7f182be`.

### Aggiunto
- Collegata Velaris alla Selva degli Alambicchi. Quattro quartieri, sette interni, residenti, commissioni, mappa e restauro persistente (file `urban-exterior.js`, `urban-interiors.js`, `urban-world.js`, `urban-services.js`, `urban-life.js`).
- Riutilizzati mercato, deposito, riparazione, fucina e incarichi della Gilda nei servizi della città (file `trade-economy.js`, `gear.js`, `guild.js`, `tradecraft.js`, `daily-life.js`).

### Modificato
- Integrate le versioni v5 di GitHub e v6 locale. Restano disponibili soccorso magico, memoriale di Nerea, durabilità, scontri e Santuario. Il formato v7 legge i salvataggi precedenti e aggiunge lo stato urbano (file `engine.js`, `build.py`, `calendar.js`, `inventory.js`, `life-panels.js`, `society.js`, `world-life.js`, `reputation.js`).
- Ricostruito `Reincarnation.html` e aggiunta la verifica automatica senza dipendenze (`tests/verifica-integrazione.cjs`).

### Corretto
- Orientamento nei quartieri e interazioni secondarie degli interni. Conservate le indicazioni e i pannelli di reputazione, Santuario ed equipaggiamento (file `panels.js`, `interface.js`, `urban-exterior.js`, `urban-world.js`, `urban-services.js`).

### Documentazione
- Allineate regole, guida, stato, roadmap e architettura. Presentato il [piano grafico da approvare](PIANO_GRAFICO.md).

## [2026-11-21] Git e GitHub — Claude
### Aggiunto
- Repository Git (`main`) e `.gitignore` (segreti, impostazioni locali degli assistenti, zip, backup, salvataggi).
- Scansione di credenziali/dati personali sui file versionati: nessuna trovata.
### Documentazione
- `AGENTS.md` §7: protocollo Git/GitHub condiviso da Claude Code e Codex (pull a inizio sessione, commit per intervento, hash nel changelog, divieti). `PROGRESS.md` aggiornato. Nessun file del videogioco modificato.

## [2026-11-21] Sistema di documentazione e memoria condivisa — Claude
### Documentazione
- Creati `AGENTS.md` (regole condivise, protocollo leggi-prima/aggiorna-dopo), `CLAUDE.md` (importa `@AGENTS.md`; nessuna istruzione preesistente da conservare, il file non esisteva), `GAME_DESIGN.md`, `PROGRESS.md`, `ROADMAP.md`, `CHANGELOG.md`.
- **Nessun file del videogioco è stato modificato** (sorgenti `*.js`, `template.html`, `style.css`, `build.py`, `cover.webp`, `Reincarnation.html`, `LEGGIMI.md` invariati).

## [2026-11-21 e precedenti] Stato ereditato — Aggiornamento 3 "Vita e mestieri"
Cronologia dettagliata non disponibile (nessun Git, nessun registro precedente). Dai timestamp dei file: moduli creati/aggiornati tra il 2026-11-20 e il 2026-11-21; ultime modifiche a `engine.js`, `interface.js`, `panels.js`, `inventory.js`, `life-panels.js`, `npc-conflicts.js`, `society.js` (2026-11-21 00:27–00:33), `build.py` (00:33), `Reincarnation.html` e `LEGGIMI.md` (00:37). Il contenuto di quello stato è descritto in `PROGRESS.md` e `LEGGIMI.md`.
