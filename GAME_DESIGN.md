# GAME_DESIGN.md — Reincarnation: Infinite Evolution

> Documento di riferimento su visione, meccaniche e architettura. Compilato il 2026-11-21 dalla lettura di `LEGGIMI.md`, `build.py`, `template.html` e dalle intestazioni/costanti dei moduli. I dettagli numerici non elencati qui vanno verificati nel codice; quando lo si fa, aggiornare questo file.

## 1. Visione

Gioco di ruolo fantasy a vista dall'alto, in italiano, ambientato nel mondo di **Lùmora** (continente-cuore **Vaelthoria**). Il giocatore **rinasce** in una creatura (una delle **44 stirpi**) e **il modo in cui vive determina ciò che diventa**: combattimento, mestieri, esplorazione e rapporti sociali orientano l'evoluzione biologica del personaggio.

Pilastri:
1. **Evoluzione osservata** — le trasformazioni derivano dalle azioni e dalle predisposizioni, non da una scelta in un menu.
2. **Vita oltre il combattimento** — mestieri, cucina, agricoltura, commercio, costruzione, famiglia e gilde sono sistemi veri, non decorazione.
3. **Mondo che continua** — calendario persistente, abitanti con routine, memorie, conflitti, morte permanente degli NPC, economia regionale.
4. **Rinascita come ciclo** — sconfitta, statue di rinascita, Eco della Rinascita, eredità fra vite.
5. **Un solo file, offline** — tutto incorporato in `Reincarnation.html`; nessuna rete, nessuna dipendenza.

Titolo della campagna principale: **"Dal Borgo al Varco"**.

## 2. Architettura tecnica

- **Linguaggio**: JavaScript vanilla senza framework né bundler; ogni file `*.js` è una IIFE che espone un globale su `window`.
- **Rendering**: Canvas 2D (`#field`) con pixel art disegnata **a runtime** su griglia di pixel logici (`sprites.js`, `expansion-art.js`, `world.js`…); minimappa e pannelli in DOM. Solo la copertina è un'immagine (`cover.webp`, incorporata in base64).
- **Audio**: Web Audio, musica sintetizzata originale con arrangiamento dinamico (`audio.js`, globale `Score`); impostazioni in `localStorage` (`lumora-audio-v1`).
- **Interfaccia**: `template.html` (schermata titolo, schermata di gioco, `#veil`/`#dialog` modale con schede, toast) + `style.css`; logica in `interface.js` (input, ciclo di gioco, camera, HUD) e `panels.js` + pannelli specializzati. Controlli touch (croce direzionale) presenti.
- **Build**: `python build.py [destinazione]` legge `template.html`, inserisce `style.css` (con la copertina in base64) e concatena i moduli nell'ordine della tupla `MODULES`, producendo `Reincarnation.html` (~1,5 MB). Solo libreria standard Python 3.
- **Persistenza**: `localStorage`, chiave `reincarnation.lumora.save.v7` (versione 7, limite `saveMaxBytes` 12.000.000), migrazione da `v6…v1` tramite `saveKeys` in `engine.js`. Export/import JSON dal menu Opzioni. Altre preferenze: `lumora-effects`, `lumora-guidance`, `lumora-audio-v1`.
- **Numeri esatti**: inventario, valute e mercati usano `BigInt` internamente e stringhe decimali in JSON.
- **Determinismo**: elementi procedurali di mondo/eventi usano semi fissi.
- **Verifica automatica** con `node tests/verifica-integrazione.cjs`. Per il collaudo in browser vedi `PROGRESS.md`.

### 2.1 Moduli (ordine di caricamento in `build.py`)

