# Specifikace: Drag & Drop řazení v administraci

Status: Draft · Cíl: vývojový plán pro DnD UX v adminu
Nahrazuje/doplňuje současné řazení **šipkami**.

## 1. Motivace

V adminu se dnes řadí **šipkami nahoru/dolů**:

- **Aktivity v plánu** — `moveActivity(index, 'up'|'down')` v
  `src/hooks/useAdminState.ts:117`, přes `swapArrayElements` (swap sousedů).
  Tlačítka `ArrowUp`/`ArrowDown` v `src/components/admin/ActivityItem.tsx`
  (`disabled` na `isFirst`/`isLast`).
- **Plány v seznamu** — `src/components/admin/PlansSidebar.tsx` zatím **řazení
  nemá**; pořadí = pořadí v poli.

Šipky jsou pomalé pro přesun přes víc pozic. Cíl: **drag & drop** pro přesun
bloku (aktivity) v plánu i pro přesun plánu v seznamu, s plnou klávesnicovou a
dotykovou podporou (ne regrese přístupnosti).

## 2. Rozsah

### V rozsahu

- DnD řazení **aktivit** uvnitř editovaného plánu.
- DnD řazení **plánů** v sidebaru.
- Drag handle, vizuální feedback (overlay, drop indikátor).
- Klávesnicová a dotyková podpora.

### Mimo rozsah

- Přesun aktivity mezi různými plány (jen v rámci jednoho plánu).
- Vnořené skupiny / supersety.
- Změny v běžeckém timeru (`index.tsx`).

## 3. Klíčová rozhodnutí

| Oblast         | Volba                                                                    | Důvod                                                                                                                 |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Knihovna       | **@dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`)                     | Moderní, React 19 ready, přístupné (klávesnice), dotyk, malý overhead. Lepší než nativní HTML5 DnD (špatný touch UX). |
| Move sémantika | **`arrayMove(from, to)`** (z `@dnd-kit/sortable`)                        | DnD je přesun na libovolnou pozici, ne swap sousedů jako dnes.                                                        |
| Aktivace dragu | **dedikovaný drag handle** (ikona `GripVertical`)                        | Řádek aktivity obsahuje inputy (sets/reps/weight) — drag nesmí kolidovat s editací.                                   |
| Senzory        | `PointerSensor` + `KeyboardSensor` (+ touch) s **activation constraint** | Drobný pohyb/zpoždění, aby klik do inputu nespustil drag.                                                             |
| Přístupnost    | **zachovat klávesnicové řazení**                                         | dnd-kit `KeyboardSensor` + `sortableKeyboardCoordinates`; šipky lze ponechat jako fallback (§7).                      |

> `modern-web-guidance` skill spustit před implementací (klientský JS/UX).

## 4. Architektura

dnd-kit pattern: `DndContext` (senzory, `onDragEnd`) → `SortableContext`
(seznam `id`, strategie `verticalListSortingStrategy`) → každá položka
`useSortable({ id })` (transform, transition, listeners na handle).

```
DndContext (onDragEnd → reorder)
  SortableContext (items = ids, vertical)
    SortableItem … (useSortable)        ← drag handle + obsah
  DragOverlay (náhled taženého prvku)
