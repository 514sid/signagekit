# Changelog

## 0.1.0

First release.

- `mount()` renders a screen document into any element, scales it to the element's shape and reflows when the element resizes. `update()` swaps the layout or data.
- `check()` and `validate()` report errors and warnings with exact paths, including low contrast and binds that find nothing in the data.
- `signagekit check` does the same from the command line and exits with 1 on errors.
- `previewUrl()` and `signagekit url` pack a screen into a link to the preview tool, for sharing and for screenshots. Screens are sized by resolution, as `WIDTHxHEIGHT` or a name like `fullhd`, `portrait` or `4k` (`SIZES`, `parseSize()`).
- The `now` option freezes the clock, so screenshots of clocks, schedules and countdowns repeat exactly.
- Documents carry a format `version`. Older formats upgrade on load through migrations that load only when needed; newer formats render as far as the library can read them, with warnings for the rest.
- `mount()` and `check()` take `colors`, which win over the document's own, so a screen can be previewed in the other scheme.
- Flow rows whose spans add up to 12 stay as written on screens of the design's orientation; zones still regroup on the other orientation.
- Tables measure and page the same way on every update, page only when their rows don't fit, and spread their rows over spare height.
- Slideshows run edge to edge like images.
- Short zones centre their content vertically. A countdown that doesn't fit shrinks its value like a stat, and in a compact zone its label drops under the value.
- Long status notes end in an ellipsis; an alert banner's footer wraps within a quarter of the banner.
- `schema.json` is about a third smaller: shared properties are defined once. It now accepts `zone` in `clocks` entries, as the checker always did.
- Component titles accept a bind, like `title: { bind: /room/name }`.
- Stats pick the arrangement that lets their value be largest: trend beside or under the value, label under or beside it. Units and trends never shrink below a readable size.
- Cycles wrap their messages in tall, narrow zones instead of cutting them off.
- An image that fails to load shows the zone's empty state; a slideshow skips it.
- Screen styles are scoped to the screen, so they never touch the host page, and host page resets like Tailwind's don't change the screen.
- A Components page in the docs draws every component live with the YAML that makes it.
- 16 example screens in `examples/`, one folder each with a layout and a data file.
- 21 components, flow and fixed layouts, alerts with 31 icons, dark and light schemes, and JSON or YAML for both the layout and the data.
