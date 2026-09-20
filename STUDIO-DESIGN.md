# Studio index — approved design

This is the selected September 2026 redesign, superseding the earlier terminal-style visual direction.

## Color and type

- Paper `#F4F4F4`, ink `#1D2027`, aqua `#169E79`, guava `#DF6B78`.
- Colors are sampled from the user's wardrobe photographs, not approximated color names.
- Space Grotesk 500 for headings; IBM Plex Sans for prose; IBM Plex Mono for metadata and code.
- Dark text on aqua and guava. Aqua marks navigation and major rules; guava fills audio and download panels.
- 6px corners, translucent ink dividers, gentle tracking, and slightly generous spacing.

## Structure

- Desktop identity rail and content column; stacked identity with horizontal navigation below 760px.
- Latest entry leads the journal, selected recent media stays inline, older entries use compact dated rows.
- Recordings and Experiments are complete archive views derived from media and tags, not filters of only the current page.
- Full content, media, tags, embedded experiments, RSS, calendar, pagination, canonical URLs, and unlisted-entry rules remain supported.
- Articles have one page H1, an optional contents list, related entries, and comfortable reading type.
- Firmware posts retain original cautions and compatibility details. Copy/wrap controls never modify source code.

## Media and technical components

- Short audio recordings have native no-JavaScript controls and enhanced play/pause/seek controls, explicit loading/error states, and a direct-file fallback.
- Large sample collections retain the existing lazy audio gallery.
- Players coordinate using `patchlog:play`; navigation pauses audio. Persistent playback is intentionally not enabled.
- Component-based YouTube embeds load on request and retain an external fallback. Embedded HTML media in Markdown is preserved.
- Code blocks support copy, horizontal scrolling, and optional wrapping; tables get accessible scroll regions.
- Same-origin firmware manifests have a download action. The HEX signal diagram is an explanatory rendering of existing controls.

## Deployment

Use the existing GitHub master branch and Railway service. Commit only redesign files. Preserve unrelated working-tree changes.
Deploy an isolated export of the committed source, not the developer working directory, so unrelated uncommitted assets cannot be published.
