import type { APIRoute, GetStaticPaths } from 'astro'
import { examples, readRepo } from '../../../lib/examples'

export const getStaticPaths: GetStaticPaths = () =>
  examples().flatMap((e) =>
    [
      [e.layout, e.source.layout],
      [e.data, e.source.data],
    ]
      .filter((pair): pair is [string, string] => !!pair[0] && !!pair[1])
      .map(([url, source]) => ({
        params: { file: url.replace('/examples/files/', '') },
        props: { source },
      })),
  )

export const GET: APIRoute = ({ props }) => {
  const source = props.source as string
  const type = source.endsWith('.json') ? 'application/json' : 'text/yaml'
  return new Response(readRepo(source), {
    headers: { 'Content-Type': `${type}; charset=utf-8` },
  })
}
