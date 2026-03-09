import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  return (
    <div className="container">
      <div className="bg-red border-[3px] border-yellow p-8 md:p-12 flex flex-col gap-8 md:flex-row md:justify-between md:items-center">
        <div className="max-w-[48rem] flex items-center">
          {richText && (
            <RichText
              className="mb-0 [&_h2]:font-bangers [&_h2]:text-4xl [&_h2]:tracking-[0.04em] [&_h2]:uppercase [&_p]:font-vt323 [&_p]:text-lg [&_p]:text-white/75 [&_p]:tracking-[0.08em]"
              data={richText}
              enableGutter={false}
            />
          )}
        </div>
        <div className="flex flex-col gap-4">
          {(links || []).map(({ link }, i) => {
            return (
              <CMSLink
                key={i}
                size="lg"
                {...link}
                className="font-bangers text-xl tracking-[0.12em] uppercase px-8 py-3 bg-white text-red border-[3px] border-white no-underline hover:scale-[1.04] transition-transform duration-100"
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
