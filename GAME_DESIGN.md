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
| 4 | `city-families.js` | `CityFamilies` | Famiglie architettoniche per continente: materiali, regole e componenti parametrici (case, botteghe, sale, banchi, pozzi, lampioni, elementi caratteristici) per i borghi e per il Generatore Procedurale Urbano 2.0 (§3.3) |
| 5 | `continents.js` | `World` | Cinque continenti, nove nuove regioni + Cripta delle Soglie, rotte, caricamento regione, monumenti; terreno, vegetazione, edifici e luci per bioma (sprite in cache) |
| 6 | `sprites.js` | `ActorArt` | Sprite animati, forme evolute, icone, ritratti |
| 7 | `expansion-species.js` | `EvolutionContent` | Stirpi aggiunte e rami evolutivi avanzati |
| 8 | `expansion-art.js` | `ActorArt` | Arte delle nuove stirpi, creature, guardiani |
| 9 | `continental-species.js` | `EvolutionContent`, `ContinentalBiology`, `ActorArt` | Otto stirpi aggiuntive e profili biologici |
| 10 | `creature-art.js` | `ActorArt` | Sprite dedicati di Scheletro errante, Orso dei larici e Viverna di brina: piano corporeo, viste, passo, attesa, attacco e cinque forme evolutive (metodo in §4.2) |
| 11 | `legendary-land.js` | `LegendaryLand`, `World` | Area del Santuario della Marea Muta (`nadir-vault`): bacino sommerso, piattaforme, colonne e rune in cache, strato emissivo e luci per `WorldLight` |
| 12 | `urban-exterior.js` | `UrbanExterior` | Quartieri, edifici, canale, ponti e percorsi deterministici di Velaris (tratti verificati in modo esatto per il raggio del corpo); luce dal calendario, finestre, cristalli, riflessi, ombre e vegetazione animata (movimento ridotto rispettato) |
| 13 | `urban-interiors.js` | `UrbanInteriors` | Sette interni visitabili e cache delle superfici |
| 13a | `filoni-sprites.js` | `FiloniSprites` | Vegetazione e tavolozza del terreno del Passo dei Larici |
| 13b | `urban-profiles.js` | `UrbanProfiles` | Configurazione di Filoni e Calis: lotti, strade, soglie, arredi, turni, terreno e servizi |
| 13c | `urban-sector-layout.js` | `UrbanSectorLayout` | Descrittori dei rioni, materializzazione a richiesta, cache e percorsi gerarchici |
| 13d | `urban-districts.js` | `UrbanDistricts` | Registro, collisioni, percorsi, superfici per settore, interni e facciate per profilo |
| 14 | `urban-world.js` | `UrbanWorld, World` | Collegamenti con la Selva degli Alambicchi, rotte, collisioni e accesso ai servizi |
| 15 | `calendar.js` | `Calendar` | Calendario persistente unico (giorno = 1800 s reali = 1440 min di gioco) |
| 16 | `inventory.js` | `Inventory` | Magazzino a pile, quantità esatte, deposito |
| 17 | `lantern.js` | `Lantern` | Evento serale nel Bosco di Vetro |
| 18 | `growth.js` | `Growth` | Biologia fantasy, predisposizioni, innata evolutiva, allenamento, metamorfosi |
| 19 | `world-life.js` | `Life` | Mestieri, luoghi di lavoro, routine NPC, eventi, statue/rinascita |
| 20 | `construction.js` | `Build` | Lotti, costruzioni (casa, fattoria, laboratorio…), collisioni, proprietà |
| 21 | `society.js` | `Society` | Abitanti, memorie, commercio, accordi, famiglia |
| 22 | `guild.js` | `Guild` | Registri pubblici, incarichi, rango F–S, compagni, gilda personale |
| 23 | `trades-practice.js` | `GamePractice` | Minigiochi di mestiere (puri, senza DOM/Canvas) |
| 24 | `tradecraft.js` | `Tradecraft` | Attività, raccolti, allevamento, ricette |
| 25 | `daily-life.js` | `Daily` | Bisogni, incarichi facoltativi quotidiani |
| 26 | `market-flows.js` | `MarketFlows` | Economia dinamica: produzione, consumo, rotte, prezzi, registro delle merci, profili per nuove città |
| 27 | `trade-economy.js` | `Economy` | Mercati regionali, valute, banca |
| 28 | `gear.js` | `Gear` | Equipaggiamento: rarità, durabilità, riparazioni, maestria, tempra, ascensione, incantamento |
| 29 | `adaptive-combat.js` | `Adaptive` | Boss che riconoscono lo stile ripetuto (melee/projectile/field) e rispondono |
| 30 | `legendary.js` | `Legendary` | Scoperta, bottino unico, successione del Santuario; Nadir, Arma Divina, Eco della Rinascita |
| 31 | `npc-conflicts.js` | `Conflicts` | Pattuglie, ferite, soccorsi, morte permanente NPC, memoriali, rito della rinascita |
| 32 | `reputation.js` | `Reputation` | Reputazione con insediamenti, regni, gilde, fazioni; titoli |
| 33 | `urban-services.js` | `UrbanServices` | Ripristino della fonte, colazione, letture ed esercitazione |
| 34 | `urban-life.js` | `UrbanLife` | Residenti, routine (soste distribuite per giorno), memorie, commissioni e scorte urbane |
| 35 | `engine.js` | `Game` | Tabelle stirpi/tecniche, simulazione, incontri, missioni, progressione, persistenza |
| 36 | `combat-fx.js` | `CombatFX` | Effetti di combattimento per elemento (fisico, fuoco, acqua, ghiaccio, fulmine, oscurità, luce): impatti, proiettili, anelli, colpo forte, schivata, aure e trasformazioni dei boss, evoluzione, numeri; solo disegno (§4.3) |
| 37 | `audio.js` | `Score` | Musica e suoni |
| 38 | `practice-panel.js` | `PracticePanel` | Vista dei mestieri/minigiochi |
| 39 | `life-panels.js` | `LifePanels` | Inventario, mestieri, vita quotidiana |
| 40 | `economy-panel.js` | `EconomyPanel` | Mercato e banca |
| 41 | `gear-panel.js` | `GearPanel` | Schermata equipaggiamento |
| 42 | `npc-conflict-panel.js` | `ConflictPanel` | Pannello conflitti/soccorsi |
| 43 | `panels.js` | `GamePanels` | Diario, mappe, interazioni con abitanti, grimorio |
| 44 | `interface.js` | `UI` | Input, loop, camera, HUD, pannelli |

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

