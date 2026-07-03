# Specifikace: AI Client (TanStack AI SDK + tools)

Status: Draft · Cíl: vývojový plán pro AI asistenta v aplikaci
Předpoklady: hotová datová vrstva ([`repository-layer.md`](./repository-layer.md))
a auth ([`auth-layer.md`](./auth-layer.md)) — tools běží server-side a jsou
scoped na přihlášeného uživatele.

## 0. Poznámka k SDK (ověřit před implementací)

V projektu **zatím není** žádný AI balík nainstalovaný a `@tanstack/*` v
`node_modules` AI SDK neobsahuje. **Přesný název balíku a API „TanStack AI SDK"
je nutné potvrdit z aktuální dokumentace** (instalace, název chat/stream helperu,
tvar definice tools, React hook) **před psaním kódu**. Tato spec je psaná
konceptuálně — tvar tools, hranice server/klient a integrace na repozitáře platí
nezávisle na finálním API; konkrétní importy se doplní po ověření.

> Pokud by se TanStack AI SDK ukázal jako nevhodný/nedostupný, fallback je
> Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) se stejnou architekturou tools.

## 1. Cíl a rozsah

AI asistent, který uživateli pomáhá pracovat s tréninkovými plány přirozeným
jazykem — vyhledat plán, založit/upravit plán, spustit trénink, shrnout pokrok.
LLM volá **tools** napojené na existující server functions / repozitáře.

### V rozsahu

- Server-side chat endpoint se **streamováním** odpovědí.
- Sada **tools** (function calling) napojených na app: CRUD plánů, spuštění
  tréninku, souhrny.
- Klientský chat UI (route + komponenta) s tool-call vizualizací.
- Scoping na přihlášeného uživatele (`requireAuth`).

### Mimo rozsah (zatím)

- Perzistence historie konverzací do DB (návrh otevřený — §9).
- Hlasový vstup, generování obrázků.
- Multi-agent / dlouhodobá paměť.

## 2. Klíčová rozhodnutí

| Oblast         | Volba                                             | Důvod                                                                   |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Model provider | **Claude** (Anthropic)                            | Pokyn projektu: pro AI aplikace default nejnovější Claude.              |
| Default model  | **`claude-opus-4-8`**                             | Nejschopnější; pro levnější cesty zvážit `claude-haiku-4-5`.            |
| Běh            | **server-only** (server route / server fn)        | API klíč nikdy do klienta; tools potřebují DB a auth context.           |
| Přenos         | **streaming** (SSE / ReadableStream)              | Plynulé tokeny + průběžné tool-call eventy.                             |
| Tools          | **server-side execute**, vstup validovaný **Zod** | Tools sahají na repozitáře pod `requireAuth`; nikdy ne přímo z klienta. |
| Secret         | `ANTHROPIC_API_KEY` z env, fail-fast              | Mimo git, jen na serveru.                                               |

## 3. Architektura

```
Klient (chat UI)
  │  POST /api/chat  (zprávy konverzace)
  ▼
Server chat endpoint  ──►  AI SDK runtime (Claude)
  │                              │  model si vyžádá tool call
  │                              ▼
  │                         tool.execute()  ──►  server fn / repository
  │                              │  (scoped: context.user)
  ▼                              ▼
streamovaná odpověď  ◄──  výsledek toolu vrácen modelu → finální text
```

- Endpoint jako **server route** (`server` na `createFileRoute`) nebo
  `createServerFn` se streamem — rozhodnout dle API SDK (§0). Guidance:
  `npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-routes`
  a `#start-core/server-functions`.
- Endpoint je obalený auth middleware → `context.user`; bez usera 401.
- Tools dostávají `context.user` (closure / per-request factory), aby operace
  byly scoped na vlastníka. **Nikdy** neposílat ownerId z klienta.

## 4. Tools (návrh)

Každý tool = `{ name, description, inputSchema (Zod), execute(input, ctx) }`.
`execute` volá existující repozitáře/server functions, vrací serializovatelný
výsledek. Popisy píšeme **pro model** (jasné, kdy tool použít).

| Tool             | Vstup (Zod)                                         | Akce / mapping                                                                  |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `list_plans`     | `{}`                                                | `planRepository.list()` pro `ctx.user` → názvy, id, daysPerWeek, počet aktivit. |
| `get_plan`       | `{ planId }`                                        | `planRepository.getById` → plán vč. aktivit; `null` ošetřit hláškou.            |
| `create_plan`    | `{ name, description?, daysPerWeek, activities[] }` | `planRepository.create` (owner = `ctx.user`). Vrátí vytvořený plán.             |
| `update_plan`    | `{ planId, patch }`                                 | `planRepository.update`; NotFound → srozumitelná chyba pro model.               |
| `delete_plan`    | `{ planId }`                                        | `planRepository.remove`. **Destruktivní** → vyžádat potvrzení (§6).             |
| `add_activity`   | `{ planId, activity }`                              | Vloží aktivitu na konec/pozici.                                                 |
| `start_workout`  | `{ planId }`                                        | Vrátí strukturu plánu připravenou ke spuštění timeru; spuštění řeší klient.     |
| `summarize_plan` | `{ planId }`                                        | Spočítá celkový čas, počet cviků/restů, dní v týdnu → krátký souhrn.            |

