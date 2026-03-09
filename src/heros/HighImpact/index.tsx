'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

export const HighImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  })

  return (
    <div
      className="relative -mt-[10.4rem] flex items-center justify-center text-white"
      data-theme="dark"
    >
      <div className="container mb-8 z-10 relative flex items-center justify-center">
        <div className="max-w-[48rem] md:text-center">
          {richText && (
            <RichText
              className="mb-6 [&_h1]:font-bangers [&_h1]:text-[clamp(48px,10vw,120px)] [&_h1]:leading-[0.9] [&_h1]:tracking-[0.04em] [&_h1]:uppercase [&_h2]:font-bangers [&_h2]:text-4xl [&_h2]:tracking-[0.04em] [&_h2]:uppercase [&_p]:font-vt323 [&_p]:text-xl [&_p]:tracking-[0.1em] [&_p]:text-white/60"
              data={richText}
              enableGutter={false}
            />
          )}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="flex md:justify-center gap-4">
              {links.map(({ link }, i) => {
                return (
                  <li key={i}>
                    <CMSLink
                      {...link}
                      className="font-bangers text-xl tracking-[0.12em] uppercase px-8 py-3 border-[3px] border-red bg-red text-white no-underline hover:scale-[1.04] hover:-rotate-1 transition-transform duration-100"
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="min-h-[80vh] select-none">
        {media && typeof media === 'object' && (
          <Media fill imgClassName="-z-10 object-cover opacity-20 mix-blend-screen" priority resource={media} />
        )}
      </div>
    </div>
  )
}
