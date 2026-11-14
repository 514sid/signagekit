# Getting started

signagekit turns a short document into a screen. The document names the zones of the screen and what each one shows; a separate data object holds the values that change. signagekit lays the zones out for the screen's shape and sizes all the text together.

## Install

```bash
npm install @514sid/signagekit
```

## A first screen

Write the layout. This one has a heading, a clock, a table and a stat:

```yaml
# lunch.layout.yml
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

Then the data. Each `{ bind: /path }` in the layout reads a value from it:

```yaml
# lunch.data.yml
menu:
  - [Tomato soup, 4.50]
  - [Chickpea curry, 7.90]
  - [Grilled halloumi wrap, 6.50]
wait: 6
```

Mount it into an element. The screen fills the element, so size the element the way the screen should be:

```js
import { mount } from '@514sid/signagekit'
import '@514sid/signagekit/style.css'

const screen = await mount(document.getElementById('screen'), {
  layout: await fetch('lunch.layout.yml').then((r) => r.text()),
  data: await fetch('lunch.data.yml').then((r) => r.text()),
})
```

When the values change, update the data and leave the layout alone:

```js
await screen.update({ data: { menu, wait: 12 } })
```

## Check it

```bash
npx @514sid/signagekit check lunch.layout.yml lunch.data.yml
```

The check lists every error and warning with its exact path: unknown properties, low contrast, and binds that find nothing in the data. It exits with 1 on errors.

## See it without a display

```bash
npx @514sid/signagekit url lunch.layout.yml lunch.data.yml --mode sizes
```

This prints a link to the [preview tool](preview.md) with the screen packed into it. Open it to see the screen at five resolutions at once, from Full HD to portrait and ultrawide, or point a headless browser at it for a screenshot.

## Next

The [document format](format.md) covers every layout option and component. [Writing with assistants](assistants.md) has the rules to give an AI that writes screens for you. The [API](api.md) lists every option of `mount()` and `check()`.
