'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const { setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <header
      className="sticky top-0 z-[500] bg-black border-b-[3px] border-red"
      style={{ animation: 'flicker 6s infinite' }}
    >
      <div className="flex items-center justify-between px-8 py-3">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Logo loading="eager" priority="high" />
        </Link>
        <HeaderNav data={data} />
      </div>
    </header>
  )
}
