import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * The release-theme JSON Schema is a cross-repository contract: DEMU (this repo)
 * validates `myradio.themeTokens.*` against it before serializing `myradio:theme-config`
 * into the feed, and MYRADIO's release-theme resolver is meant to validate the parsed
 * feed value against an identical copy of this same file (see the schema's own
 * `description` field).
 *
 * There is no shared package between the two repos, so nothing stops the files from
 * drifting silently. This test pins the DEMU copy to a known checksum. If you change
 * `src/schemas/release-theme.schema.json` on purpose, update SCHEMA_SHA256 below in the
 * same commit, bump `themeSchemaVersion` in the schema if the change is not purely
 * cosmetic, and update MYRADIO's copy of the file to match once that repo carries one.
 */
const SCHEMA_SHA256 = '4433998ef4475f2d3d11f1dbfe6781f35211b2ee36a9b4317095a4d8be49eae9'

const SCHEMA_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/schemas/release-theme.schema.json',
)

describe('release-theme.schema.json contract', () => {
  it('matches the pinned checksum (update deliberately, in lockstep with MYRADIO, on change)', () => {
    const raw = readFileSync(SCHEMA_PATH, 'utf8')
    const actual = createHash('sha256').update(raw).digest('hex')
    expect(actual).toBe(SCHEMA_SHA256)
  })

  it('declares exactly the 18 EO-specified release-theme tokens, all optional', () => {
    const raw = readFileSync(SCHEMA_PATH, 'utf8')
    const schema = JSON.parse(raw) as {
      properties: Record<string, unknown>
      required?: string[]
    }

    const EXPECTED_TOKENS = [
      'chrome',
      'muted',
      'accent',
      'accentContrast',
      'beacon',
      'beaconGlow',
      'line',
      'panelStart',
      'panelEnd',
      'panelText',
      'panelMuted',
      'panelAlt',
      'panelActive',
      'actionBackground',
      'actionText',
      'popoverBackground',
      'popoverText',
      'popoverMuted',
    ]

    expect(EXPECTED_TOKENS).toHaveLength(18)

    for (const token of EXPECTED_TOKENS) {
      expect(schema.properties).toHaveProperty(token)
    }

    // themeSchemaVersion is the only required key — every token is optional (absence
    // means "inherit the named preset"), per the schema's own hexColor description.
    expect(schema.required).toEqual(['themeSchemaVersion'])
  })

  it('rejects a malformed color and accepts a well-formed one (spot check, not a full JSON Schema run)', () => {
    const raw = readFileSync(SCHEMA_PATH, 'utf8')
    const schema = JSON.parse(raw) as {
      definitions: { hexColor: { pattern: string } }
    }
    const hexColorPattern = new RegExp(schema.definitions.hexColor.pattern)

    expect(hexColorPattern.test('#1a1a2e')).toBe(true)
    expect(hexColorPattern.test('#1a1a2eFF')).toBe(true)
    expect(hexColorPattern.test('not-a-color')).toBe(false)
    expect(hexColorPattern.test('#fff')).toBe(false) // 3-digit shorthand intentionally not accepted
  })
})