| # | File | Globale `window.*` | Ruolo |
|---|---|---|---|
| 1 | `world-light.js` | `WorldLight` | Luce del mondo aperto (World Art Overhaul): tinte di crepuscolo e notte per continente, finestre accese, aloni precalcolati (massimo otto), particelle e ombre di nuvole per bioma; i moduli del mondo registrano le sorgenti con `WorldLight.provide` |
| 2 | `world.js` | `World` | Valle di Vela (1600×1080 px logici): geografia, percorsi, scenario procedurale, collisioni, mappa |
| 3 | `expansion-world.js` | `World` | Cava delle Braci, Fenditura Astrale, passaggi regionali; profondità di terrazze e pareti, lava, isole sospese, strato emissivo e sorgenti di luce per `WorldLight` |
| 4 | `continents.js` | `World` | Cinque continenti, nove nuove regioni + Cripta delle Soglie, rotte, caricamento regione, monumenti; terreno, vegetazione, edifici e luci per bioma (sprite in cache) |
| 5 | `sprites.js` | `ActorArt` | Sprite animati, forme evolute, icone, ritratti |
| 6 | `expansion-species.js` | `EvolutionContent` | Stirpi aggiunte e rami evolutivi avanzati |
| 7 | `expansion-art.js` | `ActorArt` | Arte delle nuove stirpi, creature, guardiani |
| 8 | `continental-species.js` | `EvolutionContent`, `ContinentalBiology`, `ActorArt` | Otto stirpi aggiuntive e profili biologici |
| 9 | `legendary-land.js` | `LegendaryLand`, `World` | Area del Santuario della Marea Muta (`nadir-vault`): bacino sommerso, piattaforme, colonne e rune in cache, strato emissivo e luci per `WorldLight` |
| 10 | `urban-exterior.js` | `UrbanExterior` | Quartieri, edifici, canale, ponti e percorsi deterministici di Velaris (tratti verificati in modo esatto per il raggio del corpo); luce dal calendario, finestre, cristalli, riflessi, ombre e vegetazione animata (movimento ridotto rispettato) |
| 11 | `urban-interiors.js` | `UrbanInteriors` | Sette interni visitabili e cache delle superfici |
| 12 | `urban-world.js` | `UrbanWorld, World` | Collegamenti con la Selva degli Alambicchi, rotte, collisioni e accesso ai servizi |
| 13 | `calendar.js` | `Calendar` | Calendario persistente unico (giorno = 1800 s reali = 1440 min di gioco) |
| 14 | `inventory.js` | `Inventory` | Magazzino a pile, quantità esatte, deposito |
| 15 | `lantern.js` | `Lantern` | Evento serale nel Bosco di Vetro |
| 16 | `growth.js` | `Growth` | Biologia fantasy, predisposizioni, innata evolutiva, allenamento, metamorfosi |
| 17 | `world-life.js` | `Life` | Mestieri, luoghi di lavoro, routine NPC, eventi, statue/rinascita |
| 18 | `construction.js` | `Build` | Lotti, costruzioni (casa, fattoria, laboratorio…), collisioni, proprietà |
| 19 | `society.js` | `Society` | Abitanti, memorie, commercio, accordi, famiglia |
| 20 | `guild.js` | `Guild` | Registri pubblici, incarichi, rango F–S, compagni, gilda personale |
| 21 | `trades-practice.js` | `GamePractice` | Minigiochi di mestiere (puri, senza DOM/Canvas) |
| 22 | `tradecraft.js` | `Tradecraft` | Attività, raccolti, allevamento, ricette |
| 23 | `daily-life.js` | `Daily` | Bisogni, incarichi facoltativi quotidiani |
| 24 | `market-flows.js` | `MarketFlows` | Economia dinamica: produzione, consumo, rotte, prezzi, registro delle merci, profili per nuove città |
| 25 | `trade-economy.js` | `Economy` | Mercati regionali, valute, banca |
| 26 | `gear.js` | `Gear` | Equipaggiamento: rarità, durabilità, riparazioni, maestria, tempra, ascensione, incantamento |
| 27 | `adaptive-combat.js` | `Adaptive` | Boss che riconoscono lo stile ripetuto (melee/projectile/field) e rispondono |
| 28 | `legendary.js` | `Legendary` | Scoperta, bottino unico, successione del Santuario; Nadir, Arma Divina, Eco della Rinascita |
| 29 | `npc-conflicts.js` | `Conflicts` | Pattuglie, ferite, soccorsi, morte permanente NPC, memoriali, rito della rinascita |
| 30 | `reputation.js` | `Reputation` | Reputazione con insediamenti, regni, gilde, fazioni; titoli |
| 31 | `urban-services.js` | `UrbanServices` | Ripristino della fonte, colazione, letture ed esercitazione |
| 32 | `urban-life.js` | `UrbanLife` | Residenti, routine (soste distribuite per giorno), memorie, commissioni e scorte urbane |
| 33 | `engine.js` | `Game` | Tabelle stirpi/tecniche, simulazione, incontri, missioni, progressione, persistenza |
| 34 | `audio.js` | `Score` | Musica e suoni |
| 35 | `practice-panel.js` | `PracticePanel` | Vista dei mestieri/minigiochi |
| 36 | `life-panels.js` | `LifePanels` | Inventario, mestieri, vita quotidiana |
| 37 | `economy-panel.js` | `EconomyPanel` | Mercato e banca |
| 38 | `gear-panel.js` | `GearPanel` | Schermata equipaggiamento |
| 39 | `npc-conflict-panel.js` | `ConflictPanel` | Pannello conflitti/soccorsi |
| 40 | `panels.js` | `GamePanels` | Diario, mappe, interazioni con abitanti, grimorio |
| 41 | `interface.js` | `UI` | Input, loop, camera, HUD, pannelli |

