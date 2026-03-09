import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import Link from 'next/link'

import type { Artist } from '@/payload-types'

export default async function ReleasesPage() {
  const payload = await getPayload({ config: configPromise })

  const { docs: releases } = await payload.find({
    collection: 'releases',
    where: { status: { equals: 'published' } },
    limit: 100,
    depth: 1,
    sort: '-releaseDate',
  })

  return (
    <section className="py-20 px-12 relative overflow-hidden min-h-screen">
      <div
        className="absolute font-bangers text-[22vw] text-transparent pointer-events-none whitespace-nowrap tracking-[0.05em] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ WebkitTextStroke: '1px rgba(255,0,0,0.06)' }}
        aria-hidden="true"
      >
        CATALOG
      </div>
      <div className="max-w-[1200px] mx-auto relative z-[1]">
        <div
          className="font-vt323 text-xl tracking-[0.2em] uppercase text-red mb-2"
          style={{ textShadow: '0 0 8px #ff0000' }}
        >
          // the catalog
        </div>
        <h1 className="font-bangers text-7xl tracking-[0.04em] uppercase text-white mb-12 leading-[0.9]">
          All Releases
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map((release) => {
            const artist = release.artist as Artist | null
            return (
              <Link
                key={release.id}
                href={`/releases/${release.slug}`}
                className="group bg-[#0a0000] border-2 border-red p-6 no-underline text-inherit hover:border-yellow hover:scale-[1.02] hover:-rotate-[0.3deg] transition-all duration-150"
              >
                <div className="font-vt323 text-sm tracking-[0.15em] uppercase text-red/60 mb-1">
                  {release.type}
                </div>
                <div className="font-bangers text-3xl tracking-[0.04em] uppercase text-white leading-none mb-2 group-hover:text-yellow transition-colors">
                  {release.title}
                </div>
                {artist && (
                  <div className="font-vt323 text-base text-white/60 tracking-[0.05em] mb-1">
                    {artist.name}
                  </div>
                )}
                <div className="font-vt323 text-sm text-white/30 tracking-[0.05em]">
                  {release.genre}
                  {release.releaseDate && (
                    <> &middot; {new Date(release.releaseDate).getFullYear()}</>
                  )}
                </div>
                {release.explicit && (
                  <span className="inline-block mt-2 font-vt323 text-sm tracking-[0.1em] uppercase text-red border border-red px-2 py-0.5">
                    Explicit
                  </span>
                )}
              </Link>
            )
          })}
        </div>
        {releases.length === 0 && (
          <p className="font-vt323 text-xl text-white/50 text-center py-20">
            No releases yet. Check back soon.
          </p>
        )}
      </div>
    </section>
  )
}

export const metadata: Metadata = {
  title: 'Releases - Magic Pill Music',
  description: 'Browse the music catalog on Magic Pill Music.',
}