`continents.js` disegna le otto regioni continentali diverse dalla Selva (che resta il pilota di Codex, §3.2) con lo stesso metodo: terreno a 2 px da rampe di colore per bioma (`groundArt`: suolo, prato umido, zona secca, margine, sentiero, lastricato), rumore su tre scale con retino ai confini, sentieri dal contorno irregolare con il centro consumato, dettagli con un seme proprio, rive a strati, piazza lastricata del borgo e pavimento radiale del monumento. Alberi, cespugli, rocce, cristalli, case, sale, banchi, pozzi, lampioni e rovine sono sprite disegnati una volta per regione (`area.sprites`) da `flora` e `masonry`: ogni continente ha sagome e materiali propri (Vaelthoria querce e travertino, Nordharyn larici, baite e rocca innevata, Myrathen cristalli, alberi velati e cupole, Voryndhal acacie, capanne e palafitte fra alberi a radici aeree, Azheryon palme, case bianche, pinnacoli d’arenaria, cactus e adobe). Le basi degli sprite coincidono con i punti d’appoggio e gli ingombri di collisione esistenti; la sequenza casuale che colloca oggetti solidi, risorse e varchi è invariata, quindi `canWalk`, varchi e rotte restano identici (verifica: `tests/confronto-mondo.cjs`). La Cripta delle Soglie (fase 4) ha un materiale per sala: arenaria con sentiero consumato e mosaico del patto nell'Anticamera, mattoni a spina di pesce nei corridoi, scacchiera di basalto e marmo con la rosa delle otto chiavi nella Sala delle Chiavi, ardesia con un nome inciso per lastra e altare ad anello nella Camera dei Nomi, basalto con anelli e raggi d'oro e il cerchio della Soglia nell'Ultima Soglia; pareti d'arenaria con nicchie, urne, iscrizioni e porta sigillata, bracieri di bronzo sugli stessi punti delle lampade, rune e intarsi nello strato emissivo e penombra calda `crypt` in `world-light.js`. Sale, oggetti e punti sono quelli di prima. **Famiglie architettoniche (fase 4 D).** Gli edifici dei borghi continentali vengono da `city-families.js`: Vaelthoria (pietra chiara e legno caldo), Nordharyn (pietra robusta, tetti ripidi, miniera e fortificazioni; variante innevata della Rocca), Myrathen (legno scuro, vetro, rame ossidato, rampicanti, alchimia), Voryndhal (corteccia, radici monumentali, palafitte e passerelle; paglia nella Savana) e Azheryon (pietra calda, portici, cupole, tende; calce bianca e azzurro sulla costa). La seconda casa del borgo è la bottega della famiglia (fornaio, imbocco di miniera, laboratorio alchemico, capanna su palafitte, tintore con portico). Contratto per il Generatore 2.0: `CityFamilies.render(famiglia, variante, componente, {w, stories, variant, door})` restituisce una tela in memoria con il punto d'appoggio (`ax`, `ay`) al centro della base del fronte, l'impronta `{w, d}`, la soglia della porta `{x, y}`, i vetri da accendere di notte e, per i lampioni, la fiammella animata; stessa richiesta, stessi pixel (generatore con seme, cache con chiave). `CityFamilies.families` descrive materiali, regole (muri, tetti, aperture, piani, larghezze ammesse) e componenti di ogni famiglia senza funzioni; `CityFamilies.familyOf(tavolozza)` dà famiglia e variante; `CityFamilies.catalog(famiglia)` elenca i componenti con richieste d'esempio. Il modulo non genera città, non decide collisioni né lotti e non tocca percorsi, residenti o salvataggi: il Generatore 2.0 sceglie lotti e impronte in dati e chiede il disegno. La Selva degli Alambicchi conserva gli sprite di Codex.

