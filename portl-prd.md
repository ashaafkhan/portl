# Portl — Product & Engineering PRD
### "The conversations that used to happen at the gate now happen in one app."

**Doc type:** Brainstorm-style PRD (decisions + reasoning, not just a spec)
**Platform:** Expo (SDK 54) + React Native, mobile-first
**Test device:** Physical iPhone via Expo Go (SDK 54 client)
**Roles:** Resident · Security Guard · Society Admin
**Format:** Staged build plan (20 stages, Stage 1 = Setup → Stage 20 = Submission)

---

## 0. How to read this doc

This isn't a checkbox PRD. Every section that involves a real decision (backend, state
management, navigation, notifications, design system) is written as a **brainstorm**: what
the options were, why we picked one, and what we gave up. If you disagree with a call, the
reasoning is there so you can swap it out without re-deriving everything from scratch.

The build itself is broken into **20 stages**. Each stage has a goal, the reasoning behind
it, a task list, and a "Definition of Done" so you always know when to move on instead of
polishing forever.

---

## 1. Product Brainstorm — what we're actually building

Every apartment gate today runs the same broken loop: delivery guy shows up → guard calls
the flat → phone doesn't ring, or resident is in a meeting, or the guard mis-dials → visitor
stands at the gate → resident finally picks up → "who is it?" → 3 minutes wasted, every
single time, dozens of times a day, across thousands of societies.

Portl's bet is simple: **that phone call should be a notification, and the "who is it"
should already be answered before the guard even opens his mouth.** If we get the
guard ↔ resident visitor loop feeling instant and trustworthy, everything else (notices,
polls, helpdesk, amenities) is just "a well-built CRUD module behind the same login" —
important, but not the hard part. So our sequencing deliberately front-loads the visitor
loop and treats the community modules as later, lower-risk stages.

**Design principle we keep repeating throughout this doc:** *build the boring, relational,
permission-heavy backend first; make the 30 seconds a resident spends approving a visitor
feel instant.* Everything else can be a little rough at a hackathon deadline. That one flow
cannot.

---

## 2. Big Architecture Decisions (the brainstorm)

### 2.1 Framework & navigation

- **Decision:** Expo SDK 54, React Native 0.81, React 19.1, TypeScript, **Expo Router**
  (file-based navigation) with route groups for role separation.
- **Why Expo Router over React Navigation directly:** Expo Router gives us file-based
  routes, which map cleanly onto our 3-role structure — `app/(auth)`, `app/(resident)`,
  `app/(guard)`, `app/(admin)` — so role-based access control is partly enforced just by
  which route group a session can reach, and partly by a guard component. It also gives
  deep-linking almost for free, which matters if we ever want a guest pre-approval link to
  open the app directly.
- **New Architecture note:** SDK 54 is the last release with legacy-architecture support,
  and the new architecture is on by default for new projects. We are **not** disabling it —
  starting a hackathon build on a soon-to-be-deprecated path is a bad trade for a
  short-lived project. The main practical consequence: double-check any third-party native
  module for new-architecture compatibility on React Native Directory before adding it.
- **iOS build note:** SDK 54 ships precompiled React Native for iOS, so local iOS builds
  (if we ever move past Expo Go into a dev client) will be dramatically faster than older
  SDKs. Good news, not a decision we need to act on unless we hit the push-notification
  wall below.

### 2.2 State management

- **Decision:** **Zustand** for client/session/UI state (current role, active flat context,
  in-progress forms) + **TanStack Query (React Query)** for all server data (fetching,
  caching, mutations, optimistic updates on approve/reject).
- **Why not Redux:** too much ceremony for a hackathon timeline; Zustand gives the same
  "global store" ergonomics with a fraction of the boilerplate.
- **Why React Query on top of a Supabase client instead of hand-rolled `useEffect` fetches:**
  the visitor-approval flow lives and dies on data being fresh. React Query's cache
  invalidation + refetch-on-focus + optimistic mutation pattern means "resident taps
  Approve" can flip the UI instantly while the request is in flight, then reconcile with
  the server — that's the "feels instant" requirement from Section 1, solved by a library
  instead of custom code.

