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
    description:
      "While you listen, the app shows how many other people are listening to the same song or artist at the same time — a sense that you are not listening alone, and that others are tuned into the same track right now.",
    wireframe: "wf_listen_count",
    properties: ["comparison"],
    announcement: { title: "1.2M listening now", body: "and climbing.", delayMs: 5000 },
  },
  {
    id: "C2",
    name: "Friend presence",
    caption: "Shows a friend listening to this",
    description:
      "While you listen, the app reveals when your friends or connected users are listening to the same song or artist at the same time — so you can feel that someone you know is sharing the moment with you.",
    wireframe: "wf_friend_presence",
    properties: ["visibility"],
    announcement: { title: "Maya is listening to this too", body: "right now.", delayMs: 5000 },
  },
  {
    id: "C3",
    name: "Friend-activity feed",
    caption: "A feed of what friends played",
    description:
      "You can see a feed of what your friends have been playing — their listening history over time. How much of it you can see is still open: it might be just the last thing they played, or a fuller feed of everything they have recently listened to.",
    wireframe: "wf_activity_feed",
    properties: ["visibility"],
    announcement: { title: "New in your friends feed", body: "Sam played 3 tracks.", delayMs: 5000 },
  },
  {
    id: "C4",
    name: "Public taste profile",
    caption: "Your listening, visible to others",
    description:
      "Your profile page becomes something others can see — a richer, more expressive page where you can lay out your music taste, top tracks, and other things about how you listen. The exact details are open; this is an exploratory direction toward a more public, creative profile.",
    wireframe: "wf_public_profile",
    properties: ["visibility", "audience"],
    announcement: { title: "3 people viewed your profile", body: "this week.", delayMs: 5000 },
  },
  {
    id: "C5",
    name: "Reactions and comments",
    caption: "React or comment on a track",
    description:
      "While listening to a song, people can leave comments or reactions on it — much like SoundCloud, where listeners respond to a track and can see what others have said.",
    wireframe: "wf_reactions",
    properties: ["obligation", "audience", "visibility"],
    announcement: { title: "Someone reacted", body: "to the track you are playing.", delayMs: 5000 },
  },
  {
    id: "C6",
    name: "Post or share status",
    caption: "Post what you are listening to",
    description:
      "You can tag the song or artist you are listening to and post it — sharing what you are playing and how you are feeling about it, as a feed others can see.",
    wireframe: "wf_post_status",
    properties: ["audience", "visibility"],
    announcement: { title: "Your post is live", body: "in the feed.", delayMs: 5000 },
  },
  {
    id: "C7",
    name: "Visible to friends",
    caption: "Friends can see you are listening",
    description:
      "People connected to you can see what you are listening to in real time. The reach is flexible: it could be everyone you are connected with, or a smaller listening group you pick, where only that group sees your real-time updates and you can share and mix together.",
    wireframe: "wf_visible_to_friends",
    properties: ["visibility"],
    announcement: { title: "A friend saw you", body: "listening to this.", delayMs: 5000 },
  },
  {
    id: "C8",
    name: "Fan rank",
    caption: "Your rank among listeners",
    description:
      "You get a rank among an artist's listeners, based on how much you engage — listening time and other signals. For example, you might be the #7 listener for an artist, and you can see the people ranked just above and below you, much like a Duolingo-style leaderboard.",
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
    description:
      "People can give and receive annotated \"gifts\" — a part of a song, or a whole song — from friends and connections. There could also be a scavenger-hunt element, where listening to a song again and again reveals hidden gifts like photos or voice memos that an artist left behind.",
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
    description:
      "Imagine a music streaming platform where you have your own character — one that reflects your music taste and the way you listen. You can watch your character take shape, like how it is dressed and other details, as a reflection of your listening.",
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
    description:
      "Based on how much you listen to and engage with an artist over time, you earn a badge — almost an adaptive page — that you can show or share. It acknowledges the history you have built with an artist or a song, in a way others can see.",
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
