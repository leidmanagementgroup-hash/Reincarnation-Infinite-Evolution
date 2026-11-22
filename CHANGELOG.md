# CHANGELOG.md

Cronologia delle modifiche. Voci più recenti in alto. Formato e regole in `AGENTS.md` §6. Ogni voce indica l'agente (`Claude`, `Codex`, `Umano`).

## [2026-11-22] Apri il Piazzale degli Argani al Borgo dei Filoni — Codex
Branch `codex/generatore-urbano-filoni`, base `3ff458b`.
### Aggiunto
- Quartiere di Nordharyn con 13 lotti, piazza d'autore, strade e soglie connesse, cinque interni e tre residenti con turni diurni. Il nuovo passaggio parte dal borgo esistente senza spostare il mercato o i varchi storici.
- Planimetria deterministica, collisioni e superfici per settore, cache a capienza limitata e mappa semplificata. L'atlante del quartiere riusa 14 sprite effettivi del World Art Overhaul e le sorgenti di illuminazione del motore.
- Riposo, commercio sul mercato `filoni` e forgia attraverso i sistemi già presenti. Salvataggi v7 con ID separati per ciascuna porta e interno. HTML offline ricostruito, test e misure in `PROGRESS.md`.

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
