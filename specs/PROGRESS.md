# Progres vývoje

Centrální přehled stavu jednotlivých specifikací. Zdroj pravdy pro „co je hotové,
co se dělá a co je blokované“. Detaily vždy v odkazované spec.

Legenda stavu: 🔲 not started · 🚧 in progress · ✅ done · ⛔ blocked

## Přehled

| Spec | Stav | Závisí na | Poznámka |
| --- | --- | --- | --- |
| [repository-layer](./repository-layer.md) | ✅ | — | SQLite + Drizzle, server functions, klient přepojen; localStorage pro plány odstraněn. |
| [auth-layer](./auth-layer.md) | ✅ | repository-layer | JWT (jose HS256) access+refresh v HttpOnly cookies, argon2id, User model, requireAuth/requireRole, `_authenticated` guard, login/register/logout UI. Plány scoped na `ownerId`, klon default plánů při registraci. |
| [ai-client](./ai-client.md) | ✅ | repository-layer, auth-layer | TanStack AI (`@tanstack/ai`), tools scoped na usera, streaming SSE, tool approval, provider portability (Claude + GPT). |
| [deploy](./deploy.md) | ✅ | repository-layer, auth-layer | Kód hotový: GH Actions + SCP + PM2 + Nitro node-server + prod migrace. Zbývá jen jednorázová příprava VPS (mimo repo). |
| [admin-drag-drop](./admin-drag-drop.md) | ✅ | repository-layer | @dnd-kit DnD pro aktivity i plány; `plans.position` (migrace 0002) + `reorder()`; šipky ponechány jako a11y fallback. |
| [mobile-style-audit](./mobile-style-audit.md) | ✅ | — | Audit 3 rout × 360/390/414/768: 0 overflow. Prim. tap targety (hamburger, theme toggle) na 44px; admin ikony <44 odděleny do follow-up. |

## Pořadí prací (doporučené)

1. **repository-layer** — datový základ, blokuje auth + ai + deploy.
2. **auth-layer** — staví na DB, blokuje ai + deploy.
3. **deploy** / **ai-client** — paralelně po auth.
4. **admin-drag-drop**, **mobile-style-audit** — UI vrstva, nezávislé, kdykoliv.

---

## Milníky

### repository-layer ✅
- [x] Repository pattern (interface + impl)
- [x] SQLite + Drizzle schema (`src/db/schema.ts`)
- [x] DB klient (better-sqlite3 + drizzle, server-only) + seed
- [x] Migrace (drizzle-kit) + `db:generate`/`db:migrate` skripty
- [x] Zod / drizzle-zod schémata (`src/db/validation.ts`)
- [x] `SqlitePlanRepository` + testy proti in-memory SQLite
- [x] Server functions (CRUD) — `src/server/plans.ts`, Zod validace na hranici
- [x] Migrace klienta: `index.tsx` (loader/SSR), `useAdminState` (server fns)
- [x] Úklid: odstraněn localStorage repo + `utils/plans.ts` + klíč `titan_training_plans`

### auth-layer ✅
- [x] User model + DB tabulka (`users`, `refresh_tokens`) + migrace `0001`
- [x] `UserRepository` + `RefreshTokenStore` (sqlite impl + testy, 23 → 37 testů total)
- [x] JWT issue/verify (jose HS256, access 15 min + refresh 30 d s rotací a revokací)
- [x] argon2id hash (`@node-rs/argon2`) + enumeration defense na login
- [x] Session cookies (HttpOnly + Secure v prod + SameSite=Lax + `__Host-` v prod) — ověřeno E2E
- [x] Server functions `register/login/logout/refresh/me` + Zod + rate limit + CSRF origin check
- [x] `requireAuth` / `requireRole` server-fn middleware (data boundary)
- [x] Route guard `_authenticated` (`beforeLoad`) + router context (`user` z `me`)
- [x] Login/register/logout UI + Header stav uživatele
- [x] Scoping plánů na `ownerId`; klon `DEFAULT_PLANS` při registraci
- [x] Verifikace: tsc ✅, test 37/37 ✅, build ✅, E2E (register→klon→guard→logout) ✅

**Odchylky od spec (k potvrzení):**
- `admin.tsx` gated `requireAuth` (ne `requireRole('admin')`) — plány jsou per-user, každý edituje svoje; admin role zatím nevyužita (reserved). Spec §7 chtěl admin-only.
- Global middleware v `src/start.ts` vynecháno — `requireAuth`/`requireRole` skládány per server-fn (guidance: data boundary patří na fn, ne globálně; vyhne se double-run). Spec §6.1 chtěl global.
- Tichý auto-refresh v middleware → **iterace 2** (spec §12). `refresh` endpoint + rotace + reuse-revokace hotové.
- `JWT_SECRET`: fail-fast v prod, insecure dev fallback (viz `.env.example`).

