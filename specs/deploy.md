# Specifikace: Deploy na VPS (GitHub Actions + PM2 + SCP)

Status: Draft · Cíl: vývojový plán pro CI/CD nasazení
Předpoklady: DB vrstva ([`repository-layer.md`](./repository-layer.md)) a auth
([`auth-layer.md`](./auth-layer.md)) zavádějí SQLite + migrace a env secrets,
které deploy musí respektovat.

## 1. Cíl a rozsah

Automatický deploy aplikace na **VPS** přes **GitHub Actions**: build na CI →
přenos artefaktu přes **SCP (jméno/heslo)** → spuštění pod **PM2** na serveru.

### V rozsahu

- GitHub Actions workflow (build, test gate, přenos, restart).
- PM2 konfigurace (`ecosystem.config.cjs`) + reload bez výpadku.
- SCP přenos buildu pomocí username/password.
- Aplikace DB migrací při každém deploy.
- Správa secrets a env na serveru.

### Mimo rozsah

- Provisioning VPS (instalace Node, PM2, nginx) — předpoklad, viz §3.
- TLS / reverse proxy (nginx) — předpoklad před appkou; zmíněno v §8.
- Rollback strategie přes release adresáře — volitelné rozšíření (§9).

## 2. Build output (fakta)

`npm run build` (TanStack Start) produkuje:

```
dist/
  client/          # statická aktiva (servíruje Node server)
  server/
    server.js      # Node entry point  ← PM2 script
```

PM2 spouští `node dist/server/server.js`. Server poslouchá na `PORT`
(default 3000) — za ním nginx jako reverse proxy + TLS.

## 3. Klíčová rozhodnutí

| Oblast          | Volba                                            | Důvod                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build           | **na CI runneru** (`npm ci && npm run build`)    | Čisté, reprodukovatelné prostředí; server nemusí mít dev toolchain.                                                                                                                                                                                                                  |
| Přenos          | **SCP přes jméno/heslo** (`appleboy/scp-action`) | Požadavek. Secrets v GitHub Secrets.                                                                                                                                                                                                                                                 |
| Prod závislosti | **instalovat na VPS** (`npm ci --omit=dev`)      | `better-sqlite3` je nativní modul — musí se sestavit pro arch serveru, **nekopírovat `node_modules` z CI**.                                                                                                                                                                          |
| Verze npm       | **pinned `11.14.1`** (local == CI == VPS)        | ubuntu-latest/VPS default = npm 10 s Node 22, řeší strom jinak než lokální npm 11 → `npm ci` padal na `Missing: lru-cache@… from lock file`. Pin: `packageManager` v `package.json` + `env.NPM_VERSION` ve workflow (CI `npm i -g npm@$NPM_VERSION`, VPS `npx npm@$NPM_VERSION ci`). |
| Process manager | **PM2** + `ecosystem.config.cjs`                 | Požadavek; `pm2 reload` = zero-downtime restart.                                                                                                                                                                                                                                     |
| Migrace         | **na VPS před reloadem** (`npm run db:migrate`)  | Schéma musí být aktuální dřív, než poběží nový kód.                                                                                                                                                                                                                                  |
| Trigger         | **push na `main`** (příp. tag/manual)            | Jednoduché CI; lze zúžit na release tagy.                                                                                                                                                                                                                                            |

> Bezpečnostní poznámka: heslová SSH/SCP autentizace je slabší než SSH klíče.
> Plníme požadavek, ale doporučuji: silné heslo, omezení zdrojových IP na VPS
> firewallu, případně pozdější přechod na deploy klíč. Viz §8.

## 4. Secrets (GitHub repo → Settings → Secrets)

| Secret              | Význam                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| `HOST`              | IP / hostname serveru.                                                      |
| `PORT`              | SSH port (default 22).                                                      |
| `USERNAME`          | Uživatel na VPS.                                                            |
| `PASSWORD`          | Heslo uživatele (SCP + SSH).                                                |
| `DEPLOY_PATH`       | Cílový adresář na VPS, např. `/var/www/training-app`.                       |
| `OPENAI_API_KEY`    | AI provider klíč (default provider). Upsertuje se do serverového `.env`.    |
| `ANTHROPIC_API_KEY` | AI provider klíč (volitelný, jen když se používá Claude). Upsert do `.env`. |

**AI provider klíče** (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) jdou z GitHub
Secrets a workflow je při deployi **upsertuje** do serverového `.env`
(idempotentně — řádek se nejdřív smaže, pak připojí; prázdný/nenastavený secret
se přeskočí, takže ručně nastavená hodnota se nepřepíše). Předává je
`appleboy/ssh-action` přes `envs`, ne interpolací do skriptu.

**Ostatní runtime env (`JWT_SECRET`, `DATABASE_URL`) NEjsou v GitHub Secrets** —
žijí jen v `.env` **na serveru** (persistentní napříč deploymenty, mimo
přenášený artefakt). Workflow je nikdy nepřepisuje.

## 5. PM2 konfigurace

`ecosystem.config.cjs` (commitnutý, **bez secrets**):

