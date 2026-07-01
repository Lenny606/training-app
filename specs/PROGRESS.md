# Progres vývoje

Centrální přehled stavu jednotlivých specifikací. Zdroj pravdy pro „co je hotové,
co se dělá a co je blokované“. Detaily vždy v odkazované spec.

Legenda stavu: 🔲 not started · 🚧 in progress · ✅ done · ⛔ blocked

## Přehled

| Spec | Stav | Závisí na | Poznámka |
| --- | --- | --- | --- |
| [repository-layer](./repository-layer.md) | ✅ | — | SQLite + Drizzle, server functions, klient přepojen; localStorage pro plány odstraněn. |
| [auth-layer](./auth-layer.md) | ✅ | repository-layer | JWT (jose HS256) access+refresh v HttpOnly cookies, argon2id, User model, requireAuth/requireRole, `_authenticated` guard, login/register/logout UI. Plány scoped na `ownerId`, klon default plánů při registraci. |
| [ai-client](./ai-client.md) | 🔲 | repository-layer, auth-layer | Server-side tools scoped na usera. |
| [deploy](./deploy.md) | 🔲 | repository-layer, auth-layer | VPS + GitHub Actions + PM2. |
| [admin-drag-drop](./admin-drag-drop.md) | 🔲 | — (řazení šipkami hotové) | Nahrazuje řazení šipkami za DnD. |
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

### ai-client 🔲
- [ ] TanStack AI SDK setup
- [ ] Server-side tools (scoped na usera)
- [ ] UI asistenta
- [ ] Napojení na repository + auth context

### deploy 🔲
- [ ] GitHub Actions workflow
- [ ] SCP přenos buildu na VPS
- [ ] PM2 process management
- [ ] Env secrets + DB migrace v pipeline

### admin-drag-drop 🔲
- [ ] Výběr DnD knihovny / přístupu
- [ ] DnD řazení aktivit
- [ ] Persist nového pořadí přes repository
- [ ] A11y (keyboard) + fallback šipky
- [ ] Odstranit / nechat staré řazení šipkami

### mobile-style-audit ✅
- [x] Header — responzivní nav (hamburger + scroll lock)
- [x] `ProgressCircle` — responzivní šířka (nepřetéká na 360 px)
- [x] `PlaybackControls` — gap na úzké šířce
- [x] `ActivityItem` — `min-w-0` na grid inputy
- [x] Projet `/`, `/admin`, `/about` na 360/390/414/768 — puppeteer audit, 0 overflow
- [x] Console overflow scan (§3.4 spec) bez nálezů — `body.scrollW == clientW` všude
- [x] Ověřit tap targety ≥ 44 px — prim. ovládání (hamburger 44×44, theme toggle min-h-44) opraveno
- [ ] (follow-up) admin ikonová tlačítka 27×27 + inputy 40px na 44 px — oddělený PR
