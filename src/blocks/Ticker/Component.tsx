import type { TickerBlock as TickerBlockProps } from '@/payload-types'
import React from 'react'

export const TickerBlock: React.FC<TickerBlockProps> = ({ items, speed }) => {
  const duration = speed || 12
  const tickerText = (items || []).map((item) => item.text).join(' // ')

  if (!tickerText) return null

  return (
    <div className="bg-red border-t-[3px] border-b-[3px] border-yellow overflow-hidden py-2">
      <div
        className="inline-flex gap-16 whitespace-nowrap"
        style={{ animation: `marquee ${duration}s linear infinite` }}
      >
        {[0, 1].map((i) => (
          <span key={i} className="font-bangers text-xl tracking-[0.15em] uppercase text-white">
            {(items || []).map((item, j) => (
              <React.Fragment key={j}>
                {j > 0 && <span className="text-yellow mx-2">//</span>}
                {item.text}
              </React.Fragment>
            ))}
          </span>
        ))}
      </div>
    </div>
  )
}