Nota: `World`, `ActorArt` ed `EvolutionContent` sono **estesi da più moduli** successivi (ciascuno incapsula e riassegna il globale precedente): l'ordine in `build.py` è vincolante.

## 3. Mondo

- **Vaelthoria** (centro) con la **Valle degli Antichi** e la **Via degli Antichi**, che porta a **Nordharyn** (nord), **Myrathen** (est), **Voryndhal** (sud) e **Azheryon** (ovest). **Cinque continenti**, con la **Cripta delle Soglie** (regione permanente) e la **Fenditura Astrale**.
- **Valle di Vela** (area iniziale): Borgo di Vela, Radura delle Lanterne, Bosco di Vetro, Cerchio delle Radici; Nerea (Custode, missione principale), Tessa (mercante), Ivo (fabbro), Focolare/locanda, orto, recinto, pesiera.
- **Cava delle Braci**: dopo Orveth, con tre guardiani successivi; epilogo al Borgo di Vela.
- **Santuario della Marea Muta**: dungeon raro e deterministico (probabilità 128, scoperta a distanza ~29), con Nadir, successione dell'erede dopo 7 anni di gioco, Arma Divina.
- Le regioni si caricano al passaggio; una **statua** per continente è punto di rinascita (E per attivare).

### 3.1 Velaris

L’ingresso dalla Selva degli Alambicchi porta a `city-velaris`. La città misura 2864×1496 pixel logici. A est dei quattro quartieri storici sorgono i Portici del Vetro e gli Orti dell’Alambicco. Le vie continuano oltre l’antico limite della città. Semi e coordinate dei vecchi edifici mantengono validi gli ingressi e i salvataggi. I due settori hanno cache del terreno distinte. La minimappa orientale può essere disegnata prima di visitare i nuovi quartieri.

Le lanterne orientali illuminano gli incroci e il vialetto della serra. I Portici hanno una dominante fredda e gli Orti una luce verde con lucciole ambrate. Le soste ai Portici si distribuiscono fra quattro punti collegati. Le assegnazioni lavorative dipendono dal mestiere, mentre la sosta dopo il turno e la passeggiata sono determinate da residente e giorno di calendario.

Il ruolo urbanistico è esplicito nella regione. Velaris è una cittadina. `UrbanWorld.settlementTypes` registra le fasce progettuali per borgo (5–15 edifici), villaggio (20–50), cittadina (60–150), grande città (200–500) e capitale (da 500, fino a 1.500 e oltre nel progetto completo).

Nella Piazza delle Quattro Lenti, sul ponte centrale e sulla via del Mercato dei Venti, le superfici in pietra e rame sono incluse nel Canvas del terreno già in cache. Il calendario tinge gli esterni di Velaris prima degli effetti di combattimento e illumina fino a otto lanterne visibili con una maschera riutilizzata. L’opzione effetti ridotti ferma il luccichio delle lanterne e le increspature del canale.

La locanda, la bottega, la fucina, la Gilda del Compasso, l’archivio, l’accademia, la casa del custode e la Serra delle Talee sono regioni interne. Usano gli stessi comandi, collisioni e regole di salvataggio. La bottega condivide merci e deposito del mercato di Velaris. La bacheca della gilda assegna e riscuote gli incarichi per la Selva degli Alambicchi.