`world-light.js` (`WorldLight`) aggiunge al mondo aperto le tinte di crepuscolo e notte per continente (`skies`, notte fino a 0,42–0,52 di opacità), le finestre accese e fino a otto aloni precalcolati per lanterne, torce, fuochi, cristalli e monumenti; `interface.js` lo chiama in `atmosphere()` dopo il velo notturno. `WorldLight.ambient` sostituisce le particelle generiche fuori dalla Valle con quelle del bioma e, di giorno, con ombre di nuvole. I sotterranei (`under`, oggi la Cripta) hanno una penombra costante. Cava, Fenditura e Santuario restano con i valori precedenti. Nessun dato di salvataggio nuovo.

### 3.4 Cava delle Braci e Fenditura Astrale (World Art Overhaul)

`expansion-world.js` genera il terreno dalla maschera a 2 px che decide anche le collisioni; il disegno legge la maschera senza cambiarla. Ai colori e ai rilievi di Codex (pozze di luce, cenge, correnti della lava, nubi del vuoto) si aggiungono `depthShade` (orli illuminati verso chi guarda e in ombra sul lato lontano, pareti con gradiente e fenditure, riflesso della lava, vene incandescenti, crosta e crepe della lava, calore sul terreno vicino, sottofondi pendenti sotto le isole della Fenditura, frammenti nel vuoto) e le ombre di contatto degli oggetti. Ogni regione ha uno strato emissivo (`map.glow`) che `WorldLight.draw` riaccende di notte sopra il velo, e registra lanterne, forgia, nucleo astrale, osservatorio, guglie e varchi come sorgenti di luce; tinte `ember` per la Cava e `astral` per la Fenditura. In `interface.js` atmosfera e luci si disegnano prima degli avvisi di combattimento (`Game.drawFX`).

