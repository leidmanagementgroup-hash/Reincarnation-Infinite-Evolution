# AGENTS.md — Regole di sviluppo condivise

Questo file è la fonte unica delle regole per **ogni** assistente AI (Claude Code, OpenAI Codex, o altri) e per gli sviluppatori umani che lavorano su *Reincarnation — Infinite Evolution*. `CLAUDE.md` rimanda a questo file.

Lo sviluppo avviene in alternanza fra più intelligenze artificiali. Non c'è memoria fra una sessione e l'altra: **la documentazione nella cartella principale è la memoria del progetto**. Se non è scritta lì, per il prossimo agente non è mai successa.

---

## 1. Protocollo obbligatorio

### Prima di ogni intervento (LEGGERE)

Prima di toccare qualsiasi file, leggi nell'ordine:

1. `AGENTS.md` (questo file) — regole e convenzioni.
2. `PROGRESS.md` — stato attuale, lavoro in corso, problemi noti, test. **Controlla qui se il lavoro richiesto è già stato fatto o iniziato.**
3. `GAME_DESIGN.md` — architettura, meccaniche, sistemi, dati di salvataggio.
4. `ROADMAP.md` — priorità e cosa è già pianificato.
5. `CHANGELOG.md` — le ultime voci, per capire cosa è cambiato di recente e da chi.
6. `LEGGIMI.md` — guida per il giocatore (comandi, tabella dei moduli).

Poi leggi i file sorgente realmente coinvolti. Non ripetere lavoro già svolto e non reintrodurre problemi già risolti: se la documentazione e il codice discordano, **fidati del codice**, poi correggi la documentazione.

### Dopo ogni modifica (AGGIORNARE)

Al termine di ogni intervento, nello stesso turno di lavoro, aggiorna i file pertinenti:

| File | Quando aggiornarlo |
|---|---|
| `CHANGELOG.md` | **Sempre**, per ogni modifica a codice, dati, build o documentazione. Voce in cima, con data, autore (agente) e file toccati. |
| `PROGRESS.md` | Sempre: sposta le funzionalità fra "in corso" / "implementate", registra i test eseguiti e i risultati, aggiungi o rimuovi problemi noti, aggiorna la sezione "Prossimo passo". |
| `GAME_DESIGN.md` | Se cambiano meccaniche, sistemi, formato dei salvataggi, architettura, contenuti (stirpi, regioni, tecniche…). |
| `ROADMAP.md` | Se un obiettivo è completato, cambia priorità, o emergono nuove idee/debiti tecnici. |
| `LEGGIMI.md` | Se cambiano comandi, tasti, moduli, procedura di build o regole visibili al giocatore. |
| `AGENTS.md` | Solo se cambiano le regole di sviluppo o la procedura di lavoro. |

Un intervento non è concluso finché la documentazione non è allineata. Se non hai potuto eseguire un test o una verifica, **scrivilo esplicitamente** in `PROGRESS.md` invece di ometterlo.

### Passaggio di consegne

Termina ogni sessione lasciando in `PROGRESS.md` → *Prossimo passo* una nota sufficiente a un altro agente per riprendere subito: cosa è stato fatto, cosa resta, file in gioco, eventuali trappole. Lavoro lasciato a metà va dichiarato come tale, mai presentato come finito.

---

## 2. Il progetto in breve

- Gioco RPG fantasy a vista dall'alto, pixel art disegnata a runtime su Canvas, interfaccia in **italiano**.
- Tecnologia: **JavaScript vanilla** (nessun framework, nessun bundler, nessun `npm`), HTML/CSS, Web Audio. Build in **Python 3 standard library**.
- Il prodotto finale è un **unico file `Reincarnation.html`** autonomo (grafica, musica e logica incorporate), che funziona offline aprendolo in un browser.
- Salvataggio in `localStorage` del browser (chiave corrente `reincarnation.lumora.save.v7`) con export/import JSON e migrazione da v1 a v6.
- Dettagli completi: `GAME_DESIGN.md`.

## 3. Struttura dei file

Cartella principale (non esistono sottocartelle sorgente):

