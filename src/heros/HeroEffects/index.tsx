'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'

type HeroEffectsProps = Page['hero']

const fontClassMap: Record<string, string> = {
  bangers: 'font-bangers',
  vt323: 'font-vt323',
  blackHanSans: 'font-bhs',
}

const sizeClassMap: Record<string, string> = {
  xl: 'text-[clamp(80px,18vw,240px)] leading-[0.85]',
  lg: 'text-[clamp(60px,14vw,200px)] leading-[0.85]',
  md: 'text-[clamp(40px,9vw,130px)] leading-[1]',
  sm: 'text-[clamp(28px,5vw,72px)] leading-[1.1]',
}

function getColorStyles(color: string): React.CSSProperties {
  switch (color) {
    case 'white':
      return { color: '#ffffff' }
    case 'red':
      return { color: '#ff0000' }
    case 'yellow':
      return {
        color: '#ffee00',
        textShadow: '0 0 30px rgba(255,238,0,0.5)',
        WebkitTextStroke: '2px rgba(255,0,0,0.4)',
      }
    case 'acid':
      return { color: '#ccff00' }
    case 'outline-white':
      return {
        color: 'transparent',
        WebkitTextStroke: '2px #ffffff',
      }
    case 'outline-red':
      return {
        color: 'transparent',
        WebkitTextStroke: '2px #ff0000',
      }
    default:
      return { color: '#ffffff' }
  }
}

function getAnimationStyle(animation: string): React.CSSProperties {
  if (animation === 'none') return {}
  const durationMap: Record<string, string> = {
    glitch1: 'glitch1 7s infinite',
    glitch2: 'glitch2 7s infinite',
    shake: 'shake 0.4s ease-in-out 3s 2',
    'pulse-red': 'pulse-red 3s ease-in-out infinite',
    flicker: 'flicker 6s infinite',
  }
  return { animation: durationMap[animation] || '' }
}

function parseTagline(text: string): React.ReactNode[] {
  const parts = text.split(/(\{red\}.*?\{\/red\}|\{yel\}.*?\{\/yel\})/g)
  return parts.map((part, i) => {
    const redMatch = part.match(/\{red\}(.*?)\{\/red\}/)
    if (redMatch) {
      return (
        <span key={i} className="text-red">
          {redMatch[1]}
        </span>
      )
    }
    const yelMatch = part.match(/\{yel\}(.*?)\{\/yel\}/)
    if (yelMatch) {
      return (
        <span key={i} className="text-yellow">
          {yelMatch[1]}
        </span>
      )
    }
    return part.includes('\n')
      ? part.split('\n').map((line, j) => (
          <React.Fragment key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </React.Fragment>
        ))
      : part
  })
}

