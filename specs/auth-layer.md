# Specifikace: Auth Layer (JWT + User model)

Status: ✅ Implemented (2026-07-01) — viz [PROGRESS.md](./PROGRESS.md) pro odchylky
· Cíl: vývojový plán pro autentizaci a autorizaci
Předpoklad: hotová datová vrstva dle [`repository-layer.md`](./repository-layer.md)
(SQLite + Drizzle + Zod + server functions, repository pattern).

## 1. Cíl a rozsah

Zavést autentizaci založenou na **JWT tokenech** a model **User**, s middleware
pro ověřování requestů a route guardy pro chráněné stránky.

### V rozsahu

- `User` model + `UserRepository` (stejný pattern jako `PlanRepository`).
- Registrace, přihlášení, odhlášení, refresh, `me`.
- JWT access + refresh token, uložené v **HttpOnly cookies** (ne localStorage).
- Auth **middleware** (global request middleware) → `context.user`.
- `requireAuth` / `requireRole` pro chráněné server functions.
- Route guardy přes `beforeLoad` + `_authenticated` layout.
- RBAC: role `user` / `admin`; `admin.tsx` jen pro adminy.

### Mimo rozsah (zatím)

- OAuth / social login (návrh nechat otevřený).
- E-mailové ověření a reset hesla (zmíněno v §10 jako navazující).
- MFA.

## 2. Klíčová rozhodnutí

| Oblast | Volba | Důvod |
| --- | --- | --- |
| Tokeny | **JWT, HS256** | Požadavek; symetrický klíč stačí pro single-node. |
| JWT knihovna | **jose** | Moderní, typovaná, běží v Node i edge runtime. |
| Hash hesla | **argon2id** (`@node-rs/argon2`) | Současný best practice; prebuilt binárky bez kompilace. Fallback `bcryptjs`. |
| Úložiště tokenů | **HttpOnly cookie** | Není dostupné z JS → odolné vůči XSS krádeži. localStorage zamítnut. |
| Token model | **Access (krátký) + Refresh (dlouhý), s rotací** | Krátká životnost access tokenu omezí dopad úniku; refresh revokovatelný v DB. |
| Refresh revokace | **DB tabulka `refresh_tokens`** | JWT je stateless; revokaci (logout, krádež) řešíme allow-listem v DB. |
| Přístup z klienta | **server functions** (`createServerFn`) | Auth běží jen na serveru; klient nikdy nevidí secret ani hash. |

> Pozn.: čistě stateless JWT (bez DB) je možné, ale bez možnosti revokace.
> Volíme hybrid: access token stateless, refresh token verifikovaný proti DB.

## 3. Datové schéma (Drizzle)

Navazuje na `src/db/schema.ts`.

```ts
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(), // jti — odpovídá claimu v JWT
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }), // null = platný
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
```

Doménový typ `User` **nikdy nenese `passwordHash`** mimo repozitář — server
functions a klient dostávají `PublicUser` (`id`, `email`, `role`).

## 4. Tokeny a cookies

- **Access token** — JWT, životnost ~15 min. Claims: `sub` (userId), `role`,
  `exp`, `iat`. Verifikace čistě kryptograficky (stateless).
- **Refresh token** — JWT, životnost ~7–30 dní. Claim `jti` = řádek
  v `refresh_tokens`. Při refreshi ověřit, že `jti` existuje a není revokovaný.

Cookies (obě): `HttpOnly`, `Secure` (v produkci), `SameSite=Lax`, `Path=/`,
v produkci prefix `__Host-`. Životnost cookie = životnost tokenu.

Secret z env `JWT_SECRET` (povinné, fail-fast při startu). Refresh rotace: při
každém refreshi se starý `jti` revokuje a vydá nový (rotating refresh tokens).

## 5. Auth flow (server functions)

```
src/server/auth.ts
```

| Funkce | Metoda | Chování |
| --- | --- | --- |
| `register` | POST | Validace (Zod), e-mail musí být unikátní, hash hesla (argon2id), insert usera, vydání tokenů, set cookies. Vrací `PublicUser`. |
| `login` | POST | Najít usera dle e-mailu, ověřit heslo. Vydat tokeny, set cookies. **Enumeration defense**: stejná chybová hláška i čas pro „neexistuje" i „špatné heslo". |
| `logout` | POST | Revokovat refresh `jti`, smazat cookies. |
| `refresh` | POST | Ověřit refresh JWT + `jti` v DB (neexpirovaný, nerevokovaný), rotovat, vydat nový access token. |
| `me` | GET | Vrátí `PublicUser` z `context.user`, nebo `null`. |

Validátory: Zod schémata (`registerSchema`, `loginSchema`) na `.validator(...)`.
Rate limiting na `login`/`register` (alespoň jednoduchý in-memory limiter; viz §10).

## 6. Middleware

Načíst guidance před implementací:
`npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/middleware`
a `#start-core/auth-server-primitives`.

### 6.1 Global request middleware — `authMiddleware`

Server-only, registrované globálně přes `createStart` v `src/start.ts`:

1. Přečte access token z cookie.
2. Ověří JWT (jose). Při platnosti načte `PublicUser` (z claimů, příp.
   `userRepository.getById`).
