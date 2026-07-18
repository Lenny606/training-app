## 2024-07-15 - ARIA Labels on Icon-Only Buttons

**Learning:** Found multiple instances where icon-only buttons (`lucide-react` components without text) were missing `aria-label` attributes, relying only on `title`. While `title` helps mouse users on hover, `aria-label` is crucial for screen reader users to understand the button's action without visual context.
**Action:** When adding new icon-only buttons, always include an `aria-label` attribute describing the action (e.g., `aria-label="Delete Plan"`).