export const HeroEffects: React.FC<HeroEffectsProps> = ({
  links,
  media,
  preHeading,
  titleLines,
  badge,
  tagline,
  ghostText,
  enableOrnaments,
}) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  })

  return (
    <div
      className="hero-effects relative -mt-[10.4rem] flex flex-col items-center justify-center text-white min-h-screen overflow-hidden"
      data-theme="dark"
    >
      {media && typeof media === 'object' && (
        <Media
          fill
          imgClassName="-z-10 object-cover mix-blend-screen opacity-[0.06]"
          priority
          resource={media}
        />
      )}

      {ghostText && (
        <div
          className="hero-effects__ghost-text absolute font-bangers whitespace-nowrap pointer-events-none select-none leading-[0.8]"
          style={{
            fontSize: '28vw',
            color: 'transparent',
            WebkitTextStroke: '1px rgba(255,0,0,0.08)',
            transform: 'rotate(-15deg)',
            top: '-5%',
            left: '-10%',
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          {ghostText}
        </div>
      )}

      {enableOrnaments && (
        <>
          <img
            className="hero-effects__orn absolute top-0 left-0 w-[180px] opacity-35 pointer-events-none z-[1]"
            style={{
              filter: 'sepia(1) saturate(5) hue-rotate(-10deg) brightness(0.9)',
            }}
            src="/images/theme/orn4.png"
            alt=""
            aria-hidden="true"
          />
          <img
            className="hero-effects__orn absolute top-0 right-0 w-[180px] opacity-35 pointer-events-none z-[1]"
            style={{
              filter: 'sepia(1) saturate(5) hue-rotate(-10deg) brightness(0.9)',
              transform: 'scaleX(-1)',
            }}
            src="/images/theme/orn4.png"
            alt=""
            aria-hidden="true"
          />
        </>
      )}

      <div className="hero-effects__content relative z-[2] text-center max-w-[1100px] px-8 py-16">
        {preHeading && (
          <p
            className="font-vt323 text-xl tracking-[0.3em] uppercase text-red mb-4"
            style={{ textShadow: '0 0 10px #ff0000' }}
          >
            {preHeading}
          </p>
        )}

        {Array.isArray(titleLines) &&
          titleLines.map((line, i) => {
            const font = fontClassMap[line.font || 'bangers'] || 'font-bangers'
            const size = sizeClassMap[line.size || 'xl'] || sizeClassMap.xl
            const colorStyles = getColorStyles(line.color || 'white')
            const animStyles = getAnimationStyle(line.animation || 'none')
            const rotation = line.rotation ? { transform: `rotate(${line.rotation}deg)` } : {}

            return (
              <div key={i} className="hero-effects__title-wrap relative inline-block w-full mb-1">
                <span
                  className={`hero-effects__title-line ${font} ${size} tracking-[0.04em] uppercase block`}
                  style={{
                    ...colorStyles,
                    ...animStyles,
                    ...rotation,
                    willChange: 'transform, opacity',
                  }}
                >
                  {line.text}
                </span>
                {line.enableGhostLayer && (
                  <span
                    className={`hero-effects__ghost-layer ${font} ${size} tracking-[0.04em] uppercase block absolute inset-0`}
                    style={{
                      color: '#ff0000',
                      transform: `translate(4px, 4px)${line.rotation ? ` rotate(${line.rotation}deg)` : ''}`,
                      zIndex: -1,
                      animation: 'glitch2 7s infinite',
                      willChange: 'transform, filter',
                    }}
                    aria-hidden="true"
                  >
                    {line.text}
                  </span>
                )}
              </div>
            )
          })}

        {badge?.enabled && badge?.text && (
          <div
            className="hero-effects__badge inline-block bg-red text-white font-bangers text-[22px] tracking-[0.1em] px-6 py-1.5 mt-8 mb-8"
            style={{
              transform: 'rotate(-3deg)',
              boxShadow: '4px 4px 0 #ffee00, 8px 8px 0 rgba(255,0,0,0.2)',
              animation: 'shake 0.4s ease-in-out 3s 2',
              willChange: 'transform',
            }}
          >
            {badge.text}
          </div>
        )}

        {tagline && (
          <p className="font-vt323 text-2xl tracking-[0.1em] uppercase text-white/50 mb-12 leading-[1.5]">
            {parseTagline(tagline)}
          </p>
        )}

        {Array.isArray(links) && links.length > 0 && (
          <div className="hero-effects__ctas flex gap-5 justify-center flex-wrap">
            {links.map(({ link }, i) => (
              <CMSLink
                key={i}
                {...link}
                className={
                  i === 0
                    ? 'hero-effects__btn inline-flex items-center gap-2.5 px-9 py-3.5 font-bangers text-2xl tracking-[0.12em] uppercase no-underline bg-red text-white border-[3px] border-white transition-transform duration-100 hover:scale-[1.04] hover:-rotate-1 shadow-[5px_5px_0_#ffee00,10px_10px_0_rgba(255,0,0,0.15)]'
                    : 'hero-effects__btn inline-flex items-center gap-2.5 px-9 py-3.5 font-bangers text-2xl tracking-[0.12em] uppercase no-underline text-yellow border-[3px] border-yellow transition-transform duration-100 hover:scale-[1.04] hover:-rotate-1 hover:bg-yellow/10 shadow-[5px_5px_0_rgba(255,238,0,0.2)]'
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