### 2.3 Backend & database — the biggest call in this whole doc

We seriously considered two paths:

| | **Supabase (chosen)** | Firebase |
|---|---|---|
| Data model fit | Postgres — towers → flats → residents → visitor_requests are naturally relational, foreign keys enforce integrity | Firestore is document/NoSQL; modeling "a flat has one resident, many visitor requests, many complaints" means manual denormalization and more client-side joins |
| Access control | Row Level Security (RLS) policies expressed as SQL, directly matching "residents/guards/admins only see their own data" | Firestore security rules work but get unwieldy fast for role + ownership + hierarchy combos (society → tower → flat) |
| Realtime | Postgres changes via Realtime channels — a guard's new visitor request can push straight into a resident's open screen | Firestore listeners are also good at this — roughly a wash |
| Push notifications | Not built-in — we pair it with Expo's push service (see 2.5) | Native fit via FCM, and historically Expo's push service is *itself* a thin wrapper over FCM/APNs anyway |
| Storage | Supabase Storage (S3-compatible), fine for visitor photos, ID proofs, notice images | Firebase Storage, equally fine |
| Auth | Supabase Auth (phone OTP, email, or both) + a `profiles` table for role | Firebase Auth, equally fine |

**Decision: Supabase.** The deciding factor is the data model, not the notifications —
this app is fundamentally relational (societies contain towers contain flats contain
residents; visitor requests reference flats and guards; polls have options that have
votes with a uniqueness constraint per resident). Fighting a document database into that
shape for two weeks is a worse trade than solving push notifications separately (which we
have to do anyway — see 2.5, since Expo Go can't do remote push regardless of backend).

### 2.4 Auth & role-based access

- **Decision:** Supabase Auth with **phone OTP** as the primary login method (residents and
  guards think in phone numbers, not emails), backed by a `profiles` table
  (`id`, `society_id`, `role`, `full_name`, `flat_id | null`, `phone`, `avatar_url`).
- **Provisioning model (this matters for demo credentials too):**
  - **Admin accounts** are the seed — created directly in Supabase (or via a one-time
    admin-signup screen we disable after first use).
  - **Residents are pre-created by the admin** during society onboarding (Stage 6), tied to
    a flat and a phone number. A resident's first login is really a "claim" — they OTP-verify
    the phone number the admin already put on file, and their profile flips from
    "invited" to "active." This kills the "random person signs up and claims to live in
    Flat 402" problem without building a whole verification workflow.
  - **Guards are invited by the admin** the same way, just without a flat attached.
- **RLS in one sentence:** every table gets a policy shaped like *"you can read/write rows
  where `society_id` matches your profile's `society_id`, AND (`you own it` OR `your role
  permits it`)."* Residents see their own flat's data; guards see everything gate-relevant
  for their society; admins see everything.

### 2.5 Notifications — the decision that actually changes the roadmap

This is the one piece of received wisdom that's easy to get burned by, so it gets its own
callout:

> **As of SDK 53+, remote push notifications do not work inside Expo Go at all — iOS or
> Android.** They require a **development build** (`expo-dev-client`, built via EAS).
> Local/scheduled notifications still work fine in Expo Go; it's specifically *remote* push
> ("someone else's action pings your phone") that's unavailable.

Since the whole point of Portl is "a guard's action should instantly reach a resident's
phone," and we're testing on Expo Go per the project constraints, we need a strategy that
doesn't quietly break on demo day:

- **Primary mechanism (works in Expo Go, no extra build needed): Supabase Realtime.**
  The resident's app holds an open Realtime subscription on `visitor_requests` filtered to
  their `flat_id`. The moment a guard creates a request, it streams straight into the
  resident's app and we render an **in-app alert / banner + badge + sound**, whether the
  app is foregrounded or just backgrounded-but-connected. For the demo, this *is* the "gate
  call replaced by a notification" moment, and it works with zero native push
  configuration.
- **Stretch goal (only if time allows): a real EAS development build** with
  `expo-notifications` wired to Expo's push service, so a genuinely backgrounded/killed app
  still gets an OS-level push. This is explicitly a **Stage 19 stretch item**, not a
  dependency for the core loop — we are not letting a platform limitation block the MVP.
- **Local notifications** (via `expo-notifications`, which *does* work in Expo Go) are used
  for anything device-local: reminders, "your booking starts in 15 minutes," etc.

### 2.6 Design system & UI library

- **Decision:** **NativeWind** (Tailwind syntax for React Native) on top of a small
  `tokens.ts` file that is the single source of truth for color, spacing, and radius —
  NativeWind's config just imports those tokens. Icons via **lucide-react-native** for a
  clean, consistent line-icon look (avoids the "default Ionicons hackathon app" feel).
  Images via **expo-image** (better caching/perf than the core `Image` component) —
  relevant here because the app is full of photos: visitor photos, ID proofs, notice
  banners, amenity photos, staff directory avatars.
- **Why NativeWind over plain `StyleSheet.create`:** speed. Utility classes let us iterate
  on layout fast, which matters when the schedule is stage-based and tight. The tradeoff
  (a little more Babel config, a learning curve if you've never used Tailwind) is worth it.
- **Why not a full component kit (Tamagui, RN Paper, etc.):** those are great for
  long-lived products but come with an opinionated look that fights against Portl having
  its *own* visual identity (Section 3). We'd spend time undoing defaults instead of
  building.

### 2.7 Forms, media capture, and QR flow

- **Forms:** `react-hook-form` + `zod` for validation — used everywhere (visitor
  registration, complaint submission, poll creation, booking forms).
- **Photo capture:** `expo-image-picker` (camera or library) for visitor/ID photos taken by
  the guard, complaint photos from residents, and admin-side content (notices, amenities).
- **QR / codes for guest pre-approval:** a resident pre-approves a guest and the app
  generates a short-lived token; we render it as a QR code with `react-native-qrcode-svg`.
  The guard scans it with `expo-camera`'s barcode scanning API to instantly resolve who the
  visitor is and auto-log entry — no manual lookup needed. This is one of the few "wow"
  interactions worth budgeting real design time on.

### 2.8 Loading, empty, and error states — treated as a first-class requirement, not polish

Because the scorecard explicitly weights "Mobile User Experience" and "Engineering
Quality" highly, every list/detail screen gets three states designed *up front*, not
bolted on later:
1. **Loading** — skeleton placeholders (not spinners) for anything list-shaped.
2. **Empty** — a short illustration + one-line copy + a clear primary action ("No visitors
   yet today" + nothing else needed; "No notices" + "Post the first one" for admin).
3. **Error** — a retry affordance, never a raw error message or a blank white screen.

### 2.9 Edge-to-edge & safe areas (Android specifically)

SDK 54 defaults new Android apps to edge-to-edge layouts (Android 14+). That's a good look,
but it means every screen must explicitly respect safe-area insets (`react-native-
safe-area-context`) or content will sit under the status bar / gesture bar. Called out here
so it's a Stage 1 setup decision, not a Stage 19 bug.

---

## 3. Brand & Visual Identity Brainstorm

**Name logic:** "Portl" reads as *portal* — the gate becomes a doorway into the app instead
of a literal barrier. That's the whole product thesis in one word, so the logo should lean
into "doorway," not "building" or "generic house icon" (avoid the cliché real-estate-app
look).

- **Logomark concept:** a stylized capital **P** where the vertical stroke doubles as a
  door/gate post and the bowl of the P is drawn as an open arch — literally a doorway
  shaped like the brand's own initial. Renders cleanly as a small square app icon at
  16–1024px, works in a single flat color (needed for adaptive icon monochrome variants on
  Android 13+ and iOS's new tinted-icon mode).
- **Color palette (brainstormed against the emotional job of each role):**
  - **Primary — Indigo/Blue (`#3654F4`-ish range):** trust, security, "official," used for
    primary actions and the admin surfaces.
  - **Accent — Warm Coral/Amber (`#FF7A59`-ish range):** used *specifically* for anything
    needing urgent human attention — an incoming visitor approval, a pending guard
    request. This is deliberate: the one color in the palette that means "look at this now"
    should never be reused decoratively elsewhere, or it stops meaning anything.
  - **Success green** for approved/resolved states, **neutral red** for rejected/urgent-
    complaint states, and a calm gray scale for everything structural (cards, dividers,
    disabled states).
  - Guard screens get slightly higher-contrast, larger-touch-target styling than resident
    screens — guards use this one-handed, often outdoors in bright sunlight, glancing at it
    for two seconds between cars. That's a UX decision as much as a visual one.
- **Typography:** one geo-humanist sans (e.g., **Inter** or **Manrope**, both free via
  `@expo-google-fonts`) for everything — headings via weight, not a second typeface. Keeps
  the app feeling like one coherent product instead of a hackathon stitched together from
  defaults.
- **Iconography:** lucide-react-native throughout, one stroke weight, no mixing icon sets.
- **App icon / splash:** adaptive icon (Android) + standard icon (iOS) built from the
  logomark on the primary indigo background; splash screen shows just the logomark
  centered on that same background via `expo-splash-screen`, so cold-start feels branded
  instead of blank-white-then-app.

---

## 4. Data Model (the relational core)

```
societies
 └─ towers
     └─ flats  ── resident (profile, role=resident)
profiles (id, society_id, role[resident|guard|admin], full_name, phone, avatar_url, flat_id?)

visitors            (id, name, phone, photo_url, id_proof_url, category)
visitor_requests    (id, visitor_id, flat_id, created_by[guard], status, created_at, decided_by, decided_at)
guest_preapprovals  (id, flat_id, resident_id, guest_name, valid_from, valid_until, qr_token, status)
entry_exit_logs     (id, ref_type[request|preapproval], ref_id, entry_time, exit_time, guard_id)

complaints          (id, flat_id, resident_id, category, description, photo_url, status, assigned_to, created_at)
notices             (id, society_id, title, body, image_url, pinned, created_by, created_at)
polls               (id, society_id, question, closes_at, created_by)
poll_options        (id, poll_id, label)
poll_votes          (id, poll_id, option_id, resident_id)      -- unique(poll_id, resident_id)
amenities           (id, society_id, name, description, image_url, capacity, open_time, close_time)
amenity_bookings    (id, amenity_id, flat_id, resident_id, date, start_time, end_time, status)
staff_directory     (id, society_id, name, category, phone, photo_url, verified)
```

Every table carries `society_id` (directly or via a join) so RLS policies are consistent
and simple to reason about: *"is this row's society the same as mine, and does my role/
ownership permit this action?"*

---

## 5. Role & Permission Matrix

| Module | Resident | Security Guard | Society Admin |
|---|---|---|---|
| Visitor approval | Approve/reject for own flat | Register visitor, view own society's queue | View all, override/escalate |
| Guest pre-approval | Create/manage for own flat | Scan/verify code | View all |
| Delivery/cab/service approval | Approve/reject own flat | Register/tag category | View all |
| Entry/exit logs | Own flat's history | Full log, mark entry/exit | Full log, export |
| Helpdesk | Raise + track own tickets | — | Manage/assign/close all |
| Notices | Read | Read | Create/edit/pin/delete |
| Polls | Vote, view results | — | Create/close, view results |
| Amenity booking | Book/cancel own | — | Manage inventory/rules, view all bookings |
| Staff directory | Read | Read | Create/edit/verify |
| Admin dashboard (towers/flats/residents/etc.) | — | — | Full CRUD |

---

## 6. The Staged Build Plan

Each stage lists **Goal → Why → Tasks → Definition of Done**, so it's obvious when to
stop and move on rather than gold-plating any one piece.

### Stage 1 — Foundation & Tooling Setup
**Goal:** A running Expo SDK 54 app on the phone via Expo Go within the first hour.
**Why first:** Nothing else can be verified on-device until this works, and SDK/Expo Go
version mismatches are the #1 hackathon time-sink.
**Tasks:**
- `npx create-expo-app portl --template` (TypeScript template), confirm SDK 54 in
  `package.json`.
- Install Expo Router, set up `app/` structure with route groups: `(auth)`, `(resident)`,
  `(guard)`, `(admin)`.
- Set up NativeWind + `tokens.ts`, ESLint + Prettier, absolute imports.
- Set up `react-native-safe-area-context` and confirm edge-to-edge Android behavior isn't
  clipping content.
- Scan Expo Go on the iPhone, confirm hot reload works.
**Definition of Done:** Blank branded splash → a "Hello Portl" screen visible on the actual
iPhone via Expo Go, edge-to-edge safe on both platforms.

### Stage 2 — Brand Identity & Design System
**Goal:** Lock the visual language before any real screens get built, so nothing gets
restyled twice.
**Tasks:**
- Finalize logomark, color tokens, type scale, spacing scale, icon set (Section 3).
- Build a tiny internal "component playground" screen: buttons, inputs, cards, badges,
  empty-state, skeleton loader, toast — the reusable primitives every later stage pulls
  from.
- Generate app icon + splash assets, wire into `app.json`/`app.config.ts`.
**Definition of Done:** A component playground screen exists showing every base primitive
in its states (default/pressed/disabled/loading), and the app icon/splash are the real
brand, not the Expo default.

### Stage 3 — Backend & Data Model Setup
**Goal:** Supabase project live, full schema in place, RLS policies drafted.
**Tasks:**
- Create Supabase project; create all tables from Section 4 with foreign keys.
- Write RLS policies per table per the permission matrix (Section 5).
- Seed one demo society, 2 towers, 6 flats, 1 admin, 2 residents, 1 guard for local testing.
- Set up Supabase Storage buckets: `visitor-photos`, `id-proofs`, `notice-images`,
  `avatars`, with appropriate access policies.
**Definition of Done:** Can query every table from the Supabase SQL editor respecting the
seeded roles; storage upload/download works from a quick test script.

### Stage 4 — Authentication & Role-Based Routing
**Goal:** Phone-OTP login that lands each role on the correct dashboard, and nowhere else.
**Tasks:**
- Build `(auth)` flow: phone entry → OTP → profile fetch.
- Root layout checks session + role on boot; redirects into `(resident)`, `(guard)`, or
  `(admin)` route groups accordingly; unauthenticated → `(auth)`.
- Handle the "invited but not yet claimed" resident/guard state from Section 2.4.
- Add a lightweight route guard (HOC or layout-level check) so a resident can't navigate
  into `(admin)` routes even by deep link.
**Definition of Done:** Logging in with each of the 3 seeded demo accounts lands on the
correct role's home screen; attempting to hit another role's route redirects away.

### Stage 5 — Navigation Shell for All 3 Roles
**Goal:** Every role has a real tab bar and empty screens for every module before any
module gets built out — this exposes IA problems early.
**Tasks:**
- Resident tabs: Home (feed/alerts), Visitors, Community (notices/polls/helpdesk/amenities
  grouped or sub-tabbed), Profile.
- Guard tabs: Gate (register visitor), Requests (pending/history), Profile.
- Admin tabs: Dashboard, Society (towers/flats/residents), Content (notices/polls),
  Operations (complaints/staff), Profile.
- Every screen renders its Stage-2 empty state placeholder.
**Definition of Done:** Can tab through every screen for every role; nothing 404s; every
screen shows a real (if empty) branded state, not a lorem-ipsum placeholder.

### Stage 6 — Society Onboarding (Admin creates Towers/Flats/Residents)
**Goal:** The admin can stand up a whole society from scratch — this data is a prerequisite
for literally every other module.
**Tasks:**
- Admin: Create Tower → Create Flats under it → Invite Resident to a flat (name + phone).
- Admin: Invite Guard (name + phone, no flat).
- Bulk-friendly touches: duplicate-flat shortcut, CSV-ish paste-a-list option if time
  allows (stretch).
- Resident/guard "claim account" OTP flow actually resolves to the pre-created profile.
**Definition of Done:** From a completely empty society, an admin can build out towers →
flats → invite a resident, and that resident can log in and land in their flat's context.

### Stage 7 — Guard: Visitor Registration Flow
**Goal:** A guard can register any visitor (walk-up, delivery, cab, service) against a flat
in under 15 seconds.
**Tasks:**
- Guard: "New Visitor" → search/select flat/resident (fast fuzzy search, this is used
  constantly) → visitor name, phone, category, optional photo → submit.
- On submit: create `visitors` + `visitor_requests` (status `pending`) row.
- Guard sees the request move into a "Pending" list with live status once the resident
  acts (via Realtime, built fully in Stage 11 but the guard-side listener starts here).
**Definition of Done:** Guard can register a visitor against a real flat from the seeded
data in well under 15 seconds of taps, and it appears as `pending` in Supabase.

### Stage 8 — Resident: Visitor Approval Flow (the core loop)
**Goal:** This is the flow the whole product is judged on — make it fast and unambiguous.
**Tasks:**
- Resident Home surfaces any `pending` request for their flat as a prominent card: visitor
  photo, name, category, guard's note, big Approve/Reject buttons.
- Optimistic UI: tapping Approve instantly flips the card state while the mutation is
  in-flight (React Query optimistic update), then reconciles.
- Guard's screen reflects the decision live.
- Handle edge cases: resident rejects → guard sees a clear "Denied" state, not a silent
  failure; request auto-expires after a timeout (e.g., 5 minutes) if unanswered, guard is
  notified to follow up manually.
**Definition of Done:** From a second device/session, a guard-registered visitor appears on
the resident's screen within ~1–2 seconds, and the decision reflects back to the guard just
as fast.

### Stage 9 — Guest Pre-Approval + QR Code Flow
**Goal:** Residents expecting someone can skip the live-approval step entirely.
**Tasks:**
- Resident: "Pre-approve a guest" → name, valid window (date/time range) → generates a
  `guest_preapprovals` row + QR token, shown as a QR code + shareable text code (for
  guests without the app).
- Guard: scan QR (via `expo-camera`) or manually enter the code → auto-resolves the guest
  identity + valid flat, one-tap "Mark Entry," writes an `entry_exit_logs` row directly
  (no approval round-trip needed, since it's pre-approved).
- Expired/invalid codes show a clear guard-facing error, not a crash.
**Definition of Done:** A resident-generated code, scanned by the guard, resolves correctly
and logs entry without pinging the resident again.

### Stage 10 — Delivery / Cab / Service Staff Approval Variant
**Goal:** Reuse the Stage 7/8 loop for non-guest categories with the small UX differences
that matter (delivery partners rarely need a photo-heavy flow; cabs need a plate/booking
ref; recurring service staff shouldn't need re-approval every single day).
**Tasks:**
- Category-specific fields on the guard's registration form (delivery: platform + order
  ref optional; cab: driver/plate optional; service staff: link to `staff_directory` if
  already known/verified, enabling a "trusted, auto-approve" toggle the resident can set
  per staff member).
- Resident-side "always allow this person" setting that converts future requests from that
  specific phone number into auto-approved entries (still logged, just skipping the
  live-approval step) — this directly reflects a real complaint people have about daily
  domestic help needing re-approval every morning.
**Definition of Done:** All four visitor categories flow end-to-end; a staff member marked
"always allow" is auto-approved on a repeat visit while still producing a log entry.

### Stage 11 — Notifications & Realtime Layer
**Goal:** Formalize the Section 2.5 decision across every module that needs "push-like"
behavior, not just visitor requests.
**Tasks:**
- Supabase Realtime subscriptions: visitor requests (flat-scoped), new notices
  (society-scoped), complaint status changes (resident-scoped), poll closes (society-scoped).
- In-app toast/banner + a small unread-badge system on the relevant tabs.
- `expo-notifications` local notifications for anything device-local (booking reminders).
- Stretch: EAS dev-client build wired for real OS-level push (explicitly optional, time-
  boxed, doesn't block anything else).
**Definition of Done:** Every module that should feel "live" updates without a manual pull-
to-refresh, provably by having two roles' screens open side by side during testing.

### Stage 12 — Entry/Exit Logging & Visitor History
**Goal:** A trustworthy, searchable record of "who came in and out and when" — this is the
audit trail that replaces the paper gate register.
**Tasks:**
- Guard: mark exit for any currently-inside visitor (from approved requests or pre-approval
  scans); a live "currently on premises" list.
- Resident: read-only history filtered to their own flat.
- Admin: full society-wide log, filterable by date/tower/category, exportable (CSV, stretch).
**Definition of Done:** A full visitor lifecycle (registered → approved → entered → exited)
is visible and correctly timestamped from all three role views.

### Stage 13 — Helpdesk & Complaints
**Goal:** Residents can raise and track issues; admin can triage and resolve them.
**Tasks:**
- Resident: new complaint (category, description, optional photo) + status tracker
  (open → in_progress → resolved → closed) + comment/update thread if time allows.
- Admin: complaint queue, filter by status/category, assign, update status, add resolution
  note.
**Definition of Done:** A complaint raised by a resident is visible to admin instantly (via
Stage 11's realtime layer) and status changes reflect back to the resident.

### Stage 14 — Notice Board
**Goal:** Replace the WhatsApp-group announcement pattern with something structured and
persistent.
**Tasks:**
- Admin: create/edit/pin/delete notices, optional image.
- Resident: chronological feed, pinned notices surfaced at top, read/unread state.
**Definition of Done:** A posted notice appears on resident devices via realtime without a
manual refresh, and pinned notices always sort first.

### Stage 15 — Community Polls
**Goal:** Lightweight, real decision-making tool for the community.
**Tasks:**
- Admin: create poll (question + options + optional close date).
- Resident: vote once per poll (enforced by the `unique(poll_id, resident_id)` constraint,
  not just client-side), see live results after voting (or after poll closes, admin's
  choice per poll).
**Definition of Done:** Double-voting is impossible even by hammering the API directly;
results tally correctly.

### Stage 16 — Amenity Booking
**Goal:** Turn "who has the clubhouse this Saturday" into a real calendar instead of a
group chat argument.
**Tasks:**
- Admin: define amenities (name, image, capacity, open/close hours, rules).
- Resident: view availability by date, book a slot, cancel own booking; double-booking on
  the same amenity/slot is rejected at the database level (unique/exclusion constraint), not
  just the UI.
**Definition of Done:** Two residents cannot book the same amenity slot even if they tap
"Book" at nearly the same instant.

### Stage 17 — Staff & Service Provider Directory
**Goal:** A trusted, admin-curated list residents can actually use, feeding back into Stage
10's "trusted staff" auto-approve feature.
**Tasks:**
- Admin: CRUD staff/service-provider entries (name, category, phone, photo, verified flag).
- Resident: browse/search by category, call/contact directly, mark a staff entry as
  personally trusted (feeds Stage 10).
**Definition of Done:** Directory entries are searchable by category and a resident's
"trusted" flag correctly changes gate behavior for that person.

### Stage 18 — Society Admin Master Dashboard
**Goal:** One home screen an admin actually opens every morning — the aggregation layer
that makes all the individual CRUD screens feel like a product instead of a pile of forms.
**Tasks:**
- Summary cards: today's visitor count, pending complaints, open polls, upcoming bookings.
- Quick links into every management module built in Stages 6, 13–17.
- Basic activity feed (recent notices posted, recent complaints resolved, etc.).
**Definition of Done:** An admin can get a full sense of "what's happening in my society
right now" from one screen without drilling into every module individually.

### Stage 19 — Polish Pass
**Goal:** Convert "it works" into "it feels like a real app," which is explicitly scored.
**Tasks:**
- Apply the loading/empty/error pattern (Section 2.8) everywhere it was skipped under time
  pressure earlier.
- Micro-interactions on the visitor approval card (this is the flow judges will look at
  most closely) — subtle motion on approve/reject, haptics (`expo-haptics`) on key actions.
- Accessibility pass: tap target sizes, color contrast (especially the guard's high-glare
  screens from Section 3), dynamic text scaling not breaking layouts.
- **Stretch:** the EAS dev-client build for real push notifications, deferred from Stage 11.
**Definition of Done:** Nobody clicking through the app for the first time hits a blank
screen, a raw error, or an obviously unstyled default component.

### Stage 20 — QA, Demo Recording & Submission Packaging
**Goal:** Everything the rubric explicitly asks for, captured cleanly.
**Tasks:**
- Full run-through on the physical iPhone via Expo Go, one pass per role, using the seeded
  demo accounts.
- Fix anything that only shows up on-device (keyboard avoidance, safe areas, camera
  permission prompts, etc.).
- Record the demo video: cold open on the brand splash, then walk the visitor-approval
  loop live across two devices/sessions (guard registers → resident approves in real time)
  since that's the single most convincing 30 seconds of the whole submission.
- Write the README: setup instructions, demo credentials for all three roles, screenshots.
- Push to a public GitHub repo; produce an Expo/APK build artifact if required.
**Definition of Done:** Every item in the Submission Requirements checklist below is
actually present in the repo, not just planned.

---

## 7. Cross-Cutting Concerns (apply at every stage, not just Stage 19)

- **Optimistic UI on every write that a human is waiting on** (approve/reject, vote, book,
  submit complaint) — perceived speed matters more than raw speed for this app's core
  promise.
- **RLS as the real security boundary**, not just client-side role checks — a resident's
  app hiding the admin tab is a UX nicety; the database refusing the query is the actual
  security.
- **One reusable card component** for anything resembling a "request" (visitor request,
  complaint, booking) so the visual language stays consistent without re-inventing layout
  five times.
- **Consistent empty/loading/error states** from the Stage 2 component playground, reused
  everywhere rather than redesigned per screen.

---

## 8. Risks & Open Questions

- **Push notification stretch goal (Stage 19) may not land in time** — mitigated by design,
  since the core demo relies on Realtime, not native push, per Section 2.5.
- **Resident "claim account" flow assumes correct phone numbers entered by admin** — a typo
  locks a resident out; worth a simple "resend/edit invite" admin action if time allows.
- **QR code flow needs camera permissions handled gracefully** on a real device — test this
  explicitly and early (Stage 9), not the night before the demo.
- **Maintenance/dues payments** are mentioned in the brief's "About" narrative but not listed
  among the graded core features — treated here as an explicit **out-of-scope-unless-time-
  remains** item, kept out of the 20-stage critical path so it never threatens the modules
  that are actually scored.

---

## 9. Submission Checklist (mapped back to the rubric)

- [ ] Public GitHub repository
- [ ] Expo project runs via Expo Go on SDK 54 (or APK if built)
- [ ] Demo video — visitor-approval loop shown live across two sessions
- [ ] README with setup instructions
- [ ] Screenshots of all three role dashboards
- [ ] Demo credentials for Resident / Guard / Admin (seeded in Stage 3, verified in Stage 20)
- [ ] Every module from Stages 6–18 present and reachable from its role's navigation shell
