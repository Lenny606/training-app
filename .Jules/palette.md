## 2026-07-12 - Add aria-labels to PlaybackControls buttons
**Learning:** Icon-only playback controls rely solely on title attributes which aren't fully robust for screen readers. Added aria-labels mirroring the titles for Play/Pause, Stop, Previous, and Next buttons.
**Action:** Always include aria-label or accessible text inside icon-only buttons to ensure they are screen-reader friendly.
## 2024-05-23 - Add aria-label to Remove media button
**Learning:** The "Remove media" button in MediaUpload.tsx used a `title` attribute for accessibility, which isn't fully robust for screen readers. Added `aria-label="Remove media"` to ensure it's screen-reader friendly.
**Action:** Always include an explicit `aria-label` attribute on icon-only buttons, even if they have a `title` attribute.