### 3.5 Santuario della Marea Muta, monumenti e varchi (World Art Overhaul)

`legendary-land.js` disegna le sette sale come piattaforme di pietra su un bacino d'acqua immobile: il calpestabile è ancora definito solo da sale e colonne (`canWalk`), mentre acqua, alghe, coralli e rovine sommerse occupano il resto. Parapetti, pareti frontali che scendono nell'acqua, lastre smussate, fasce a onde, cerchi di rune luminosi attorno ai luoghi di lettura e l'arena del Trono con bordo chiaro e solco inciso rendono leggibili spazi e combattimento. Le colonne sono sprite in cache (stessa impronta di collisione). Lo strato emissivo (`map.glow`) e le sorgenti (portale, arena, trono, cerchi, colonne) passano a `WorldLight`; il cielo `tide` è una penombra marina costante, con bolle che salgono. Lapidi e trono (`legendary.js`) mantengono posizioni, raggi d'interazione e stati. Nell'integrazione con il lavoro di Codex le sale hanno anche una finitura propria (rosa delle correnti alla Soglia, binari e grate nel Deposito, mosaici a onde nel Chiostro), sponde rocciose, otto lanterne alle pareti e la spalliera dietro il trono; le colonne prendono la tinta della zona.

In `continents.js` i cinque monumenti della rinascita (`monument`, variante = continente) e i loro pilastri hanno sagome e materiali propri; i varchi (`gate`) cambiano per bioma e mostrano un passaggio scuro. Nessuno di questi oggetti ha ingombro di collisione: posizioni, collegamenti e interazioni sono quelli di prima. Statue di Nordharyn e Azheryon e pilastri e varco della Cripta usano i disegni di Codex (`paintRelic`); gli altri gli sprite per bioma di Claude.

Gli otto interni di Velaris (`urban-interiors.js`, lavoro di Codex) hanno pavimenti, rivestimenti, arredi e luci per tipo di sorgente precalcolati e limitati alla stanza, nel rispetto del movimento ridotto; coordinate, collisioni, accessi, servizi e dati di salvataggio sono invariati.

### 3.5 Borgo dei Filoni · Piazzale degli Argani

Il cartello a est del mercato nel Passo dei Larici apre il nuovo quartiere `city-filoni` (960×672 pixel logici). Il borgo preesistente continua a usare mappa, servizi e inventario del mercato `filoni`. I tredici lotti sono associati a chiavi permanenti. La piazza, gli argani e la cooperativa sono elementi d'autore. Varianti delle abitazioni e posizioni entro il lotto usano il seme e la revisione 1, con sequenze indipendenti per lotto e decorazione.

Il grafo di strade e collegamenti alle soglie usa le stesse sagome di collisione indicizzate per settore del movimento locale. Sono generate bitmap da 256 px soltanto per i settori osservati. La cache conserva tutti quelli inquadrati con un margine ridotto. La carta usa una planimetria compatta. Facciate, soglie, arredi di strada e finestre sono restituiti da `CityFamilies` per Nordharyn. Le soglie disegnate si allineano alle porte persistenti e i vetri e le fiammelle forniti dalla famiglia alimentano `WorldLight`. Le cinque istanze interne riusano piante e arredi collaudati di Velaris, con nomi, accessi, semi di disegno e servizi associati al proprio edificio.

