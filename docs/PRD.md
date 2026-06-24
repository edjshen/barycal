# Orbit — Product Requirements Document

**Name:** Orbit *(confirmed; was "Kairos" in v0.1)*
**One-liner:** Your calendar is your profile. You see what your people are up to this week — everyday or out — join or spin up low-friction plans, and the same faces recurring turn into your community. Hosts give everyone a reason to keep showing up.
**Doc owner:** Ed
**Status:** Draft v0.3 — key decisions locked (see §0.1)
**Platform:** PWA (MVP) → native iOS/Android (v1)

> **The product in one breath.** Orbit centers on **community through repeated exposure**, built on the *everyday* texture of social life (lunches, the gym, coffee, the Tuesday hang) with host events as recurring anchors. Three stacked layers: a future-tense **calendar-as-profile**; **discovery through your people**; and a **Regulars** engine that turns incidental co-presence into real community. Availability (free/busy) is a quiet utility, not the hero.

---

## 0. Version notes

### 0.1 Decisions locked in this version

| # | Decision | Choice |
|---|---|---|
| 1 | Name | **Orbit** |
| 2 | Home screen | **Discover** — this week, with social proof |
| 3 | Privacy model | **Tiered by circle** — Inner Circle sees event content; Orbit sees free/busy |
| 4 | Discovery scope (MVP) | **Friends + host events only** — no external/city import |
| 5 | Regulars visibility | **Private to you**; nudges a **standing plan** |
| 6 | Account-free depth | **View + soft-RSVP** without an account |
| 7 | Host events | **Created in-app** (lightweight host flow) |
| 8 | Core actions | **Join + make plans + standing (recurring) plans** |
| 9 | Google Calendar | **Optional enhancement** — not required to use Orbit |
| 10 | Profile contents | **Upcoming + bio/scenes** |
| 11 | Center of gravity | **Everyday interactions first**; host events are anchors |

### 0.2 What changed from v0.1 ("Kairos")

1. **New north star:** from *"plans that happened"* → **recurring co-presence** (acquaintances becoming regulars).
2. **Hero flips:** from *Open Time* (availability) → **Discover + Profile + Regulars**.
3. **Privacy inverts, with a valve:** from free/busy-only → **content shared, tiered by circle**; free/busy is the fallback tier, not the whole model.
4. **The host is the engine:** Ed's events solve cold-start and perpetually fuel repeated exposure.
5. **Everyday-first (v0.3):** the daily fabric is ordinary interactions; this brings back **Status/Intention** and keeps **free/busy** as a live utility.

Inherited from v0.1 unless noted: tech architecture (§11 there), OAuth scope strategy, PWA constraints. See §12 for deltas.

---

## 1. TL;DR

Instagram is a museum of the past — proof of what you already did. A calendar points the other way: a future-tense, *actionable* record of what you're about to do. That makes it a far better social object, because "you're going to that? I'm in" turns a profile view into a plan. A photo grid can't.

Orbit makes your calendar your profile, and routes discovery through the calendars of the people you know — but discovery isn't the point. The point is what it produces: **repeated exposure to the same group of people**, the only thing that reliably turns acquaintances into a community. And the substance is **everyday**: lunches, workouts, coffee, the standing Tuesday hang — not just nights out. Everyday recurrence is exactly the soil community grows in.

The unlock that makes this real is the **host**. Ed runs events; a host can unilaterally give people a reason to be in the same room, with no network required — the bootstrap that kills every other social-calendar startup. Host events anchor the everyday fabric; attendance and everyday hangs populate calendars; overlap surfaces *Regulars* (the people you keep ending up around); Orbit nudges those familiar faces into standing plans; a denser community shows up to more, everyday and hosted alike. The flywheel turns on day one.

Beachhead: the NYC social graph already reachable through PLUR.NYC and SAM — dense, pre-connected, taste-driven, already gathering around events Ed controls.

---

## 2. Thesis: community is a byproduct of repeated exposure