- `*.js` — moduli di gioco, ciascuno una IIFE che espone un oggetto globale su `window` (es. `window.World`, `window.Game`, `window.Inventory`).
- `template.html`, `style.css` — struttura e stile; `cover.webp` — copertina (incorporata in base64 dalla build).
- `build.py` — assembla tutto in `Reincarnation.html`. **L'ordine dei moduli nella tupla `MODULES` è l'ordine di caricamento e conta**: un modulo può usare solo i globali definiti da moduli precedenti (o accedervi in modo pigro a runtime).
- `Reincarnation.html` — **artefatto generato**. Non modificarlo a mano.
- `LEGGIMI.md` — guida per il giocatore e mappa dei moduli.
- `AGENTS.md`, `CLAUDE.md`, `GAME_DESIGN.md`, `PROGRESS.md`, `ROADMAP.md`, `CHANGELOG.md` — memoria condivisa fra gli agenti.
- `PIANO_GRAFICO.md` — proposta artistica e tecnica per il successivo intervento grafico, da approvare prima della sua applicazione.

## 4. Regole di sviluppo

### Codice
1. **Modifica i sorgenti, mai `Reincarnation.html`.** Dopo ogni modifica a `*.js`, `template.html`, `style.css`, `cover.webp` o `build.py`, ricostruisci: `python build.py Reincarnation.html`.
2. **Nuovo modulo = aggiornare `build.py`** (posizione corretta in `MODULES`) **e la tabella dei moduli in `LEGGIMI.md`** e in `GAME_DESIGN.md`.
3. **Rispetta lo stile esistente**: IIFE con `'use strict'`, esportazione tramite `window.Nome=`, nessuna dipendenza esterna, nessuna rete, nessun CDN. Il gioco deve restare 100% offline e in un solo file.
4. **Modifiche minime e mirate.** Non riformattare, rinominare o riorganizzare codice non toccato dal compito. I refactoring estesi vanno prima inseriti in `ROADMAP.md` e fatti come intervento dedicato.
5. **Retrocompatibilità dei salvataggi.** Ogni nuovo campo di stato deve avere un valore predefinito e una normalizzazione al caricamento. Non rompere i salvataggi esistenti. Se il formato cambia in modo incompatibile: incrementa `version`, aggiungi la nuova chiave in `saveKeys` mantenendo le vecchie per la migrazione, e documentalo in `GAME_DESIGN.md` e `CHANGELOG.md`.
6. **Quantità esatte.** Inventario, denaro e mercato usano `BigInt` internamente e decimali in JSON: non introdurre `Number` per grandezze che possono crescere senza limite.
7. **Determinismo.** Contenuti procedurali (scenari, scoperte, eventi) usano generatori con seme: non sostituirli con `Math.random()` dove oggi sono deterministici.
8. **Sicurezza HTML.** Il testo dinamico inserito nei pannelli va sempre passato dalle funzioni di escape (`esc`) già presenti nei moduli di interfaccia.
9. **Input e accessibilità.** Mantieni la parità tastiera/mouse/touch e le etichette ARIA esistenti.
10. **Nessun segreto, nessun file esterno.** Non aggiungere chiavi, tracciamento, dipendenze di rete o asset non originali.

### Contenuti e lingua
- Tutti i testi visibili al giocatore, i nomi dei luoghi, delle stirpi, delle tecniche e le voci di documentazione sono in **italiano**. Mantieni tono e terminologia del mondo di Lùmora/Vaelthoria.
- Nomi, personaggi, illustrazioni e musica sono originali: non copiare opere protette.
- Gli identificatori nel codice (variabili, chiavi di dati, id) restano in inglese, come oggi.

### Verifica
- Esegui `node tests/verifica-integrazione.cjs` per il controllo automatico senza dipendenze. Ricostruisci l'HTML, controlla la sintassi dei moduli toccati e, quando possibile, prova la funzione in un browser includendo il caricamento di un salvataggio esistente e la verifica della console.
- Registra in `PROGRESS.md` **cosa hai verificato davvero e come**, e cosa no.
- Se aggiungi test, descrivi in `PROGRESS.md` come eseguirli.

### Ambiente
- Piattaforma di sviluppo: Windows, shell PowerShell (Bash disponibile). Percorsi con barre normali nei comandi dove possibile.
- Python 3 e Node.js sono disponibili; il progetto non richiede installazioni di pacchetti.
- La cartella è un **repository Git** (branch `main`) collegato a un repository GitHub **privato** `Reincarnation-Infinite-Evolution`. Vedi §7.

## 5. Coordinamento fra agenti

