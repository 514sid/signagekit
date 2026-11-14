# Writing screens with an AI assistant

This guide is written to be handed to an assistant along with [format.md](format.md) and, for editors and validation, [schema.json](../schema.json). It covers what makes a screen read well from across a room and the mistakes assistants make most often.

## How to work

Write the layout once and put everything that changes in the data. A menu, a score, a list of arrivals or an alert lives in the data; the layout only says where it goes. After the first version, an update rewrites the data and leaves the layout alone, so a screen can't break because a value changed.

Run `npx @514sid/signagekit check layout.yml data.yml` after every change and fix everything it prints, warnings included. A warning that a bind finds nothing in the data is almost always a typo in a path, and it shows as a dash on the screen. Then look at it. `npx @514sid/signagekit url layout.yml data.yml --mode sizes` prints a link to the [preview tool](preview.md); screenshot it once `html[data-status="ready"]` appears and check the screen at every resolution. Pass `--now` with a fixed time so clocks and schedules match between screenshots.

## Layout

- Start every document with `version: 1`, so it keeps working when the format changes.

- Use a `flow` layout. Design it once for the orientation the screen mostly has (`design: landscape` or `portrait`), and it adapts to other shapes. Use `areas` only when a screen must look exactly as drawn.
- Give headers and footers a fixed height in px, about 120 to 170 for a heading and 90 to 120 for a strip of messages. Let everything else share the remaining height with plain numbers.
- Spans are out of 12 columns. Two or three zones per row reads well on a landscape screen; one or two on portrait.
- Fewer, bigger zones read from further away. A screen seen from across a room works best with four to six zones and short lists. Each extra zone makes every text smaller.

## Content

- Don't set `size`. signagekit sizes all text together after every render, so tables, lists and stats on one screen share sizes. Pin a size only when the person asks for one.
- Keep text short. Headings are a few words, cycle messages are one line each, and table cells are a word or a number. Long text doesn't shrink to fit: lists drop rows with "+N more" and tables page.
- Use `stat` with `thresholds` instead of writing states into the data, so the data only carries numbers: `thresholds: { warning: 80, danger: 95 }`. With danger below warning, lower is worse.
- Show state with `state`, never with color alone. States add an icon and a label as well as a color.
- Give a bind a `fallback` when the value may be missing and a dash would confuse people: `{ bind: /wait, fallback: Ask at the desk }`.
- Pick the component that matches the data: `bars` for a ranking, `meters` for values against limits, `split` for parts of one whole, `chart` for change over time, `status` for things that are up or down, `schedule` for a timetable, `queue` for "now serving".
- Never ask for scrolling or moving text. `cycle` swaps whole messages instantly.

## Alerts

Bind the alert to the data, `alert: { bind: /alert }`, so raising one and clearing it are data changes:

```yaml
alert:
  level: danger
  icon: fire
  title: Fire alarm
  message: Leave the building now by the nearest exit.
  steps: [Do not use the lifts, Gather at assembly point B]
```

Set it to `null` to bring the screen back. Pick the `icon` that names the situation from the list in [format.md](format.md#icons), keep the title to a few words, and put instructions in `steps`, one action each. Use `mode: banner` for notices that shouldn't hide the screen, and `until` for ones that should end on their own.

## Colors

Set `colors.scheme` so the screen looks the same everywhere, and set `accent` only when the person names a brand color. Fix every contrast warning: change the color the warning names, or remove it and let the scheme supply one.

## YAML

YAML data is read as text, so `4.50` stays `4.50`. In the layout, quote values that must stay text, like `delta: '+0.04'`. Quote any value that starts with `%`, `#`, `@` or `*`, and any value containing `: ` or, inside `{ }` and `[ ]`, a comma. When in doubt, write JSON.

## A prompt to start from

> You write screens for signagekit. A screen is a layout document and a data object, both YAML. Follow schema.json and docs/assistants.md. Put every value that can change in the data and bind to it. Use a flow layout with at most six zones. Don't set text sizes. After writing, run `npx @514sid/signagekit check` and fix every error and warning, then screenshot the link from `npx @514sid/signagekit url --mode sizes` and fix anything that looks cramped or empty before you answer. For later changes, edit only the data unless the person asks for a different layout.
