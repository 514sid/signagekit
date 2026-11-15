# API

## Mounting a screen

Give `mount()` an element and a document. The screen fills the element, so size the element the way you want the screen.

```js
import { mount } from '@514sid/signagekit'
import '@514sid/signagekit/style.css'

const screen = await mount(document.getElementById('screen'), {
  layout: layoutYamlOrObject,
  data: { menu: [['Tomato soup', '4.50']], wait: 6 },
})

// Later, when the values change:
await screen.update({ data: { menu: [...], wait: 12 } })
```

Without a bundler, load it as a module with an import map. The YAML parser, uPlot and the QR encoder only download when a screen needs them.

Map `yaml` to jsDelivr's bundled `+esm` build, as below. The package's own `browser/index.js` is about 70 separate modules that load one level at a time, which adds over a second before a YAML screen shows on a slow network.

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@514sid/signagekit@0.0.3/dist/style.css"
/>
<script type="importmap">
  {
    "imports": {
      "@514sid/signagekit": "https://cdn.jsdelivr.net/npm/@514sid/signagekit@0.0.3/dist/index.js",
      "preact": "https://cdn.jsdelivr.net/npm/preact@10.27.2/dist/preact.module.js",
      "preact/hooks": "https://cdn.jsdelivr.net/npm/preact@10.27.2/hooks/dist/hooks.module.js",
      "preact/jsx-runtime": "https://cdn.jsdelivr.net/npm/preact@10.27.2/jsx-runtime/dist/jsxRuntime.module.js",
      "uplot": "https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.esm.js",
      "uqr": "https://cdn.jsdelivr.net/npm/uqr@0.1.3/dist/index.mjs",
      "yaml": "https://cdn.jsdelivr.net/npm/yaml@2.9.1/+esm"
    }
  }
</script>
<div id="screen" style="position: fixed; inset: 0"></div>
<script type="module">
  import { mount } from '@514sid/signagekit'
  await mount(document.getElementById('screen'), { layout: '...', data: '...' })
</script>
```

## `mount(element, options)`

Renders a document into `element` and resolves with a handle once the screen is drawn, charts included. The canvas is 1080 px on the element's short side and follows its shape, then scales to fit with one CSS transform. When the element changes size, the layout reflows.

| Option         | Default          | What it does                                                         |
| -------------- | ---------------- | -------------------------------------------------------------------- |
| `layout`       | required         | The document: JSON or YAML text, or an object.                       |
| `data`         | `{}`             | Values that binds read: JSON or YAML text, or an object.             |
| `scheme`       | `'dark'`         | `'dark'` or `'light'`, used when the document doesn't set one.       |
| `accent`       | `'#2563eb'`      | Accent color, used when the document doesn't set one.                |
| `colors`       | none             | Colors that win over the document's own, like `{ scheme: 'light' }`. |
| `timeZone`     | device time zone | IANA time zone for clocks, dates and schedules.                      |
| `locale`       | device locale    | BCP 47 locale for dates and times.                                   |
| `showProblems` | `false`          | Shows errors and warnings over the screen. Useful while building.    |
| `now`          | live clock       | A `Date` that freezes the clock, for screenshots and tests.          |

`timeZone`, `locale` and `now` belong to the screen they are given to: several screens on one page can each use their own.

The handle has:

- `update({ layout?, data? })` replaces either or both and renders again.
- `errors` and `warnings` hold the messages from the last check.
- `report(message)` adds an error, which `showProblems` displays. Use it for your own failures, like a data request that didn't come back.
- `destroy()` removes the screen and stops watching the element's size.

`mount()` never throws on a bad document. Errors drop only what they affect: a broken layout renders nothing, a broken zone is left out, and warnings never block rendering.

## `check(layout, data?, options?)`

Parses and validates a document without rendering it. Resolves with `{ doc, data, errors, warnings }`. Run it on anything an assistant wrote before showing it. Options are `scheme`, `accent` and `colors`, which the contrast check uses, and `checkBinds: false`, which skips the warnings about binds that find nothing in the data, for data that arrives later.

## `validate(object)`

The synchronous core of `check()`, for an already parsed document. Returns `{ doc, errors, warnings }`. It doesn't upgrade older formats, since upgrades load on demand; use `check()` for documents that may be old.

## `previewUrl(layout, data?, options?)`

Resolves with a link to the [preview tool](preview.md) showing the screen. Options are the preview's parameters: `mode`, `size`, `scheme`, `accent`, `timeZone`, `locale`, `now` and `problems`, plus `base` for your own copy of the site. `pack()` and `unpack()` encode and decode the `#s=` part on their own.

## Also exported

`FORMAT` is the newest document format this version reads. `canvasSize(width, height)` returns the canvas size for a screen. `COLOR_KEYS`, `SCHEMES`, `ICON_NAMES` and `LEVELS` list the allowed colors, schemes, icons and alert levels. Every document type is exported too, from `ScreenDoc` down to each component.

## Command line

```bash
npx @514sid/signagekit check screen.layout.yml screen.data.yml
```

Prints every error and warning with its exact path, low contrast and binds that find nothing in the data. It exits with 1 when there are errors, so it works as a gate in scripts and as a feedback loop for an assistant. `--scheme light` and `--accent '#hex'` match the contrast check to how you'll mount the screen.

```bash
npx @514sid/signagekit url screen.layout.yml screen.data.yml --mode sizes --now 2026-11-14T09:30
```

Prints a [preview](preview.md) link with the screen packed into it. It takes every preview parameter as a flag: `--mode`, `--size`, `--scheme`, `--accent`, `--tz`, `--locale`, `--now`, `--problems` and `--base`.

## Browser support

Browsers from 2020 on: current Chrome, Edge, Firefox and Safari, and the Chromium builds in signage players, smart TVs and sticks. It needs ES2020 and CSS grid. `ResizeObserver` is used when present.