La serra ha un’aiuola persistente. Il campo facoltativo `cityWorks.seedbedAt` vale −1 per il terreno vuoto, 0 dopo la semina e indica il minuto assoluto di maturazione dopo l’irrigazione. Costa una semente, richiede 80 minuti di calendario e produce due erbe per raccolta. Semina e raccolta usano gli eventi `sow` e `reap` dei mestieri. Le partite v7 anteriori all’espansione ricevono un’aiuola vuota.

Routine per quartiere: ogni residente abita nel quartiere del proprio lavoro (`homesByDistrict` in `urban-life.js`) e la sera passeggia verso la piazza del suo quartiere invece che tutti verso la Piazza delle Quattro Lenti; le soste restano distribuite da `spread()` e i percorsi verificati in modo esatto (BUG-011). Gli edifici dell’annesso registrano i vetri come quelli storici, quindi di notte si accendono con lo stesso strato precalcolato del passo 2; le atmosfere locali del passo 2 restano limitate ai quartieri storici a est del canale.

Pianificazione delle soste (PERF-002). L'indice spaziale cerca le soste già assegnate solo nel raggio utile. I profili continuano a essere elaborati nell'ordine originale, con gli stessi criteri di distanza, orari, destinazioni e controlli di percorribilità. Dalle 22:00 a Velaris si prepara il giorno successivo con al massimo otto soste per aggiornamento del gioco e un budget indicativo di 2 ms fra le soste. Il piano completo diventa attivo a mezzanotte. Dopo un salto o un caricamento l'eventuale piano assente viene completato al primo utilizzo. Questa cache è legata alla mappa e alla partita e si rigenera dai dati esistenti.

Il formato v7 conserva `urban` (routine, scorte, memorie e commissioni), `cityWorks` (restauro, colazione, esercitazioni e letture) ed `economy.flows` (campo facoltativo, `schema: 1`: giorno, ricchezza, spedizioni in viaggio, riporti frazionari e registro delle merci; assente nei salvataggi precedenti, che lo ricevono al giorno corrente senza recuperi retroattivi, e ricreato se non valido). Le mappe si rigenerano dallo stesso seme. I salvataggi precedenti ricevono i nuovi campi al caricamento. La v5 di GitHub può includere equipaggiamento, conflitti, reputazione e Santuario. La migrazione conserva i campi presenti e inizializza quelli mancanti nelle v5 precedenti.

### 3.2 Selva degli Alambicchi

`continents.js` disegna il terreno della Selva degli Alambicchi a due pixel logici con variazioni su più scale e margini di sentiero irregolari. Le chiome e gli edifici del borgo riusano sprite originali in cache. Le texture usano un seme dedicato, mentre il flusso casuale dei punti solidi, delle risorse e dei varchi resta quello già pubblicato. Le dimensioni della regione e il collegamento verso Velaris sono quelli della planimetria esistente. Direzione per le aree successive nel [World Art Overhaul](WORLD_ART_OVERHAUL.md).

### 3.3 Paesaggi dei continenti (World Art Overhaul)

`continents.js` disegna le otto regioni continentali diverse dalla Selva (che resta il pilota di Codex, §3.2) con lo stesso metodo: terreno a 2 px da rampe di colore per bioma (`groundArt`: suolo, prato umido, zona secca, margine, sentiero, lastricato), rumore su tre scale con retino ai confini, sentieri dal contorno irregolare con il centro consumato, dettagli con un seme proprio, rive a strati, piazza lastricata del borgo e pavimento radiale del monumento. Alberi, cespugli, rocce, cristalli, case, sale, banchi, pozzi, lampioni e rovine sono sprite disegnati una volta per regione (`area.sprites`) da `flora` e `masonry`: ogni continente ha sagome e materiali propri (Vaelthoria querce e travertino, Nordharyn larici, baite e rocca innevata, Myrathen cristalli, alberi velati e cupole, Voryndhal acacie, capanne e palafitte fra alberi a radici aeree, Azheryon palme, case bianche, pinnacoli d’arenaria, cactus e adobe). Le basi degli sprite coincidono con i punti d’appoggio e gli ingombri di collisione esistenti; la sequenza casuale che colloca oggetti solidi, risorse e varchi è invariata, quindi `canWalk`, varchi e rotte restano identici (verifica: `tests/confronto-mondo.cjs`). La Cripta delle Soglie ha pareti in mattoni, lastre smussate e rune, con le stesse sale.

