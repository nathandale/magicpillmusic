import { isIP } from 'node:net'
import { lookup as dnsLookup } from 'node:dns/promises'

/**
 * Bounded, SSRF-safe reachability probe for a track's audio URL (EO §7.6 condition
 * 6/7). This makes an outbound network request from the DEMU server, so the usual
 * SSRF rules apply: an attacker who can set `audioUrl` must not be able to make this
 * server probe its own loopback/private network, cloud metadata endpoints, or
 * anything not genuinely a public audio origin.
 *
 * Rules:
 * - only http/https;
 * - every hostname in the URL, and every redirect target, is resolved and the
 *   resolved IP is checked against loopback/private/link-local/multicast/metadata
 *   ranges before any request is made to it;
 * - redirects are followed manually (fetch's automatic redirect follow does not let
 *   us re-validate each hop), capped, and re-validated at every hop;
 * - a short connect/total timeout and a small response-body cap, since this only
 *   needs headers (HEAD) or the first bytes (ranged GET fallback), never the whole
 *   file;
 * - failures are reported as a reason string, never thrown, so a validation hook can
 *   turn them into a clear user-facing message.
 */

const MAX_REDIRECTS = 3
const TIMEOUT_MS = 4000
const MAX_PROBE_BYTES = 1024 // only used for the ranged-GET fallback

export type AudioProbeResult =
  | { ok: true; status: number; contentType: string | null; contentLength: number | null }
  | { ok: false; reason: string }

const BLOCKED_V4_RANGES: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local — includes 169.254.169.254 cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
]

const ipToInt = (ip: string): number =>
  ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0

const isBlockedV4 = (ip: string): boolean => {
  const target = ipToInt(ip)
  return BLOCKED_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (target & mask) === (ipToInt(base) & mask)
  })
}

const isBlockedV6 = (ip: string): boolean => {
  const lower = ip.toLowerCase()
  if (lower === '::1') return true // loopback
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — check the embedded v4 address too
    const v4 = lower.split(':').pop()
    if (v4 && isIP(v4) === 4) return isBlockedV4(v4)
  }
  if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
  if (lower.startsWith('ff')) return true // multicast
  return false
}

const isBlockedIp = (ip: string): boolean => {
  const version = isIP(ip)
  if (version === 4) return isBlockedV4(ip)
  if (version === 6) return isBlockedV6(ip)
  return true // unrecognized — fail closed
}

/** Resolves a hostname and rejects if ANY resolved address is in a blocked range. */
const assertHostnameIsSafe = async (hostname: string): Promise<void> => {
  // A literal IP in the URL — check it directly, no DNS needed.
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error(`resolves to a blocked address (${hostname})`)
    }
    return
  }

  let addresses: { address: string }[]
  try {
    addresses = await dnsLookup(hostname, { all: true })
  } catch {
    throw new Error('hostname could not be resolved')
  }

  if (addresses.length === 0) {
    throw new Error('hostname resolved to no addresses')
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new Error(`resolves to a blocked address (${address})`)
    }
  }
}

const assertUrlIsSafe = async (url: URL): Promise<void> => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`unsupported protocol "${url.protocol}"`)
  }
  if (url.username || url.password) {
    throw new Error('credentials in URL are not allowed')
  }
  await assertHostnameIsSafe(url.hostname)
}

/**
 * Bounded probe: tries HEAD first (cheapest), falls back to a ranged GET (bytes
 * 0-1023) for origins that reject HEAD (common for some static/CDN configs). Follows
 * redirects manually, re-validating SSRF safety at every hop, capped at
 * MAX_REDIRECTS.
 */
export const probeAudioUrl = async (rawUrl: string): Promise<AudioProbeResult> => {
  let currentUrl: URL
  try {
    currentUrl = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'not a well-formed URL' }
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    try {
      await assertUrlIsSafe(currentUrl)
    } catch (err) {
      return { ok: false, reason: `blocked: ${err instanceof Error ? err.message : 'unsafe URL'}` }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      let response: Response
      try {
        response = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
        })
      } catch {
        // Some origins reject HEAD outright (network-level) — fall back to a
        // small ranged GET on the same URL before giving up on this hop.
        response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: { Range: `bytes=0-${MAX_PROBE_BYTES - 1}` },
          signal: controller.signal,
        })
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          return { ok: false, reason: `redirect (${response.status}) with no Location header` }
        }
        if (hop === MAX_REDIRECTS) {
          return { ok: false, reason: 'too many redirects' }
        }
        try {
          currentUrl = new URL(location, currentUrl)
        } catch {
          return { ok: false, reason: 'redirect target is not a well-formed URL' }
        }
        continue // re-validate the new hop at the top of the loop
      }

      if (!response.ok && response.status !== 206) {
        return { ok: false, reason: `unexpected status ${response.status}` }
      }

      const contentLength = response.headers.get('content-length')
      return {
        ok: true,
        status: response.status,
        contentType: response.headers.get('content-type'),
        contentLength: contentLength ? Number(contentLength) : null,
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, reason: `timed out after ${TIMEOUT_MS}ms` }
      }
      return { ok: false, reason: err instanceof Error ? err.message : 'request failed' }
    } finally {
      clearTimeout(timer)
    }
  }

  return { ok: false, reason: 'too many redirects' }
}
