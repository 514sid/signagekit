import { readRepo } from '../lib/examples'

/** The document schema, at a stable address for editors and assistants. */
export function GET() {
  return new Response(readRepo('schema.json'), {
    headers: { 'Content-Type': 'application/schema+json' },
  })
}