### ai-client ✅
- [x] TanStack AI SDK setup — `@tanstack/ai` + `-react` + `-anthropic` + `-openai`
- [x] Provider adaptéry (portability): `src/ai/client.ts` registr, default `claude-opus-4.8`, haiku + GPT-5.2
- [x] System prompt (`src/ai/system-prompt.ts`, server-only) + fail-fast `ANTHROPIC_API_KEY`
- [x] Typed tools (`toolDefinition` + Zod): list/get/summarize/create/update/add_activity/delete/start_workout
- [x] Tools scoped na usera přes factory `buildTools(userId, repo)` — ownerId nikdy z klienta
- [x] `delete_plan` `needsApproval` → human-in-the-loop approval v UI
- [x] Streaming SSE endpoint `src/routes/api.chat.ts` (server route), `requireAuth` (getSessionUser 401) + rate limit + usage middleware
- [x] Chat UI `src/components/Chat.tsx` (streaming, thinking, tool-call viz, approval, provider picker) + route `_authenticated/assistant.tsx`
- [x] `start_workout` → navigace na `/?plan=<id>` (index route `validateSearch`) → timer s předvybraným plánem
- [x] Testy tools (`src/ai/tools.test.ts`, 16) proti in-memory SQLite vč. scoping/NotFound
- [x] Verifikace: tsc ✅, test 53/53 ✅, lint 0 errors ✅, build ✅, žádný leak server-only do klient bundle

**Odchylky od spec (potvrdit):**
- SDK: „TanStack AI SDK" = reálný balík `@tanstack/ai` (0.38.x, AG-UI). Vercel AI SDK fallback nebyl potřeba.
- Model id je `claude-opus-4.8` (tečka — tak to má typová unie adaptéru), ne `claude-opus-4-8`.
- Endpoint je **server route** `routes/api.chat.ts` (ne `server/chat.ts` server-fn) — `useChat` potřebuje HTTP SSE endpoint.
- Perzistence historie konverzací do DB: mimo rozsah (§8), zatím klientský stav.

### deploy ✅ (kód)
- [x] GitHub Actions workflow (`.github/workflows/deploy.yml`) — build + lint/test/tsc gate + SCP + SSH
- [x] SCP přenos buildu na VPS (`appleboy/scp-action`, heslo)
- [x] PM2 process management (`ecosystem.config.cjs`, `pm2 reload` → fallback `start`)
- [x] Env secrets + DB migrace v pipeline (`db:migrate:prod` z serverového `.env`)
- [x] Runnable Node server přes Nitro (`.output/server/index.mjs`)
- [ ] (mimo repo) jednorázová příprava VPS: Node/PM2/nginx+TLS, `.env` (600), `pm2 startup`, GitHub Secrets

### admin-drag-drop ✅
- [x] Knihovna: `@dnd-kit/core` + `/sortable` + `/modifiers` + `/utilities`
- [x] DnD řazení **aktivit** (`ActivitiesList` DndContext/SortableContext, `ActivityItem` useSortable + GripVertical handle) → `reorderActivity` (`arrayMove`), uloží se přes existující Save
- [x] Model pořadí plánů: `plans.position` (schema + migrace `0002_eminent_swarm`), `list()` řadí `position, createdAt`, `create()` append na konec, seed přiřazuje pozice
- [x] `PlanRepository.reorder(orderedIds, ownerId)` (bulk update v transakci, owner-scoped) + server fn `reorderPlans` + testy (17 v repo)
- [x] DnD řazení **plánů** (`PlansSidebar`) → `reorderPlans` s **okamžitou** perzistencí (optimistic + rollback); editor efekt keyuje na identitu vybraného plánu, takže reorder neztratí rozdělané změny
- [x] A11y/touch: `KeyboardSensor` + `sortableKeyboardCoordinates`, `PointerSensor` activation distance 8px, handle ≥44px (touch target), `prefers-reduced-motion` (`usePrefersReducedMotion`), `touch-none` na handle
- [x] Šipky ponechány jako sekundární a11y ovládání (`moveActivity` přemapováno na `reorderActivity`)
- [x] Verifikace: tsc ✅, test 57/57 ✅, lint 0 errors ✅, build ✅

**Odchylky od spec (potvrdit):**
- `plans.position` je **jen DB/persistenční** sloupec, ne pole doménového `TrainingPlan` (§9 zmiňoval `TrainingPlan.position`) — klient se spoléhá na pořadí pole z `list()`; drží se tím position mimo AI planShape/validaci/DEFAULT_PLANS.
- `DragOverlay` vynechán — feedback řešen `opacity` + built-in transform posunem (splňuje „viditelný feedback"); handle izoluje listeners, takže drag nekoliduje s editací inputů i bez overlaye.
- Otevřené otázky §12: šipky **ponechány** (redundantní, ale bez a11y regrese); position = souvislé přečíslování (malý seznam); pořadí plánů se ukládá hned po dropu.

### mobile-style-audit ✅
- [x] Header — responzivní nav (hamburger + scroll lock)
- [x] `ProgressCircle` — responzivní šířka (nepřetéká na 360 px)
- [x] `PlaybackControls` — gap na úzké šířce
- [x] `ActivityItem` — `min-w-0` na grid inputy
- [x] Projet `/`, `/admin`, `/about` na 360/390/414/768 — puppeteer audit, 0 overflow
- [x] Console overflow scan (§3.4 spec) bez nálezů — `body.scrollW == clientW` všude
- [x] Ověřit tap targety ≥ 44 px — prim. ovládání (hamburger 44×44, theme toggle min-h-44) opraveno
- [ ] (follow-up) admin ikonová tlačítka 27×27 + inputy 40px na 44 px — oddělený PR
