import { examples } from '../../lib/examples'

/** The examples as JSON, for the preview tool and for agents. */
export function GET() {
  const list = examples().map(({ source: _source, ...e }) => e)
  return new Response(JSON.stringify(list, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
}
