# Specifikace: Repository Layer (SQLite + Drizzle)

Status: Draft · Cíl: vývojový plán pro datovou vrstvu

## 1. Motivace

Přístup k datům je dnes rozprostřený přímo v komponentách. `src/utils/plans.ts`
vystavuje `getStoredPlans()` / `saveStoredPlans()` nad `localStorage` a volající
(`src/routes/admin.tsx`, `src/routes/index.tsx`) si sami skládají CRUD —
přepisují celé pole plánů, generují `id` přes `Math.random()`, serializují JSON
a řeší SSR guard. Žádná validace, žádná hranice perzistence.

Tato iterace odstraňuje `localStorage` jako úložiště plánů a zavádí **serverovou
relační databázi (SQLite)** s repository vrstvou nad ní.

## 2. Klíčová rozhodnutí

| Oblast            | Volba                                                  | Důvod                                                                                                                                     |
| ----------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Databáze          | **SQLite**                                             | Jednosouborová, zero-config, ideální pro single-node app.                                                                                 |
| Driver            | **better-sqlite3**                                     | Synchronní, stabilní, nativní Node. Migrace na libSQL/Turso možná později.                                                                |
| ORM               | **Drizzle ORM**                                        | Lehké, SQL-first, špičkové TS inference bez codegenu; přirozeně sedí k TanStack Start.                                                    |
| Migrace           | **drizzle-kit**                                        | Generování + aplikace migrací ze schématu.                                                                                                |
| Validátor         | **Zod + drizzle-zod**                                  | Zod je nativní pro TanStack (server-fn validátory, `validateSearch`). `drizzle-zod` odvodí schémata přímo z tabulek → jeden zdroj pravdy. |
| Přístup z klienta | **TanStack Start server functions** (`createServerFn`) | SQLite běží jen na serveru; klient nesmí mít přímý přístup k DB.                                                                          |

> Alternativy zvážené a zamítnuté: Prisma (těžší, codegen, vlastní engine),
> ukládání aktivit jako JSON sloupec (volíme plně relační model — viz §4).

## 3. Hranice: co zůstává v localStorage

`localStorage` **nezmizí úplně** — zůstává výhradně pro **stav běžícího timeru**
(efemérní UI stav, který nepatří do DB):

- index běžící aktivity, zbývající čas, play/pause, příp. preference zvuku.

Vše ostatní (training plans + aktivity) jde do SQLite. Klíč
`titan_training_plans` se přestane používat a odstraní.

## 4. Databázové schéma

Plně relační model. `TrainingPlan` 1:N `Activity`, řazení přes `position`,
cascade delete.

```ts
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  daysPerWeek: integer('days_per_week').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(), // pořadí v plánu
  name: text('name').notNull(),
  duration: integer('duration').notNull(), // sekundy
  type: text('type', { enum: ['exercise', 'rest'] }).notNull(),
  sets: integer('sets'),
  reps: text('reps'),
  weight: text('weight'),
})
```

Doménové typy (`TrainingPlan`, `Activity`) zůstávají aplikační hranicí —
repozitář mapuje řádky ↔ doménový objekt (skládá `activities` seřazené dle
`position` do `plan.activities`). Tvar vrácený do komponent je beze změny oproti
dnešnímu `src/utils/plans.ts`, takže UI se nemusí přepisovat.

## 5. Schémata (Zod / drizzle-zod)

```ts
// src/db/validation.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const activityInsert = createInsertSchema(activities, {
  duration: (s) => s.positive(),
  name: (s) => s.min(1),
})
export const planInsert = createInsertSchema(plans, {
  name: (s) => s.min(1),
  daysPerWeek: (s) => s.min(1).max(7),
})
```

Tato schémata se použijí jako **validátory server functions** (`createServerFn`
`.validator(...)`) — vstup z klienta je validovaný na hranici serveru.

## 6. Repository layer (server-only)

Repozitář běží výhradně na serveru a obaluje Drizzle. Drží mapping řádky↔doména
a transakce.

```ts
// src/repositories/plan-repository.ts  (server-only)
type NewTrainingPlan = Omit<TrainingPlan, 'id'>

interface PlanRepository {
  list(): Promise<TrainingPlan[]>
  getById(id: string): Promise<TrainingPlan | null>
  create(plan: NewTrainingPlan): Promise<TrainingPlan>
  update(id: string, patch: Partial<NewTrainingPlan>): Promise<TrainingPlan>
  remove(id: string): Promise<void>
}
```

Sémantika:

- `list` / `getById` — sestaví plán včetně seřazených aktivit; `getById` vrací
  `null`, ne výjimku.
- `create` — v transakci vloží plán + aktivity; přidělí `id` (viz §8), nastaví
  `createdAt`/`updatedAt`.
- `update` — merge patch; přepis aktivit řešen jako delete+insert v transakci;
  neexistující `id` → `PlanNotFoundError`.
- `remove` — idempotentní; cascade smaže aktivity.

