## 2024-07-15 - ARIA Labels on Icon-Only Buttons

**Learning:** Found multiple instances where icon-only buttons (`lucide-react` components without text) were missing `aria-label` attributes, relying only on `title`. While `title` helps mouse users on hover, `aria-label` is crucial for screen reader users to understand the button's action without visual context.
**Action:** When adding new icon-only buttons, always include an `aria-label` attribute describing the action (e.g., `aria-label="Delete Plan"`).

## 2024-07-20 - [Input Fields Missing Accessible Names]

**Learning:** Found a pattern where several form inputs in admin panels (e.g. ActivityItem, AddActivityForm, PlanMetaForm) lacked explicit `aria-label`s or associated `<label htmlFor="id">` attributes. While they rely on placeholders, visually unlinked labels are not read properly by screen readers, creating an accessibility gap.
**Action:** Always ensure inputs have an explicit accessible name using `aria-label` or `<label htmlFor="...">` when the label element does not explicitly wrap the input or use the `htmlFor` property to target it.

## 2024-05-18 - Explicit ARIA Labels for Inputs Without Visible Labels
**Learning:** In compact UI elements like lists or data tables where visible `<label>` elements are omitted to save space, it's critical to add explicit `aria-label` attributes to `<input>` and `<textarea>` elements. Relying solely on `placeholder` text as a label for screen readers is a known anti-pattern, because the placeholder text is no longer read once the field is populated with data.
**Action:** Always verify that every form input and textarea has an accessible name, either via an explicit, linked `<label>` or an `aria-label` attribute if a visible label is visually omitted due to layout constraints.
