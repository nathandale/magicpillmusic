import type { ArtistGridBlock as ArtistGridBlockProps } from '@/payload-types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import Link from 'next/link'
import RichText from '@/components/RichText'

import type { Artist } from '@/payload-types'

export const ArtistGridBlock: React.FC<ArtistGridBlockProps & { id?: string }> = async (props) => {
  const { id, introContent, limit: limitFromProps } = props
  const limit = limitFromProps || 6

  const payload = await getPayload({ config: configPromise })
  const { docs: artists } = await payload.find({
    collection: 'artists',
    where: { status: { equals: 'active' } },
    limit,
    sort: '-createdAt',
  })

  return (
    <section className="py-20 px-12 relative overflow-hidden" id={`block-${id}`}>
      <div
        className="absolute font-bangers text-[22vw] text-transparent pointer-events-none whitespace-nowrap tracking-[0.05em] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ WebkitTextStroke: '1px rgba(255,0,0,0.06)' }}
        aria-hidden="true"
      >
        ARTISTS
      </div>
      <div className="max-w-[1200px] mx-auto relative z-[1]">
        {introContent && (
          <RichText
            className="mb-8 [&_h2]:font-bangers [&_h2]:text-7xl [&_h2]:tracking-[0.04em] [&_h2]:uppercase [&_h2]:leading-[0.9] [&_p]:font-vt323 [&_p]:text-xl [&_p]:tracking-[0.2em] [&_p]:uppercase [&_p]:text-red"
            data={introContent}
            enableGutter={false}
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[3px]">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
        {artists.length === 0 && (
          <p className="font-vt323 text-xl text-white/50 text-center py-10">
            No artists yet. Check back soon.
          </p>
        )}
      </div>
    </section>
  )
}

function ArtistCard({ artist }: { artist: Artist }) {
  const initials = artist.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group relative bg-[#080808] border-b-2 border-red/30 p-7 text-center no-underline text-inherit overflow-hidden flex flex-col items-center gap-2 hover:border-red hover:shadow-[0_0_20px_rgba(255,0,0,0.15)] hover:z-10 transition-all duration-150"
    >
      <div
        className="w-[72px] h-[72px] rounded-full border border-red/40 flex items-center justify-center font-bangers text-[26px] tracking-[0.05em] text-red bg-[#080808] relative z-[1] group-hover:border-yellow/60 group-hover:text-yellow transition-colors duration-150"
      >
        {initials}
      </div>
      <div className="font-bangers text-[28px] tracking-[0.06em] uppercase text-white relative z-[1] leading-none">
        {artist.name}
      </div>
      {artist.bio && (
        <div className="font-vt323 text-base tracking-[0.04em] text-white/40 relative z-[1] line-clamp-2 max-w-[250px]">
          {artist.bio}
        </div>
      )}
      <div className="mt-2.5 inline-flex items-center gap-2 font-bangers text-lg tracking-[0.15em] uppercase text-red border border-red/40 px-5 py-1 relative z-[1] group-hover:text-yellow group-hover:border-yellow/60 group-hover:bg-yellow/5 transition-all duration-150">
        <img
          src="/images/theme/lightning.png"
          alt=""
          className="w-4 h-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
          aria-hidden="true"
        />
        Listen
      </div>
    </Link>
  )
}
