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

// Default delay before an announcement fires, to feel live (spec 5.4).
export const DEFAULT_ANNOUNCEMENT_DELAY_MS = 2500;

export const lineLabels = {
  left: "Just me and the app",
  right: "Other people can see or react to what you are doing",
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
      delayMs: 2000,
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
      delayMs: 2000,
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
    announcement: { title: "1.2M listening now", body: "and climbing.", delayMs: 2500 },
  },
  {
    id: "C2",
    name: "Friend presence",
    caption: "Shows a friend listening to this",
    wireframe: "wf_friend_presence",
    properties: ["visibility"],
    announcement: { title: "Maya is listening to this too", body: "right now.", delayMs: 2500 },
  },
  {
    id: "C3",
    name: "Friend-activity feed",
    caption: "A feed of what friends played",
    wireframe: "wf_activity_feed",
    properties: ["visibility"],
    announcement: { title: "New in your friends feed", body: "Sam played 3 tracks.", delayMs: 2500 },
  },
  {
    id: "C4",
    name: "Public taste profile",
    caption: "Your listening, visible to others",
    wireframe: "wf_public_profile",
    properties: ["visibility", "audience"],
    announcement: { title: "3 people viewed your profile", body: "this week.", delayMs: 2500 },
  },
  {
    id: "C5",
    name: "Reactions and comments",
    caption: "React or comment on a track",
    wireframe: "wf_reactions",
    properties: ["obligation", "audience", "visibility"],
    announcement: { title: "Someone reacted", body: "to the track you are playing.", delayMs: 2500 },
  },
  {
    id: "C6",
    name: "Post or share status",
    caption: "Post what you are listening to",
    wireframe: "wf_post_status",
    properties: ["audience", "visibility"],
    announcement: { title: "Your post is live", body: "in the feed.", delayMs: 2500 },
  },
  {
    id: "C7",
    name: "Visible to friends",
    caption: "Friends can see you are listening",
    wireframe: "wf_visible_to_friends",
    properties: ["visibility"],
    announcement: { title: "A friend saw you", body: "listening to this.", delayMs: 2500 },
  },
  {
    id: "C8",
    name: "Fan rank",
    caption: "Your rank among listeners",
    wireframe: "wf_fan_rank",
    // Decision locked (spec 16.3): rank is EXPOSED — others can see your rank.
    properties: ["comparison", "visibility"],
    announcement: { title: "A friend just passed you", body: "on this artist.", delayMs: 2500 },
  },
];

export const cardById = (id: string): CardConfig | undefined =>
  cards.find((c) => c.id === id);

export const cardName = (id: string): string => cardById(id)?.name ?? id;