3. `next({ context: { user } })` — `user` je `PublicUser | null`.
4. Neplatný/expirovaný access token → zkusit tichý refresh (pokud je refresh
   cookie validní), jinak `user = null`. (Tichý refresh volitelně až v iteraci 2.)

### 6.2 Server-fn middleware — `requireAuth`, `requireRole(role)`

Pro chráněné server functions; pokud `context.user` chybí → vyhodí
`401` / `redirect('/login')`. `requireRole('admin')` navíc kontroluje roli.

## 7. Route guardy (klient/SSR)

- `src/routes/_authenticated.tsx` — layout route s `beforeLoad`, který z router
  contextu přečte `user`; pokud chybí → `throw redirect({ to: '/login' })`.
  Chráněné stránky se vnoří pod tento layout.
- `admin.tsx` přesunout pod guard s kontrolou `role === 'admin'` (jinak redirect
  / 403). Plány teď patří přihlášenému uživateli — viz §9.
- Router context naplnit `user` (z `me` v root loaderu) pro typovaný přístup
  v `beforeLoad`. Guidance:
  `npx @tanstack/intent@latest load @tanstack/router-core#router-core/auth-and-guards`.

Login/registrace UI: nové routy `src/routes/login.tsx`, `src/routes/register.tsx`
volající server functions; po úspěchu `router.invalidate()` + redirect.

## 8. Bezpečnost (checklist)

- Hesla pouze argon2id; nikdy plaintext v logu/odpovědi.
- `passwordHash` nikdy neopustí repozitář (`PublicUser` projekce).
- Cookies `HttpOnly` + `Secure` + `SameSite=Lax` + `__Host-` v produkci.
- **CSRF**: u non-GET server functions ověřit origin/`SameSite` (cookie-based auth
  je CSRF-náchylný) — viz `auth-server-primitives`.
- Rate limiting na `login`/`register`/`refresh`.
- Enumeration defense na `login` a (později) reset hesla.
- `JWT_SECRET` mimo git, fail-fast pokud chybí; rotace secretu = invalidace all.
- Refresh rotace + revokace při logoutu a při detekci reuse.

## 9. Dopad na repository-layer

Plány přestávají být globální a stávají se vlastnictvím uživatele:

- `plans` tabulka dostane `ownerId` (FK → `users.id`, cascade).
- `PlanRepository` metody dostanou `ownerId` (scoping), nebo se zavede
  `context.user` a repozitář filtruje dle něj.
- Server functions plánů obalit `requireAuth`; admin operace `requireRole`.
- Seed `DEFAULT_PLANS`: buď systémové read-only plány, nebo se klonují novému
  uživateli při registraci. **Rozhodnout** (viz §10).

## 10. Plán implementace (kroky)

1. **Závislosti** — `jose`, `@node-rs/argon2`; (`zod`, `drizzle-orm` už jsou).
2. **Schéma** — `users`, `refresh_tokens` do `src/db/schema.ts`; migrace
   (`drizzle-kit generate` + `db:migrate`).
3. **Doména** — `User`, `PublicUser`, `Role` typy; `toPublicUser()` projekce.
4. **UserRepository** — `getByEmail`, `getById`, `create`, (`updateRole`);
   nikdy nevrací `passwordHash`. Testy proti temp SQLite.
5. **Tokeny** — `src/auth/tokens.ts`: `signAccess`, `signRefresh`, `verify`
   (jose), helpery na cookies (set/clear). Env `JWT_SECRET` validace.
6. **Hash** — `src/auth/password.ts`: `hash`, `verify` (argon2id).
7. **Refresh store** — issue/verify/revoke/rotate nad `refresh_tokens`.
8. **Server functions** — `src/server/auth.ts`: register/login/logout/refresh/me
   se Zod validátory + enumeration defense + rate limit.
9. **Middleware** — `authMiddleware` (global, `src/start.ts`), `requireAuth`,
   `requireRole`.
10. **Router context + guardy** — naplnit `user` v root loaderu;
    `_authenticated.tsx`; přesun `admin.tsx` pod `requireRole('admin')`.
11. **UI** — `login.tsx`, `register.tsx`, logout v `Header`.
12. **Napojení plánů** — `ownerId` scoping dle §9.
13. **Verifikace** — `/verify`: lint, `tsc --noEmit`, test, build.

## 11. Akceptační kritéria

- Registrace + login vydají JWT v HttpOnly cookies; token není v localStorage
  ani v klientském JS.
- Chráněné routy/sf bez platného tokenu → redirect na `/login` resp. 401.
- `admin.tsx` přístupné jen roli `admin`.
- Heslo uložené jen jako argon2id hash; `passwordHash` se nikdy neobjeví
  v odpovědi server function.
- Logout revokuje refresh token; následný refresh selže.
- Refresh rotace funguje; revokovaný/expirovaný refresh je odmítnut.
- `tsc --noEmit`, lint, test, build zelené.

## 12. Otevřené otázky

- Tichý auto-refresh access tokenu v middleware hned, nebo až ve 2. iteraci?
- `DEFAULT_PLANS`: systémové read-only vs. klonování novému uživateli při
  registraci.
- Rate limiter: in-memory (single-node) vs. perzistentní — záleží na deploymentu.
- Reset hesla / e-mailové ověření — navazující spec.
- SameSite `Lax` vs `Strict` (dopad na případné externí návraty/OAuth později).
