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
- **Persistenza**: `localStorage`, chiave `reincarnation.lumora.save.v5` (versione 5, limite `saveMaxBytes` 12.000.000); migrazione da `v4…v1` tramite `saveKeys` in `engine.js`. Export/import JSON dal menu Opzioni. Altre preferenze: `lumora-effects`, `lumora-guidance`, `lumora-audio-v1`.
- **Numeri esatti**: inventario, valute e mercati usano `BigInt` internamente e stringhe decimali in JSON.
- **Determinismo**: elementi procedurali di mondo/eventi usano semi fissi.
- **Nessuna suite di test automatici** al momento (vedi `PROGRESS.md`).

### 2.1 Moduli (ordine di caricamento in `build.py`)

| # | File | Globale `window.*` | Ruolo |
|---|---|---|---|
| 1 | `world.js` | `World` | Valle di Vela (1600×1080 px logici): geografia, percorsi, scenario procedurale, collisioni, mappa |
| 2 | `expansion-world.js` | `World` | Cava delle Braci, Fenditura Astrale, passaggi regionali |
| 3 | `continents.js` | `World` | Cinque continenti, nove nuove regioni + Cripta delle Soglie, rotte, caricamento regione, monumenti |
| 4 | `sprites.js` | `ActorArt` | Sprite animati, forme evolute, icone, ritratti |
| 5 | `expansion-species.js` | `EvolutionContent` | Stirpi aggiunte e rami evolutivi avanzati |
| 6 | `expansion-art.js` | `ActorArt` | Arte delle nuove stirpi, creature, guardiani |
| 7 | `continental-species.js` | `EvolutionContent`, `ContinentalBiology`, `ActorArt` | Otto stirpi aggiuntive e profili biologici |
| 8 | `legendary-land.js` | `LegendaryLand`, `World` | Area del Santuario della Marea Muta (`nadir-vault`) |
| 9 | `legendary.js` | `Legendary` | Scoperta, bottino unico, successione del Santuario; Nadir, Arma Divina, Eco della Rinascita |
| 10 | `calendar.js` | `Calendar` | Calendario persistente unico (giorno = 1800 s reali = 1440 min di gioco) |
| 11 | `inventory.js` | `Inventory` | Magazzino a pile, quantità esatte, deposito |
| 12 | `lantern.js` | `Lantern` | Evento serale nel Bosco di Vetro |
| 13 | `growth.js` | `Growth` | Biologia fantasy, predisposizioni, innata evolutiva, allenamento, metamorfosi |
| 14 | `world-life.js` | `Life` | Mestieri, luoghi di lavoro, routine NPC, eventi, statue/rinascita |
| 15 | `construction.js` | `Build` | Lotti, costruzioni (casa, fattoria, laboratorio…), collisioni, proprietà |
| 16 | `society.js` | `Society` | Abitanti, memorie, commercio, accordi, famiglia |
| 17 | `guild.js` | `Guild` | Registri pubblici, incarichi, rango F–S, compagni, gilda personale |
| 18 | `trades-practice.js` | `GamePractice` | Minigiochi di mestiere (puri, senza DOM/Canvas) |
| 19 | `tradecraft.js` | `Tradecraft` | Attività, raccolti, allevamento, ricette |
| 20 | `daily-life.js` | `Daily` | Bisogni, incarichi facoltativi quotidiani |
| 21 | `trade-economy.js` | `Economy` | Mercati regionali, valute, banca |
| 22 | `adaptive-combat.js` | `Adaptive` | Boss che riconoscono lo stile ripetuto (melee/projectile/field) e rispondono |
| 23 | `reputation.js` | `Reputation` | Reputazione con insediamenti, regni, gilde, fazioni; titoli |
| 24 | `gear.js` | `Gear` | Equipaggiamento: rarità, durabilità, riparazioni, maestria, tempra, ascensione, incantamento |
| 25 | `npc-conflicts.js` | `Conflicts` | Pattuglie, ferite, soccorsi, morte permanente NPC, memoriali, rito della rinascita |
| 26 | `engine.js` | `Game` | Tabelle stirpi/tecniche, simulazione, incontri, missioni, progressione, persistenza |
| 27 | `audio.js` | `Score` | Musica e suoni |
| 28 | `practice-panel.js` | `PracticePanel` | Vista dei mestieri/minigiochi |
| 29 | `gear-panel.js` | `GearPanel` | Schermata equipaggiamento |
| 30 | `npc-conflict-panel.js` | `ConflictPanel` | Pannello conflitti/soccorsi |
| 31 | `life-panels.js` | `LifePanels` | Inventario, mestieri, vita quotidiana |
| 32 | `economy-panel.js` | `EconomyPanel` | Mercato e banca |
| 33 | `panels.js` | `GamePanels` | Diario, mappe, interazioni con abitanti, grimorio |
| 34 | `interface.js` | `UI` | Input, loop, camera, HUD, pannelli |

