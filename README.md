# A1 Socialness Test — Web App

A single-participant, moderated research instrument that runs the **A1 Socialness
Test** session end to end and records every response consistently. It replaces
paper cards and a manually held "reserve announcement" with an interactive lo-fi
wireframe prototype. One participant uses it at a time, in a moderated session,
on a laptop or tablet.

Built from `[Final] A1_Socialness_Test_Plan.docx` (methodology) and its companion
build spec. See [Mapping to the spec](#mapping-to-the-spec) for traceability.

---

## What it does

1. Walks the participant through the fixed session sequence — baseline, line
   calibration, the feature cards (11 by default), compose, probe.
2. Shows rough grey-box wireframes of each feature plus a baseline music-app
   wireframe (deliberately lo-fi, no branding).
3. Fires each card's social event as a **persistent notification the participant
   must dismiss** (records when it fired and when it was closed).
4. Captures everything — placements, keep/kill, familiarity, reasons, timings,
   dismissal latency, compose, probe — into one exportable session record.
5. Gives the **moderator a logging view** (`/admin`) to review every captured
   signal across all sessions and export JSON + flattened CSV.

### Design principles enforced in code
- **Lo-fi on purpose.** Grey boxes, plain borders, no logos or album art. A
  polished UI would suppress the novelty signal the study measures.
- **Neutral participant copy.** The words *social*, *private*, and the five
  property names never appear in anything the participant sees.
- **Persistent announcements.** Must be clicked to close; fired/dismissed
  timestamps are recorded (dismissal latency is a hesitation signal).
- **Hidden team coding.** Each card's property checklist is never rendered to the
  participant; it rides along only in the export, for the novelty-bias gap.
- **Log everything.** Every step records enter/exit timestamps.
- **Fixed step order, randomized card order** (the per-session order is logged).

---

## Quick start

```bash
npm install
cp .env.example .env.local        # then edit the keys (see below)
npm run dev                       # http://localhost:3000
```

### Required environment variables

| Var | Purpose |
|---|---|
| `ADMIN_KEY` | Unlocks the researcher log + exports at `/admin`. **Required.** |
| `FACILITATOR_KEY` | Unlocks the in-session facilitator panel. **Required.** |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` | Optional hosted persistence (see below). |
| `NEXT_PUBLIC_FACILITATOR_REQUIRED` | Cosmetic flag for the panel. |

Set both keys in `.env.local` before running — `/admin` and the facilitator
panel return 401 until they match.

---

## Running a session (moderator)

1. Open the app. On **Setup**, enter a participant ID and confirm consent. A
   randomized `cardOrder` is generated and logged. (Optional: under *facilitator
   options*, paste a fixed 8-card order for the pilot.)
2. Hand the device to the participant. A **← Back** control (top-left) lets them
   return one page at a time — including card-by-card within the 8-card loop.
   Previous answers are preserved on return, and an announcement they already
   acknowledged does **not** re-fire. Closing the browser tab mid-session still
   warns first, and progress autosaves so a session can be resumed.
3. The participant works through: Baseline → Line intro → Calibration →
   the feature cards (11 by default) → Compose → Probe → Done.
4. On **Done**, the record is finalized, saved, synced, and a per-session JSON
   export button is offered as a guaranteed escape hatch. "Start a new session"
   returns to setup for the next participant.

### Facilitator panel (in-session)
Press **Ctrl + Shift + F** and enter `FACILITATOR_KEY`. From there the moderator
can see the current step, **re-fire** the current card's announcement, **add an
observation note** to the current card, and **end the session** early. Notes are
saved to the session record.

### Voice input on freeform answers
Every long text field (the per-card "why" and the four probe prompts) has a
**mic button** for real-time dictation, so participants can talk instead of
type. Tap it, allow mic access at the browser prompt, and speech is transcribed
live into the field (appended to anything already typed); tap again to stop.
Typing always still works, and the captured text is identical either way.

Uses the browser-native Web Speech API — no backend or API key. Requirements:
a **secure context** (localhost or HTTPS, e.g. Vercel) and a supporting browser
(**Chrome, Edge, or Safari**; not Firefox). Where it's unavailable the mic is
hidden and the field is a plain textarea. Run a quick mic test on the session
device before your first participant.

---

## Moderator logging & export (`/admin`)

Go to **`/admin`**, enter `ADMIN_KEY`, and you get the full session log:

- **Session list** (all participants, newest first; complete vs in-progress).
- **Per-session detail:**
  - Summary — participant, consent, start/finish, total time, card order,
    baseline explore time.
  - Calibration anchor placements.
  - **Card responses table** — keep/kill, line placement (0–100), familiarity
    (1–5), disambiguation, **dismissal latency**, the **hidden team-coded
    properties + social score**, the computed **novelty-bias gap** (highlighted
    when large), and the free-text reason.
  - Compose (included / excluded / stop time), probe (top pick, crossed-line set,
    disliked set, four open answers), step timings, and facilitator notes.
- **Exports:** *Export all JSON*, *Export CSV* (flattened, one row per card
  response), and *Server CSV* (`/api/admin/export.csv?key=...`).

The log merges sessions from the **server** and this **device's localStorage**,
de-duplicated by id, so it stays complete even if the network was down.

### The novelty-bias gap
`novelty_gap = team_social_score (0–100) − participant_line_placement`. A large
positive gap flags a feature the participant placed as "just me" despite being
socially loaded by team coding — the core signal of the study.

---

## Persistence

localStorage is the **source of truth on the session device**, so the tool is
fully functional with **no backend**. Every step also best-effort mirrors to the
server:

- **No Supabase configured (default):** the server uses a local JSON file
  (`.data/sessions.json`). Perfect for a single moderated laptop. Note that on a
  serverless host this file is ephemeral — configure Supabase for hosted runs.
- **Supabase configured:** sessions upsert to a `sessions` table over Supabase's
  auto REST API (no extra SDK). Create the table with:

  ```sql
  create table sessions (
    id uuid primary key,
    participant_id text,
    data jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz
  );
  ```

---

## Editing content

All cards, captions, announcements, and **team-coded properties** live in
[`config/cards.ts`](config/cards.ts) — edit them without touching app logic.
Add or remove cards by editing the `cards` array; everything (progress count,
randomization, compose tray, probe lists, export) derives from it, so no other
file needs to change. Participant-facing strings must never contain construct
words. Also configurable there: `MIDLINE_THRESHOLD` (disambiguation trigger,
default 55) and the neutral line pole labels.

**The set is 11 cards (C1–C11).** C1–C8 are the original feature set; C9–C11 are
concept-derived to fill gaps the originals miss: **C9 Song gift** (`obligation`
with no audience — a relational reciprocity case), **C10 Listening character**
(`private` — the only self-only card; its wireframe deliberately shows no
share/visible-to-others affordance), and **C11 Exclusive status** (`comparison` +
`audience` + `visibility` — a worn-badge status flex, distinct from C8 rank).

**Locked decisions** (spec Section 16), encoded in config comments:
- Announcements **auto-fire** after a short delay, with facilitator re-fire.
- Calibration anchors **hide** after calibration (no extra anchoring).
- C8 *Fan rank* is coded as **exposed** (`comparison`, `visibility`).

---

## API routes

| Route | Purpose |
|---|---|
| `POST /api/session` | Create/persist a session. |
| `PUT /api/session/[id]` | Upsert the full session (autosave). |
| `GET /api/session/[id]` | Fetch (resume on another device). |
| `GET /api/admin/sessions?key=` | List/export all sessions as JSON (auth). |
| `GET /api/admin/export.csv?key=` | Flattened CSV (auth). |
| `POST /api/facilitator` | Verify the facilitator passcode. |

---

## Project structure

```
app/
  page.tsx                     setup & consent (Step 0)
  session/[id]/page.tsx        state-machine host for steps 1–7
  admin/page.tsx               researcher / moderator log + export
  api/...                      session + admin + facilitator routes
components/
  SessionRunner.tsx            forward-only state machine, autosave, timings
  steps/*                      Baseline, LineIntro, Calibration, CardLoop,
                               Compose, Probe, Done
  ui/SocialnessLine.tsx        re-poled 0–100 line (reused everywhere)
  ui/AnnouncementOverlay.tsx   persistent must-close notification
  ui/WireframeFrame.tsx        music-app shell + fake now-playing bar
  ui/wireframes/*              grey-box feature wireframes (wf_*)
  ui/DictationTextarea.tsx     freeform field with real-time voice input
  ui/FacilitatorPanel.tsx      in-session moderator controls
config/cards.ts                content + hidden team coding
lib/
  session.ts                   create / autosave / resume / export
  randomize.ts                 seeded Fisher–Yates shuffle
  store.ts                     server store (file or Supabase)
  analysis.ts                  novelty gap, latencies, CSV flattening
types/index.ts                 data model (capture schema)
```

---

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · `@dnd-kit/core` for
drag-and-drop. No state library — React state plus an autosave hook.

---

## Deploy (Vercel)

1. Push to GitHub and import into Vercel.
2. Set env vars (`ADMIN_KEY`, `FACILITATOR_KEY`, and Supabase vars for hosted
   persistence — the file store is ephemeral on serverless).
3. Deploy and open the production URL on the session device in full screen.
4. Smoke-test a dummy session and confirm the export contains every field.

---

## Mapping to the spec

| Spec | Where |
|---|---|
| §4 session flow | `components/SessionRunner.tsx` + `components/steps/*` |
| §5 screens | one file per step under `components/steps/` |
| §6 content config | `config/cards.ts` |
| §7 data model | `types/index.ts` |
| §8 randomization | `lib/randomize.ts`, generated in `lib/session.ts` |
| §9 persistence/API | `lib/store.ts`, `app/api/*` |
| §12 key components | `components/ui/*` |
| §14 acceptance criteria | all met — verified via a full dummy session |
```