Pravidla:

- Vstup vždy validovaný Zod schématem (sdílet se schématy z `db/validation.ts`).
- `execute` je **idempotentní kde to jde** a vrací strukturovaný výsledek, ne jen
  text — model si formuluje odpověď sám.
- Chyby (NotFound, validace) vracet jako čitelný objekt, ne výjimku do streamu.
- Destruktivní tools (`delete_plan`, příp. `update_plan`) → human-in-the-loop
  potvrzení před vykonáním (§6).

## 5. Klientské UI

- Route `src/routes/assistant.tsx` (pod `_authenticated`) s chat panelem.
- Komponenta `src/components/Chat.tsx`: seznam zpráv, stream rendering, indikace
  „tool je volán", vstupní pole. Použít React hook z AI SDK (název ověřit, §0).
- Tool-cally vizualizovat (např. „📋 načítám plány…", „✅ plán vytvořen").
- `start_workout` výsledek napojit na existující timer v `index.tsx` (navigace
  s předvybraným plánem).

## 6. Bezpečnost a kontrola

- `ANTHROPIC_API_KEY` jen na serveru; klient nikdy nevidí klíč ani system prompt.
- Endpoint pod `requireAuth`; všechny tools scoped na `ctx.user`.
- **Destruktivní operace** (`delete_plan`): model navrhne, klient potvrdí
  (confirmation step) — neexekuovat naslepo.
- Rate limiting na chat endpoint (zneužití = náklady).
- Velikost vstupu/historie omezit (truncation / limit zpráv) kvůli nákladům.
- Tools nikdy nevrací `passwordHash` ani cizí data (repozitář to už chrání).
- Prompt injection: tools mají úzké schéma a server-side autorizaci; model nemůže
  obejít `ctx.user` scoping.

## 7. Struktura souborů

```
src/
  ai/
    client.ts          # konfigurace AI SDK + Claude provider (server-only)
    system-prompt.ts   # system prompt asistenta
    tools/
      index.ts         # registr tools (factory s ctx.user)
      plans.ts         # list/get/create/update/delete/add_activity/summarize
      workout.ts       # start_workout
    tools.test.ts
  server/
    chat.ts            # streamovaný chat endpoint (server route / server fn)
  components/
    Chat.tsx
  routes/
    assistant.tsx      # pod _authenticated
```

## 8. Plán implementace (kroky)

1. **Ověřit SDK** (§0) — potvrdit balík, instalace, API (chat/stream, tool tvar,
   React hook). Nainstalovat AI SDK + Anthropic provider.
2. **Env** — `ANTHROPIC_API_KEY` (fail-fast), mimo git.
3. **AI klient** — `src/ai/client.ts`, default `claude-opus-4-8`, system prompt.
4. **Tools (read-only)** — `list_plans`, `get_plan`, `summarize_plan` +
   Zod schémata; factory s `ctx.user`.
5. **Tools (mutace)** — `create_plan`, `update_plan`, `add_activity`,
   `delete_plan` (s confirmation flagem), `start_workout`.
6. **Testy tools** — execute proti temp SQLite + fake user, vč. scoping a
   NotFound. Mockovat jen LLM, ne repozitáře.
7. **Chat endpoint** — `src/server/chat.ts`, streaming, `requireAuth`,
   registrace tools, rate limit.
8. **Chat UI** — `assistant.tsx` + `Chat.tsx`, stream + tool-call vizualizace.
9. **Napojení timeru** — `start_workout` → navigace do `index.tsx` s plánem.
10. **Verifikace** — `/verify`: lint, `tsc --noEmit`, test, build.

## 9. Akceptační kritéria

- Uživatel vede konverzaci; asistent odpovídá **streamovaně**.
- Model umí přes tools vyjmenovat, načíst, vytvořit, upravit a (po potvrzení)
  smazat plán — vše scoped na přihlášeného uživatele.
- API klíč ani system prompt nejsou v klientském bundlu.
- Vstupy tools validované Zod; chyby vrácené modelu čitelně, ne jako pád streamu.
- Destruktivní operace vyžaduje potvrzení.
- `start_workout` spustí trénink ve stávajícím timeru.
- `tsc --noEmit`, lint, test, build zelené.

## 10. Otevřené otázky

- **Přesné API TanStack AI SDK** — potvrdit (§0); jinak fallback Vercel AI SDK.
- Perzistence historie konverzací do SQLite (tabulka `conversations`/`messages`)
  vs. jen klientský stav — rozhodnout dle požadavku na kontinuitu.
- Model routing: kdy `opus-4-8` vs. `haiku-4-5` (náklady vs. kvalita).
- Confirmation UX pro destruktivní tools: server-side pause + resume, nebo
  klientský dvoukrok.
- Limit historie / context window strategie (sumarizace starých zpráv).
- Rate limiting sdílet s auth limiterem, nebo samostatný (náklady na tokeny).