Nota: `World`, `ActorArt` ed `EvolutionContent` sono **estesi da più moduli** successivi (ciascuno incapsula e riassegna il globale precedente): l'ordine in `build.py` è vincolante.

## 3. Mondo

- **Vaelthoria** (centro) con la **Valle degli Antichi** e la **Via degli Antichi**, che porta a **Nordharyn** (nord), **Myrathen** (est), **Voryndhal** (sud) e **Azheryon** (ovest). **Cinque continenti, tredici aree**, inclusa la **Cripta delle Soglie** (regione permanente) e la **Fenditura Astrale**.
- **Valle di Vela** (area iniziale): Borgo di Vela, Radura delle Lanterne, Bosco di Vetro, Cerchio delle Radici; Nerea (Custode, missione principale), Tessa (mercante), Ivo (fabbro), Focolare/locanda, orto, recinto, pesiera.
- **Cava delle Braci**: dopo Orveth, con tre guardiani successivi; epilogo al Borgo di Vela.
- **Santuario della Marea Muta**: dungeon raro e deterministico (probabilità 128, scoperta a distanza ~29), con Nadir, successione dell'erede dopo 7 anni di gioco, Arma Divina.
- Le regioni si caricano al passaggio; una **statua** per continente è punto di rinascita (E per attivare).

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

### 4.6 Società e costruzione
Abitanti con memorie, accordi commerciali, crescita e famiglia; insediamenti con scorte e maestri. Costruzione su lotti designati (casa, fattoria, laboratorio…) con materiali (legno, minerale, oro); villaggi e città assemblabili ai limiti dei lotti, con entrate dagli scambi.

### 4.7 Gilde e reputazione
Gilda pubblica (rango F→S): caccia, raccolta, ricognizione, lettura iscrizioni, scorta, esplorazione della Cripta. **Gilda personale** con squadre che avanzano con il giocatore. **Reputazione** con insediamenti, regni, gilde e fazioni (Compagnia dei Cartografi, Custodi delle Lanterne); **titoli**.

### 4.8 Equipaggiamento
Slot arma/armatura/accessorio; rarità (comune…leggendaria); durabilità, riparazione, maestria, tempra, ascensione, incantamento; retrocompatibilità con reliquie e lame forgiate.

### 4.9 Conflitti NPC e rinascita
Pattuglie, ferite (sano/ferito/critico/morto), soccorsi, **morte permanente** degli abitanti, memoriali, rito della rinascita; Eco della Rinascita.

## 5. Comandi

Movimento WASD/frecce · Attacco J/clic · Schivata Spazio · Abilità 1-2-3 · Innata R · Interazione E · Pozione Q · Personaggio C · Inventario I · Abilità K · Evoluzioni V · Bestiario B · Mappa M · Diario L · Mestieri U · Calendario/bisogni N · Abitanti O · Proprietà T · Gilda G · Guida H · Pausa/chiudi Esc. (Fonte: `LEGGIMI.md` e `interface.js`.)

## 6. Obiettivi di prodotto

- Campagna "Dal Borgo al Varco" giocabile dall'inizio all'epilogo (stato: vedi `PROGRESS.md`).
- Sistema di vita/economia/società profondo e coerente fra regioni.
- Mantenere il gioco in un solo file offline, leggibile e modificabile da più agenti AI.
- Sviluppi futuri: `ROADMAP.md`.

## 7. Limiti dichiarati della fase attuale

Metropoli e relazioni politiche fra regni su vasta scala; prestiti, trasferimenti fra conti, fondazione di banche, imprese oltre le botteghe esistenti, grimori scrivibili, accademie; generazione di dungeon, governo di un dungeon, leggi locali con taglie e reputazioni distinte. (Da `LEGGIMI.md`.)

## 8. Ambiti legali e creativi
Personaggi, nomi dei luoghi, illustrazioni e musica sono originali. La copertina è stata generata con ImageGen integrato (prompt in `LEGGIMI.md`).