```js
module.exports = {
  apps: [
    {
      name: 'training-app',
      script: 'dist/server/server.js',
      cwd: '/var/www/training-app',
      instances: 1, // 'max' pro cluster mód, pokud je app stateless
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3000 },
      env_file: '.env', // runtime secrets ze serverového .env
    },
  ],
}
```

První spuštění na VPS: `pm2 start ecosystem.config.cjs && pm2 save` +
`pm2 startup` (autostart po rebootu). Další deploy už jen `pm2 reload`.

## 6. Přenášený artefakt

Na VPS se kopíruje **jen to potřebné** (ne `node_modules`, ne `src`):

```
dist/                    # build
package.json
package-lock.json
ecosystem.config.cjs
drizzle/                 # migrace (drizzle-kit) — viz repository-layer
drizzle.config.ts
```

Na serveru se pak provede `npm ci --omit=dev` (nativní moduly), migrace a reload.

## 7. GitHub Actions workflow

`.github/workflows/deploy.yml` (konceptuálně):

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false # nepřerušovat běžící deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run test # test/lint gate — fail = no deploy
      - run: npx tsc --noEmit
      - run: npm run build

      - name: Bundle artefakt
        run: |
          tar -czf release.tar.gz \
            dist package.json package-lock.json \
            ecosystem.config.cjs drizzle drizzle.config.ts

      - name: Copy přes SCP (heslo)
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          port: ${{ secrets.VPS_PORT }}
          username: ${{ secrets.VPS_USERNAME }}
          password: ${{ secrets.VPS_PASSWORD }}
          source: release.tar.gz
          target: ${{ secrets.DEPLOY_PATH }}

      - name: Extrakce + migrace + reload
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          port: ${{ secrets.VPS_PORT }}
          username: ${{ secrets.VPS_USERNAME }}
          password: ${{ secrets.VPS_PASSWORD }}
          script: |
            set -e
            cd ${{ secrets.DEPLOY_PATH }}
            tar -xzf release.tar.gz && rm release.tar.gz
            npm ci --omit=dev
            npm run db:migrate
            pm2 reload ecosystem.config.cjs --update-env || \
              pm2 start ecosystem.config.cjs
            pm2 save
```

> Konkrétní verze actions a `node-version` ověřit/aktualizovat při implementaci.

## 8. Bezpečnost a provoz

- VPS za **nginx** reverse proxy s TLS (Let's Encrypt); Node poslouchá jen na
  `127.0.0.1:3000`, nikdy přímo na veřejné IP.
- Heslová autentizace: silné heslo, fail2ban, omezit SSH na potřebné IP, zvážit
  pozdější deploy SSH klíč.
- `.env` na serveru s právy `600`, vlastník deploy user; **nikdy v gitu**.
- DB soubor (SQLite) mimo `DEPLOY_PATH`/přenášený artefakt, aby ho deploy
  nepřepsal; zálohovat (cron `cp`/`litestream`).
- Test/lint/`tsc` gate v CI — červené = žádný deploy.
- `concurrency` brání paralelním deployům.

## 9. Plán implementace (kroky)

1. **VPS příprava** (jednorázově) — Node 22, PM2 globálně, nginx + TLS, deploy
   user, `DEPLOY_PATH`, `.env` se secrets (`600`), `pm2 startup`.
2. **PM2 config** — `ecosystem.config.cjs` v repu.
3. **GitHub Secrets** — `VPS_*`, `DEPLOY_PATH`.
4. **Workflow** — `.github/workflows/deploy.yml` (build + gate + SCP + SSH).
5. **První deploy** — ručně ověřit `pm2 start` + `pm2 save` na serveru, pak
   nechat workflow doběhnout na `pm2 reload`.
6. **Migrace v pipeline** — ověřit `db:migrate` proti serverové DB.
7. **Smoke test** — po deployi health check (curl na veřejnou URL / `/`).
8. **Volitelně** — atomické releasy (adresáře `releases/<sha>` + symlink
   `current`) pro snadný rollback; PM2 cluster mód.

## 10. Akceptační kritéria

- Push na `main` s zelenými testy → automatický build, přenos a `pm2 reload`
  bez výpadku.
- Selhání lint/test/`tsc`/build → deploy se neprovede.
- Nativní moduly (`better-sqlite3`) fungují na serveru (instalace na VPS).
- DB migrace proběhnou před spuštěním nového kódu.
- Runtime secrets jsou jen v serverovém `.env`, ne v repu ani artefaktu.
- App běží pod PM2, přežije reboot (`pm2 startup` + `pm2 save`).

## 11. Otevřené otázky

- Trigger: každý push na `main` vs. jen release tagy / manual approval (prod
  gate)?
- Rollback: atomické release adresáře hned, nebo až později?
- PM2 `fork` (1 instance) vs. `cluster max` — závisí na statelessnosti (DB je
  lokální SQLite → cluster sdílí jeden DB soubor, OK pro reads, ověřit zápisy).
- Health check / auto-rollback při selhání reloadu.
- Přechod z hesla na SSH deploy klíč (bezpečnostní dluh dle §3/§8).
