import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Footer } from '@/payload-types'

import { CMSLink } from '@/components/Link'

export async function Footer() {
  const footerData: Footer = await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto bg-black border-t-[3px] border-red px-12 py-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <span
          className="font-bangers text-lg tracking-[0.12em] text-red"
          style={{ textShadow: '2px 2px 0 #ffee00' }}
        >
          Magic Pill Music
        </span>

        <nav className="flex gap-6">
          {navItems.map(({ link }, i) => {
            return (
              <CMSLink
                className="font-vt323 text-lg tracking-[0.1em] uppercase text-white/40 no-underline hover:text-red hover:drop-shadow-[0_0_8px_rgba(255,0,0,1)] transition-colors duration-100"
                key={i}
                {...link}
              />
            )
          })}
        </nav>

        <span className="font-vt323 text-base text-red/30">
          &copy; {new Date().getFullYear()} &mdash; Artist Cooperative
        </span>
      </div>
    </footer>
  )
}
