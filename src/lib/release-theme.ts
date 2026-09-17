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

// ---------------------------------------------------------------------------
// Full theme-config feed contract — tokens + assets + options + signalCard +
// socialCard, transported to MYRADIO as the single `myradio:theme-config`
// podcast:txt value (JSON, CDATA-wrapped). Versioned by themeSchemaVersion,
// validated field-by-field against explicit allowlists (never arbitrary CSS/
// HTML/JS/URLs), and size-bounded. See src/schemas/release-theme.schema.json for
// the corresponding JSON Schema and its checksum test.
// ---------------------------------------------------------------------------

export const ARTWORK_TREATMENT_VALUES = ['full', 'crop', 'framed'] as const
export const TYPE_TREATMENT_VALUES = ['default', 'display', 'mono'] as const
export const SURFACE_TREATMENT_VALUES = ['solid', 'gradient', 'image', 'image-gradient'] as const
export const THEME_MOTION_VALUES = ['none', 'subtle'] as const
export const SIGNAL_CARD_LAYOUT_VALUES = ['standard', 'broadcast', 'archival', 'minimal'] as const
export const SOCIAL_CARD_LAYOUT_VALUES = ['standard', 'minimal'] as const

const MAX_THEME_CONFIG_JSON_LENGTH = 6000
const MAX_ASSET_URL_LENGTH = 2000

export type ThemeConfigAssetsInput = {
  backgroundImage?: string | null
  textureImage?: string | null
  markImage?: string | null
}

export type ThemeConfigOptionsInput = {
  artworkTreatment?: string | null
  typeTreatment?: string | null
  surfaceTreatment?: string | null
  motion?: string | null
}

export type ThemeConfigInput = {
  themeSchemaVersion?: number | null
  themeTokens?: ReleaseThemeTokens | null
  themeAssets?: ThemeConfigAssetsInput | null
  themeOptions?: ThemeConfigOptionsInput | null
  signalCard?: { layout?: string | null; showArtwork?: boolean | null } | null
  socialCard?: { layout?: string | null } | null
}

const allowlistedEnum = <T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | undefined => (value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined)

const isBoundedHttpUrl = (value: string | null | undefined): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= MAX_ASSET_URL_LENGTH &&
  (value.startsWith('https://') || value.startsWith('http://'))

/**
 * Builds the bounded, versioned theme-config object actually sent to MYRADIO.
 * Every field is independently allowlisted/validated — nothing here is passed
 * through from raw admin input unchecked. Returns `null` if the result would
 * exceed the size budget (a corrupt/oversized config is omitted from the feed
 * entirely, which forces a client to fall back to the named preset, rather than
 * ever emitting a truncated or partially-valid document).
 *
 * Asset fields take already-resolved absolute URLs (the caller resolves Payload
 * Media relationships to URLs) — this module has no dependency on Payload's Media
 * collection shape.
 */
export const buildThemeConfigPayload = (
  input: ThemeConfigInput,
): { json: string; value: Record<string, unknown> } | null => {
  if (!input.themeSchemaVersion) return null

  const { valid: tokens } = collectValidReleaseThemeTokens(input.themeTokens ?? {})

  const assets: Record<string, string> = {}
  if (isBoundedHttpUrl(input.themeAssets?.backgroundImage)) assets.backgroundImage = input.themeAssets!.backgroundImage as string
  if (isBoundedHttpUrl(input.themeAssets?.textureImage)) assets.textureImage = input.themeAssets!.textureImage as string
  if (isBoundedHttpUrl(input.themeAssets?.markImage)) assets.markImage = input.themeAssets!.markImage as string

  const options: Record<string, string> = {}
  const artworkTreatment = allowlistedEnum(input.themeOptions?.artworkTreatment, ARTWORK_TREATMENT_VALUES)
  const typeTreatment = allowlistedEnum(input.themeOptions?.typeTreatment, TYPE_TREATMENT_VALUES)
  const surfaceTreatment = allowlistedEnum(input.themeOptions?.surfaceTreatment, SURFACE_TREATMENT_VALUES)
  const motion = allowlistedEnum(input.themeOptions?.motion, THEME_MOTION_VALUES)
  if (artworkTreatment) options.artworkTreatment = artworkTreatment
  if (typeTreatment) options.typeTreatment = typeTreatment
  if (surfaceTreatment) options.surfaceTreatment = surfaceTreatment
  if (motion) options.motion = motion

  const signalCard: Record<string, unknown> = {}
  const signalCardLayout = allowlistedEnum(input.signalCard?.layout, SIGNAL_CARD_LAYOUT_VALUES)
  if (signalCardLayout) signalCard.layout = signalCardLayout
  if (typeof input.signalCard?.showArtwork === 'boolean') signalCard.showArtwork = input.signalCard.showArtwork

  const socialCard: Record<string, unknown> = {}
  const socialCardLayout = allowlistedEnum(input.socialCard?.layout, SOCIAL_CARD_LAYOUT_VALUES)
  if (socialCardLayout) socialCard.layout = socialCardLayout

  const value: Record<string, unknown> = { themeSchemaVersion: input.themeSchemaVersion }
  if (Object.keys(tokens).length > 0) value.tokens = tokens
  if (Object.keys(assets).length > 0) value.assets = assets
  if (Object.keys(options).length > 0) value.options = options
  if (Object.keys(signalCard).length > 0) value.signalCard = signalCard
  if (Object.keys(socialCard).length > 0) value.socialCard = socialCard

  const json = JSON.stringify(value)
  if (json.length > MAX_THEME_CONFIG_JSON_LENGTH) return null

  return { json, value }
}
