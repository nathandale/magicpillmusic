# Magic Pill Music — DEMUPUB Business Plan

**DEMUPUB** = Decentralized Music Publisher
**Site**: magicpillmusic.com (also hosted on nathandale.com)
**Stack**: Payload CMS + Next.js + PostgreSQL + Lightning Network

---

## Mission

Give independent musicians a dead-simple, affordable way to publish music via Podcasting 2.0, get paid directly by fans through Value4Value, and own their distribution — no labels, no gatekeepers.

---

## Revenue Model (Three Stacked Layers)

### Layer 1: Hosting Fees — $14.99/yr

| | Free Tier | Hosted Tier ($14.99/yr) |
|---|---|---|
| Artist profile + page on magicpillmusic.com | Yes | Yes |
| Podcasting 2.0 RSS feed generation | Yes (external URLs only) | Yes (hosted files) |
| Submit to Podcast Index | Yes | Yes |
| Audio file hosting | No — artist provides URLs | Up to 15 songs hosted |
| Player embed | Yes | Yes |
| Merch slides in player | Yes | Yes |

**Hosting cost per artist**: ~$0.01/yr on Backblaze B2 or Cloudflare R2
**Margin**: ~$14.98/artist/yr (~99.9%)
**Break-even**: 1 artist

### Layer 2: V4V Fee Tag — 5% of Lightning payments

Every hosted feed includes DEMUPUB as a `fee="true"` recipient in the `<podcast:value>` block:

```xml
<podcast:valueRecipient
  name="DEMUPUB"
  type="node"
  address="[our-node-pubkey]"
  split="5"
  fee="true"
/>
```

- Deducted before artist splits (industry standard for hosting fees)
- Only active when V4V players implement split support (spec exists, adoption growing)
- Wavlake takes 10% — we take 5% (competitive advantage)

### Layer 3: Affiliate Referrals — Passive income

Recommend services to artists via the platform. Earn recurring commissions:

| Service | Commission | What They Do |
|---|---|---|
| Captivate | 25% recurring/lifetime | Podcast hosting (full V4V support) |
| Transistor | 25% recurring/monthly | Podcast hosting (has API) |
| RSS.com | TBD | Podcast hosting (new public API, full Podcasting 2.0) |
| DistroKid | 25% (via Impact) | Music distribution to Spotify/Apple/etc. |
| Castos | 25% recurring (60-day cookie) | Podcast hosting |
| Buzzsprout | $20/referral | Podcast hosting |
| Printful / Spring | Varies | Merch print-on-demand (see Merch section) |

Referral links surfaced on: free tier "host your files" page, artist dashboard, onboarding flow.

---

## Competitive Landscape

| Service | Price | Model | V4V Support | Our Advantage |
|---|---|---|---|---|
| **DEMUPUB** | **$14.99/yr** | Hosted + feed + player | Full | Cheapest, player with merch, 5% fee |
| Wavlake | Free | 10% of all boosts | Full | We're cheaper on the fee (5% vs 10%) |
| DistroKid | $22.99/yr | Distribution to DSPs | None | We're $8 cheaper + V4V native |
| TuneCore | $24.99-54.99/yr | Distribution to DSPs | None | Way cheaper + V4V native |
| Amuse | $23.99/yr | Distribution to DSPs | None | Cheaper + open protocol |
| SoundCloud | $39-99/yr | Own platform only | None | Fraction of the cost |
| Fountain | $12/yr | Music hosting | Full | We include merch + richer player |

---

## The Player — Core Product Differentiator

Mobile-first, PWA-compatible music player that works like Apple Music but with V4V built in. Served from magicpillmusic.com and embeddable on artist sites.

### Now-Playing Screen

```
┌─────────────────────────────┐
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │   [Album Art]       │   │  ← Swipeable carousel
│   │   [Merch Photo]     │   │     during playback
│   │   [Next Show]       │   │
│   │   [Band Photo]      │   │
│   │                     │   │
│   └─────────────────────┘   │
│          · · ○ ·            │  ← Dot indicators (max 4-5)
│                             │
│   Song Title                │
│   Artist Name               │
│                             │
│      ◄◄    ▶    ►►          │
│   ──────●───────────── 2:34 │
│                             │
│  [⚡ Boost]  [🛍 Merch]     │  ← Action buttons
│                             │
└─────────────────────────────┘
```

### Carousel Slides (during playback only)

1. **Album art** — Always default, always first
2. **Merch item** — One featured item with price tag overlay + "Buy" tap target
3. **Next show** — If concert dates exist, nearest upcoming date + venue
4. **Band photo** — One recent photo (manual upload or future IG integration)

Rules:
- Max 4-5 slides, never bloated
- Only shows during active playback
- If no data exists for a slide type, it's simply not shown
- Subtle dot indicator, no tabs or menus

### Action Buttons

- **Boost** — Send sats to artist via Lightning (keysend, LNURL, or Lightning Address)
- **Merch** — Opens merch slide or links to artist's store
- **Share** — Share track link (includes player embed)

---

## Merch Integration

### Phase 1 (Simple — Build Now)

Artist adds merch items to their DEMUPUB profile:
- Image (uploaded to media)
- Title ("Tour T-Shirt 2026")
- Price ("$25")
- URL (links to wherever they sell — Etsy, Big Cartel, Shopify, Bandcamp, etc.)

Shows as carousel slides in the player during playback. Tap → opens merch URL.

### Phase 2 (Revenue — Build Later)

Partner with print-on-demand services:
- Integrate Printful or Spring API
- Artist designs merch in DEMUPUB dashboard
- We handle storefront, they handle printing/shipping
- We earn margin on each sale (Printful: artist sets retail price, cost is fixed)
- OR: Affiliate commission from the print-on-demand service