I salvataggi continuano a usare il formato v7. `city-filoni` e gli interni sono registrati prima della validazione della partita. La disposizione si ricostruisce dal seme, senza salvare Canvas, grafo o sprite. Cambi futuri alla generazione devono mantenere la revisione 1 per queste coordinate o migrare esplicitamente le posizioni. I turni dei tre residenti usano il calendario e i percorsi locali. L'attività economica resta aggregata nell'unico mercato dei Filoni.

### 3.6 Porto di Calis · Baia del Carico

Il varco a est dello scalo sulla Costa delle Sette Vele collega `dune-port` a `city-calis`. Il quartiere aggiunge 11 edifici, quattro interni, quattro residenti, due pontili e una banchina lastricata. Il profilo proietta le ellissi costiere esistenti nello spazio locale con origine `(430,200)`. L'acqua blocca il movimento eccetto sulla superficie percorribile dei pontili. Impronte e collisioni della regione originaria restano quelle pubblicate. L'accesso è un punto aggiunto alla mappa e al grafo dei varchi.

`urban-profiles.js` contiene dati separati per revisione, lotti, strade, turni e servizi. `urban-districts.js` condivide indicizzazione spaziale, grafo, regole di soglia, cache dei settori, registro degli interni e sorgenti per l'illuminazione. Le tele del terreno vengono disegnate per area inquadrata e vengono recuperate dalla cache al ritorno. Il registro mantiene al massimo cinque istanze di mappe e interni per seme/regione e non serializza le superfici. I quattro interni di Calis riusano piante di `UrbanInteriors` con chiavi permanenti proprie. Il codice della famiglia di Azheryon disegna cupole, portici, banchi, fronte dei moli e lampioni. La decisione su quale parte dell'acqua si può attraversare appartiene al profilo.

L'emporio usa il mercato `calis` già registrato in `Economy` con gli stessi prezzi, quantità e orari. Il Registro dei Carichi apre il diario. La commissione `calis-freight` registra una vendita unica di almeno tre unità di legno all'emporio, paga 16 Scintille al Registro e usa le missioni persistenti di `Daily`. L'acquisto, la vendita, l'avanzamento e il pagamento passano per i normali comandi di gioco. Restano il salvataggio v7 e la migrazione delle partite precedenti.

### 3.7 Confluenza · Laboratorio multisettore

`UrbanSectorLayout` è opt-in per i profili con `neighborhoods`. Il laboratorio usa rioni da 512×512 e tele del terreno da 256×256. I descrittori di piazze, lotti, soglie e strade si ricostruiscono da seme, ID e revisione. Collisioni, decorazioni e indici locali vengono costruiti a richiesta. La cache della geometria conserva al massimo otto rioni, la visuale limita la cache delle tele e le facciate si appoggiano a `CityFamilies` con al massimo 56 riferimenti locali per mappa. Le porte di un rione conservano il loro ID quando il profilo si estende a nuove righe.

Il percorso cerca un collegamento locale fra partenza e piazza, attraversa il grafo delle piazze contigue, poi risolve l'ultimo tratto nel rione di arrivo. Il grafo principale presuppone arterie riservate e percorribili. Per i profili litoranei o con barriere serviranno collegamenti espliciti e verifica del segmento principale. Filoni e Calis conservano il percorso e la planimetria della revisione pubblicata.

