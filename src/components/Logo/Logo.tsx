import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, className } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  return (
    <span className={clsx('flex items-center gap-3', className)}>
      <img
        alt="Magic Pill Music"
        width={36}
        height={36}
        loading={loading}
        fetchPriority={priority}
        decoding="async"
        className="w-9 h-9"
        style={{
          filter: 'invert(1) sepia(1) saturate(10) hue-rotate(-10deg)',
          animation: 'rotate-float 4s ease-in-out infinite',
        }}
        src="/images/theme/logo.svg"
      />
      <span
        className="font-bangers text-[22px] tracking-[0.1em] text-red"
        style={{ textShadow: '2px 2px 0 #ffee00, 4px 4px 0 rgba(255,0,0,0.3)' }}
      >
        Magic Pill Music
      </span>
    </span>
  )
}
