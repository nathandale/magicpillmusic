/* eslint-disable @next/next/no-img-element -- Satori renders plain <img>; next/image does not apply inside an OG image. */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'
import React from 'react'
import sharp from 'sharp'

import { getServerSideURL } from '../../utilities/getURL'
import type { MediaRef, ResolvedShareCard } from './resolve'

/**
 * Renders a resolved share card to a 1200×630 JPEG. sharp does all pixel work
 * (focal-point crops, blur); next/og (Satori) only lays out type over it.
 */

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

const ASSET_DIR = path.join(process.cwd(), 'src/lib/share-card/assets')
const MEDIA_DIR = process.env.SHARE_CARD_MEDIA_DIR || path.join(process.cwd(), 'public/media')

const INK = '#ebe5f6'
const INK_SOFT = 'rgba(235, 229, 246, 0.8)'
const NIGHT = '#0d0820'

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: 'normal' }[]> | null = null
const loadFonts = () =>
  (fontsPromise ??= Promise.all([
    readFile(path.join(ASSET_DIR, 'PathwayGothicOne-Regular.ttf')).then((data) => ({ name: 'Pathway Gothic One', data, weight: 400 as const, style: 'normal' as const })),
    readFile(path.join(ASSET_DIR, 'IBMPlexMono-Regular.ttf')).then((data) => ({ name: 'IBM Plex Mono', data, weight: 400 as const, style: 'normal' as const })),
    readFile(path.join(ASSET_DIR, 'IBMPlexMono-Medium.ttf')).then((data) => ({ name: 'IBM Plex Mono', data, weight: 500 as const, style: 'normal' as const })),
  ]))

const isRef = (value: unknown): value is MediaRef => typeof value === 'object' && value !== null && 'id' in value

/** Reads an upload from disk, falling back to its public URL (e.g. local dev without the media folder). */
const readMedia = async (ref: MediaRef): Promise<Buffer | null> => {
  if (ref.filename && !ref.filename.includes('/') && !ref.filename.includes('..')) {
    try {
      return await readFile(path.join(MEDIA_DIR, ref.filename))
    } catch {
      /* fall through to URL */
    }
  }
  if (!ref.url) return null
  try {
    const url = new URL(ref.url, getServerSideURL())
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null
  } catch {
    return null
  }
}

/** Cover-crop to w×h, centered on the upload's focal point when it has one. */
const focalCover = async (input: Buffer, width: number, height: number, ref?: MediaRef) => {
  const image = sharp(input, { failOn: 'none' }).rotate()
  const meta = await image.metadata()
  const sourceWidth = meta.autoOrient?.width ?? meta.width ?? width
  const sourceHeight = meta.autoOrient?.height ?? meta.height ?? height
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const cropWidth = Math.min(sourceWidth, Math.round(width / scale))
  const cropHeight = Math.min(sourceHeight, Math.round(height / scale))
  const fx = (ref?.focalX ?? 50) / 100
  const fy = (ref?.focalY ?? 50) / 100
  const left = Math.max(0, Math.min(sourceWidth - cropWidth, Math.round(fx * sourceWidth - cropWidth / 2)))
  const top = Math.max(0, Math.min(sourceHeight - cropHeight, Math.round(fy * sourceHeight - cropHeight / 2)))
  return image.extract({ left, top, width: cropWidth, height: cropHeight }).resize(width, height)
}

const dataUri = (buffer: Buffer) => `data:image/jpeg;base64,${buffer.toString('base64')}`

const loadCover = async (value: unknown, width: number, height: number, adjust?: (img: sharp.Sharp) => sharp.Sharp) => {
  if (!isRef(value)) return null
  const input = await readMedia(value)
  if (!input) return null
  const cropped = await focalCover(input, width, height, value)
  return dataUri(await (adjust ? adjust(cropped) : cropped).jpeg({ quality: 88 }).toBuffer())
}

let skyPromise: Promise<string> | null = null
const loadSky = () =>
  (skyPromise ??= readFile(path.join(ASSET_DIR, 'terrestrial-sky.jpg'))
    .then((input) => focalCover(input, CARD_WIDTH, CARD_HEIGHT, { id: 'sky', focalX: 50, focalY: 58 }))
    .then((img) => img.jpeg({ quality: 88 }).toBuffer())
    .then(dataUri))

/** Title size steps down with length so long song names still fit in three lines. */
const headlineSize = (value: string, sizes: [number, number, number, number]) => {
  const length = value.length
  if (length <= 14) return sizes[0]
  if (length <= 24) return sizes[1]
  if (length <= 40) return sizes[2]
  return sizes[3]
}

/** MY RADIO in the TERRESTRIAL wordmark: two words, beacon on the apex of the A. */
const Wordmark = ({ size, accent, color = INK }: { size: number; accent: string; color?: string }) => {
  // Proportional at display sizes, but never so small the beacon disappears.
  const dot = Math.max(7, Math.round(size * 0.1))
  const letter = { letterSpacing: size * 0.18, color }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', fontFamily: 'Pathway Gothic One', fontSize: size, lineHeight: 1 }}>
      <span style={letter}>MY</span>
      <span style={{ width: size * 0.34 }} />
      <span style={letter}>R</span>
      <div style={{ display: 'flex', position: 'relative', marginRight: size * 0.18 }}>
        <span style={{ color }}>A</span>
        <div
          style={{
            position: 'absolute',
            top: Math.round(size * 0.03) - dot,
            left: '50%',
            marginLeft: -dot / 2,
            width: dot,
            height: dot,
            borderRadius: dot,
            background: accent,
            boxShadow: `0 0 ${dot * 2}px ${accent}`,
          }}
        />
      </div>
      <span style={{ ...letter, letterSpacing: size * 0.18 }}>DIO</span>
    </div>
  )
}

