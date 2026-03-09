import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'
import Link from 'next/link'

import type { Artist, Release } from '@/payload-types'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function ArtistPage({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  const artist = docs[0]
  if (!artist) return notFound()

  const { docs: releases } = await payload.find({
    collection: 'releases',
    where: {
      artist: { equals: artist.id },
      status: { equals: 'published' },
    },
    depth: 0,
    sort: '-releaseDate',
  })

  return (
    <section className="py-20 px-12 min-h-screen">
      <div className="max-w-[1000px] mx-auto">
        <Link
          href="/artists"
          className="font-vt323 text-lg tracking-[0.1em] uppercase text-red no-underline hover:text-yellow transition-colors mb-8 inline-block"
        >
          &larr; All Artists
        </Link>

        <div className="flex flex-col sm:flex-row items-start gap-8 mb-16">
          <div
            className="w-[120px] h-[120px] rounded-full border-[3px] border-red flex items-center justify-center font-bangers text-5xl text-red bg-[#0a0000] shrink-0"
            style={{ boxShadow: '0 0 25px rgba(255,0,0,0.4), inset 0 0 20px rgba(255,0,0,0.05)' }}
          >
            {artist.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h1 className="font-bangers text-6xl tracking-[0.04em] uppercase text-white leading-[0.9] mb-4">
              {artist.name}
            </h1>
            {artist.bio && (
              <p className="font-vt323 text-xl text-white/60 leading-relaxed mb-4">{artist.bio}</p>
            )}
            <div className="flex flex-wrap gap-4">
              {artist.website && (
                <a
                  href={artist.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-vt323 text-lg tracking-[0.1em] uppercase text-yellow no-underline border border-yellow px-4 py-1 hover:bg-yellow/10 transition-colors"
                >
                  Website
                </a>
              )}
              {artist.lightningAddress && (
                <span className="font-vt323 text-lg tracking-[0.05em] text-acid">
                  &#9889; {artist.lightningAddress}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className="font-vt323 text-xl tracking-[0.2em] uppercase text-red mb-2"
          style={{ textShadow: '0 0 8px #ff0000' }}
        >
          // discography
        </div>
        <h2 className="font-bangers text-5xl tracking-[0.04em] uppercase text-white mb-8 leading-[0.9]">
          Releases
        </h2>

        {releases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {releases.map((release) => (
              <Link
                key={release.id}
                href={`/releases/${release.slug}`}
                className="group bg-[#0a0000] border-2 border-red p-6 no-underline text-inherit hover:border-yellow hover:scale-[1.01] transition-all duration-150"
              >
                <div className="font-vt323 text-sm tracking-[0.15em] uppercase text-red/60 mb-1">
                  {release.type}
                </div>
                <div className="font-bangers text-3xl tracking-[0.04em] uppercase text-white leading-none mb-2 group-hover:text-yellow transition-colors">
                  {release.title}
                </div>
                <div className="font-vt323 text-base text-white/40 tracking-[0.05em]">
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
            ))}
          </div>
        ) : (
          <p className="font-vt323 text-xl text-white/50 py-10">No releases yet.</p>
        )}
      </div>
    </section>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const artist = docs[0]

  return {
    title: artist ? `${artist.name} - Magic Pill Music` : 'Artist Not Found',
    description: artist?.bio || 'Artist on Magic Pill Music',
  }
}
