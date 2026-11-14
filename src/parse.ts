// Layouts and data may be JSON or YAML text. JSON is tried first and
// costs nothing extra; the YAML parser is a separate chunk that only loads
// when the text actually is YAML.

export interface Parsed {
  value: unknown
  error?: string
}

/**
 * `layout` uses the YAML core schema, so `fit: true` and `gap: 24` keep their
 * types. `data` uses the failsafe schema, which reads every scalar as a
 * string: a price written as 4.50 stays "4.50" instead of becoming 4.5.
 */
export type Mode = 'layout' | 'data'

export async function parseText(src: string, mode: Mode): Promise<Parsed> {
  const text = src.trim()
  let jsonError: string
  try {
    return { value: JSON.parse(text) }
  } catch (e) {
    jsonError = (e as Error).message
  }
  try {
    const { parse } = await import('yaml')
    const value: unknown = parse(text, {
      schema: mode === 'data' ? 'failsafe' : 'core',
      maxAliasCount: 50,
      prettyErrors: true,
    })
    return { value }
  } catch (e) {
    // Text that looks like JSON gets the JSON error, which is the clearer one.
    const looksJson = text.startsWith('{') || text.startsWith('[')
    return {
      value: null,
      error: looksJson
        ? `not valid JSON: ${jsonError}`
        : `not valid YAML: ${(e as Error).message}`,
    }
  }
}
