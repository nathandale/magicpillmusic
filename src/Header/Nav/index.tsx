'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  return (
    <nav className="flex gap-7 items-center">
      {navItems.map(({ link }, i) => {
        return (
          <CMSLink
            key={i}
            {...link}
            appearance="link"
            className="font-vt323 text-lg tracking-[0.1em] uppercase text-white/60 no-underline hover:text-yellow hover:drop-shadow-[0_0_10px_rgba(255,238,0,1)] transition-all duration-100"
          />
        )
      })}
      <Link href="/search" className="text-white/60 hover:text-yellow transition-colors duration-100">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5" />
      </Link>
    </nav>
  )
}
