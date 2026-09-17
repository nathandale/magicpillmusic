import type { TextField } from 'payload'

/**
 * Shared release-theme contract. The token names and the hex-color rule mirror
 * src/schemas/release-theme.schema.json exactly (see that file's checksum test) —
 * this module is DEMU's runtime validator against that same contract, used both by
 * the `myradio.themeTokens.*` Payload fields below and by the publish-validation
 * hook (src/hooks/validatePublishTransition.ts) when resolving the full token set
 * for the required contrast checks.
 */
export const RELEASE_THEME_SCHEMA_VERSION = 1

export const RELEASE_THEME_TOKEN_NAMES = [
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
] as const

export type ReleaseThemeTokenName = (typeof RELEASE_THEME_TOKEN_NAMES)[number]

// Sanity check the count in one place, so a future edit that adds/removes a token
// without updating the schema/checksum test is caught immediately in this module too.
if (RELEASE_THEME_TOKEN_NAMES.length !== 18) {
  throw new Error(
    `RELEASE_THEME_TOKEN_NAMES must have exactly 18 entries per the EO token contract, found ${RELEASE_THEME_TOKEN_NAMES.length}`,
  )
}

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** Empty/undefined/null is valid and means "inherit the named preset." */
export const isValidReleaseThemeTokenValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed === '') return true
  return HEX_COLOR_PATTERN.test(trimmed)
}

const humanizeTokenName = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())

/** Payload field definitions for the `myradio.themeTokens` group — one per token. */
export const RELEASE_THEME_TOKEN_FIELDS: TextField[] = RELEASE_THEME_TOKEN_NAMES.map((name) => ({
  name,
  type: 'text',
  validate: (value: unknown) =>
    isValidReleaseThemeTokenValue(value)
      ? true
      : `${humanizeTokenName(name)} must be a hex color like #1a1a2e, or left blank to inherit the preset.`,
  admin: {
    description: 'Hex color. Leave blank to inherit the preset.',
    width: '33%',
  },
}))

export type ReleaseThemeTokens = Partial<Record<ReleaseThemeTokenName, string | null | undefined>>

/**
 * Resolved-and-validated token set for the publish-validation hook's contrast checks
 * (EO §7.6 condition 14). Only tokens present and well-formed are returned; callers
 * are responsible for falling back to the named preset for anything absent — DEMU
 * does not carry the preset palettes itself (they live in MYRADIO's CSS), so this
 * function validates shape, not the actual computed contrast against an unknown
 * preset background.
 */
export const collectValidReleaseThemeTokens = (
  tokens: ReleaseThemeTokens | null | undefined,
): { valid: ReleaseThemeTokens; invalidKeys: ReleaseThemeTokenName[] } => {
  const valid: ReleaseThemeTokens = {}
  const invalidKeys: ReleaseThemeTokenName[] = []

  for (const name of RELEASE_THEME_TOKEN_NAMES) {
    const value = tokens?.[name]
    if (value === undefined || value === null || value === '') continue
    if (isValidReleaseThemeTokenValue(value)) {
      valid[name] = value
    } else {
      invalidKeys.push(name)
    }
  }

  return { valid, invalidKeys }
}
