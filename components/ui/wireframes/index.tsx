import React from "react";

// ---------------------------------------------------------------------------
// Grey-box wireframes, keyed by the `wireframe` field in config/cards.ts.
// Lo-fi on purpose (spec principle 1): grayscale only, no real imagery, no
// branding, no color. But concrete enough that a participant immediately reads
// what the feature IS — recognizable layouts (avatars, toggles, lists, stats,
// leaderboards) built only from labeled boxes, placeholder text bars, and mono
// glyphs. The shared app shell + now-playing bar lives in WireframeFrame.
// ---------------------------------------------------------------------------

// --- Primitives -------------------------------------------------------------
function Box({
  label,
  className = "",
  h = "h-12",
}: {
  label?: string;
  className?: string;
  h?: string;
}) {
  return (
    <div className={`wire-box flex items-center justify-center ${h} ${className}`}>
      {label ? <span className="wire-label">{label}</span> : null}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

// A grey circle standing in for an avatar / profile photo.
function Circle({
  size = "h-10 w-10",
  dot = false,
}: {
  size?: string;
  dot?: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 rounded-full border border-wire-border bg-wire-box ${size}`}
    >
      {dot ? (
        <span className="absolute -bottom-0 -right-0 h-3 w-3 rounded-full border-2 border-white bg-wire-line" />
      ) : null}
    </div>
  );
}

// A horizontal bar standing in for a line of text.
function Line({ w = "w-24", strong = false }: { w?: string; strong?: boolean }) {
  return (
    <div
      className={`h-2.5 rounded ${w} ${strong ? "bg-wire-line" : "bg-wire-border"}`}
    />
  );
}

// A name line + a fainter subtitle line.
function Lines({ name = "w-24", sub = "w-16" }: { name?: string; sub?: string }) {
  return (
    <div className="flex-1 space-y-1.5">
      <Line w={name} strong />
      <Line w={sub} />
    </div>
  );
}

// A real-looking on/off toggle.
function Toggle({ on = true }: { on?: boolean }) {
  return (
    <div
      className={`flex h-6 w-11 shrink-0 items-center rounded-full border border-wire-border px-0.5 ${
        on ? "justify-end bg-wire-line" : "justify-start bg-wire-box"
      }`}
    >
      <span className="h-4 w-4 rounded-full border border-wire-border bg-white" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-base text-wire-ink">{value}</span>
      <span className="wire-label !text-[10px]">{label}</span>
    </div>
  );
}

function Pill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
        active
          ? "border-wire-ink bg-wire-ink text-white"
          : "border-wire-border text-wire-muted"
      }`}
    >
      {label}
    </span>
  );
}

function Thumb({ size = "h-10 w-10", label }: { size?: string; label?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-wire-border bg-wire-box ${size}`}
    >
      {label ? <span className="wire-label !text-[9px]">{label}</span> : null}
    </div>
  );
}

function Icon({ glyph }: { glyph: string }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center border border-wire-border bg-white font-mono text-sm text-wire-ink">
      {glyph}
    </span>
  );
}

// A list row: leading thumbnail/avatar, two text lines, optional trailing node.
function ListRow({
  avatar = false,
  name = "w-28",
  sub = "w-20",
  trailing,
}: {
  avatar?: boolean;
  name?: string;
  sub?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border border-wire-border bg-white px-2 py-2">
      {avatar ? <Circle size="h-9 w-9" /> : <Thumb size="h-9 w-9" />}
      <Lines name={name} sub={sub} />
      {trailing}
    </div>
  );
}

function Bars({ heights }: { heights: number[] }) {
  return (
    <div className="flex h-10 items-end gap-1">
      {heights.map((n, i) => (
        <span
          key={i}
          className="w-2 bg-wire-border"
          style={{ height: `${n * 4}px` }}
        />
      ))}
    </div>
  );
}

// --- Baseline now-playing surface (P0) -------------------------------------
function P0NowPlaying() {
  return (
    <div className="space-y-3">
      <Box label="album art" h="h-40" />
      <div className="space-y-1.5">
        <Line w="w-2/3" strong />
        <Line w="w-1/3" />
      </div>
      <div className="flex items-center justify-center gap-5 py-1">
        <span className="font-mono text-lg text-wire-line">◁◁</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-wire-ink bg-wire-ink font-mono text-white">
          ▶
        </span>
        <span className="font-mono text-lg text-wire-line">▷▷</span>
      </div>
      <div className="space-y-1">
        <div className="relative h-1.5 w-full rounded bg-wire-box">
          <div className="absolute left-0 top-0 h-1.5 w-1/3 rounded bg-wire-line" />
        </div>
        <div className="flex justify-between">
          <span className="wire-label !text-[10px]">1:12</span>
          <span className="wire-label !text-[10px]">3:45</span>
        </div>
      </div>
      <div className="pt-1">
        <span className="wire-label">up next</span>
        <div className="mt-1 space-y-1">
          <ListRow />
          <ListRow />
        </div>
      </div>
    </div>
  );
}

// --- Anchors ----------------------------------------------------------------
function MoodMix() {
  return (
    <div className="space-y-2">
      <span className="wire-label">made for you</span>
      <Box label="mood mix" h="h-20" />
      <div className="flex flex-wrap gap-1.5">
        <Pill label="chill" active />
        <Pill label="focus" />
        <Pill label="upbeat" />
        <Pill label="late night" />
      </div>
      <ListRow />
      <ListRow />
    </div>
  );
}

function SharedPlaylist() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Thumb size="h-12 w-12" label="cover" />
        <Lines name="w-28" sub="w-20" />
      </div>
      <div className="flex items-center gap-1">
        <Circle size="h-6 w-6" />
        <Circle size="h-6 w-6" />
        <Circle size="h-6 w-6" />
        <span className="wire-label ml-1 !text-[10px]">3 friends · 12 songs</span>
      </div>
      <Box label="+ add a song" h="h-9" />
      <ListRow trailing={<Circle size="h-6 w-6" />} />
      <ListRow trailing={<Circle size="h-6 w-6" />} />
    </div>
  );
}

// --- Feature wireframes -----------------------------------------------------
function NowPlayingMini() {
  return (
    <div className="flex items-center gap-2">
      <Thumb size="h-12 w-12" label="art" />
      <Lines name="w-24" sub="w-16" />
    </div>
  );
}

function ListenCount() {
  return (
    <div className="space-y-3">
      <NowPlayingMini />
      <div className="border border-wire-border bg-white p-3 text-center">
        <div className="font-mono text-2xl text-wire-ink">1,204,839</div>
        <span className="wire-label">listening now · ▲ climbing</span>
        <div className="mt-2 flex justify-center">
          <Bars heights={[5, 7, 4, 8, 6, 9, 7, 10, 8]} />
        </div>
      </div>
    </div>
  );
}

function FriendPresence() {
  return (
    <div className="space-y-3">
      <NowPlayingMini />
      <div className="flex items-center gap-2 border border-wire-border bg-white px-2 py-2">
        <Circle size="h-10 w-10" dot />
        <div className="flex-1 space-y-1.5">
          <Line w="w-20" strong />
          <span className="wire-label !text-[10px]">listening now</span>
        </div>
        <div className="flex h-6 items-end gap-0.5">
          {[3, 5, 2, 6, 4, 5, 3].map((n, i) => (
            <span key={i} className="w-1 bg-wire-line" style={{ height: `${n * 3}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedRow({ action, time }: { action: string; time: string }) {
  return (
    <div className="flex items-center gap-2 border border-wire-border bg-white px-2 py-2">
      <Circle size="h-9 w-9" />
      <div className="flex-1 space-y-1">
        <Line w="w-20" strong />
        <span className="wire-label !text-[10px]">{action}</span>
      </div>
      <Thumb size="h-9 w-9" />
      <span className="wire-label !text-[10px]">{time}</span>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="space-y-2">
      <span className="wire-label">friends · activity</span>
      <FeedRow action="played a track" time="2m" />
      <FeedRow action="liked a playlist" time="14m" />
      <FeedRow action="made a playlist" time="1h" />
    </div>
  );
}

function PublicProfile() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Circle size="h-16 w-16" />
        <div className="flex-1 space-y-1.5">
          <Line w="w-24" strong />
          <Pill label="public profile" active />
        </div>
      </div>
      <div className="flex justify-around border-y border-wire-border py-2">
        <Stat value="128" label="followers" />
        <Stat value="86" label="following" />
        <Stat value="12" label="playlists" />
      </div>
      <span className="wire-label">top tracks · visible to others</span>
      <div className="grid grid-cols-3 gap-2">
        <Thumb size="h-14 w-full" />
        <Thumb size="h-14 w-full" />
        <Thumb size="h-14 w-full" />
      </div>
      <span className="wire-label !text-[10px]">viewed by 3 people this week</span>
    </div>
  );
}

function Reactions() {
  return (
    <div className="space-y-3">
      <NowPlayingMini />
      <div className="flex items-center gap-2">
        <Icon glyph="♥" />
        <Icon glyph="★" />
        <Icon glyph="+" />
        <span className="wire-label !text-[10px]">react to this track</span>
      </div>
      <div className="flex items-start gap-2">
        <Circle size="h-8 w-8" />
        <div className="flex-1 space-y-1.5 border border-wire-border bg-white p-2">
          <Line w="w-16" strong />
          <Line w="w-28" />
        </div>
      </div>
      <Box label="add a comment…" h="h-9" />
    </div>
  );
}

function PostStatus() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Circle size="h-9 w-9" />
        <span className="wire-label">share to feed</span>
      </div>
      <Box label="what are you listening to?" h="h-12" />
      <div className="flex items-center gap-2 border border-wire-border bg-white p-2">
        <Thumb size="h-10 w-10" label="art" />
        <Lines name="w-24" sub="w-16" />
      </div>
      <div className="flex items-center justify-between">
        <Pill label="friends ▾" />
        <span className="flex items-center justify-center border border-wire-ink bg-wire-ink px-4 py-1.5 font-mono text-xs text-white">
          Post
        </span>
      </div>
    </div>
  );
}

