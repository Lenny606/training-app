## 2024-05-24 - Accessibility Labels for Icon Buttons
**Learning:** Found several icon-only buttons across admin components (`ActivityItem`, `PlansSidebar`, `MediaUpload`) that relied solely on `title` for tooltip display but lacked explicit screen-reader `aria-label`s.
**Action:** Always ensure that icon-only interactive elements contain an explicit `aria-label` in addition to or instead of just a `title` attribute, ensuring proper accessibility for assistive technology users navigating lists or forms.
