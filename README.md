# signagekit

A toolkit for AI agents that build digital signage screens: dashboards, menus, schedules and alerts. The agent writes a short JSON or YAML template that names the zones of a screen and what goes in each. signagekit validates it, lays it out for any display and sizes every piece of text, and gives the agent a checker and a preview link to see its work. After that, updating a screen means writing new data, not touching the template.

Docs, components, examples and the preview tool: https://signagekit.514sid.com

```yaml
layout:
  flow:
    - { zone: head, span: 9, height: 150px }
    - { zone: clock, span: 3, height: 150px }
    - { zone: menu, span: 8 }
    - { zone: wait, span: 4 }
zones:
  head: { type: heading, text: Today's lunch }
  clock: { type: clock, show_date: true }
  menu: { type: table, columns: [Dish, Price], rows: { bind: /menu } }
  wait: { type: stat, title: Wait time, value: { bind: /wait }, unit: min }
```

It's built for the cheap hardware that drives most screens. The core is 39 KB of JavaScript (16 KB gzipped) and 16 KB of CSS (4 KB gzipped), plus Preact at 6 KB gzipped. There are no web fonts, shadows or filters. Charts, QR codes, YAML parsing and the rarer components load only on screens that use them, and clocks wake up once a minute.

## Install

```bash
npm install @514sid/signagekit
```

## Use

```js
import { mount } from '@514sid/signagekit'
import '@514sid/signagekit/style.css'

const screen = await mount(document.getElementById('screen'), {
  layout: layoutYamlOrObject,
  data: { menu: [['Tomato soup', '4.50']], wait: 6 },
})

await screen.update({ data: newData })
```

The screen fills the element you give it. [docs/api.md](docs/api.md) covers every option, `check()` for validating what an assistant wrote, use without a bundler, preview links, and the `signagekit` command.

## The document format

[docs/format.md](docs/format.md) is the full reference: layouts, the 21 components, binding data, how text is sized, states and thresholds, charts, alerts, icons and colors. [schema.json](schema.json) has every property; reference it from a YAML file to get autocomplete in editors that read JSON Schema:

```yaml
# yaml-language-server: $schema=https://signagekit.514sid.com/schema.json
```

## With AI assistants

signagekit is meant to be written by assistants as much as by people. [docs/assistants.md](docs/assistants.md) is a guide you can hand to one. The short version: give the assistant the guide, let it write the layout once and only the data after that, and run `signagekit check` on every change.

## Development

```bash
bun install
bun test
bun run storybook
```

Storybook shows every component and the example screens at 16:9, 4:3, 21:9 and portrait, with controls for scheme and accent. [examples/](examples/) has a folder per example screen, each with its layout and data.

```bash
bun run build
bun run check-all
```

`build` writes the ES modules, `style.css` and type declarations to `dist/`. `check-all` runs the type check, lint, format check and tests, and `prepublishOnly` runs both.

```bash
bun run preview screen.layout.yml screen.data.yml --out preview
```

Renders a screen from the built package to PNG files at Full HD and Full HD portrait. `--size` takes other resolutions, by name or as `WIDTHxHEIGHT`, like `4k,xga,1366x768`. It needs a Chromium for Playwright: run `bun x playwright install chromium` once, or set `CHROMIUM_PATH`.

## Website

`site/` is the documentation site, built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com): the docs from `docs/`, a gallery of every example, and the [preview tool](docs/preview.md). It's static and builds to `site/dist`.

```bash
bun run site:dev
bun run site:build
```

It's live at https://signagekit.514sid.com, deployed by Cloudflare Pages from this repository: build command `npm run site:build`, output directory `site/dist`, root directory left empty, and `NODE_VERSION` set to 22.23.4 or newer for Astro. `previewUrl()` and `signagekit url` link to its preview page by default; pass `base` or `--base` to link to a copy hosted elsewhere.

## Releasing

Releases publish to npm from GitHub Actions through npm's trusted publishing, so no npm token is stored anywhere, and each version on npm links back to the commit that built it.

1. Update `version` in `package.json` and add the changes to `CHANGELOG.md`.
2. Commit and push.
3. Create a GitHub release tagged with the version, like `v0.2.0`.

The publish workflow checks that the tag matches `package.json`, runs every check and the build, and publishes. A release for a version that's already on npm publishes nothing.

npm may hold a new version as staged until a maintainer approves it, either under Staged Packages on npmjs.com or with `npm stage approve`. Approving needs two-factor authentication.

The trusted publisher is set once, in the package settings on npmjs.com: GitHub Actions, user `514sid`, repository `signagekit`, workflow `publish.yml`.

## License

MIT. The icons are from [Lucide](https://lucide.dev), under the ISC license; see [LICENSE](LICENSE).
