# PROGRESS.md — Stato del progetto

> Ultimo aggiornamento 2026-11-21, Codex, prima fase del Mega City Overhaul.

## In corso
_Nessuna modifica in corso._

## Prossimo passo
1. Aprire un branch dalla versione corrente di `main` per la **fase 2** del [piano ufficiale](MEGA_CITY_OVERHAUL.md). Estendere il contrasto visivo tra il Mercato dei Venti e i Giardini delle Lanterne e facilitare l’orientamento con segnaletica e mappa. Partire da `urban-exterior.js`, `urban-world.js` e dal [piano grafico](PIANO_GRAFICO.md).
2. Verificare l’affollamento nei punti di sosta. A mezzogiorno alcuni residenti si sovrappongono nella piazza. Distribuire le soste su punti percorribili in `urban-life.js` e verificare accesso agli abitanti, orari e commissioni prima di ampliare la popolazione.
3. Per la **fase 3** il banco di Velaris riceve già prodotti locali e merci di commissione. Riutilizzare le scorte persistenti e il mercato condiviso con la Selva. Restano da collegare altre filiere, richieste individuali, eventi e servizi.

## Versione e stato generale
- **Aggiornamento 5 · Velaris**, salvataggio **v7** con migrazione da v1 a v6.
- `Reincarnation.html` è il prodotto offline. La build integrata coincide byte per byte con una ricostruzione indipendente dei sorgenti.
- Il commit iniziale di GitHub `3f72b69` usava il formato v5 e includeva parti dell’Aggiornamento 4. L’integrazione è partita da quel commit in un branch separato. Prima dell’intervento sono stati conservati un bundle Git e un archivio della v6 e di Velaris.
- La fase 1 parte da `875ac74` sul branch `codex/mega-city-fase-1`. Il piano ufficiale conserva il brief originale in 18 sezioni e aggiunge criteri di verifica e passaggio di consegne fra modelli.

## Funzionalità implementate
La tabella elenca i sistemi disponibili. La sezione seguente indica le verifiche eseguite sulla build integrata.

| Area | Stato | Moduli |
|---|---|---|
| Mondo di Lùmora, cinque continenti, Cripta delle Soglie e campagna | ✅ | `world.js`, `expansion-world.js`, `continents.js` |
| Velaris, quattro quartieri, sette interni e servizi interattivi | ✅ | `urban-exterior.js`, `urban-interiors.js`, `urban-world.js`, `urban-services.js`, `urban-life.js` |
| Piazza e ponte centrale di Velaris con intarsi, riflessi e lanterne governate dal calendario | ✅ | `urban-exterior.js` |
| Rifornimento del Mercato di Velaris dai mestieri all’alba e dalle commissioni consegnate | ✅ | `urban-life.js`, `trade-economy.js`, `economy-panel.js` |
| 44 stirpi, rami evolutivi, predisposizioni, innate, metamorfosi | ✅ | `engine.js`, `expansion-species.js`, `continental-species.js`, `growth.js` |
| Arte pixel procedurale (sprite, forme evolute, ritratti, icone) | ✅ | `sprites.js`, `expansion-art.js`, `legendary-land.js` |
| Combattimento, tecniche, fusioni (K), boss a fasi | ✅ | `engine.js` |
| Combattimento adattivo dei boss | ✅ | `adaptive-combat.js` |
| Campagna "Dal Borgo al Varco" (Orveth, Cava, 3 guardiani, epilogo) | ✅ | `engine.js`, `world-life.js` |
| Inventario esatto (BigInt), deposito | ✅ | `inventory.js`, `life-panels.js` |
| Calendario persistente, sonno, stagioni, bisogni | ✅ | `calendar.js`, `daily-life.js` |
| Mestieri con minigiochi (pesca, forgia, agricoltura, allevamento, cucina) e ricettario | ✅ | `trades-practice.js`, `tradecraft.js`, `practice-panel.js` |
| Mercati regionali, 4 valute, banca (5 sportelli) | ✅ | `trade-economy.js`, `economy-panel.js` |
| Abitanti, memorie, accordi, famiglia | ✅ | `society.js` |
| Costruzione su lotti, proprietà | ✅ | `construction.js` |
| Gilda pubblica (rango F–S) e personale | ✅ | `guild.js` |
| Reputazione e titoli | ✅ | `reputation.js` |
| Equipaggiamento (rarità, durabilità, tempra, ascensione, incantamento) | ✅ | `gear.js`, `gear-panel.js` |
| Conflitti NPC, ferite, morte permanente, memoriali | ✅ | `npc-conflicts.js`, `npc-conflict-panel.js` |
| Santuario della Marea Muta, Nadir, Arma Divina, Eco della Rinascita | ✅ | `legendary-land.js`, `legendary.js` |
| Evento serale delle lanterne | ✅ | `lantern.js` |
| Audio sintetizzato dinamico | ✅ | `audio.js` |
| UI: HUD, pannelli, minimappa, touch, export/import salvataggi | ✅ | `interface.js`, `panels.js`, `template.html`, `style.css` |
| Build a file singolo | ✅ | `build.py` |

