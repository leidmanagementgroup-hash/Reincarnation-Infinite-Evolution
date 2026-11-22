# Piano grafico di Reincarnation — Infinite Evolution

Direzione artistica e tecnica per [l’Aggiornamento 5](MEGA_CITY_OVERHAUL.md). La prima prova riguarda la Piazza delle Quattro Lenti a Velaris, il ponte sul canale e l’accesso al Mercato dei Venti. La build integrata `875ac74` serve da riferimento per il confronto.

Per terreni, vegetazione e architettura fuori da Velaris, consulta il [World Art Overhaul](WORLD_ART_OVERHAUL.md). Il riferimento principale è la scena della Valle di Vela indicata dall’utente. La luce del mondo aperto (`world-light.js`) segue le stesse condizioni del passo 2: aloni precalcolati, al massimo otto attivi, `prefers-reduced-motion` ed effetti ridotti rispettati; Velaris e gli interni mantengono la propria luce. Dal branch `claude/world-art-cava-fenditura` l'atmosfera si applica prima degli avvisi di combattimento (`Game.drawFX`), come previsto dalle condizioni del passo 2.

## Stato di approvazione (registrato 2026-11-21)

- **Approvati dall'utente:** passo 1 (piazza, ponte, mercato: già realizzato nel commit `84c1ff4`, giudicato riuscito dalla revisione di Claude con confronto giorno/notte) e **passo 2 (luce e vegetazione)**.
- **Condizioni del passo 2** (proposte della revisione, accettate con l'approvazione): luci come sprite precalcolati o maschera a bassa risoluzione, non un gradiente per luce a ogni fotogramma; massimo otto luci attive; luce propria per gli interni; rispetto di `prefers-reduced-motion` oltre all'opzione effetti; avvisi di combattimento distinguibili anche per forma e non solo per colore; misura delle prestazioni ripetuta con lo stesso metodo del passo 1.
- **Da approvare ancora:** passi 3 (personaggi e creature), 4 (magia e combattimento) e 5 (interfaccia). Prima di ciascuno serve una nuova conferma dell'utente.
- Osservazione aperta dal passo 1: nella piazza più residenti si sovrappongono (visibile anche di notte); da risolvere in `urban-life.js` prima di ampliare la popolazione.

## Direzione artistica

Velaris deve riconoscersi dai tetti di rame ossidato, dalle lenti di vetro e dalle luci calde visibili attraverso portici e passerelle. A distanza si leggono il canale, il ponte e la piazza. Avvicinandosi emergono insegne dei mestieri, casse di pigmenti e strumenti lungo i banchi. La densità di dettagli segue ciò che il giocatore può osservare o raggiungere.

- **Sea of Stars.** Studiare come il passaggio fra giorno e notte e le fonti di luce cambiano la lettura dei volumi. A Velaris l’ambiente serale tende al blu, le lanterne scaldano le superfici vicine e le lenti restituiscono accenti turchesi. [Scheda ufficiale di Sabotage Studio](https://sabotagestudio.com/presskits/sea-of-stars/)
- **Eastward.** Studiare come oggetti d’uso, materiali e insegne raccontano la funzione dei luoghi. Nel mercato di Velaris useremmo tende rattoppate e vetreria, alle Fornaci pietra ferrigna e strumenti riposti vicino alle porte. [Galleria ufficiale di Eastward](https://eastwardgame.com/media/)
- **Chained Echoes.** Usare le immagini ufficiali come riferimento per la composizione 16-bit e per la leggibilità dei personaggi nelle scene affollate. Nel nostro gioco il profilo, la postura e il ritmo del movimento distinguono specie e maturità evolutiva. [Galleria ufficiale di Chained Echoes](https://store.steampowered.com/app/1229240/Chained_Echoes/)

Ogni asset sarà originale. Per separare i quartieri anche a colpo d’occhio, le Terrazze delle Lenti avranno archi alti e vetro, la Corte delle Fornaci tetti bassi e camini, il Mercato dei Venti tende e portici, i Giardini delle Lanterne pergolati e abbondanza di verde.

## Sequenza di lavoro proposta

| Passaggio | Contenuto | Verifica |
|---|---|---|
| 1. Piazza, ponte e ingresso al mercato | Tre famiglie architettoniche, materiale del suolo, primi piani e ombre di contatto. I nuovi volumi poggiano sulle impronte degli edifici esistenti. Soglie e interazioni restano nelle stesse posizioni logiche. | Inquadrature prima e dopo a mezzogiorno e di notte, con pari seme, ora, meteo e camera. Ponte e ingresso devono leggersi a distanza di gioco. |
| 2. Luce e vegetazione | Maschera ambientale alimentata dal calendario e zone di luce per lanterne, finestre e fornaci. Riflessi interrotti sul canale, foglie e chiome con piccoli cicli sfasati. | Controllare luce sul suolo, ombre ai piedi degli attori e leggibilità delle interazioni. Le animazioni ridotte devono conservare il contrasto. |
| 3. Personaggi, creature ed evoluzioni | Prova su un abitante, una creatura e due stadi della stessa linea evolutiva. Differenziare centro di massa, profilo e camminata. Estendere alle altre famiglie dopo la verifica alla scala reale. | Confrontare le sagome in movimento e in ombra. Coordinate ai piedi, ingombri, portata e tempi di gioco restano identici. |
| 4. Magia e combattimento | Migliorare per primi un fendente, un’abilità magica d’area e un attacco di boss. Separare visivamente preparazione, impatto e dissipazione. | In un combattimento notturno l’area di pericolo resta leggibile sopra particelle e bagliori. Durata degli avvisi, hitbox e danni coincidono con la build di riferimento. |
| 5. Interfaccia | Cornici leggere in rame e vetro, icone coerenti e gerarchia più chiara fra salute, abilità, mappa e interazioni. Riprendere la lingua visiva di Velaris mantenendo il DOM esistente. | Verificare contrasto, scorrimento, stati di focus e uso reale di tastiera, mouse e touch. Controllare a 1366×768 e 390×844. |

## Integrazione tecnica

- **Scena.** Aggiungere strati visivi al disegno attuale. `urban-exterior.js` e `urban-interiors.js` mantengono i dati di percorso, le porte, le collisioni e i semi. La base resta in `World.drawGround`, il disegno di oggetti e attori in `World.drawFront` con ordinamento in profondità. Il Canvas continua a usare pixel logici senza interpolazione.
- **Atmosfera ed effetti.** In `interface.js` la luce ambientale oggi tinge la scena dopo gli attori. Preparare una maschera Canvas riutilizzabile e applicarla prima degli avvisi di combattimento. Usare maschere di luce e ombre brevi precalcolate. `Game.drawFX` conserva la visibilità degli avvisi e la simulazione continua a decidere quando questi appaiono.
- **Sprite e HUD.** Estendere `ActorArt` in `sprites.js`, `expansion-art.js`, `continental-species.js` e `creature-art.js` (sprite dedicati, metodo in `GAME_DESIGN.md` §4.2) conservando le chiavi dei personaggi e delle forme. Le animazioni aggiungono pose di disegno mantenendo i tempi di attacco. Per l’interfaccia intervenire in `template.html`, `style.css` e nei pannelli, mantenendo scorciatoie ed etichette ARIA.
- **Prestazioni e compatibilità.** Riutilizzare le superfici Canvas, disegnare solo gli elementi visibili e limitare le fonti di luce dinamica a quelle vicine alla camera. La prova usa al massimo otto fonti attive e collega il movimento di acqua e luci all’opzione effetti esistente. Gli interventi grafici conservano la distribuzione offline in un unico HTML e il formato dei salvataggi di gioco.

## Condizioni di accettazione proposte

1. Registrare 30 secondi lungo lo stesso tragitto prima e dopo, su Edge con la stessa macchina e finestra. Confrontare mediana e 95º percentile dei tempi per fotogramma. La prova mira a contenere il 95º percentile entro il 10% del riferimento nella scena più densa.
2. Confrontare quattro acquisizioni fisse, una coppia diurna e una notturna. Controllare l’orientamento senza mappa fra piazza, ponte e mercato, la separazione fra personaggi e sfondo e la leggibilità degli avvisi di combattimento.
3. Ripetere ingresso e uscita da Velaris, interni e servizi, combattimento e riapertura di una partita precedente. Confrontare posizione, inventario, missioni e stato urbano dopo il salvataggio.

La prima prova rimane circoscritta a Velaris. Per la verifica effettiva e per riprendere il lavoro consulta [PROGRESS.md](PROGRESS.md).