**The mechanism.** Proximity and repetition, not compatibility, create relationships (Festinger's propinquity effect; Zajonc's mere-exposure effect). You grow close to the people you keep incidentally encountering — the regulars. Friendship precipitates out of recurrence; it is almost never engineered directly. **Everyday** life is where that recurrence actually happens — which is why Orbit is everyday-first and treats host events as the high-gravity anchors inside an everyday fabric, not as the product itself.

**The failure of everyone else.** Social products engineer the *connection* — feeds, follower graphs, suggestions, matching — and optimize reach and engagement. A feed gives you a thousand weak, one-way exposures to people you'll never share a room with. Orbit inverts the target: **engineer recurrence, not connection.** Make the same real people keep showing up in each other's actual lives, and community forms on its own.

**Three stacked layers:**
- **Calendar-as-profile** — your future-tense identity. What you're into, expressed by where you're going. Browseable, account-free-viewable, screenshot-worthy — the social object that replaces the IG profile, but *forward-pointing and therefore joinable*.
- **Discovery through your people** — find things to do (everyday or out) by seeing what your friends and scenes are up to this week, with social proof ("who you know is going").
- **Regulars, hosted** — the host supplies recurring occasions; Orbit makes the resulting overlaps *visible* ("you've seen Maya 3×") and *actionable* (a standing plan), turning incidental co-presence into a named, growing community.

**Positioning, one line:** the everyday, future-tense identity-and-discovery layer that turns a host's events into a self-densifying community — where Instagram is past-tense and solitary, Partiful is episodic and amnesiac, and Howbout is a utility with no identity, discovery, or community model.

---

## 3. Competitive landscape

| Product | Owns | Misses |
|---|---|---|
| **Instagram / TikTok** | Identity, discovery, reach | Past-tense; not joinable; performative; no calendar truth |
| **Partiful** | Beautiful one-off event pages; Gen-Z/NYC default; frictionless RSVP | Episodic, *amnesiac* — no memory of who you keep seeing; no profile, no everyday, no community accretion |
| **Luma** | Sleek pages, ticketing, recurring | Professional/cold; organizer tool, not a personal identity surface |
| **Howbout** | Everyday friend-group availability, polls, widget | A utility; no identity/profile, no discovery, no community model, no design soul |
| **Geneva / Discord** | Community containers, chat | No calendar truth; chat-first, high-maintenance, not ambient |
| **Google / Apple Calendar** | Source of truth, ubiquity | Solitary, sterile, no social model |

**White space:** a future-tense *profile* (1) design-forward enough to be your public face, (2) plugged into your people's real calendars for everyday discovery, (3) built to maximize *repeated exposure to the same people*, and (4) host-seeded and continuously fueled. No incumbent holds even two corners together. Partiful is closest on (1)/(4) but amnesiac — no concept of "the people you keep seeing," which is the whole point.