`world-light.js` (`WorldLight`) aggiunge al mondo aperto le tinte di crepuscolo e notte per continente (`skies`, notte fino a 0,42–0,52 di opacità), le finestre accese e fino a otto aloni precalcolati per lanterne, torce, fuochi, cristalli e monumenti; `interface.js` lo chiama in `atmosphere()` dopo il velo notturno. `WorldLight.ambient` sostituisce le particelle generiche fuori dalla Valle con quelle del bioma e, di giorno, con ombre di nuvole. I sotterranei (`under`, oggi la Cripta) hanno una penombra costante. Cava, Fenditura e Santuario restano con i valori precedenti. Nessun dato di salvataggio nuovo.

### 3.4 Cava delle Braci e Fenditura Astrale (World Art Overhaul)

`expansion-world.js` genera il terreno dalla maschera a 2 px che decide anche le collisioni; il disegno legge la maschera senza cambiarla. Ai colori e ai rilievi di Codex (pozze di luce, cenge, correnti della lava, nubi del vuoto) si aggiungono `depthShade` (orli illuminati verso chi guarda e in ombra sul lato lontano, pareti con gradiente e fenditure, riflesso della lava, vene incandescenti, crosta e crepe della lava, calore sul terreno vicino, sottofondi pendenti sotto le isole della Fenditura, frammenti nel vuoto) e le ombre di contatto degli oggetti. Ogni regione ha uno strato emissivo (`map.glow`) che `WorldLight.draw` riaccende di notte sopra il velo, e registra lanterne, forgia, nucleo astrale, osservatorio, guglie e varchi come sorgenti di luce; tinte `ember` per la Cava e `astral` per la Fenditura. In `interface.js` atmosfera e luci si disegnano prima degli avvisi di combattimento (`Game.drawFX`).

### 3.5 Santuario della Marea Muta, monumenti e varchi (World Art Overhaul)

`legendary-land.js` disegna le sette sale come piattaforme di pietra su un bacino d'acqua immobile: il calpestabile è ancora definito solo da sale e colonne (`canWalk`), mentre acqua, alghe, coralli e rovine sommerse occupano il resto. Parapetti, pareti frontali che scendono nell'acqua, lastre smussate, fasce a onde, cerchi di rune luminosi attorno ai luoghi di lettura e l'arena del Trono con bordo chiaro e solco inciso rendono leggibili spazi e combattimento. Le colonne sono sprite in cache (stessa impronta di collisione). Lo strato emissivo (`map.glow`) e le sorgenti (portale, arena, trono, cerchi, colonne) passano a `WorldLight`; il cielo `tide` è una penombra marina costante, con bolle che salgono. Lapidi e trono (`legendary.js`) mantengono posizioni, raggi d'interazione e stati. Nell'integrazione con il lavoro di Codex le sale hanno anche una finitura propria (rosa delle correnti alla Soglia, binari e grate nel Deposito, mosaici a onde nel Chiostro), sponde rocciose, otto lanterne alle pareti e la spalliera dietro il trono; le colonne prendono la tinta della zona.

In `continents.js` i cinque monumenti della rinascita (`monument`, variante = continente) e i loro pilastri hanno sagome e materiali propri; i varchi (`gate`) cambiano per bioma e mostrano un passaggio scuro. Nessuno di questi oggetti ha ingombro di collisione: posizioni, collegamenti e interazioni sono quelli di prima. Statue di Nordharyn e Azheryon e pilastri e varco della Cripta usano i disegni di Codex (`paintRelic`); gli altri gli sprite per bioma di Claude.

Gli otto interni di Velaris (`urban-interiors.js`, lavoro di Codex) hanno pavimenti, rivestimenti, arredi e luci per tipo di sorgente precalcolati e limitati alla stanza, nel rispetto del movimento ridotto; coordinate, collisioni, accessi, servizi e dati di salvataggio sono invariati.

## 4. Meccaniche

### 4.1 Incarnazione e stirpi
Nuova partita: estrae una delle **44 stirpi** (rarità da Comune a Leggendaria), genera **predisposizioni individuali** e assegna una delle **sei abilità innate**. Ogni stirpe ha profilo biologico, tolleranze (freddo, caldo, fame, sete), abilità iniziale e due rami evolutivi a più stadi.

