import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'
import Link from 'next/link'

import type { Artist, Track, ValueSplit, PublishingSetting } from '@/payload-types'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function ReleasePage({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'releases',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
  })

  const release = docs[0]
  if (!release) return notFound()

  const artist = release.artist as Artist | null

  const { docs: tracks } = await payload.find({
    collection: 'tracks',
    where: { release: { equals: release.id } },
    sort: 'trackNumber',
    limit: 100,
    depth: 0,
  })

  const { docs: splits } = await payload.find({
    collection: 'value-splits',
    where: { release: { equals: release.id } },
    limit: 100,
    depth: 0,
  })

  const settings: PublishingSetting = await payload.findGlobal({ slug: 'publishing-settings' })
  const feedUrl = settings.baseFeedUrl
    ? `${settings.baseFeedUrl}/feeds/${release.slug}`
    : `/feeds/${release.slug}`

  return (
    <section className="py-20 px-12 min-h-screen">
      <div className="max-w-[1000px] mx-auto">
        <Link
          href="/releases"
          className="font-vt323 text-lg tracking-[0.1em] uppercase text-red no-underline hover:text-yellow transition-colors mb-8 inline-block"
        >
          &larr; All Releases
        </Link>

        <div className="mb-12">
          <div className="font-vt323 text-sm tracking-[0.15em] uppercase text-red/60 mb-1">
            {release.type}
            {release.explicit && (
              <span className="ml-3 text-red border border-red px-2 py-0.5">Explicit</span>
            )}
          </div>
          <h1 className="font-bangers text-6xl tracking-[0.04em] uppercase text-white leading-[0.9] mb-3">
            {release.title}
          </h1>
          {artist && (
            <Link
              href={`/artists/${artist.slug}`}
              className="font-vt323 text-2xl text-yellow no-underline hover:drop-shadow-[0_0_10px_rgba(255,238,0,0.5)] transition-all"
            >
              {artist.name}
            </Link>
          )}
          {release.description && (
            <p className="font-vt323 text-lg text-white/50 mt-4 leading-relaxed max-w-[700px]">
              {release.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            {release.genre && (
              <span className="font-vt323 text-sm tracking-[0.1em] uppercase text-white/40 border border-white/20 px-3 py-1">
                {release.genre}
              </span>
            )}
            {release.subgenres?.map((sg) => (
              <span
                key={sg.id}
                className="font-vt323 text-sm tracking-[0.1em] uppercase text-white/30 border border-white/10 px-3 py-1"
              >
                {sg.name}
              </span>
            ))}
            {release.releaseDate && (
              <span className="font-vt323 text-sm tracking-[0.1em] text-white/30 px-3 py-1">
                {new Date(release.releaseDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {tracks.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-vt323 text-xl tracking-[0.2em] uppercase text-red mb-4"
              style={{ textShadow: '0 0 8px #ff0000' }}
            >
              // tracklist
            </h2>
            <div className="border-2 border-red">
              {tracks.map((track, i) => (
                <div
                  key={track.id}
                  className={`flex items-center gap-4 px-6 py-4 ${
                    i > 0 ? 'border-t border-red/30' : ''
                  } hover:bg-red/5 transition-colors`}
                >
                  <span className="font-bangers text-2xl text-red/40 w-8 text-right shrink-0">
                    {track.trackNumber || i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bangers text-xl tracking-[0.04em] text-white truncate">
                      {track.title}
                    </div>
                    <div className="font-vt323 text-sm text-white/30 flex gap-3">
                      {track.duration && (
                        <span>
                          {Math.floor(track.duration / 60)}:
                          {String(track.duration % 60).padStart(2, '0')}
                        </span>
                      )}
                      {track.isrc && <span>ISRC: {track.isrc}</span>}
                      {track.explicit && <span className="text-red">Explicit</span>}
                    </div>
                  </div>
                  {track.audioUrl && (
                    <a
                      href={track.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-vt323 text-sm tracking-[0.1em] uppercase text-yellow border border-yellow px-3 py-1 no-underline hover:bg-yellow/10 transition-colors shrink-0"
                    >
                      &#9654; Play
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {splits.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-vt323 text-xl tracking-[0.2em] uppercase text-red mb-4"
              style={{ textShadow: '0 0 8px #ff0000' }}
            >
              // value splits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {splits.map((split) => (
                <div key={split.id} className="bg-[#0a0000] border border-red/40 p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bangers text-lg text-white tracking-[0.04em]">
                      {split.recipientName}
                    </span>
                    <span className="font-bangers text-2xl text-yellow">{split.percentage}%</span>
                  </div>
                  <div className="font-vt323 text-sm text-white/30">
                    {split.role && <span className="mr-3">{split.role}</span>}
                    {split.lightningAddress && (
                      <span className="text-acid">&#9889; {split.lightningAddress}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-red/20 pt-8 flex flex-wrap gap-4 items-center">
          <a
            href={feedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-vt323 text-lg tracking-[0.1em] uppercase text-red no-underline border-2 border-red px-5 py-2 hover:bg-red/10 transition-colors"
          >
            &#128225; RSS Feed
          </a>
          {release.license && (
            <span className="font-vt323 text-sm text-white/30">{release.license}</span>
          )}
          {release.upc && (
            <span className="font-vt323 text-sm text-white/20">UPC: {release.upc}</span>
          )}
          {release.location && (
            <span className="font-vt323 text-sm text-white/20">&#128205; {release.location}</span>
          )}
        </div>

        {release.fundingLinks && release.fundingLinks.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {release.fundingLinks.map((fl) => (
              <a
                key={fl.id}
                href={fl.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bangers text-lg tracking-[0.1em] uppercase text-white no-underline bg-red px-5 py-2 hover:scale-[1.03] transition-transform"
                style={{ boxShadow: '3px 3px 0 #ffee00' }}
              >
                {fl.label || 'Support'}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'releases',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  const release = docs[0]
  const artist = release?.artist as Artist | null

  return {
    title: release
      ? `${release.title} by ${artist?.name || 'Unknown'} - Magic Pill Music`
      : 'Release Not Found',
    description: release?.description || 'Release on Magic Pill Music',
  }
}
