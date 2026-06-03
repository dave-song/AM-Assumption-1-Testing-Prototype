import type { AnchorConfig, CardConfig } from "@/types";

// ---------------------------------------------------------------------------
// Content configuration (spec Section 6).
// Edit cards, captions, announcements, and team-coded properties here WITHOUT
// touching app logic. `properties` are hidden from the participant and ride
// along only in the export. Participant-facing strings (caption / announcement)
// must never contain construct words: "social", "private", or the five
// property names (spec principle 2).
// ---------------------------------------------------------------------------

export const APP_VERSION = "1.0.0";

// Disambiguation midline threshold (spec 5.4): show the follow-up only when
// linePlacement crosses this value toward "other people".
export const MIDLINE_THRESHOLD = 55;

// Show features the participant already placed as faint reference markers on the
// line during each card's placement. Helps them stay consistent relative to
// earlier answers. TRADEOFF: this reintroduces the anchoring the spec
// deliberately avoided for calibration anchors (Section 16.2) — placements are
// no longer independent, so the line measures relative ranking as much as
// absolute position. Set to false for an independent-placement run.
export const SHOW_PRIOR_PLACEMENTS = true;

// Delay before an announcement auto-fires, in ms. Long enough that the
// participant can take in the whole feature screen first, then the notification
// appears on its own and must be closed manually (no auto-dismiss).
export const DEFAULT_ANNOUNCEMENT_DELAY_MS = 5000;

// Line poles. Framed as a resemblance gradient ("how much does this feel like a
// social app") rather than a capability ("can others see it"), which reads as a
// spectrum, not a binary. NOTE: this deliberately overrides spec principle 2's
// ban on the word "social" — the team's decision, since the construct here is
// essentially "how social-app-like does this feel."
export const lineLabels = {
  left: "Just my own music",
  right: "More like a social app",
};

export const baseline = { wireframe: "p0_now_playing" };

export const anchors: AnchorConfig[] = [
  {
    id: "A1",
    name: "Mood mix",
    caption: "Builds a mix from your mood",
    wireframe: "wf_mood_mix",
    expectedSide: "left",
    announcement: {
      title: "Your mix is ready",
      body: "Tuned to your mood right now.",
      delayMs: 5000,
    },
  },
  {
    id: "A2",
    name: "Shared playlist",
    caption: "A playlist your friends can add to",
    wireframe: "wf_shared_playlist",
    expectedSide: "right",
    announcement: {
      title: "Jordan added a song",
      body: "to your shared playlist.",
      delayMs: 5000,
    },
  },
];

export const cards: CardConfig[] = [
  {
    id: "C1",
    name: "Aggregate listen count",
    caption: "Shows how many people are listening",
    wireframe: "wf_listen_count",
    properties: ["comparison"],
    announcement: { title: "1.2M listening now", body: "and climbing.", delayMs: 5000 },
  },
  {
    id: "C2",
    name: "Friend presence",
    caption: "Shows a friend listening to this",
    wireframe: "wf_friend_presence",
    properties: ["visibility"],
    announcement: { title: "Maya is listening to this too", body: "right now.", delayMs: 5000 },
  },
  {
    id: "C3",
    name: "Friend-activity feed",
    caption: "A feed of what friends played",
    wireframe: "wf_activity_feed",
    properties: ["visibility"],
    announcement: { title: "New in your friends feed", body: "Sam played 3 tracks.", delayMs: 5000 },
  },
  {
    id: "C4",
    name: "Public taste profile",
    caption: "Your listening, visible to others",
    wireframe: "wf_public_profile",
    properties: ["visibility", "audience"],
    announcement: { title: "3 people viewed your profile", body: "this week.", delayMs: 5000 },
  },
  {
    id: "C5",
    name: "Reactions and comments",
    caption: "React or comment on a track",
    wireframe: "wf_reactions",
    properties: ["obligation", "audience", "visibility"],
    announcement: { title: "Someone reacted", body: "to the track you are playing.", delayMs: 5000 },
  },
  {
    id: "C6",
    name: "Post or share status",
    caption: "Post what you are listening to",
    wireframe: "wf_post_status",
    properties: ["audience", "visibility"],
    announcement: { title: "Your post is live", body: "in the feed.", delayMs: 5000 },
  },
  {
    id: "C7",
    name: "Visible to friends",
    caption: "Friends can see you are listening",
    wireframe: "wf_visible_to_friends",
    properties: ["visibility"],
    announcement: { title: "A friend saw you", body: "listening to this.", delayMs: 5000 },
  },
  {
    id: "C8",
    name: "Fan rank",
    caption: "Your rank among listeners",
    wireframe: "wf_fan_rank",
    // Decision locked (spec 16.3): rank is EXPOSED — others can see your rank.
    properties: ["comparison", "visibility"],
    announcement: { title: "A friend just passed you", body: "on this artist.", delayMs: 5000 },
  },
  // --- Concept-derived cards (C9–C11) -----------------------------------------
  // Added to fill cells the original eight miss: relational obligation with no
  // audience (C9), a purely private self-recognition case (C10 — the set had no
  // private card), and a visible loyalty-status flex distinct from rank (C11).
  {
    id: "C9",
    name: "Song gift from a friend",
    caption: "A friend sent you this song with a note",
    wireframe: "wf_song_gift",
    // Only obligation card WITHOUT audience — contrasts with C5 to isolate
    // whether reciprocity pressure tips people only when it is public.
    properties: ["obligation"],
    announcement: {
      title: "Maya sent you this song",
      body: 'with a note: "this part is so you."',
      delayMs: 5000,
    },
  },
  {
    id: "C10",
    name: "Personal listening character",
    caption: "Your listening shapes a character",
    wireframe: "wf_character",
    // Coded private on purpose: the wireframe shows NO share / visible-to-others
    // affordance, so it reads as self-only. Anchors the quiet, low-social end.
    properties: ["private"],
    announcement: {
      title: "Your character changed",
      body: "from what you have been playing.",
      delayMs: 5000,
    },
  },
  {
    id: "C11",
    name: "Exclusive visible status",
    caption: "A status others can see, earned by how much you listen",
    wireframe: "wf_exclusive_status",
    // Stacks comparison + audience + visibility (a worn badge): a high-load
    // status flex, distinct from C8 rank by adding the worn-badge audience.
    properties: ["comparison", "audience", "visibility"],
    announcement: {
      title: "You unlocked Top Fan status",
      body: "now showing on your profile.",
      delayMs: 5000,
    },
  },
];

export const cardById = (id: string): CardConfig | undefined =>
  cards.find((c) => c.id === id);

export const cardName = (id: string): string => cardById(id)?.name ?? id;
