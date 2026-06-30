# Specifikace: Rychlý mobilní style audit

Status: Draft · Cíl: odhalit overflow a basic responsivitu na mobilu
Záběr: **lehký** — základní responsivita a layout, ne kompletní redesign.

## 1. Cíl

Projít aplikaci v mobilním zobrazení a najít místa, kde:

- něco **přetéká** (horizontální scroll, useknutý obsah),
- layout je **nepoužitelný** (přeplácané ovládání, malé tap targety),
- chybí základní responsivní chování.

Výstup = seznam nálezů + doporučená oprava. Implementace oprav je samostatný
krok (mimo tuto spec, nebo navazující PR).

## 2. Rozsah

### Auditované routy

- `/` (`index.tsx`) — výběr plánu + **timer** (nejvíc dynamického UI).
- `/admin` (`admin.tsx`) — dvousloupcový layout (`lg:flex-row`), editace plánu.
- `/about` (`about.tsx`).
- Sdílené: `Header.tsx` (nav, wrap), `Footer.tsx`.

### Breakpointy k otestování

- **360 px** (malý telefon), **390 px** (běžný), **414 px** (větší), **768 px**
  (tablet / přechod na `sm`/`md`).

### Mimo rozsah

- Vizuální redesign, barvy, dark/light jemnosti.
- Přístupnost nad rámec tap targetů (kompletní a11y = samostatně, lze využít
  skill `chrome-devtools-mcp:a11y-debugging`).

## 3. Metoda

1. Spustit app (`npm run dev`, port 3000).
2. Projít routy v mobilních šířkách (§2) — DevTools device toolbar nebo skill
   `chrome-devtools-mcp:chrome-devtools` (`resize_page` / `take_screenshot` /
   `take_snapshot`).
3. Pro každou routu projít **checklist** (§4) a zapsat nálezy do tabulky (§6).
4. Overflow detekovat i programově v konzoli:
   ```js
   [...document.querySelectorAll('*')]
     .filter((el) => el.scrollWidth > document.documentElement.clientWidth)
     .map((el) => ({ el, w: el.scrollWidth }))
   ```

## 4. Checklist (na každou routu)

- [ ] **Žádný horizontální scroll** na `<body>` (root už má `overflow-x: hidden`
      v `styles.css:84` — ověřit, že jen maskuje, nebo skutečně neteče).
- [ ] Text se **zalamuje**, nepřetéká (pozor na `white-space: nowrap`
      v `styles.css:298` a `flex-nowrap` v nav).
- [ ] Tlačítka/odkazy mají **tap target ≥ 44×44 px**.
- [ ] Ovládací prvky se **nepřekrývají** a mají rozumný gap.
- [ ] Obrázky/SVG mají `max-width: 100%`.
- [ ] Formuláře/inputy se vejdou na šířku, nepřetékají.
- [ ] Dlouhý text (názvy plánů, váhy) **nerozbíjí** layout.

## 5. Místa s vyšším rizikem (z rychlého scanu kódu)

| Místo | Riziko | Co ověřit |
| --- | --- | --- |
| `Header.tsx` nav | `flex-wrap` + `sm:flex-nowrap`, odkazy `order-3 w-full` | Že se nav na 360 px láme čistě, ne do scrollu. |
| `admin.tsx` layout | `flex-col lg:flex-row` (dva sloupce až od `lg`) | Že na mobilu jde vše do jednoho sloupce a editor plánu se vejde. |
| Editor aktivit v adminu | řádky se sets/reps/weight inputy | Že se inputy nelámou do overflow na úzké šířce. |
| Timer v `index.tsx` | velká čísla / ovládací tlačítka | Že velký časomíra text a tlačítka nepřetékají. |
| `styles.css:298` `nowrap` | text, co se nesmí zalomit | Že na mobilu nezpůsobuje horizontální scroll. |
| `styles.css:381` `overflow-x: auto` | zamýšlený scroll kontejner | Že je to záměr (tabulka?), ne náhodný únik. |
| `page-wrap` `width: min(1080px, 100% - 2rem)` | gutter 1rem | Že 2rem gutter sedí i na 360 px. |

## 6. Formát výstupu (nález)

Tabulka v reportu / issue:

| Routa | Breakpoint | Problém | Závažnost | Návrh opravy |
| --- | --- | --- | --- | --- |
| /admin | 360 px | inputy aktivit přetékají vpravo | high | `flex-wrap` + `min-w-0` na řádek |
| … | | | | |

Závažnost: **high** (overflow / nepoužitelné) · **med** (kostrbaté) ·
**low** (kosmetika).

## 7. Plán

1. Spustit app, připravit šířky 360/390/414/768.
2. Projít 4 routy dle checklistu (§4) + console scan na overflow.
3. Sepsat nálezy do tabulky (§6) seřazené dle závažnosti.
4. (Volitelně) rovnou opravit `high` nálezy v navazujícím PR — typicky
   `flex-wrap`, `min-w-0`, `break-words`, `overflow-x-auto` na správný kontejner,
   zvětšení tap targetů.

## 8. Akceptační kritéria

- Každá ze 4 rout zkontrolovaná na 360/390/414/768 px.
- Žádný **neúmyslný** horizontální scroll (root `overflow-x: hidden` nesmí jen
  zakrývat reálný únik).
- Nálezy zdokumentované v tabulce se závažností a návrhem.
- Tap targety hlavního ovládání ≥ 44 px.

## 9. Otevřené otázky

- Rovnou opravovat v rámci auditu, nebo jen reportovat a oddělit fix do PR?
- Cílové minimum šířky — stačí 360 px, nebo i 320 px (iPhone SE 1. gen)?