`urban-lab.js` registra il profilo e cinque varianti regionali. `urban-lab-start.js` avvia il laboratorio attraverso un varco esistente nella build di prova. I due moduli si caricano soltanto con `--urban-lab`. Il formato rimane v7 e le chiavi di salvataggio locali sono isolate per taglio. Le varianti riutilizzano le piante degli interni e i servizi esistenti, con cinque residenti esterni assegnati alla prima fila di rioni. [Verifiche](PROGRESS.md#confluenza--scala-multisettore).

## 4. Meccaniche

### 4.1 Incarnazione e stirpi
Nuova partita: estrae una delle **44 stirpi** (rarità da Comune a Leggendaria), genera **predisposizioni individuali** e assegna una delle **sei abilità innate**. Ogni stirpe ha profilo biologico, tolleranze (freddo, caldo, fame, sete), abilità iniziale e due rami evolutivi a più stadi.

### 4.2 Evoluzione
Le trasformazioni sono **automatiche e osservate** (albero con V). Secondo stadio: progressione della campagna oppure pratica di mestiere sufficiente. Esistono assimilazione, tratti, ascensione, fusioni di tecniche (cambiano forma alla maestria 4). Parametri in `engine.js` → `rules` (es. `evolutionLevel`, `evolutionEssence`, `ascensionLevel`, `fuseLevel`).

**Sprite delle stirpi.** La forma disegnata è `spriteForm(p)`: 0 base, 1–2 primo stadio (ramo 0/1), 3–4 secondo stadio. `ActorArt` è una catena: `sprites.js` (nove stirpi originali), `expansion-art.js` (ventisette stirpi aggiunte, creature e guardiani; le forme 3–4 delle originali con ali, cresta e gemme comuni), `continental-species.js` (otto stirpi che prendono in prestito uno sprite esistente più un accento) e `creature-art.js` (sprite dedicati; oggi Scheletro errante, Orso dei larici, Viverna di brina, elencati in `ActorArt.dedicated`). Metodo per dare uno sprite proprio a una stirpe senza toccare le meccaniche: (1) **piano corporeo** per vista (fronte, spalle, lato; sinistra speculare) con coordinate intere ai piedi, asse di simmetria fra le colonne -1 e 0 e ingombro vicino a quello di prima; (2) **volto** leggibile a 1:1 (occhi a 1–2 px con un punto di luce, muso o mascella) solo nelle viste in cui si vede; (3) **forme**: il ramo offensivo aggiunge un'arma o una sagoma aggressiva con accento caldo, il ramo di sostegno un oggetto o un'aura con accento freddo, il secondo stadio ingrandisce la sagoma e aggiunge un elemento nuovo (elmo, corona, cristalli, ali a velo), sempre coerente con il nome della forma e la sua tecnica; (4) **pose**: passo a due tempi in movimento, due tempi lenti in attesa (dettagli, non le zampe), posa d'attacco, lampo del colpo; (5) contorno d'inchiostro, ombra e fotogrammi in memoria comuni; (6) verifica con `tests/scatti-creature.cjs` e `tests/prova-browser-creature.cjs`. Requisiti, statistiche, alberi, tecniche e tempi restano in `engine.js`, `growth.js` e nei dati delle stirpi.

### 4.3 Combattimento
Attacco base concatenabile (J / clic), schivata, tre tecniche assegnabili (1-2-3), innata (R), pozione (Q). **Combinazioni magiche** (K): coppie di tecniche, fusioni assegnabili a un tasto. Boss con **fasi** e **combattimento adattivo** (`adaptive-combat.js`). **Effetti per elemento** (`combat-fx.js`): ogni stirpe e ogni mostro ha uno dei sette elementi visivi (fisico, fuoco, acqua, ghiaccio, fulmine, oscurità, luce); `engine.js` copia un'etichetta solo visiva (`fxTag`, mai salvata) su effetti, proiettili e aree e segnala colpi, ferite, schivate, scatti, cambi di fase, sconfitte ed evoluzioni a `CombatFX`, che disegna con variazioni da una funzione hash (nessun `Math.random`). Ordine in `Game.drawFX`: decorazioni (aure, impatti, archi, anelli, scintille), poi avvisi di pericolo e aree, proiettili, compagno, numeri; ciò che tocca la figura del personaggio resta al 25%, i numeri che si toccano salgono di una riga. Il gioco non ha colpi critici casuali: il «colpo forte» visivo è il terzo colpo della combo (×1,25 già nel motore). Con effetti ridotti o `prefers-reduced-motion` restano solo forme ferme. Sconfitta → ritorno all'ultima statua attivata, recupero fino a 3 Scintille dal borsello; prima della prima attivazione, Nerea ti risveglia al borgo.

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
