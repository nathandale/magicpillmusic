import { lookup as dnsLookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'

/**
 * Bounded, SSRF-safe reachability probe for a track's audio URL.
 *
 * DNS validation alone is insufficient: resolving a hostname, checking the answer,
 * and then calling fetch() permits DNS rebinding because fetch performs a second,
 * independent lookup. This implementation resolves once, rejects the hostname if
 * any answer is unsafe, and pins the actual HTTP(S) socket lookup to one of those
 * already-approved addresses. Every redirect repeats that process for its new host.
 */

const MAX_REDIRECTS = 3
const TIMEOUT_MS = 4000
const MAX_PROBE_BYTES = 1024

export type AudioProbeResult =
  | { ok: true; status: number; contentType: string | null; contentLength: number | null }
  | { ok: false; reason: string }

type ResolvedAddress = { address: string; family: number }
type LookupAll = (hostname: string) => Promise<ResolvedAddress[]>
type ProbeMethod = 'HEAD' | 'GET'
type PinnedResponse = {
  status: number
  contentType: string | null
  contentLength: number | null
  location: string | null
}
type PinnedRequest = (url: URL, address: ResolvedAddress, method: ProbeMethod) => Promise<PinnedResponse>

export type AudioProbeDependencies = {
  lookup?: LookupAll
  request?: PinnedRequest
}

const BLOCKED_V4_RANGES: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
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
  if (lower === '::' || lower === '::1') return true
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice('::ffff:'.length)
    if (isIP(mapped) === 4) return isBlockedV4(mapped)
    return true
  }
  if (/^fe[89ab]/.test(lower)) return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('ff')) return true
  return false
}

const isBlockedIp = (ip: string): boolean => {
  const version = isIP(ip)
  if (version === 4) return isBlockedV4(ip)
  if (version === 6) return isBlockedV6(ip)
  return true
}

const defaultLookup: LookupAll = async (hostname) => {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true })
  return addresses.map(({ address, family }) => ({ address, family }))
}

const normalizeHostname = (hostname: string): string =>
  hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname

const resolveSafeAddresses = async (hostname: string, lookup: LookupAll): Promise<ResolvedAddress[]> => {
  const normalized = normalizeHostname(hostname)
  const literalFamily = isIP(normalized)
  let addresses: ResolvedAddress[]

  if (literalFamily) {
    addresses = [{ address: normalized, family: literalFamily }]
  } else {
    try {
      addresses = await lookup(normalized)
    } catch {
      throw new Error('hostname could not be resolved')
    }
  }

  if (addresses.length === 0) throw new Error('hostname resolved to no addresses')
  for (const { address } of addresses) {
    if (isBlockedIp(address)) throw new Error(`resolves to a blocked address (${address})`)
  }
  return addresses
}

const assertUrlIsSafe = async (url: URL, lookup: LookupAll): Promise<ResolvedAddress[]> => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`unsupported protocol "${url.protocol}"`)
  }
  if (url.username || url.password) throw new Error('credentials in URL are not allowed')
  return resolveSafeAddresses(url.hostname, lookup)
}

const requestPinned: PinnedRequest = (url, address, method) =>
  new Promise((resolve, reject) => {
    const requestImpl = url.protocol === 'https:' ? httpsRequest : httpRequest
    const headers = method === 'GET' ? { Range: `bytes=0-${MAX_PROBE_BYTES - 1}` } : undefined
    const lookup = (
      _hostname: string,
      _options: unknown,
      callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ) => callback(null, address.address, address.family)

    const request = requestImpl(
      url,
      {
        method,
        headers,
        lookup,
        ...(url.protocol === 'https:' ? { servername: normalizeHostname(url.hostname) } : {}),
      },
      (response) => {
        const contentLengthHeader = response.headers['content-length']
        const parsedLength = contentLengthHeader ? Number(contentLengthHeader) : null
        const result: PinnedResponse = {
          status: response.statusCode ?? 0,
          contentType: response.headers['content-type'] ?? null,
          contentLength: Number.isFinite(parsedLength) ? parsedLength : null,
          location: response.headers.location ?? null,
        }

        // Never consume the media. Destroying immediately after headers bounds the
        // fallback even when a hostile origin ignores the Range request.
        response.destroy()
        resolve(result)
      },
    )

    request.setTimeout(TIMEOUT_MS, () => {
      const error = new Error(`timed out after ${TIMEOUT_MS}ms`)
      error.name = 'AbortError'
      request.destroy(error)
    })
    request.once('error', reject)
    request.end()
  })

const performProbe = async (
  url: URL,
  address: ResolvedAddress,
  request: PinnedRequest,
): Promise<PinnedResponse> => {
  try {
    const head = await request(url, address, 'HEAD')
    if (head.status !== 405 && head.status !== 501) return head
  } catch {
    // Network-level HEAD failures get the same bounded GET fallback as explicit
    // method-not-supported responses.
  }
  return request(url, address, 'GET')
}

export const probeAudioUrl = async (
  rawUrl: string,
  dependencies: AudioProbeDependencies = {},
): Promise<AudioProbeResult> => {
  const lookup = dependencies.lookup ?? defaultLookup
  const request = dependencies.request ?? requestPinned
  let currentUrl: URL
  try {
    currentUrl = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'not a well-formed URL' }
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let addresses: ResolvedAddress[]
    try {
      addresses = await assertUrlIsSafe(currentUrl, lookup)
    } catch (error) {
      return { ok: false, reason: `blocked: ${error instanceof Error ? error.message : 'unsafe URL'}` }
    }

    try {
      const response = await performProbe(currentUrl, addresses[0], request)

      if (response.status >= 300 && response.status < 400) {
        if (!response.location) return { ok: false, reason: `redirect (${response.status}) with no Location header` }
        if (hop === MAX_REDIRECTS) return { ok: false, reason: 'too many redirects' }
        try {
          currentUrl = new URL(response.location, currentUrl)
        } catch {
          return { ok: false, reason: 'redirect target is not a well-formed URL' }
        }
        continue
      }

      if (response.status < 200 || response.status >= 300) {
        return { ok: false, reason: `unexpected status ${response.status}` }
      }

      return {
        ok: true,
        status: response.status,
        contentType: response.contentType,
        contentLength: response.contentLength,
      }
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'request failed' }
    }
  }

  return { ok: false, reason: 'too many redirects' }
}
