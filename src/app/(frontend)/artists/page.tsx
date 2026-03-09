import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import Link from 'next/link'

import type { Artist } from '@/payload-types'

export default async function ArtistsPage() {
  const payload = await getPayload({ config: configPromise })

  const { docs: artists } = await payload.find({
    collection: 'artists',
    where: { status: { equals: 'active' } },
    limit: 100,
    sort: 'name',
  })

  return (
    <section className="py-20 px-12 relative overflow-hidden min-h-screen">
      <div
        className="absolute font-bangers text-[22vw] text-transparent pointer-events-none whitespace-nowrap tracking-[0.05em] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ WebkitTextStroke: '1px rgba(255,0,0,0.06)' }}
        aria-hidden="true"
      >
        ARTISTS
      </div>
      <div className="max-w-[1200px] mx-auto relative z-[1]">
        <div
          className="font-vt323 text-xl tracking-[0.2em] uppercase text-red mb-2"
          style={{ textShadow: '0 0 8px #ff0000' }}
        >
          // the roster
        </div>
        <h1 className="font-bangers text-7xl tracking-[0.04em] uppercase text-white mb-12 leading-[0.9]">
          All Artists
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[3px]">
          {artists.map((artist) => {
            const initials = artist.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="group relative bg-[#0a0000] border-2 border-red p-7 text-center no-underline text-inherit overflow-hidden flex flex-col items-center gap-2 hover:scale-[1.02] hover:-rotate-[0.5deg] hover:border-yellow hover:z-10 transition-all duration-150"
              >
                <div
                  className="w-[72px] h-[72px] rounded-full border-[3px] border-red flex items-center justify-center font-bangers text-[26px] tracking-[0.05em] text-red bg-[#0a0000] relative z-[1] group-hover:border-yellow group-hover:text-yellow transition-colors duration-150"
                  style={{ boxShadow: '0 0 15px rgba(255,0,0,0.3), inset 0 0 15px rgba(255,0,0,0.05)' }}
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
                <div className="mt-2.5 font-bangers text-lg tracking-[0.15em] uppercase text-red border-2 border-red px-5 py-1 relative z-[1] group-hover:text-yellow group-hover:border-yellow group-hover:bg-yellow/5 transition-all duration-150">
                  &#9654; View
                </div>
              </Link>
            )
          })}
        </div>
        {artists.length === 0 && (
          <p className="font-vt323 text-xl text-white/50 text-center py-20">
            No artists yet. Check back soon.
          </p>
        )}
      </div>
    </section>
  )
}

export const metadata: Metadata = {
  title: 'Artists - Magic Pill Music',
  description: 'Browse artists on Magic Pill Music. Direct payments via Lightning Network.',
}
