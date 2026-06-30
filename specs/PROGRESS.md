# Progres vývoje

Centrální přehled stavu jednotlivých specifikací. Zdroj pravdy pro „co je hotové,
co se dělá a co je blokované“. Detaily vždy v odkazované spec.

Legenda stavu: 🔲 not started · 🚧 in progress · ✅ done · ⛔ blocked

## Přehled

| Spec | Stav | Závisí na | Poznámka |
| --- | --- | --- | --- |
| [repository-layer](./repository-layer.md) | 🚧 | — | DB vrstva hotová (schéma, migrace, seed, SQLite repo + testy); zbývají server functions + migrace klienta. |
| [auth-layer](./auth-layer.md) | 🔲 | repository-layer | JWT + User model. |
| [ai-client](./ai-client.md) | 🔲 | repository-layer, auth-layer | Server-side tools scoped na usera. |
| [deploy](./deploy.md) | 🔲 | repository-layer, auth-layer | VPS + GitHub Actions + PM2. |
| [admin-drag-drop](./admin-drag-drop.md) | 🔲 | — (řazení šipkami hotové) | Nahrazuje řazení šipkami za DnD. |
| [mobile-style-audit](./mobile-style-audit.md) | 🚧 | — | Header nav + high overflow fixes hotové; chybí projet 4 routy na 360/390/414/768. |

## Pořadí prací (doporučené)

1. **repository-layer** — datový základ, blokuje auth + ai + deploy.
2. **auth-layer** — staví na DB, blokuje ai + deploy.
3. **deploy** / **ai-client** — paralelně po auth.
4. **admin-drag-drop**, **mobile-style-audit** — UI vrstva, nezávislé, kdykoliv.

---

## Milníky

### repository-layer 🚧
- [x] Repository pattern (interface + lokální implementace)
- [x] Admin state hooks nad repository
- [x] SQLite + Drizzle schema (`src/db/schema.ts`)
- [x] DB klient (better-sqlite3 + drizzle, server-only) + seed
- [x] Migrace (drizzle-kit) + `db:generate`/`db:migrate` skripty
- [x] Zod / drizzle-zod schémata (`src/db/validation.ts`)
- [x] `SqlitePlanRepository` + testy proti in-memory SQLite
- [ ] Server functions (CRUD) — Zod validace na hranici klient↔server
- [ ] Migrace klienta (`admin.tsx`/`index.tsx`) na server functions; odstranit localStorage pro plány

### auth-layer 🔲
- [ ] User model + DB tabulka
- [ ] JWT issue/verify (server)
- [ ] Session cookie (HttpOnly/Secure/SameSite)
- [ ] Login/register/logout server functions
- [ ] Route guards (`beforeLoad`)
- [ ] Scoping repository na usera

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

### mobile-style-audit 🚧
- [x] Header — responzivní nav (hamburger + scroll lock)
- [x] `ProgressCircle` — responzivní šířka (nepřetéká na 360 px)
- [x] `PlaybackControls` — gap na úzké šířce
- [x] `ActivityItem` — `min-w-0` na grid inputy
- [ ] Projet `/`, `/admin`, `/about` na 360/390/414/768
- [ ] Console overflow scan (§3.4 spec) bez nálezů
- [ ] Ověřit tap targety ≥ 44 px
