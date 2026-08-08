## 2024-07-15 - ARIA Labels on Icon-Only Buttons

**Learning:** Found multiple instances where icon-only buttons (`lucide-react` components without text) were missing `aria-label` attributes, relying only on `title`. While `title` helps mouse users on hover, `aria-label` is crucial for screen reader users to understand the button's action without visual context.
**Action:** When adding new icon-only buttons, always include an `aria-label` attribute describing the action (e.g., `aria-label="Delete Plan"`).

## 2024-07-20 - [Input Fields Missing Accessible Names]

**Learning:** Found a pattern where several form inputs in admin panels (e.g. ActivityItem, AddActivityForm, PlanMetaForm) lacked explicit `aria-label`s or associated `<label htmlFor="id">` attributes. While they rely on placeholders, visually unlinked labels are not read properly by screen readers, creating an accessibility gap.
**Action:** Always ensure inputs have an explicit accessible name using `aria-label` or `<label htmlFor="...">` when the label element does not explicitly wrap the input or use the `htmlFor` property to target it.

## 2024-08-07 - [Visually Hidden File Inputs Overlay Accessibility]
**Learning:** Found an accessibility pattern where visually hidden `<input type="file" className="... opacity-0">` elements overlaying custom UI buttons (like "Browse Files", "Take Photo") lack ARIA labels. Because the UI button itself is visually informative, the underlying invisible native `<input>` that captures focus/interaction is read generically by screen readers, confusing non-sighted users.
**Action:** When using the pattern of an invisible file input over a styled custom button, ensure the `<input type="file">` explicitly sets an `aria-label` that mirrors the visual intent (e.g., `aria-label="Take Photo"`).

## 2024-08-11 - Dynamic Status Indicators Need ARIA Roles

**Learning:** Found a pulsating colored dot indicator for "Unsaved changes" that only relied on a hover `title`. While sighted users could see the animation and color, and mouse users could see the tooltip, screen reader users navigating the header received no context.
**Action:** When adding dynamic visual status indicators (like colored dots or badges), use `role="status"` and a clear `aria-label` so that assistive technologies announce the state change or convey the meaning explicitly without relying on hover text alone.
