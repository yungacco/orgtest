# Benessere

App personale di benessere e organizzazione: **peso**, **ricette e menù**,
**task** e **diario**, in italiano, che funziona sul telefono come
un'applicazione vera e sul computer come un sito.

I dati sono tuoi e stanno in un database che crei tu (gratuito): nessun altro
può leggerli, nemmeno chi conosce l'indirizzo del sito.

---

## Indice

- [Che cosa fa](#che-cosa-fa)
- [Prima di iniziare](#prima-di-iniziare)
- [Passo 1 — Crea il database su Supabase](#passo-1--crea-il-database-su-supabase)
- [Passo 2 — Crea le tabelle](#passo-2--crea-le-tabelle)
- [Passo 3 — Sistema gli indirizzi di ritorno](#passo-3--sistema-gli-indirizzi-di-ritorno)
- [Passo 4 — Copia le due chiavi su GitHub](#passo-4--copia-le-due-chiavi-su-github)
- [Passo 5 — Controlla il nome del repository](#passo-5--controlla-il-nome-del-repository)
- [Passo 6 — Accendi GitHub Pages](#passo-6--accendi-github-pages)
- [Passo 7 — Primo accesso](#passo-7--primo-accesso)
- [Passo 8 — Installa l'app sul telefono](#passo-8--installa-lapp-sul-telefono)
- [Come si usa](#come-si-usa)
- [Backup dei dati](#backup-dei-dati)
- [Se qualcosa non funziona](#se-qualcosa-non-funziona)
- [Per chi vuole modificare il codice](#per-chi-vuole-modificare-il-codice)
- [Scelte fatte e loro motivo](#scelte-fatte-e-loro-motivo)

---

## Che cosa fa

**Peso e progressi**
- inserimento rapido del peso, con data modificabile per registrare giorni passati
- percentuale di massa grassa e nota, entrambe facoltative
- grafico con filtri 7 giorni / 30 giorni / 3 mesi / 1 anno / tutto
- media mobile a 7 giorni disegnata sul grafico
- peso attuale, variazione su settimana e mese, minimo e massimo, indice di massa corporea
- obiettivo di peso come linea tratteggiata, con i chili che mancano e la
  stima di quando lo raggiungerai al ritmo attuale

**Ricette e menù**
- ricettario con foto, categoria, tag, tempo, difficoltà, ingredienti,
  procedimento e valori nutrizionali per porzione
- le foto vengono rimpicciolite dal telefono prima di essere caricate
- ricerca per nome, ingrediente o tag e filtri per categoria e tag
- generatore di menù casuale: scegli da 1 a 14 giorni e quali pasti; puoi
  ri-tirare un singolo pasto, bloccarne uno che ti piace e salvare tutto nel
  calendario settimanale
- lista della spesa creata dagli ingredienti del piano, con le quantità
  sommate, le voci da spuntare e la possibilità di copiarla o condividerla

**Task**
- priorità, note, scadenza e categoria
- completando una task questa esce dalla lista con un'animazione e finisce in
  archivio; per qualche secondo puoi annullare
- task ricorrenti (ogni giorno / settimana / mese): al completamento viene
  creata da sola la prossima
- riordino trascinando le righe
- archivio separato con ricerca, filtro per periodo, ripristino ed eliminazione

**Diario e abitudini**
- nota giornaliera con salvataggio automatico e umore su cinque faccine
- calendario che segnala i giorni compilati
- abitudini con spunta giornaliera, serie attuale, record e heatmap in stile
  GitHub degli ultimi mesi

**Impostazioni**
- nome, altezza, unità di misura (kg/lb, cm/in)
- obiettivo di peso e obiettivo calorico
- tema chiaro / scuro / automatico e sei colori d'accento
- gestione dei tag delle ricette e delle categorie delle task
- promemoria, backup completo in un file, eliminazione totale dei dati,
  cambio password

---

## Prima di iniziare

Ti servono due cose, entrambe **gratuite**, e circa **20 minuti**:

1. un account **GitHub** (dove sta questo codice e dove verrà pubblicato il sito);
2. un account **Supabase** (dove staranno i tuoi dati).

Non serve installare niente sul computer: si fa tutto dal browser.

> **Nota sui nomi**: in questa guida `<tuo-utente>` è il tuo nome utente
> GitHub e `<nome-repo>` è il nome di questo repository. Se non li hai
> cambiati, il tuo sito finirà su
> `https://<tuo-utente>.github.io/<nome-repo>/`.

---

## Passo 1 — Crea il database su Supabase

1. Vai su [supabase.com](https://supabase.com) e premi **Start your project**.
   Puoi accedere direttamente con il tuo account GitHub.
2. Premi **New project**.
3. Compila:
   - **Name**: `benessere` (o quello che preferisci)
   - **Database Password**: premi **Generate a password** e **salvala** da
     qualche parte. Non ti servirà per usare l'app, ma perderla è una
     seccatura.
   - **Region**: scegli quella più vicina a te (per l'Italia va bene
     *Frankfurt* o *Milan* se disponibile).
4. Premi **Create new project** e aspetta un paio di minuti: Supabase sta
   preparando il database.

---

## Passo 2 — Crea le tabelle

1. Nel menu a sinistra apri **SQL Editor**.
2. Premi **New query**.
3. Apri il file [`supabase/schema.sql`](supabase/schema.sql) di questo
   repository, **copia tutto** il contenuto e incollalo nel riquadro.
4. Premi **Run** (in basso a destra, oppure `Ctrl` + `Invio`).
5. Deve comparire un messaggio verde tipo **Success. No rows returned**.

Questo comando crea tutte le tabelle, gli indici, le regole di sicurezza e lo
spazio dove finiranno le foto delle ricette. Puoi rieseguirlo quante volte
vuoi: non cancella niente di quello che hai già inserito.

> **Che cosa sono le "regole di sicurezza"?** Si chiamano *Row Level
> Security*. Dicono al database: «ogni utente può leggere e scrivere solo le
> righe che gli appartengono». Sono attive su tutte le tabelle. Anche se
> qualcuno leggesse la chiave pubblica dentro il sito (cosa normale e
> prevista), non potrebbe vedere i tuoi dati.

---

## Passo 3 — Sistema gli indirizzi di ritorno

Serve perché i link che ricevi via email (conferma dell'account e recupero
password) devono riportarti sulla **tua** app.

1. Sempre su Supabase, menu a sinistra: **Authentication** → **URL
   Configuration**.
2. In **Site URL** scrivi l'indirizzo del tuo sito:
   `https://<tuo-utente>.github.io/<nome-repo>/`
3. In **Redirect URLs** premi **Add URL** e aggiungi:
   - `https://<tuo-utente>.github.io/<nome-repo>/**`
   - `http://localhost:5173/**` (serve solo se proverai l'app sul computer)
4. Salva.

**Facoltativo ma comodo se l'app la usi solo tu**: in **Authentication** →
**Sign In / Providers** → **Email** puoi disattivare *Confirm email*. Così al
primo accesso entri subito, senza aspettare l'email di conferma. Se lo lasci
attivo va benissimo lo stesso: riceverai un'email con un link da aprire.

---

## Passo 4 — Copia le due chiavi su GitHub

Adesso bisogna dire all'app **a quale database collegarsi**.

### 4a. Trova i due valori su Supabase

Menu a sinistra: **Project Settings** (l'ingranaggio) → **API** (in alcune
versioni si chiama **Data API** / **API Keys**). Ti servono:

| Cosa copiare | Come si chiama su Supabase |
|---|---|
| L'indirizzo del progetto | **Project URL** (assomiglia a `https://abcdefgh.supabase.co`) |
| La chiave pubblica | **anon public** (una stringa lunghissima) |

> ⚠️ **Non copiare mai** la chiave `service_role`: quella dà accesso completo
> al database e non deve finire in un sito.

### 4b. Incollali su GitHub

1. Vai sulla pagina di questo repository su GitHub.
2. **Settings** (in alto) → nel menu a sinistra **Secrets and variables** →
   **Actions**.
3. Premi **New repository secret** e crea il primo:
   - **Name**: `VITE_SUPABASE_URL`
   - **Secret**: l'indirizzo del progetto copiato sopra
   - **Add secret**
4. Premi di nuovo **New repository secret** e crea il secondo:
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Secret**: la chiave *anon public*
   - **Add secret**

I nomi devono essere **esattamente** quelli scritti sopra, maiuscole comprese.

---

## Passo 5 — Controlla il nome del repository

GitHub Pages pubblica il sito dentro una sottocartella che ha il nome del
repository. L'app deve saperlo.

Apri il file [`vite.config.ts`](vite.config.ts): nelle prime righe trovi

```ts
const REPO_NAME = '/orgtest/'
```

Se il tuo repository si chiama diversamente, cambia questa riga mettendo il
nome giusto **fra due barre** (per esempio `'/benessere/'`) e salva. Puoi
farlo direttamente da GitHub: apri il file, premi la matita ✏️, modifica e
premi **Commit changes**.

---

## Passo 6 — Accendi GitHub Pages

1. Sul repository: **Settings** → menu a sinistra **Pages**.
2. Alla voce **Source** scegli **GitHub Actions**.
3. Vai nella scheda **Actions** (in alto), apri il workflow
   *Pubblica su GitHub Pages* e premi **Run workflow** → **Run workflow**.
   (In alternativa parte da solo al primo salvataggio di un file.)
4. Aspetta due o tre minuti: quando il pallino diventa verde ✅ il sito è
   online su `https://<tuo-utente>.github.io/<nome-repo>/`.

Da adesso in poi **ogni modifica al codice ripubblica il sito da sola**.

---

## Passo 7 — Primo accesso

1. Apri l'indirizzo del tuo sito.
2. Premi **Registrati**, scrivi nome, email e una password di almeno 6
   caratteri.
3. Se hai lasciato attiva la conferma via email, apri il link che ricevi
   (controlla anche lo spam) e poi torna sull'app.
4. Vai in **Impostazioni** e imposta almeno altezza e obiettivo di peso:
   servono per le statistiche.

L'app è tua e vuota: aggiungi il primo peso, la prima ricetta, le tue
abitudini.

---

## Passo 8 — Installa l'app sul telefono

Non serve nessun negozio di applicazioni.

**iPhone / iPad (Safari)**
1. Apri l'indirizzo del sito **con Safari** (non funziona da Chrome su iOS).
2. Premi il pulsante *Condividi* (il quadrato con la freccia in su).
3. Scorri e scegli **Aggiungi a Home**.
4. Premi **Aggiungi**: trovi l'icona con la foglia verde fra le tue app.

**Android (Chrome)**
1. Apri l'indirizzo del sito.
2. Premi i tre puntini in alto a destra.
3. Scegli **Installa app** (oppure *Aggiungi a schermata Home*).

Una volta installata si apre a schermo intero come un'app normale e, se sei
senza connessione, mostra comunque gli ultimi dati che aveva sincronizzato.

---

## Come si usa

- Sul **telefono** hai la barra in basso con Home, Peso, Ricette, Task e
  Diario; le impostazioni sono nell'ingranaggio in alto a destra. Il pulsante
  verde **+** in basso inserisce al volo la cosa più utile della pagina in cui
  ti trovi (e dalla Home apre un menu con le quattro azioni rapide).
- Sul **computer** hai la barra laterale fissa con anche *Piano pasti*,
  *Lista della spesa* e *Archivio task*, e le pagine usano più colonne.
- Nelle liste (misurazioni del peso, archivio) puoi **trascinare una riga
  verso sinistra** per far comparire i pulsanti Modifica ed Elimina.
- Le task attive si riordinano trascinando la maniglia a sinistra.

---

## Backup dei dati

In **Impostazioni → I tuoi dati**:

- **Esporta tutto** scarica un file `.json` con tutto quello che hai
  registrato. Tienilo da parte ogni tanto, è la tua copia di sicurezza.
- **Importa un backup** rimette i dati di quel file nel tuo account (anche in
  un account nuovo).
- **Elimina tutto** cancella pesi, ricette, foto, task, diario e abitudini.
  Chiede una doppia conferma: devi scrivere la parola `ELIMINA`.

Le foto delle ricette non entrano nel file di backup (sarebbe enorme):
restano nello spazio di archiviazione di Supabase.

---

## Se qualcosa non funziona

**Il sito mostra "Manca la configurazione"**
I due segreti su GitHub non sono stati letti. Controlla che si chiamino
esattamente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, poi vai in
**Actions** e rilancia il workflow *Pubblica su GitHub Pages*: i segreti
vengono inseriti quando il sito viene ricostruito, non dopo.

**Il sito è tutto bianco oppure dice 404**
Quasi sempre è il nome del repository sbagliato in `vite.config.ts`
(vedi [Passo 5](#passo-5--controlla-il-nome-del-repository)). Deve
corrispondere al nome che vedi nell'indirizzo di GitHub.

**"Il database non è ancora stato configurato"**
Manca il [Passo 2](#passo-2--crea-le-tabelle): esegui `supabase/schema.sql`
nell'SQL Editor.

**"Email o password non corretti"**
Se ti sei appena registrato e hai lasciato attiva la conferma via email,
devi prima aprire il link ricevuto.

**Il link per la password non funziona**
Va aperto **sullo stesso browser** da cui l'hai richiesto e l'indirizzo del
sito deve essere fra i *Redirect URLs* di Supabase
([Passo 3](#passo-3--sistema-gli-indirizzi-di-ritorno)).

**Le foto delle ricette non si vedono**
Riesegui `supabase/schema.sql`: crea lo spazio (`bucket`) chiamato `ricette`
e i relativi permessi.

**I promemoria non arrivano**
Sono notifiche del browser: devi dare il permesso in Impostazioni e l'app
deve restare aperta (anche solo in una scheda in secondo piano). Se chiudi
del tutto l'app quel giorno non partono: non c'è nessun server che le invii
al posto tuo.

**Ho aggiornato l'app ma vedo la versione vecchia**
L'app si aggiorna da sola alla riapertura successiva. Per forzare: chiudila
del tutto e riaprila, oppure ricarica la pagina.

---

## Per chi vuole modificare il codice

### Provare l'app sul proprio computer

Serve [Node.js](https://nodejs.org) versione 20 o successiva.

```bash
# 1. scarica il codice
git clone https://github.com/<tuo-utente>/<nome-repo>.git
cd <nome-repo>

# 2. installa le librerie
npm install

# 3. crea il file con le chiavi
cp .env.example .env
#    apri .env e incolla i due valori presi da Supabase

# 4. avvia
npm run dev
```

L'app si apre su `http://localhost:5173/<nome-repo>/`.

Altri comandi utili:

| Comando | Cosa fa |
|---|---|
| `npm run dev` | avvia in sviluppo, con ricarica automatica |
| `npm run build` | compila il sito pronto per la pubblicazione |
| `npm run preview` | mostra il risultato di `build` in locale |
| `npm run typecheck` | controlla i tipi TypeScript |
| `npm run lint` | controlla lo stile del codice |
| `node scripts/generate-icons.mjs` | rigenera le icone della PWA |

### Com'è organizzato

```
src/
├── components/
│   ├── layout/          guscio dell'app (sidebar, barra in basso, logo)
│   └── ui/              mattoncini riusabili (pulsanti, campi, modali, toast…)
├── features/            una cartella per funzionalità
│   ├── auth/            accesso, registrazione, recupero password
│   ├── dashboard/       la home con il riepilogo
│   ├── weight/          peso, grafico, statistiche
│   ├── recipes/         ricettario e foto
│   ├── mealplan/        generatore di menù e calendario settimanale
│   ├── shopping/        lista della spesa
│   ├── tasks/           task, archivio, ricorrenze
│   ├── journal/         diario, umore, abitudini
│   ├── settings/        profilo, aspetto, promemoria, backup
│   └── quickadd/        il pulsante flottante "+"
├── lib/                 utilità (Supabase, date e numeri italiani, unità…)
├── providers/           autenticazione e tema
└── types/               i tipi TypeScript condivisi
```

Dentro ogni funzionalità:

- `api.ts` — le sole funzioni che parlano con il database
- `hooks.ts` — la cache e gli aggiornamenti ottimistici (React Query)
- i file `.tsx` — i componenti, che non conoscono Supabase

Così cambiare il modo di salvare i dati non tocca l'interfaccia, e viceversa.

### Tecnologie

React 18 · TypeScript · Vite · Tailwind CSS · React Router (HashRouter) ·
Recharts · lucide-react · Framer Motion · dnd-kit · TanStack Query ·
Supabase (Auth, Postgres, Storage) · vite-plugin-pwa · GitHub Actions

---

## Scelte fatte e loro motivo

Dove la richiesta lasciava spazio a interpretazioni, ho scelto l'opzione più
semplice da usare. Le annoto qui:

1. **Barra in basso a cinque voci.** Le sezioni principali sono Home, Peso,
   Ricette, Task e Diario. Le Impostazioni sono nell'ingranaggio in alto (e
   nella barra laterale su computer): sei voci in fondo sarebbero state
   troppo strette per un dito su uno schermo da 375 px. *Piano pasti*, *Lista
   della spesa* e *Archivio* sono raggiungibili dalla Home, dalla barra
   laterale e dai pulsanti delle rispettive sezioni.
2. **Pesi sempre in chilogrammi, altezze in centimetri.** Le libbre e i
   pollici sono solo un modo di *mostrare* i dati: cambiando unità non si
   riscrive niente nel database e i valori storici restano corretti.
3. **Foto in uno spazio privato.** Le immagini delle ricette non sono
   pubbliche: l'app genera per te un link temporaneo (un'ora) ogni volta che
   deve mostrarle. Costa una richiesta in più, ma nessuno può indovinare
   l'indirizzo di una tua foto.
4. **La lista della spesa somma solo unità uguali.** «200 g di farina» +
   «100 g di farina» diventa «300 g di farina», mentre «2 cucchiai di olio» e
   «50 ml di olio» restano due righe: sommarli darebbe un numero senza senso.
   Le quantità sono quelle scritte nella ricetta, non vengono moltiplicate
   per il numero di porzioni.
5. **Il menù non lascia buchi.** Se per un pasto non hai ricette della
   categoria giusta, il generatore pesca dalle altre; se hai poche ricette
   può ripeterle anche prima della distanza che hai scelto. Meglio un piano
   completo che uno con caselle vuote.
6. **Il diario si salva da solo** un secondo dopo che smetti di scrivere:
   niente pulsante "Salva" da ricordarsi.
7. **La serie di un'abitudine non si spezza a mezzogiorno.** Se oggi non hai
   ancora spuntato, la serie viene contata fino a ieri: si interrompe solo
   saltando un giorno intero.
8. **I promemoria sono locali.** Notifiche del browser mentre l'app è aperta,
   senza server e senza abbonamenti. È il compromesso onesto per un'app che
   sta interamente su GitHub Pages.
9. **La cache viene salvata nel browser.** Riaprendo l'app senza connessione
   vedi gli ultimi dati sincronizzati invece di una schermata d'errore;
   appena torna la rete si aggiorna da sola.
10. **Il backup non include le foto.** Un file JSON con le immagini dentro
    diventerebbe pesantissimo e difficile da gestire.
