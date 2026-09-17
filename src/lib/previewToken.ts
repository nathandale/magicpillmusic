import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Scoped, expiring preview tokens for the release-feed preview route (EO §7.7).
 *
 * Distinct from the existing `/next/preview` mechanism (src/app/(frontend)/next/
 * preview/route.ts), which relies on a static shared secret plus a logged-in Payload
 * admin session/cookie — fine for a human editor previewing a page in a browser, but
 * unusable for a feed URL a machine (MYRADIO, or a publisher validating a draft) needs
 * to fetch directly. These tokens are self-contained, signed, expiring, and scoped to
 * exactly one release, so the preview route needs no session at all. The token is
 * accepted only as an Authorization Bearer credential — never in a query string —
 * so it does not enter request-target logs, analytics URLs, canonical URLs, copied
 * links, or referrers.
 */
const DEFAULT_TTL_SECONDS = 600 // 10 minutes

type PreviewTokenPayload = {
  releaseId: string
  exp: number // unix seconds
}

const getSigningSecret = (): string => {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET is not configured; cannot sign preview tokens.')
  }
  return secret
}

const base64url = (input: string): string =>
  Buffer.from(input, 'utf8').toString('base64url')

const fromBase64url = (input: string): string => Buffer.from(input, 'base64url').toString('utf8')

const sign = (payloadB64: string): string =>
  createHmac('sha256', getSigningSecret()).update(payloadB64).digest('hex')

export const createReleasePreviewToken = (
  releaseId: string | number,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string => {
  const payload: PreviewTokenPayload = {
    releaseId: String(releaseId),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const payloadB64 = base64url(JSON.stringify(payload))
  const signature = sign(payloadB64)
  return `${payloadB64}.${signature}`
}

export type PreviewTokenVerification =
  | { ok: true }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'wrong_release' }

export const verifyReleasePreviewToken = (
  token: string | null | undefined,
  expectedReleaseId: string | number,
): PreviewTokenVerification => {
  if (!token || !token.includes('.')) return { ok: false, reason: 'malformed' }

  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return { ok: false, reason: 'malformed' }

  const expectedSignature = sign(payloadB64)
  const sigBuf = Buffer.from(signature, 'hex')
  const expectedBuf = Buffer.from(expectedSignature, 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, reason: 'bad_signature' }
  }

  let payload: PreviewTokenPayload
  try {
    payload = JSON.parse(fromBase64url(payloadB64)) as PreviewTokenPayload
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (typeof payload.exp !== 'number' || Math.floor(Date.now() / 1000) > payload.exp) {
    return { ok: false, reason: 'expired' }
  }

  if (payload.releaseId !== String(expectedReleaseId)) {
    return { ok: false, reason: 'wrong_release' }
  }

  return { ok: true }
}