**Defensibility:** the **co-presence graph** (who keeps ending up around whom — impossible to backfill, stickier each week), the **host relationship** (a warm, exactly-ICP graph incumbents can't buy), and **identity lock-in** (your calendar becomes your social face).

---

## 4. Design philosophy: "engineer recurrence, not engagement"

The soul carries from v0.1's "intentional," sharpened: Orbit *embraces* discovery and identity (they serve real-world recurrence) while refusing engagement-bait. One test governs everything:

> **Does this make the same real people more likely to be in the same room again?** If yes, ship it. If it only raises time-in-app, cut it.

- **Everyday-first, ultra-low friction.** The common case is "free for lunch, who's around?" — two taps, not an event-creation wizard. Friction is the enemy of recurrence.
- **Forward-tense and joinable.** Identity is what you're *going to do*, and every expression is an open door. A face, not a stage — no vanity counts as a goal.
- **Discovery in service of meeting, not scrolling.** There *is* a Discover home (a reversal from v0.1), but it's bounded — "this week," finite — and oriented to action. No infinite feed.
- **Memory of co-presence — a deliberate, narrow past tense.** Orbit remembers who you've been around (to power Regulars); almost nothing else. Threads and statuses fade; the recurrence graph persists, because it *is* the product.
- **Calm notifications.** Batched digest at a time you pick. Real-time only for convergence ("3 of your regulars are converging on lunch").
- **Density over reach.** The unit is the *scene/pocket*, not the dyad and not the global network.
- **Soft commitment.** RSVP is a gradient (Down / Maybe / Can't), so tentative everyday plans form earlier and recur more easily.
- **Beauty is a feature.** Profile and event pages must clear "a designer would screenshot this." References: Partiful's warmth, Luma's dark sophistication, Amie/Notion Calendar's editorial calm — synthesized, decluttered.

---

## 5. Core concepts & vocabulary

- **Profile** — your future-tense identity: what you're going to (by visibility tier) + a short bio + your scenes. Account-free-viewable, shareable, screenshot-worthy.
- **Discover** — the home. This week's events *and* everyday openings from your people, chronological, with social proof.
- **Intention / Status** — the everyday on-ramp: a lightweight, expiring broadcast ("free for lunch," "gym at 6, join?") to a chosen tier. The lowest-friction way to create a hang.
- **Plan** — a concrete hang you spin up (find a time, invite, soft-RSVP, write back). **Standing plans** (recurring) are first-class — Tuesday lunch, Sunday run — because recurrence is the thesis.
- **Event** — a first-class, *joinable* object with a page and who's-going. **Host/Anchor events** (Ed's) are created in-app and act as recurring gravity wells.
- **Regulars** — *the hero magic.* The people you keep ending up around, surfaced privately from overlapping presence; nudges you toward a standing plan. Shows you your emerging community before you'd have noticed it.
- **Circles & the visibility tiers** — your graph in closeness tiers: **Inner Circle** sees event *content*; **Orbit** sees *free/busy* only. One-tap ghost mode.
- **The Scene** — a host/community surface (PLUR, SAM, a run crew): its anchor events and its regulars. The Poiesis bridge.

---

## 6. Information architecture

```
Discover (home)
├── This week: events + everyday openings from your people
├── Social proof on each (who you know is going / who's free)
├── From your scenes (host/anchor events)
└── Join → soft-RSVP → lands on your calendar & profile

Profile (your identity surface)
├── What I'm going to (future-tense, by visibility tier)
├── Bio + my scenes
├── My Regulars (private to me)
└── Share link (account-free viewable)

Plans
├── Set an Intention / Status (everyday on-ramp)
├── Make a plan / Standing plan (recurring)
├── Plan page (who's in, soft RSVP, ephemeral thread)
└── Past (fades; co-presence memory retained)

Regulars (private)
├── Familiar faces — you've been around N times
├── Nudge → "make it a standing thing?"
└── Scenes you're becoming a regular of

You
├── Connect Google Calendar (optional)
├── Circles & visibility tiers + ghost mode
├── Notification cadence
└── Theme / appearance
```

---

## 7. MVP feature specifications

**F1 — Profile (calendar-as-identity).** Public-by-link, future-tense profile: upcoming (by visibility tier) + bio + scenes. Account-free viewable; screenshot-worthy; the primary share/growth surface.
*Acceptance:* a stranger opens your link, grasps who you are *by where you're going*, and can follow or join a public event with no account.

**F2 — Discover (home).** This week's events *and* everyday openings from your people, chronological, each with social proof ("who you know is going / who's free"). Bounded and action-oriented — not an infinite feed.
*Acceptance:* with ≥3 connections, the user finds at least one real thing to do *and* sees who they'd know there, in under 15 seconds.

**F3 — Events + lightweight host flow.** First-class joinable events (page, who's-going, soft-RSVP, visibility). The host creates anchor events in-app via a simple flow; joining writes to the joiner's calendar and profile.
*Acceptance:* Ed creates an event in under a minute; his graph sees it; one-tap join lands it on the joiner's calendar/profile; the page is screenshot-worthy.

**F4 — Intention / Status.** Two-tap everyday broadcast ("free for lunch," "gym at 6, join?") to a chosen tier; auto-expires. The lowest-friction path into a hang; shows up ambiently on friends' Discover.
*Acceptance:* setting an intention takes two taps; friends see it this-week; it disappears on its own; nothing accumulates.

**F5 — Plans + standing plans.** Spin up a hang (invite, soft-RSVP, write-back) — and **recurring/standing plans** that auto-propose the next slot from the group.
*Acceptance:* "want to see these people" → sent plan in under a minute; a standing plan re-proposes itself with no re-organizing.

**F6 — Regulars (repeated-exposure engine).** *Private to you.* Surfaces the people you keep co-occurring with (everyday + events) and nudges a standing plan. Warm, never surveillant.
*Acceptance:* after sharing ≥3 occasions with someone, they appear as a Regular with a one-tap "make it a standing thing"; visible only to you.

**F7 — Circles + tiered visibility.** Inner Circle (sees content) / Orbit (sees free/busy); conservative defaults; one-tap ghost mode. The privacy model and safety valve in one.
*Acceptance:* a user trusts the model in under a minute; every item's audience is obvious and changeable in one tap.

**F8 — Soft-RSVP + account-free RSVP + write-back.** Down / Maybe / Can't on any event/plan; non-users can view and soft-RSVP via link (install nudge after). Confirmed attendance writes to Google Calendar *if connected*.
*Acceptance:* a non-user RSVPs from a shared link with no account; a connected user's "I'm in" lands on their real calendar.

**F9 — Google Calendar (optional connect).** Orbit works standalone; connecting Google Calendar auto-populates your week and enables the **free/busy availability utility** (used in plan-making and tiered sharing). Scopes requested just-in-time.
*Acceptance:* a user is fully functional without connecting; connecting visibly enriches Discover and plan-making within seconds.

**F10 — Ephemeral plan thread.** Per-plan, fades after the event (Mayfly substrate). Coordination, not an inbox.

**F11 — Slow notifications.** Batched digest by default; real-time only for convergence moments. Full cadence control.

**F12 — PWA install.** Guided, Safari-aware install (push requires home-screen install on iOS); honest about why; non-installers still usable.

---

## 8. Feature scope matrix

| Feature | MVP (PWA) | v1 (native) | Vision |
|---|---|---|---|
| Profile (calendar-as-identity) | ● | ● | ● |
| Discover (home, social proof) | ● | ● | ● |
| Events + lightweight host flow | ● | ● | ● |
| Intention / Status (everyday) | ● | ● | ● |
| Plans + standing plans | ● | ● | ● |
| **Regulars (private engine)** | ● | ● | ● |
| Circles + tiered visibility | ● | ● | ● |
| Soft-RSVP + account-free RSVP | ● | ● | ● |
| Google Calendar (optional) + free/busy | ● | ● | ● |
| Ephemeral plan thread | ● | ● | ● |
| Slow notifications | ● (web push) | ● (native) | ● |
| PWA install | ● | n/a | n/a |
| Scene / community pages (host) | ◐ basic | ● | ● |
| Cultural-events import (city) | ○ | ◐ | ● |
| Home-screen Regulars/availability widget | ○ | ● | ● |
| Serendipity ("both free + both regulars") | ○ | ● | ● |
| AI plan concierge · generative art · the Reel | ○ | ○ | ● |
| Live "Tonight" layer · tap-to-connect | ○ | ○ | ● |
| Apple / Outlook calendars | ○ | ◐ | ● |

● in scope · ◐ partial · ○ out of scope for that stage

---

## 9. North-star & metrics

The metric *is* the thesis. Get it wrong and you build Instagram.

**North-star: recurring connections formed** — person-pairs who share **≥3 occasions** (events, plans, or everyday hangs) within a rolling window: relationships that crossed from acquaintance to *regular*. Hard to game, directly encodes "community through repeated exposure," tracked by no incumbent.

**The recurrence funnel (core diagnostic):** 1st co-presence → **3rd-occasion conversion** (the central job) → standing-plan formation.

**Activation (first 2 weeks):** ≥3 connections **+** joined ≥1 thing **+** ≥1 surfaced Regular. The "aha" is seeing a familiar face *named*.

**Community/graph health:** co-presence density inside a pocket; % of users with ≥1 recurring connection; host-event → repeat-attendee rate.

**Retention:** weekly cadence (open to see what your people are up to). Thesis to validate: **users who form ≥1 recurring connection retain dramatically better.**

**Anti-metrics (guardrails):** time-in-app kept *low*; vanity reach not optimized; notification volume capped; *discovery scrolling that doesn't convert to attendance* — if it rises, Discover has become a feed and must be re-bounded.

---

## 10. The flywheel & go-to-market

The host solves cold-start — the genre's killer. You can give people a reason to show up on day one.

```
Host throws / a friend posts an everyday intention
        ↓
People join → it lands on calendars & profiles
        ↓
Overlapping presence accrues → Regulars surface (private)
        ↓
Orbit nudges familiar faces → standing plans form
        ↓
Denser community → more hangs, everyday & hosted → (loop)
```

**Phase 1 — seed one pocket.** Launch into a single dense PLUR/SAM cluster around real events Ed hosts; density *inside the pocket* is enough, and the host manufactures it.
**Phase 2 — profile + event-page virality.** Every profile/event page is a shareable, account-free-viewable growth surface; joining re-publishes to the joiner's profile, exposing their graph.
**Phase 3 — wedge expansion.** Scene → adjacent scenes → other cities, same host-anchored pocket-density playbook.
**Phase 4 — Scenes as a product (Poiesis bridge).** Hosts run member-facing Scene pages; audiences become connected graphs. B2B2C + distribution loop.

---

## 11. Relationship to your other builds

- **Poiesis** = the *host/operator* surface (run the event). **Orbit** = the *attendee/personal* surface (live your week, become a regular). Shared graph and event notion; the **Scene** is the seam. The host pillar is the Poiesis bridge, now load-bearing. (MVP host flow is lightweight and in-Orbit; deeper host tooling lives in Poiesis.)
- **Mayfly** (ephemeral chat) → plan threads (F10) and statuses (F4).
- **PLUR.NYC / SAM** → the host-seeded pocket; cold-start made of real, recurring events.
- **Stack** (Next.js, Supabase, Cloudflare DO/Yjs, Anthropic) is largely reused; new surface area is the co-attendance graph and the Discover/Profile rendering.

---

## 12. Technical deltas from v0.1

Inherited: v0.1 architecture, OAuth scope strategy, PWA constraints. Changes:

- **Events are first-class shared objects**, not just free/busy blocks. New tables ≈ `events` (host- or user-owned; `visibility ∈ {inner, orbit, public}`; cover, location, time; `recurring` flag for standing plans), `event_attendance` (`event_id`, `user_id`, `rsvp ∈ {down,maybe,cant,none}`, `source ∈ {hosted, joined, intention}`), `statuses`/intentions (text, vibe, tier, `expires_at`). v0.1's `availability_blocks` survives for the F9 utility.
- **Co-presence graph** is the new core structure: derive `(user_a, user_b, shared_count, last_shared_at)` from attendance + standing plans. Powers Regulars (F6) and the north star. The one thing Orbit deliberately remembers.
- **Tiered-circle visibility replaces free/busy-only** as the default authz question. Postgres RLS enforces it: Inner reads content; Orbit reads free/busy; cross-tier content reads are refused at the DB layer.
- **Google Calendar is optional.** Onboarding does not require it → much lower friction and *defers Google's restricted-scope verification* until the feature is switched on for a user. Connected users get auto-populated weeks + the free/busy utility; everyone else uses Orbit-native events/intentions/plans. Write-back (`events.insert`) still requested just-in-time at first write.
- **Reuse from the current `social-cal` prototype:** the shareId + account-free public-page pattern, and the per-event `isPublic` flag (the seed of the visibility tiers). Rebuild on the v0.1 stack; the manual event-CRUD becomes the lightweight host/plan flow.

---

## 13. Privacy & safety

Carries v0.1 §12 (data minimization for the free/busy utility, RLS as authz, JIT consent, token hygiene, conservative defaults, ghost mode) **plus**:

- **Tiered content is the model:** Inner sees what; Orbit sees when. New connections default conservative until placed in a tier.
- **Future-tense location is a safety surface.** A public future plan can broadcast where you'll be. Mitigations: Google-synced events default private; location coarsened/hidden on public events unless opted in; ghost mode one tap; the *public* tier is always an explicit per-item choice.
- **Co-presence memory is sensitive and private.** Regulars is private-to-you by default (locked decision #5); minimal data (counts + timestamps + refs), never a behavioral dossier.
- **Discovery ≠ surveillance.** You only ever see what someone chose to share at the tier they chose. No "who viewed you," no location pings.

---

## 14. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Drifts into Instagram (engagement bait) | High | §9 anti-metrics with owners; the §4 test; Discover stays bounded/join-oriented |
| Future-tense location / safety | High | Synced events private by default; coarsened public location; per-item public opt-in; ghost mode |
| Cold start | Med (host de-risks) | Host-seeded pocket density; account-free virality; solo value via your own profile |
| Privacy backlash (content is sensitive) | High | Tiered visibility + RLS; conservative defaults; lead with trust + safety |
| Regulars feels creepy not warm | Med | Private-by-default; gentle opt-in nudges; counts not dossiers; high copy/UX bar |
| Everyday friction too high → no recurrence | Med | Two-tap Intentions; standing plans; ruthless friction budget on the core loop |
| Google verification + CASA | Med (deferred) | GCal optional → verification needed only when the feature ships broadly; narrowest scopes, JIT |
| Scope creep | Med | Hold the §8 matrix; MVP is F1–F12 |

---

## 15. Open questions

*(Resolved by the v0.3 interview: name, home screen, privacy model, discovery scope, Regulars visibility + action, account-free depth, host-event creation, core actions, Google Calendar requirement, profile contents, everyday-first.)*

Still open:
- **Discover ranking details** beyond chronological-with-social-proof — how to weight host events vs friends' everyday openings without becoming a popularity feed.
- **Standing-plan mechanics** — how aggressively to auto-propose the next slot; opt-in vs default.
- **Scene pages in MVP** — basic host page now, or wait for Poiesis integration?
- **One app or two** (Orbit vs Poiesis) — data/brand boundary, given the in-Orbit host flow.
- **Where exactly the "bounded discovery vs feed" line sits** as usage grows.

---

## 16. Roadmap & milestones

**Phase 0 — Foundation (weeks 0–2).** Auth, the **Profile** (F1) + **Discover** shell (F2), Circles + tiered visibility (F7), optional Google Calendar connect (F9). *Milestone: your profile is something you'd actually share, and Discover shows something real.*

**Phase 1 — The everyday recurrence loop (weeks 2–8).** Events + host flow (F3), Intentions (F4), Plans + standing plans (F5), Regulars (F6), soft/account-free RSVP + write-back (F8), threads (F10), slow notifications (F11), PWA install (F12). *Milestone: a closed beta in one PLUR/SAM pocket produces real repeat co-presence — pairs reaching a 3rd shared occasion.*

**Phase 2 — Delight & Scenes.** Scene pages, serendipity, AI concierge, generative art, the Reel, native shell + widget. *Milestone: north-star growing week over week without engagement-bait.*

**Phase 3 — Full vision (native).** Live "Tonight" layer, tap-to-connect, Apple/Outlook, context integrations, E2E. *Milestone: category-defining across multiple city pockets.*

---

## 17. Appendix

**Core differentiator, one line:** *the only calendar that is your future-tense profile, routes everyday discovery through your people, and is engineered — host-seeded — to make the same faces recur until they're a community.*

**Design references:** Partiful (warmth, shareable pages), Luma (dark sophistication), Amie/Notion Calendar (editorial calm), Locket (ambient intimacy) — synthesized, decluttered. Profile and event pages must clear "a designer would screenshot this."

**Inherited constraints:** Google Calendar API (Events, Freebusy, watch channels, syncToken) + restricted-scope verification/CASA (deferred by optional connect); iOS PWA limits in 2026 (install-gated push, no background sync, no widgets, eviction).