const Kicker = ({ value, accent, size = 20 }: { value: string; accent: string; size?: number }) =>
  value ? (
    <div style={{ display: 'flex', fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: size, letterSpacing: size * 0.3, textTransform: 'uppercase', color: accent }}>
      {value}
    </div>
  ) : null

const Subline = ({ value, size = 24 }: { value: string; size?: number }) =>
  value ? (
    <div style={{ display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: size, letterSpacing: size * 0.28, textTransform: 'uppercase', color: INK_SOFT }}>
      {value}
    </div>
  ) : null

const Headline = ({ value, sizes, align = 'left', spacing = 0.04 }: { value: string; sizes: [number, number, number, number]; align?: 'left' | 'center'; spacing?: number }) => {
  const size = headlineSize(value, sizes)
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: 'Pathway Gothic One',
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: size * spacing,
        textTransform: 'uppercase',
        color: INK,
        textAlign: align,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        textShadow: '0 2px 24px rgba(10, 5, 30, 0.55)',
      }}
    >
      {value}
    </div>
  )
}

const broadcast = async (card: ResolvedShareCard) => {
  const art = await loadCover(card.artwork, 440, 440)
  const background =
    (await loadCover(card.background, CARD_WIDTH, CARD_HEIGHT)) ??
    (await loadCover(card.artwork, CARD_WIDTH, CARD_HEIGHT, (img) => img.blur(36).modulate({ brightness: 0.55, saturation: 1.1 }))) ??
    (await loadSky())

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: NIGHT }}>
      <img alt="" src={background} width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'linear-gradient(90deg, rgba(8,5,20,0.35) 0%, rgba(8,5,20,0.72) 55%, rgba(8,5,20,0.82) 100%)' }} />
      {art ? (
        <img
          alt=""
          src={art}
          width={440}
          height={440}
          style={{ position: 'absolute', left: 72, top: 95, borderRadius: 6, boxShadow: '0 24px 60px rgba(0,0,0,0.55)' }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: art ? 572 : 96,
          right: 64,
          top: 95,
          bottom: 95,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        <Kicker value={card.kicker} accent={card.accentColor} />
        <Headline value={card.headline} sizes={[104, 88, 70, 56]} />
        <Subline value={card.subline} />
      </div>
      {card.showWordmark ? (
        <div style={{ position: 'absolute', right: 64, bottom: 40, display: 'flex' }}>
          <Wordmark size={34} accent={card.accentColor} />
        </div>
      ) : null}
    </div>
  )
}

const poster = async (card: ResolvedShareCard) => {
  const background = (await loadCover(card.artwork, CARD_WIDTH, CARD_HEIGHT)) ?? (await loadSky())
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: NIGHT }}>
      <img alt="" src={background} width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'linear-gradient(180deg, rgba(8,5,20,0) 28%, rgba(8,5,20,0.68) 58%, rgba(8,5,20,0.94) 100%)' }} />
      <div style={{ position: 'absolute', left: 64, right: 380, bottom: 52, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Kicker value={card.kicker} accent={card.accentColor} size={18} />
        <Headline value={card.headline} sizes={[96, 80, 64, 52]} />
        <Subline value={card.subline} size={22} />
      </div>
      {card.showWordmark ? (
        <div style={{ position: 'absolute', right: 64, bottom: 58, display: 'flex' }}>
          <Wordmark size={34} accent={card.accentColor} />
        </div>
      ) : null}
    </div>
  )
}

const terrestrial = async (card: ResolvedShareCard) => {
  const background = (await loadCover(card.background, CARD_WIDTH, CARD_HEIGHT)) ?? (await loadSky())
  // When the title is MY RADIO itself, the wordmark IS the title (the homepage card).
  const titleIsWordmark = card.headline.replace(/\s+/g, ' ').trim().toUpperCase() === 'MY RADIO'
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: NIGHT }}>
      <img alt="" src={background} width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'radial-gradient(ellipse 60% 45% at 50% 44%, rgba(10,6,24,0.35), rgba(10,6,24,0) 70%)' }} />
      <div style={{ position: 'absolute', left: 80, right: 80, top: 150, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Kicker value={card.kicker} accent={card.accentColor} />
        {titleIsWordmark ? (
          <Wordmark size={150} accent={card.accentColor} />
        ) : (
          <Headline value={card.headline} sizes={[120, 96, 72, 56]} align="center" spacing={0.14} />
        )}
        <Subline value={card.subline} size={21} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 42, display: 'flex', justifyContent: 'center' }}>
        {card.showWordmark && !titleIsWordmark ? (
          <Wordmark size={30} accent={card.accentColor} />
        ) : (
          <div style={{ display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, letterSpacing: 4.5, color: 'rgba(235, 229, 246, 0.72)' }}>
            MYRADIO.NATHANDALE.COM
          </div>
        )}
      </div>
    </div>
  )
}

export const renderShareCard = async (card: ResolvedShareCard): Promise<Buffer> => {
  if (card.layout === 'image' && isRef(card.image)) {
    const input = await readMedia(card.image)
    if (input) return (await focalCover(input, CARD_WIDTH, CARD_HEIGHT, card.image)).jpeg({ quality: 88 }).toBuffer()
  }
  const layout = card.layout === 'poster' ? poster : card.layout === 'terrestrial' ? terrestrial : broadcast
  const element = await layout(card)
  const response = new ImageResponse(element, { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: await loadFonts() })
  const png = Buffer.from(await response.arrayBuffer())
  return sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
}