function VisibleToFriends() {
  return (
    <div className="space-y-3">
      <NowPlayingMini />
      <div className="flex items-center gap-2 border border-wire-border bg-white px-2 py-3">
        <div className="flex-1 space-y-1.5">
          <Line w="w-32" strong />
          <span className="wire-label !text-[10px]">friends can see what you play</span>
        </div>
        <Toggle on />
      </div>
      <div className="flex items-center gap-1">
        <Circle size="h-7 w-7" />
        <Circle size="h-7 w-7" />
        <Circle size="h-7 w-7" />
        <span className="wire-label ml-1 !text-[10px]">3 friends can see this</span>
      </div>
    </div>
  );
}

function RankRow({ rank, you = false }: { rank: string; you?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 border px-2 py-2 ${
        you ? "border-wire-ink bg-wire-box" : "border-wire-border bg-white"
      }`}
    >
      <span className="w-5 text-center font-mono text-sm text-wire-ink">#{rank}</span>
      <Circle size="h-8 w-8" />
      <div className="flex-1 space-y-1">
        {you ? (
          <span className="font-mono text-xs text-wire-ink">YOU</span>
        ) : (
          <Line w="w-20" strong />
        )}
        <span className="wire-label !text-[10px]">plays this week</span>
      </div>
      <span className="font-mono text-sm text-wire-ink">{rank === "6" ? "412" : rank === "7" ? "389" : "356"}</span>
    </div>
  );
}

function FanRank() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Thumb size="h-10 w-10" label="artist" />
        <div className="flex-1 space-y-1.5">
          <Line w="w-24" strong />
          <span className="wire-label !text-[10px]">top listeners</span>
        </div>
      </div>
      <RankRow rank="6" />
      <RankRow rank="7" you />
      <RankRow rank="8" />
      <span className="wire-label !text-[10px]">your rank is visible to others</span>
    </div>
  );
}

// C9 — Song gift: one-to-one only. A friend sent a song + a personal note, with
// a "send one back" reply hook (the reciprocity = obligation). No feed, no
// audience, no counts.
function SongGift() {
  return (
    <div className="space-y-3">
      <NowPlayingMini />
      <div className="space-y-2 border border-wire-border bg-white p-3">
        <div className="flex items-center gap-2">
          <Circle size="h-10 w-10" />
          <div className="flex-1 space-y-1.5">
            <Line w="w-20" strong />
            <span className="wire-label !text-[10px]">sent you this song</span>
          </div>
          <span className="font-mono text-lg text-wire-line">♪</span>
        </div>
        <div className="border-l-2 border-wire-border pl-2">
          <span className="font-mono text-xs italic text-wire-ink">
            &ldquo;this part is so you.&rdquo;
          </span>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center justify-center border border-wire-ink bg-wire-ink px-3 py-1.5 font-mono text-xs text-white">
            Send one back
          </span>
          <Box label="reply" className="flex-1" h="h-8" />
        </div>
      </div>
    </div>
  );
}

// C10 — Listening character: self-only by design. A grey "character" that grows
// from listening, with personal traits and a level. Critically NO share button,
// NO visible-to-others cue, NO audience — self-recognition reads from absence,
// not from any "only you" label (which would anchor the placement).
function Character() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-wire-border bg-wire-box">
          <span className="wire-label">character</span>
        </div>
        <Line w="w-24" strong />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="wire-label !text-[10px]">grows as you listen</span>
          <span className="wire-label !text-[10px]">level 3</span>
        </div>
        <div className="relative h-2 w-full rounded bg-wire-box">
          <div className="absolute left-0 top-0 h-2 w-2/3 rounded bg-wire-line" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Pill label="night owl" />
        <Pill label="deep listener" />
        <Pill label="explorer" />
      </div>
    </div>
  );
}

// C11 — Exclusive visible status: a worn "Top Fan" badge shown on the profile
// (audience + visibility) that is earned by listening more than others
// (comparison). A status flex, distinct from C8 rank.
function ExclusiveStatus() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Circle size="h-14 w-14" />
        <div className="flex-1 space-y-1.5">
          <Line w="w-24" strong />
          <span className="wire-label !text-[10px]">shown on your profile</span>
        </div>
      </div>
      <div className="flex items-center gap-2 border border-wire-ink bg-wire-box p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-wire-ink font-mono text-sm text-wire-ink">
          ★
        </span>
        <div className="flex-1">
          <span className="font-mono text-sm text-wire-ink">TOP FAN</span>
          <div>
            <span className="wire-label !text-[10px]">ahead of most listeners</span>
          </div>
        </div>
        <Pill label="on profile" active />
      </div>
      <span className="wire-label !text-[10px]">others can see this badge</span>
    </div>
  );
}

const REGISTRY: Record<string, React.FC> = {
  p0_now_playing: P0NowPlaying,
  wf_mood_mix: MoodMix,
  wf_shared_playlist: SharedPlaylist,
  wf_listen_count: ListenCount,
  wf_friend_presence: FriendPresence,
  wf_activity_feed: ActivityFeed,
  wf_public_profile: PublicProfile,
  wf_reactions: Reactions,
  wf_post_status: PostStatus,
  wf_visible_to_friends: VisibleToFriends,
  wf_fan_rank: FanRank,
  wf_song_gift: SongGift,
  wf_character: Character,
  wf_exclusive_status: ExclusiveStatus,
};

export function Wireframe({ name }: { name: string }) {
  const Component = REGISTRY[name];
  if (!Component) {
    return <Box label={name} h="h-24" />;
  }
  return <Component />;
}

// A small thumbnail version for the compose tray / probe chips. Rendered into a
// fixed-height overflow-hidden window by the caller, so we just scale down.
export function WireframeThumb({ name }: { name: string }) {
  return (
    <div className="pointer-events-none w-[160%] origin-top-left scale-[0.6]">
      <Wireframe name={name} />
    </div>
  );
}