### Phase 3 (Marketplace — Future)

Full merch marketplace on magicpillmusic.com:
- Browse merch from all artists
- Checkout without leaving the site
- Payment via Lightning or traditional (Stripe)
- DEMUPUB takes a small platform fee (5-10%)

---

## Artist Profile Data Model

What an artist manages in the DEMUPUB dashboard:

```
Artist Profile
├── Name, Bio, Photo, Links
├── Lightning Address (for V4V payments)
├── Releases
│   ├── Tracks (with hosted audio or external URLs)
│   ├── Cover Art
│   └── Value Splits (payment recipients + percentages)
├── Merch Items (image, title, price, URL)
├── Concert Dates (date, venue, city, ticket URL)
├── Photos (manual uploads for player carousel)
└── Publishing Settings
    ├── RSS Feed (auto-generated Podcasting 2.0)
    ├── Podcast Index submission status
    └── Feed URL for external players
```

---

## Roles & Access

| Role | Description | Access |
|---|---|---|
| **Admin** (Nathan) | Full platform control | Everything — manage users, content, settings |
| **Publisher** | Trusted uploaders | Upload audio, manage own content, NO admin access |
| **Artist** | Standard musician account | Profile, metadata, feed generation, NO file uploads |

- **No self-registration** — Admin creates all accounts manually
- Artists on free tier use external audio URLs
- Publishers/Admin can upload audio files (hosted tier)

---

## Infrastructure & Costs

### Hosting Stack

| Component | Service | Monthly Cost |
|---|---|---|
| App server | Linode (existing) | Already paid |
| Database | PostgreSQL (on Linode) | $0 (same server) |
| Audio storage | Cloudflare R2 or Backblaze B2 | ~$0.01/artist/yr |
| Image storage | Local disk (public/media) | $0 |
| Domain | magicpillmusic.com | Already owned |
| Email | ForwardEmail (existing) | Already paid |

### Cost Projections

| Artists | Storage Cost/yr | Revenue/yr (hosting) | Revenue/yr (affiliates est.) | Profit/yr |
|---|---|---|---|---|
| 10 | $0.10 | $149.90 | ~$100 | ~$250 |
| 50 | $0.50 | $749.50 | ~$500 | ~$1,250 |
| 100 | $1.00 | $1,499.00 | ~$1,000 | ~$2,500 |
| 500 | $5.00 | $7,495.00 | ~$5,000 | ~$12,500 |

*Affiliate estimates assume 10% of artists use a referred service at ~$20/yr commission each.*

---

## Build Roadmap

### Phase 1 — Foundation (Current)
- [x] Payload CMS with DEMUPUB collections (Artists, Releases, Tracks, ValueSplits)
- [x] Role-based access control (Admin, Publisher, Artist)
- [x] AudioMedia collection for file uploads
- [x] Podcasting 2.0 RSS feed generation
- [x] CRT/glitch theme + Hero Effects plugin
- [x] CMS-driven pages (SEO, header/footer)
- [ ] Add merch fields to Artist profile (image, title, price, URL)
- [ ] Add concert dates array to Artist profile
- [ ] Add photos array to Artist profile

### Phase 2 — The Player
- [ ] Mobile-first PWA music player
- [ ] Playback from hosted audio + external URLs
- [ ] Album art carousel with merch/show/photo slides
- [ ] Boost button (Lightning payment — start with LNURL/Lightning Address)
- [ ] Merch button (links to artist's store URL)
- [ ] Share button (track link + embed code)

### Phase 3 — Monetization
- [ ] Implement $14.99/yr hosted tier (payment via Stripe or Lightning)
- [ ] Embed `fee="true"` DEMUPUB recipient in all hosted feeds (5%)
- [ ] Affiliate link integration (Captivate, Transistor, DistroKid)
- [ ] Referral tracking dashboard

### Phase 4 — Growth
- [ ] Merch print-on-demand integration (Printful/Spring API)
- [ ] Concert date aggregation page
- [ ] Artist discovery / browse page with filters
- [ ] Embeddable player widget for artist websites
- [ ] Mobile app wrapper (Capacitor/PWA)

### Phase 5 — Scale
- [ ] Multi-artist merch marketplace
- [ ] Storage resale program (API-based upload for third parties)
- [ ] Analytics dashboard for artists (plays, boosts, merch clicks)
- [ ] Nostr integration (publish events, zap receipts)

---

## Key Decisions Made

1. **$14.99/yr** pricing — undercuts all major competitors
2. **No self-registration** — admin approves all accounts
3. **5% V4V fee** (not 10% like Wavlake) — competitive advantage
4. **Cloudflare R2 or Backblaze B2** for audio storage — near-zero cost
5. **Player carousel** — merch, shows, photos during playback (max 4-5 slides, never bloated)
6. **Three revenue layers** — hosting fees + V4V fee tag + affiliate referrals
7. **Free tier exists** — generates affiliate income, feeds paid tier pipeline

---

## Open Questions

- [ ] Which object storage provider? (R2 vs B2 — both viable)
- [ ] Stripe or Lightning (or both) for $14.99/yr subscription billing?
- [ ] Instagram API integration for artist photos? (rate limits, approval process)
- [ ] What Lightning node setup for receiving V4V fees? (Alby, Voltage, self-hosted?)
- [ ] Merch print-on-demand partner selection (Printful vs Spring vs Printify)
- [ ] Mobile app strategy — PWA only, or native wrapper?

---

*Last updated: March 9, 2026*
*Status: Phase 1 in progress*