## Test e verifiche
### Mega City Overhaul, fase 1

- ✅ `node tests/verifica-integrazione.cjs`. Il test include ora quantità e prezzi dopo il rifornimento all’alba, acquisto, consegna, mancata duplicazione, riserva cittadina e ricaricamento delle scorte.
- ✅ Edge su Windows. Percorsi a piedi con i semi `18420` e `42`, quattro quartieri, sette interni, commissione, mercato, banca, Gilda, fucina e restauro, senza richieste di rete o errori JavaScript.
- ✅ Confronto geometrico per i semi `18420`, `42` e `4294967295`. Edifici, porte, 21 percorsi piazza-servizi e 582.429 verifiche di percorribilità coincidono con la base.
- ✅ Edge. Importati salvataggi nativi v5 di GitHub, v6 locale e v7 di Velaris. Verificati stirpe, posizione, quantità esatte, equipaggiamento usurato e restauro v7.
- ✅ Edge. Campagna fino all’epilogo, quattro boss della campagna, due evoluzioni Goblin, usura e riparazione di una lama importata dalla v5.
- ✅ Edge. Dopo il sonno in locanda il grano passa da 0 a 7 unità e da 7 a 5 Scintille. Acquisto dal pannello e salvataggio confermano 6 unità residue e 1 unità nello zaino.
- ✅ Giorno e notte su Edge a parità di seme, ora e camera. Nel confronto notturno a 1366×768, con quattro tratte fra piazza e mercato in 30 secondi per build, mediana 4,2 ms e 95º percentile 4,3 ms in entrambe le build. Misura relativa locale in Edge headless.
- ✅ Edge. Con effetti disattivati, luci e scena notturna restano leggibili a entrambe le inquadrature. L’acqua e i bagliori restano fissi.
- ✅ `node --check` su tutti i moduli e build indipendente con `python build.py` identica byte per byte.
- 🟡 Il tocco su dispositivo reale resta da provare.

### Integrazione precedente

- ✅ `node tests/verifica-integrazione.cjs`. Usa un Canvas simulato per verificare migrazione v5/v6, quantità esatte, equipaggiamento usurato, soccorso magico, sette interni e restauro persistente.
- ✅ `node --check` sui moduli JavaScript e ricostruzione indipendente con `python build.py`.
- ✅ Edge su Windows. Importati salvataggi prodotti dalle build archiviate v2, v3, v4, v5 precedente, v5 di GitHub, v6 e v7 di Velaris. Verificato anche un caso v1 ricostruito e il caricamento successivo in v7.
- ✅ Edge. Percorsa la campagna fino all’epilogo. Verificati evoluzioni, boss adattivi, cinque minigiochi, soccorso e morte degli NPC, rito e ricompensa unica del Santuario, successione di Nerav e conquista del trono.
- ✅ Edge. Verificati a piedi i collegamenti ai quattro quartieri e ai sette interni. Provati riposo, mercato, banca, fucina, missione della gilda, consegna cittadina e ricaricamento del restauro. Nessuna richiesta di rete durante la prova urbana.
- 🟡 Il collaudo in Edge è stato eseguito localmente. I test del browser restano da integrare nella suite condivisa.

## Problemi conosciuti
_Nessun bug confermato è stato registrato finora._ Rischi e debiti noti (non bug verificati):

| ID | Tipo | Descrizione |
|---|---|---|
| RISK-001 | ~~Debito~~ Risolto 2026-11-21 | Git inizializzato; la cronologia ufficiale è `git log`. |
| RISK-002 | Debito | Il test Node copre percorsi essenziali. I test in browser non hanno ancora un’esecuzione automatica condivisa. |
| RISK-003 | Debito | File molto grandi/densi (`engine.js` ~81 KB in ~1350 righe, `panels.js`, `interface.js`) difficili da modificare in sicurezza. |
| RISK-004 | Design | `World`/`ActorArt`/`EvolutionContent` sono ridefiniti da più moduli: l'ordine in `build.py` è critico. |
| RISK-005 | Contenuto | La prima espansione urbana riguarda Velaris. Le metropoli e gli altri limiti aperti sono elencati in `GAME_DESIGN.md` §7. |

Per ogni nuovo bug: aggiungi `BUG-NNN` con passi per riprodurlo, file sospetti e stato.

## Decisioni di design registrate
- Quantità di oggetti e denaro: `BigInt` internamente, decimali in JSON.
- Progressione delle squadre di gilda personale e dei processi lontani: avanza **solo con il gioco attivo**, su intervalli di calendario.
- Un solo file HTML autonomo offline come prodotto finale.