### 4.2 Evoluzione
Le trasformazioni sono **automatiche e osservate** (albero con V). Secondo stadio: progressione della campagna oppure pratica di mestiere sufficiente. Esistono assimilazione, tratti, ascensione, fusioni di tecniche (cambiano forma alla maestria 4). Parametri in `engine.js` → `rules` (es. `evolutionLevel`, `evolutionEssence`, `ascensionLevel`, `fuseLevel`).

### 4.3 Combattimento
Attacco base concatenabile (J / clic), schivata, tre tecniche assegnabili (1-2-3), innata (R), pozione (Q). **Combinazioni magiche** (K): coppie di tecniche, fusioni assegnabili a un tasto. Boss con **fasi** e **combattimento adattivo** (`adaptive-combat.js`). Sconfitta → ritorno all'ultima statua attivata, recupero fino a 3 Scintille dal borsello; prima della prima attivazione, Nerea ti risveglia al borgo.

### 4.4 Mestieri e vita quotidiana
Pesca, forgia, agricoltura, allevamento, cucina con minigiochi (tocco vs tenuto premuto); competenza e qualità; ricettario di combinazioni riuscite; piatti con benefici temporanei. Inventario senza limiti di slot/peso. Calendario: giorno = 30 min reali, stagione = 12 giorni, sonno → 06:00 con avanzamento di colture/animali/scorte; bisogni dipendenti dalla specie. Diario con incarichi facoltativi e richiesta del giorno degli abitanti.

### 4.5 Economia
Valute: **Scintille, Lunari, Solari, Astrali** (rapporto 100:1). Mercato per continente (07:00–20:00), prezzi e scorte regionali influenzati dagli scambi. Banca con deposito (cinque sportelli).

Velaris trasferisce legno, minerale, erbe e grano dalla riserva urbana al mercato condiviso fra la bottega e il banco della Selva. All’alba i mestieri producono nuove unità. Le merci delle commissioni alimentano la stessa riserva e possono rifornire il banco appena consegnate. Ogni trasferimento conserva le unità e lascia la scorta minima in città. Il limite dell’approvvigionamento urbano è due unità sopra la scorta di riferimento del mercato, per merce. Le scorte e i prezzi usano le regole di commercio esistenti. I dati continuano a usare i campi `urban` ed `economy` del salvataggio v7.

**Economia dinamica (`market-flows.js`, `MarketFlows`).** I cinque mercati non si riassortiscono più verso un obiettivo fisso: le scorte cambiano ogni giorno di calendario per produzione, consumo, deperimento e rotte. Nove professioni producono (contadini, erbaiuoli, minatori, falegnami, pastori, cercatori di essenza, pozzaioli) o trasformano (fornai: un grano per un pane; alchimisti: due erbe per una pozione); i lavoratori accelerano fino al +70% quando manca la merce e si fermano quando la scorta raggiunge il doppio dell'obiettivo. Gli abitanti consumano acqua, pane, grano, erbe, pozioni, minerale, legno, sementi, lana ed essenza; la domanda cala con la scarsità. Otto rotte (Vela al centro) spostano una merce solo se la partenza conserva una riserva, la destinazione ha un deficit previsto e il prezzo all'arrivo copre prezzo di partenza, deperimento e trasporto; mai in senso opposto sulla stessa rotta. Il prezzo di base di ogni merce è scalato da scarsità (×0,4–×1,6) e ricchezza del mercato (piena sul lusso, dimezzata sulla necessità); qualità, stagione, favore e lutto restano come prima. Un registro esatto per mercato e merce (BigInt) garantisce che nessuna merce nasca o sparisca: gli scambi del giocatore e le forniture di Velaris sono flussi esterni dichiarati. Non c'è simulazione individuale: tutto è aggregato e deterministico (seme e giorno).

