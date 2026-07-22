## 2024-07-15 - ARIA Labels on Icon-Only Buttons

**Learning:** Found multiple instances where icon-only buttons (`lucide-react` components without text) were missing `aria-label` attributes, relying only on `title`. While `title` helps mouse users on hover, `aria-label` is crucial for screen reader users to understand the button's action without visual context.
**Action:** When adding new icon-only buttons, always include an `aria-label` attribute describing the action (e.g., `aria-label="Delete Plan"`).

## 2024-07-20 - [Input Fields Missing Accessible Names]

**Learning:** Found a pattern where several form inputs in admin panels (e.g. ActivityItem, AddActivityForm, PlanMetaForm) lacked explicit `aria-label`s or associated `<label htmlFor="id">` attributes. While they rely on placeholders, visually unlinked labels are not read properly by screen readers, creating an accessibility gap.
**Action:** Always ensure inputs have an explicit accessible name using `aria-label` or `<label htmlFor="...">` when the label element does not explicitly wrap the input or use the `htmlFor` property to target it.