Chyby: `PlanNotFoundError`, `PlanValidationError`.

## 7. Server functions (hranice klient↔server)

Tenká vrstva nad repozitářem; jediné, co volá klient.

```ts
// src/server/plans.ts
export const listPlans = createServerFn({ method: 'GET' }).handler(() =>
  planRepository.list(),
)
export const createPlan = createServerFn({ method: 'POST' })
  .validator(planInsert /* + activities */)
  .handler(({ data }) => planRepository.create(data))
// updatePlan, deletePlan, getPlan analogicky
```

Klient (`admin.tsx`, `index.tsx`) přejde z `getStoredPlans()`/`saveStoredPlans()`
na tyto server functions (přes `useServerFn` nebo route loadery). Ruční
`map`/`filter`/`spread` nad polem plánů zmizí. Po mutaci se buď refetchne
`listPlans`, nebo se invaliduje loader.

> Před implementací načíst guidance:
> `npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions`
> (a `#start-core/server-routes` dle potřeby).

## 8. Struktura souborů

```
src/
  db/
    schema.ts          # Drizzle tabulky
    validation.ts      # drizzle-zod schémata
    client.ts          # better-sqlite3 + drizzle() instance (server-only)
    seed.ts            # naplnění DEFAULT_PLANS při prázdné DB
  repositories/
    plan-repository.ts # PlanRepository + impl (server-only)
    plan-repository.test.ts
  server/
    plans.ts           # createServerFn wrappery
  domain/
    plans.ts           # TrainingPlan/Activity typy + DEFAULT_PLANS (seed data)
  utils/
    id.ts              # createId()
drizzle/               # vygenerované migrace (drizzle-kit)
drizzle.config.ts
```

`src/utils/plans.ts` se odstraní (nebo přechodný re-export typů). Cesta k DB
souboru přes env (např. `DATABASE_URL` / `./data/app.db`), mimo git.

## 9. Plán implementace (kroky)

1. **Závislosti** — `drizzle-orm`, `better-sqlite3`, `zod`, `drizzle-zod`;
   dev: `drizzle-kit`, `@types/better-sqlite3`.
2. **Konfigurace** — `drizzle.config.ts`, cesta k DB přes env, `.gitignore` pro
   DB soubor.
3. **Schéma** — `src/db/schema.ts` (plans, activities).
4. **Migrace** — `drizzle-kit generate` + skript pro aplikaci migrací; přidat
   npm skripty (`db:generate`, `db:migrate`).
5. **DB klient** — `src/db/client.ts` (server-only, better-sqlite3 + drizzle).
6. **Doména + seed** — přesun typů a `DEFAULT_PLANS` do `src/domain/plans.ts`;
   `src/db/seed.ts` naplní prázdnou DB.
7. **Validace** — `src/db/validation.ts` (drizzle-zod schémata).
8. **Repozitář** — `PlanRepository` + impl s mappingem a transakcemi.
9. **Testy repozitáře** — proti in-memory/temp SQLite: list/seed, getById,
   create, update (patch + reorder aktivit + NotFound), remove (cascade,
   idempotence). Nahradí `plans.test.ts`.
10. **Server functions** — `src/server/plans.ts` s Zod validátory.
11. **Migrace klienta** — `admin.tsx` a `index.tsx` na server functions;
    odstranit `localStorage` pro plány. **Ponechat** `localStorage` pro stav
    timeru.
12. **Úklid** — smazat `getStoredPlans`/`saveStoredPlans` a klíč
    `titan_training_plans`; aktualizovat importy.
13. **Verifikace** — `npm run lint`, `tsc --noEmit`, `npm run test`, `npm run build`
    (skill `/verify`).

## 10. Akceptační kritéria

- Plány a aktivity jsou perzistované v SQLite; `localStorage` se pro ně
  nepoužívá. `localStorage` zůstává **pouze** pro stav běžícího timeru.
- Klient přistupuje k datům výhradně přes server functions; SQLite ani Drizzle
  se neimportuje do klientského bundlu.
- Vstup mutací je validovaný Zod schématem na hranici serveru.
- Schéma má migrace generované drizzle-kit; prázdná DB se naseedí
  `DEFAULT_PLANS`.
- Testy pokrývají všech 5 metod repozitáře včetně cascade a reorder; testy běží
  proti reálnému SQLite (temp/in-memory).
- `tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build` zelené.

## 11. Otevřené otázky

- Refetch po mutaci vs. route loadery + `router.invalidate()` — sjednotit při
  migraci klienta (záleží, zda chceme data v loaderu pro SSR).
- `update` aktivit: delete+insert vs. diff — spec volí delete+insert v transakci
  pro jednoduchost; ověřit proti velikosti plánů (malé → OK).
- Cesta/umístění DB souboru a strategie zálohy (mimo rozsah, ale rozhodnout
  před nasazením).
- better-sqlite3 (single-node) vs. libSQL/Turso, pokud se plánuje serverless
  deployment — driver je izolovaný v `db/client.ts`, výměna levná.
