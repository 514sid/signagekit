# Preview tool

The preview page renders a screen from its URL, so a person can share a screen as a link and an AI assistant can screenshot what it built. Everything it needs is in the URL; nothing is uploaded.

```bash
npx @514sid/signagekit url screen.layout.yml screen.data.yml --mode sizes
```

prints a link like `https://signagekit.514sid.com/preview/?mode=sizes#s=rVXfb9s2...`. The layout and data are compressed into the part after `#s=`, which browsers never send to a server.

## Modes

| `mode`    | Shows                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| `screen`  | One screen. With `size`, at that resolution; without, the window is the screen. The default.                      |
| `sizes`   | The screen at several resolutions side by side, to check that a flow layout adapts. Problems are listed.          |
| `schemes` | The screen in the dark and the light scheme side by side.                                                         |
| `edit`    | An editor for the layout and data with the screen beside it, and a resolution menu. The link updates as you type. |

## Parameters

| Parameter                | Example                         | Does                                                                                                   |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `#s=`                    | from `signagekit url`           | The layout and data, compressed. Use this one when you can.                                            |
| `layout`, `data`         | `?layout=%7B...%7D`             | The layout and data as URL-encoded JSON or YAML, for short documents.                                  |
| `layout_url`, `data_url` | `?layout_url=https://...`       | Fetch the layout and data from URLs. The server must allow cross-origin requests.                      |
| `example`                | `noc-wall`                      | One of the [examples](../examples/).                                                                   |
| `mode`                   | `sizes`                         | See above.                                                                                             |
| `size`                   | `portrait` or `fullhd,1366x768` | Resolutions, by name or as `WIDTHxHEIGHT`. One for `screen`, `schemes` and `edit`; a list for `sizes`. |
| `frame`                  | `480`                           | In `sizes` and `schemes`, the long side of each screen on the page in px. Default 640.                 |
| `scheme`                 | `light`                         | Shows the screen in this scheme, even when the document sets its own.                                  |
| `accent`                 | `%23e11d48`                     | Accent when the document doesn't set one. Encode `#` as `%23`.                                         |
| `tz`, `locale`           | `Europe/Berlin`, `de-DE`        | Time zone and locale for clocks, dates and schedules.                                                  |
| `now`                    | `2026-11-14T09:30`              | Freezes the clock, so clocks, schedules and countdowns come out the same every time.                   |
| `problems`               | `1`                             | In `screen` mode, show errors and warnings over the screen.                                            |

## Resolutions

Every screen renders at its real resolution and is scaled down to fit, so text sizes come out exactly as on that display. Any `WIDTHxHEIGHT` works, from 64 to 16384 px a side. These have names:

| Name           | Resolution | Also              |
| -------------- | ---------- | ----------------- |
| `hd`           | 1280×720   | `720p`            |
| `fullhd`       | 1920×1080  | `1080p`, `fhd`    |
| `qhd`          | 2560×1440  | `1440p`           |
| `4k`           | 3840×2160  | `uhd`, `2160p`    |
| `hd-portrait`  | 720×1280   |                   |
| `portrait`     | 1080×1920  | `fullhd-portrait` |
| `4k-portrait`  | 2160×3840  |                   |
| `xga`          | 1024×768   | 4:3               |
| `xga-portrait` | 768×1024   | 3:4               |
| `sxga`         | 1280×1024  | 5:4               |
| `ultrawide`    | 2560×1080  | 21:9              |
| `bar`          | 1920×540   | 32:9 strip        |
| `square`       | 1080×1080  |                   |

Without `size`, `sizes` mode shows `fullhd`, `portrait`, `xga`, `ultrawide` and `square`. The library exports the same list as `SIZES`, with `parseSize()` to read either form.

## Taking screenshots

The page sets `data-status` on `<html>` to `ready` once every screen on it is drawn, charts included, or to `error` when the layout couldn't be read. Wait for it before taking the screenshot. The same result is on `window.signagekit` as `{ status, errors, warnings }`, and every error and warning is also logged to the console.

For a screenshot of one screen at its real pixels, use `screen` mode without `size` and make the window that size:

```js
await page.setViewportSize({ width: 1080, height: 1920 })
await page.goto(url)
await page.waitForSelector(
  'html[data-status="ready"], html[data-status="error"]',
)
await page.screenshot({ path: 'screen.png' })
```

With Chrome alone, give the page a few seconds of virtual time:

```bash
chrome --headless --window-size=1920,1080 --virtual-time-budget=5000 --screenshot=screen.png "$URL"
```

When you can't set the window size, pass `size` instead: the screen lays out for that resolution and scales to fit the window. `sizes` mode needs a window about 1400 px wide and a full-page screenshot.

## Running your own

The site is static. Build it with `bun run site:build` and serve `site/dist` from anywhere; pass `--base https://your.host/preview/` to `signagekit url`, or `base` to `previewUrl()`, to link to your copy.
