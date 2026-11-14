import type { Preview } from '@storybook/preact-vite'
import '../src/style.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
  },
}

export default preview