- **Un solo agente scrive alla volta** sugli stessi file. Se `PROGRESS.md` indica un lavoro "in corso" su un file, non modificarlo senza averne capito lo stato.
- All'inizio di un intervento lungo, segna in `PROGRESS.md` → *In corso* cosa stai facendo e quali file tocchi; rimuovilo a lavoro concluso.
- Firma ogni voce di `CHANGELOG.md` con l'agente (`Claude`, `Codex`, `Umano`).
- Non cancellare informazioni dalla documentazione per "fare ordine": se sono obsolete, spostale in una sezione *Storico/Obsoleto* o rimuovile solo se verificato che sono false.
- In caso di dubbio su una decisione di design o sul perimetro del compito, scegli l'opzione più conservativa, annotala in `PROGRESS.md` e prosegui; chiedi all'utente solo per decisioni irreversibili o di direzione del gioco.

## 6. Formato delle voci

**CHANGELOG.md** (più recente in alto, formato *Keep a Changelog* semplificato):
```
## [AAAA-MM-GG] Titolo breve — Agente
### Aggiunto / Modificato / Corretto / Rimosso / Documentazione
- Descrizione concisa (file: `engine.js`, `panels.js`)
```

**PROGRESS.md**: tabelle e liste con stato `✅ completo`, `🟡 parziale`, `🔴 non iniziato`, `🐞 bug noto`. Ogni problema noto ha un identificatore stabile (`BUG-001`…) per poterlo citare altrove.

**Date**: formato ISO `AAAA-MM-GG`.

---

## 7. Git e GitHub (registro verificato degli aggiornamenti)

Git è la cronologia ufficiale e verificabile; i file `.md` ne sono il riassunto leggibile. Claude Code e Codex seguono entrambi questo protocollo.

### All'inizio di ogni sessione
1. `git status` e `git log --oneline -10`: se ci sono modifiche non committate che non sono tue, **non sovrascriverle**; capiscine l'origine (`git diff`) e segnalale in `PROGRESS.md`.
2. Se esiste il remoto: `git pull --ff-only` prima di lavorare, per ricevere il lavoro dell'altro agente. Se non è un fast-forward, fermati e chiedi all'utente.
3. Leggi la documentazione condivisa (§1) **e** confrontala con `git log`: l'ultimo commit deve corrispondere all'ultima voce di `CHANGELOG.md`. Se non corrisponde, il registro è in ritardo: riconcilialo prima di procedere.

### Dopo ogni intervento
1. Verifica (§4 «Verifica») e ricostruisci `Reincarnation.html` se hai toccato i sorgenti.
2. Aggiorna `CHANGELOG.md`, `PROGRESS.md` e gli altri file pertinenti (§1).
3. **Un commit per intervento logico**, che includa codice, `Reincarnation.html` ricostruito e documentazione aggiornata. Messaggio in italiano, imperativo, con prefisso: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`. Nel corpo indica l'agente (`Agente: Claude` / `Agente: Codex`) e cosa è stato verificato.
4. La voce di `CHANGELOG.md` riporta l'**hash breve del commit** (`git rev-parse --short HEAD`); poiché l'hash esiste solo dopo il commit, aggiungilo con un secondo commit `docs: registra hash <hash>` oppure scrivilo nella voce successiva. Un aggiornamento è considerato **verificato** solo se esiste un commit che lo contiene.
5. `git push` verso `origin main`. Se il push fallisce, segnalalo in `PROGRESS.md` come lavoro non pubblicato.

### Divieti
- Mai `git push --force`, `git reset --hard`, `git clean -fd`, riscrittura della cronologia pubblicata o cancellazione di branch senza richiesta esplicita dell'utente.
- Mai committare credenziali, token, chiavi, file `.env`, impostazioni locali degli assistenti, salvataggi personali o dati personali. Prima di ogni commit controlla `git status` e `git diff --staged`; il `.gitignore` è una rete di sicurezza, non un'autorizzazione.
- Mai committare codice che non si ricostruisce: `python build.py` deve riuscire e `Reincarnation.html` deve corrispondere ai sorgenti.
- Il repository è **privato**: non renderlo pubblico e non aggiungere collaboratori senza richiesta dell'utente.

### Più agenti
- Lavora su `main` finché c'è un solo agente attivo alla volta. Se due agenti devono lavorare in parallelo, usa branch separati (`claude/<tema>`, `codex/<tema>`) e unisci tramite l'utente.
- Autenticazione GitHub: gestita dall'utente sul proprio computer (GitHub CLI o Git Credential Manager). Non chiedere né memorizzare token nei file del progetto.
