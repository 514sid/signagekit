# Document format

A screen is one document, JSON or YAML, plus an optional data object. The document holds the shape of the screen; the data holds anything that changes: values, states, list rows, messages. Something that updates the screen then only rewrites the data.

[schema.json](../schema.json) has every property with its default; editors that read JSON Schema autocomplete and check documents against it.

## Example

```yaml
# yaml-language-server: $schema=https://unpkg.com/@514sid/signagekit/schema.json
colors:
  scheme: dark
  accent: '#2563eb'

layout:
  design: landscape
  flow:
    - { zone: head, span: 9, height: 150px }
    - { zone: clock, span: 3, height: 150px }
    - { zone: menu, span: 8, height: 3 }
    - { zone: side, span: 4, height: 3 }

zones:
  head: { type: heading, text: Today's lunch }
  clock: { type: clock, show_date: true }
  menu:
    { type: table, title: Menu, columns: [Dish, Price], rows: { bind: /menu } }
  side: { type: list, title: Notices, items: { bind: /notices } }
```

[examples/lunch](../examples/lunch/) has this screen in full. [examples/](../examples/) has more, one folder per screen with its layout and data.

## Layout

The canvas is 1080 px on the screen's short side and follows its shape, so a 4:3, 21:9 or portrait screen is never letterboxed. All sizes in a document are px on that canvas.

A `flow` layout lists zones in reading order and is designed once, for landscape or portrait (`design`, default landscape). `span` is the zone's width in the design orientation, out of 12 columns (default 12). `height` is a share of the free height, like CSS `fr` (default 1), or fixed pixels such as `150px`.

On a screen of another shape each zone keeps about its designed width. On a narrower screen zones take more columns and move to new rows; on a wider one they shrink up to a quarter to share a row. Every row fills the full width, and zones in a row take the tallest height in it. A fixed-height strip, like a header or footer, never shares a row with zones that grow. On a screen of the design's own orientation, a row whose spans add up to 12 stays exactly as written.

For a screen that must stay exactly as drawn, `areas` takes a fixed CSS grid instead (`areas`, `columns`, `rows`). It doesn't reflow for other shapes.

Zone names use lowercase letters, digits, `-` and `_`, and start with a letter. A zone in `zones` that the layout doesn't place is a warning; a name in the layout without a zone is left empty.

## Components

