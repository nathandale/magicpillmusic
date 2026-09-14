'use client'

import React from 'react'
import Link from 'next/link'
import { useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

export function MyRadioNavLink() {
  const { config } = useConfig()
  const adminRoute = config.routes.admin || '/admin'
  const href = `${adminRoute}/my-radio`
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      className="nav__link"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontWeight: active ? 700 : undefined,
      }}
    >
      <span aria-hidden style={{ fontSize: 15 }}>
        📻
      </span>
      MY RADIO
    </Link>
  )
}