```

`onDragEnd({ active, over })`: pokud `over && active.id !== over.id`, spočítat
`oldIndex`/`newIndex` z id a zavolat reorder handler s `arrayMove`.

## 5. Aktivity (v plánu)

- `useAdminState.ts`: přidat `reorderActivity(from: number, to: number)` —
  `activities: arrayMove(editingPlan.activities, from, to)`, `hasUnsavedChanges = true`.
  Stávající `moveActivity('up'|'down')` ponechat pro klávesnicový/šipkový fallback
  (interně přemapovat na `reorderActivity`).
- `ActivitiesList.tsx`: obalit `DndContext` + `SortableContext`
  (`items = activities.map(a => a.id)`). `id` = `activity.id` (existuje).
- `ActivityItem.tsx`: `useSortable({ id: activity.id })`, drag handle
  (`GripVertical`) vlevo, aplikovat `transform`/`transition`. Inputy zůstávají
  editovatelné (handle izoluje listeners).
- Perzistence: beze změny — pořadí se uloží se zbytkem plánu přes existující
  „Save" tok (`editingPlan` + `hasUnsavedChanges`). Po napojení na repozitář
  (viz repository-layer) update přepíše `activities.position`.

## 6. Plány (v sidebaru)

- `PlansSidebar.tsx`: stejný DnD pattern, `items = plans.map(p => p.id)`.
- `reorderPlans(from, to)` handler v `useAdminState.ts`.
- **Perzistence pořadí plánů**: sidebar nemá „Save" tlačítko → pořadí se musí
  uložit **okamžitě** po dropu. To vyžaduje **trvalé pořadí plánů**:
  - dnešní model `TrainingPlan` **nemá** order/position pole;
  - repository-layer spec zavedl `position` jen u `activities`, **ne u `plans`**.
  - → **Závislost:** přidat `position` (integer) do tabulky `plans` + do
    doménového typu, řadit `list()` podle něj, a `reorderPlans` perzistovat přes
    repozitář (`updatePlanPositions(orderedIds)` nebo bulk update v transakci).

## 7. Přístupnost a dotyk

- **Klávesnice**: `KeyboardSensor` — fokus na handle, Space/Enter zvedne, šipky
  posouvají, Space/Enter položí, Esc zruší. Alternativně ponechat viditelné
  šipky jako sekundární ovládání.
- **Dotyk**: `PointerSensor` s `activationConstraint` (distance ~8px nebo
  delay ~150ms), aby scroll/klik do inputu nezačal drag. Handle dostatečně velký
  (≥ 44px tap target — viz mobile-style-audit).
- **Screen reader**: dnd-kit `announcements` (výchozí hlášení o uchopení/přesunu/
  položení); ponechat/lokalizovat.
- `reduced-motion`: respektovat `prefers-reduced-motion` (zkrátit transition).

## 8. Vizuální feedback

- Tažený prvek: snížená opacita v seznamu + `DragOverlay` s náhledem.
- Drop pozice: posun ostatních prvků (built-in `transition`), případně linka.
- Handle: `cursor: grab` / `grabbing`, viditelný na hover i focus.

## 9. Soubory

```
src/
  hooks/useAdminState.ts             # reorderActivity, reorderPlans (arrayMove)
  components/admin/
    ActivitiesList.tsx               # DndContext + SortableContext (aktivity)
    ActivityItem.tsx                 # useSortable + drag handle
    PlansSidebar.tsx                 # DndContext + SortableContext (plány)
  db/schema.ts                       # plans.position  (závislost §6)
  domain/plans.ts                    # TrainingPlan.position
  repositories/plan-repository.ts    # list() řadí dle position; reorder/bulk update
```

## 10. Plán implementace (kroky)

1. **Závislost** — `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`.
2. **Aktivity DnD** — `reorderActivity` + obalit `ActivitiesList`/`ActivityItem`
   (`id` už existuje). Drag handle, senzory, overlay.
3. **Fallback šipek** — ponechat/přemapovat na `reorderActivity` (klávesnice).
4. **Plán pořadí — model** — `plans.position` do schématu + doménového typu,
   migrace; `list()` řadí dle `position`.
5. **Repozitář** — `reorderPlans(orderedIds)` (bulk update v transakci).
6. **Plány DnD** — `PlansSidebar` + `reorderPlans` s okamžitou perzistencí.
7. **A11y/touch** — klávesnicový sensor, activation constraint, announcements,
   reduced-motion, velikost handle.
8. **Verifikace** — `/verify` (lint, `tsc`, test, build) + ruční test myš/
   klávesnice/dotyk; mobil dle mobile-style-audit.

## 11. Akceptační kritéria

- Aktivitu lze přetáhnout na libovolnou pozici v plánu; pořadí se uloží se
  zbytkem plánu.
- Plán lze přetáhnout v sidebaru; nové pořadí **přežije reload** (perzistováno).
- Drag jde ovládat **myší, klávesnicí i dotykem**; editace inputů aktivit dragem
  neruší.
- Drag handle ≥ 44px, viditelný feedback při tažení.
- `prefers-reduced-motion` respektováno; žádná regrese přístupnosti oproti
  šipkám.
- `tsc --noEmit`, lint, test, build zelené.

## 12. Otevřené otázky

- Ponechat viditelné šipky vedle dragu (redundantní, ale jistota a11y), nebo je
  nahradit jen klávesnicovým sensorem?
- `plans.position`: souvislé přečíslování při každém reorderu vs. „sparse"
  (fractional) indexy kvůli levnějšímu zápisu — pro malý seznam stačí přečíslovat.
- Perzistence pořadí plánů: okamžitě po dropu (UX bez tlačítka) — potvrdit oproti
  vzoru „unsaved changes" u editace plánu (nekonzistence: sidebar ukládá hned,
  editor přes Save).