API per sistemi futuri: `Economy.quote(s, mercato, merce[, scorta])`, `Economy.deliver` / `Economy.procure` (un negozio, un mercante o un residente porta o preleva merce; limiti di magazzino e di scorta), `Economy.flowReport(s)` (prezzi, ricchezza, merci in viaggio, previsione di domanda e produzione, rotte, verifica del registro). `MarketFlows.settlementProfile({id, size, focus, seed, world})` genera il profilo economico di un nuovo insediamento (abitanti, mestieri, obiettivi di scorta, prezzi, specialità) senza condizioni speciali, e `MarketFlows.routesFor(profili)` ne ricava le rotte (connesse, deterministiche). Limiti: il gioco usa cinque mercati (ECO-002); i mercati sono poco profondi (ECO-001); nessuna interfaccia mostra ancora tendenze e merci in viaggio (ECO-003).

### 4.6 Società e costruzione
Abitanti con memorie, accordi commerciali, crescita e famiglia; insediamenti con scorte e maestri. Costruzione su lotti designati (casa, fattoria, laboratorio…) con materiali (legno, minerale, oro); villaggi e città assemblabili ai limiti dei lotti, con entrate dagli scambi.

### 4.7 Gilde e reputazione
Gilda pubblica (rango F→S): caccia, raccolta, ricognizione, lettura iscrizioni, scorta, esplorazione della Cripta. **Gilda personale** con squadre che avanzano con il giocatore. **Reputazione** con insediamenti, regni, gilde e fazioni (Compagnia dei Cartografi, Custodi delle Lanterne); **titoli**.

### 4.8 Equipaggiamento
Slot arma/armatura/accessorio; sette rarità da Comune a Divino; durabilità, riparazione, maestria, tempra, ascensione, incantamento; retrocompatibilità con reliquie e lame forgiate.

### 4.9 Conflitti NPC e rinascita
Pattuglie, ferite (sano/ferito/critico/morto), soccorsi con oggetti o magia, **morte permanente** degli abitanti, memoriali e rito dell’Eco della Rinascita. Il memoriale di Nerea conserva il percorso alternativo della campagna.

**Compagni di gilda in combattimento (decisione confermata dall'utente il 2026-11-21).** I compagni della squadra sono abitanti a tutti gli effetti e subiscono danno reale tramite `Conflicts.damageNpc` quando sono a contatto con un nemico. Sotto il 42% dei PV diventano *feriti* e si ritirano dallo scontro; a 0 PV diventano *critici* con una scadenza di circa 105 unità di tempo. Se non vengono soccorsi (pozione, erbe o magia di cura) entro la scadenza **muoiono in modo permanente**, con memoriale, e se il giocatore era presente subisce una perdita di reputazione per negligenza (`npc-neglect`). Solo abitanti sani possono essere reclutati. Prima dell'integrazione di Velaris i compagni avevano un minimo di PV e non potevano morire.

## 5. Comandi

Movimento WASD/frecce · Attacco J/clic · Schivata Spazio · Abilità 1-2-3 · Innata R · Interazione E · Pozione Q · Personaggio C · Inventario I · Abilità K · Evoluzioni V · Bestiario B · Mappa M · Diario L · Mestieri U · Calendario/bisogni N · Abitanti O · Proprietà T · Gilda G · Guida H · Pausa/chiudi Esc. (Fonte: `LEGGIMI.md` e `interface.js`.)

## 6. Obiettivi di prodotto

- Campagna "Dal Borgo al Varco" giocabile dall'inizio all'epilogo (stato: vedi `PROGRESS.md`).
- Sistema di vita/economia/società profondo e coerente fra regioni.
- Mantenere il gioco in un solo file offline, leggibile e modificabile da più agenti AI.
- Sviluppi futuri in [ROADMAP.md](ROADMAP.md). Requisiti urbani e fasi dell’Aggiornamento 5 in [MEGA_CITY_OVERHAUL.md](MEGA_CITY_OVERHAUL.md).

## 7. Limiti dichiarati della fase attuale

Restano da ampliare le città oltre Velaris e le relazioni politiche su vasta scala. Restano da sviluppare prestiti, trasferimenti fra conti, fondazione di banche, imprese oltre le botteghe esistenti, grimori scrivibili, gestione di accademie, nuovi dungeon procedurali, gestione di guardiani e leggi locali con taglie.

## 8. Ambiti legali e creativi
Personaggi, nomi dei luoghi, illustrazioni e musica sono originali. La copertina è stata generata con ImageGen integrato (prompt in `LEGGIMI.md`).
