## 2026-07-12 - Add aria-labels to PlaybackControls buttons
**Learning:** Icon-only playback controls rely solely on title attributes which aren't fully robust for screen readers. Added aria-labels mirroring the titles for Play/Pause, Stop, Previous, and Next buttons.
**Action:** Always include aria-label or accessible text inside icon-only buttons to ensure they are screen-reader friendly.