Every component can also take `title` (a small label above it), `icon` (shown before the title), `surface` (`base`, `raised` or `accent`), `size` and `weight` (see [Adjusting by hand](#adjusting-by-hand)).

| Type        | Shows                                                                                  | Required                   |
| ----------- | -------------------------------------------------------------------------------------- | -------------------------- |
| `heading`   | Large title filling its zone                                                           | `text`                     |
| `text`      | Paragraph; `fit: true` fills the zone, else `size` s, m, l or xl                       | `text`                     |
| `stat`      | Big number with `unit`, `label`, `state`, `thresholds`, `trend`, `spark`               | `value`                    |
| `meter`     | One value against `max` (default 100) with a bar                                       | `value`                    |
| `meters`    | One row per item, value against limit, bars lined up                                   | `items`                    |
| `bars`      | Ranked horizontal bars, largest first                                                  | `items`                    |
| `split`     | One whole in up to six parts, shares printed                                           | `items`                    |
| `chart`     | Line, area or column chart, with optional `target` line                                | `kind`, `labels`, `series` |
| `table`     | Rows and columns; pages when rows don't fit                                            | `columns`, `rows`          |
| `list`      | Bulleted list                                                                          | `items`                    |
| `status`    | Rows with a state icon each, like service health                                       | `items`                    |
| `schedule`  | Entries from the current one on, with Now and Next marked                              | `items`                    |
| `queue`     | "Now serving" number and the recently called ones                                      | `current`                  |
| `clock`     | Current time, optionally the date                                                      |                            |
| `clocks`    | One clock per time zone                                                                | `zones`                    |
| `countdown` | Time left until `to`; shows `done` (default "Now") once it has passed                  | `to`                       |
| `cycle`     | One-line messages that swap instantly on a timer, never scrolling                      | `items`                    |
| `image`     | Image from an https URL                                                                | `src`                      |
| `slideshow` | Images swapped instantly on a timer                                                    | `images`                   |
| `qr`        | QR code, black on white so phones can scan it                                          | `value`                    |
| `stack`     | Splits a zone into parts holding other components; `direction` row or column (default) | `items`                    |

The schema has every property, with defaults.

## Data

### Binding

Any value can be a literal or a bind: `{ bind: /menu/0/2 }` reads key `menu`, item 0, item 2. Add `fallback` to show something when the path is missing or empty: `{ bind: /wait, fallback: Ask at the desk }`.

Bound lists take the same shape as their literal form:

| Component                    | Each item                         |
| ---------------------------- | --------------------------------- |
| `table.rows`                 | an array of cells                 |
| `list`, `cycle`, `slideshow` | a string                          |
| `meters`, `bars`, `split`    | `{ label, value, max?, state? }`  |
| `status`                     | `{ label, state, note? }`         |
| `schedule`                   | `{ start, end?, title, detail? }` |
| chart `labels` and `values`  | a string or number per point      |

### Missing and empty values

Nothing breaks and nothing renders as a blank box:

- A missing single value (a stat, a meter, a queue number, a table cell) shows a dash, unless its bind has a `fallback`.
- Empty list items are skipped, and an empty list, table, chart, cycle or schedule shows "Nothing to show" (or similar).
- A countdown past its time shows its `done` text.
- `check()`, `mount()` and the `signagekit check` command warn about every bind whose path isn't in the data.

### Numbers and text

YAML data is read with every value as text, so a price written as `4.50` stays `4.50`. JSON data keeps its numbers. Either way, components that need numbers (meters, bars, charts, thresholds) read numeric text like `1,240` as a number, and stats shorten values from 10,000 up (`format: full` shows every digit).

A YAML layout uses the core schema, so `true`, `24` and `+6` are a boolean and numbers. Quote layout values that must stay text: `delta: '+0.04'` keeps its plus sign. In YAML generally, quote any value that starts with `%`, `#`, `@` or `*`, and any value containing `: ` or, inside `{ }` and `[ ]`, a comma.

## How text is sized

You don't set sizes; signagekit does, after every render, for the zone sizes on the actual screen:

- Small zones get tighter padding, and short strips put their title beside the content, so content always has room.
- Text grows to fill its zone, then snaps to a type scale. Row-based components (tables, lists, status, meters, bars, schedules, world clocks) share one body size across the screen. Stats and countdowns in a row share a size, so values and labels line up. Headings and cycles stay within a few times the body size.
- Text never goes below a readable size (22 px). Lists that don't fit drop whole rows from the end and say "+N more"; tables page; a table too wide truncates its widest column with an ellipsis; long titles and labels end in an ellipsis.
- A row of three or more narrow stats in a stack wraps into two columns.

## Adjusting by hand

Every automatic choice can be overridden:

| Property           | On                 | Does                                                                    |
| ------------------ | ------------------ | ----------------------------------------------------------------------- |
| `size`             | any component      | Pins the text size in px and skips automatic sizing for that zone       |
| `weight`           | parts of a `stack` | Share of the space relative to siblings, like 1 and 3 (default 1)       |
| `match_row: false` | `stat`             | Keeps its own size instead of matching its row                          |
| `format: full`     | `stat`             | Shows every digit instead of 1.2M                                       |
| `page_rows`        | `table`            | Most rows per page (pages still shrink if fewer fit)                    |
| `widths`           | `table`            | Relative column widths, like `[3, 1, 1]`; long cells end in an ellipsis |
| `y_min`, `y_max`   | `chart`            | Fixed y-axis range                                                      |
| `limit`            | `bars`             | Rows to show (default 12)                                               |

## States, thresholds and trends

`stat` and `meter` take `state`: `neutral`, `good`, `warning` or `danger`, literal or bound. A state adds a colored strip across the top of the zone (down its left edge in short zones) and a badge by the label with a check, an exclamation mark or a cross, so it never relies on color alone. In short zones, where the label may not fit, the badge moves into the title line. The label defaults to Good, Warning or Danger.

`thresholds` sets the state from the value, so data only carries numbers: `{ warning: 80, danger: 95 }` shows warning from 80 and danger from 95. With danger below warning, lower is worse: `{ warning: 40, danger: 20 }` for a battery. An explicit `state` wins. On `meters`, thresholds apply to each row without its own state.

A `stat` can show a trend arrow: `trend` is `up`, `down` or `flat`, `delta` is text beside it like `+12%`, and `good_when` (`up` or `down`) colors the arrow green when the move is good news and red when it isn't. Without `good_when` the arrow stays neutral. `spark` adds recent values as a small line under the number.

## Charts

`chart` draws line, area and column charts with [uPlot](https://github.com/leeoniya/uPlot), loaded only on screens that have one. Series take colors from a fixed order checked for color blindness and contrast on both schemes. Two or more series get a legend with each series' latest value; column charts print each value on its bar. `target` draws a labelled line, like a goal or an SLO, and stays in view. Column and area charts start at zero; `y_min` and `y_max` fix the range. Charts don't animate and have no hover, since screens aren't interactive.

## Alerts

One `alert` block covers every screen-wide message, from an evacuation to a maintenance notice:

```yaml
alert:
  level: danger # info, good (all clear), warning or danger
  icon: fire # names the situation; see the icon list below
  title: Fire alarm # short, shown very large
  message: Leave the building now by the nearest exit.
  steps: # numbered instructions
    - Do not use the lifts
    - Gather at assembly point B
  footer: Wait for the all clear.
  mode: takeover # or banner: a strip across the top, screen stays visible
  until: '2026-11-14T15:00:00Z' # optional: stops showing after this time
```

It shows while its `title` or `message` is set. Bind the whole alert to the data, `alert: { bind: /alert }`, and an assistant raises or clears it by writing the data alone: an object with the fields above shows it, and `null` or an empty object brings the screen back. Unknown levels show as danger and unknown icons fall back to the level's icon, so a bad value never hides an alert. The older `text` and `state` fields still work as `message` and `level`.

### Icons

Alerts and zone titles share one set of icons from [Lucide](https://lucide.dev): `info`, `check`, `warning`, `danger`, `fire`, `evacuate`, `assembly`, `medical`, `first-aid`, `storm`, `wind`, `snow`, `flood`, `heat`, `lockdown`, `shelter`, `security`, `power`, `water`, `network`, `closed`, `delay`, `maintenance`, `announcement`, `phone`, `biohazard`, `radiation`, `chemical`, `event`, `location` and `accessibility`. Any zone can set `icon` to show one before its title in place of the square marker. Storybook shows them all under Components → Alerts → Icons.

## Colors

All colors come from the `colors` block as hex values: `background`, `surface`, `text`, `muted`, `line`, `accent`, `on_accent`, and the state colors `good`, `warning` and `danger`. `scheme` (`dark` or `light`) fills in whatever is left out; without it the `scheme` passed to `mount()` decides (default dark), so set it when a screen must look the same everywhere. `accent` defaults to the accent passed to `mount()`, else `#2563eb`, and `on_accent` to whichever of near-black and white reads better on it. signagekit warns when text has less than 4.5:1 contrast with its background, and when a state color leaves its icon under 3:1.

## Versions

`version` says which format a document is written in. Leaving it out means format 1, the current one; writing `version: 1` keeps the document unambiguous when the format changes later.

When the format changes, signagekit keeps reading the old one. A document in an older format is upgraded on load, one version at a time, and any property with no place in the new format is reported as a warning. Each upgrade step is its own small file, loaded only for documents that need it, so current documents load no upgrade code.

A document in a newer format than the library reads is shown as far as it can be. Everything the library knows renders; newer properties and component types are skipped with warnings, and the first warning names the format the document was written for. A screen therefore never goes blank because a player runs an older version.

The data has no version of its own. Its shape follows the binds in the layout.

## Errors

Errors drop only what they affect: a broken layout renders nothing, a broken zone is left out and the rest of the screen renders, and warnings never block rendering. Every message names the exact path, like `zones.menu.rows: expected an array or a bind`.
