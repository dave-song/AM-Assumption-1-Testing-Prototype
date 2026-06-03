import React from "react";

// ---------------------------------------------------------------------------
// Crude grey-box wireframes, keyed by the `wireframe` field in config/cards.ts.
// Intentionally lo-fi: labeled rectangles, no imagery, no branding
// (spec principle 1). Each renders the feature-specific surface; the shared
// music-app shell + now-playing bar lives in WireframeFrame.
// ---------------------------------------------------------------------------

function Box({
  label,
  className = "",
  h = "h-12",
}: {
  label: string;
  className?: string;
  h?: string;
}) {
  return (
    <div className={`wire-box flex items-center justify-center ${h} ${className}`}>
      <span className="wire-label">{label}</span>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

// --- Baseline now-playing surface (P0) -------------------------------------
function P0NowPlaying() {
  return (
    <div className="space-y-3">
      <Box label="album art" h="h-40" />
      <Box label="track title" />
      <Box label="artist" h="h-8" />
      <Row>
        <Box label="prev" className="flex-1" />
        <Box label="play" className="flex-1" />
        <Box label="next" className="flex-1" />
      </Row>
      <Box label="progress" h="h-4" />
      <div className="pt-2">
        <span className="wire-label">up next</span>
        <div className="mt-1 space-y-1">
          <Box label="track row" h="h-8" />
          <Box label="track row" h="h-8" />
        </div>
      </div>
    </div>
  );
}

// --- Feature wireframes -----------------------------------------------------
function MoodMix() {
  return (
    <div className="space-y-2">
      <Box label="mood mix" h="h-24" />
      <Row>
        <Box label="track" className="flex-1" h="h-8" />
        <Box label="track" className="flex-1" h="h-8" />
      </Row>
    </div>
  );
}

function SharedPlaylist() {
  return (
    <div className="space-y-2">
      <Box label="shared playlist" h="h-10" />
      <Box label="+ add a song" h="h-8" />
      <Box label="track · added by friend" h="h-8" />
    </div>
  );
}

function ListenCount() {
  return (
    <div className="space-y-2">
      <Box label="now playing" h="h-16" />
      <div className="wire-box flex items-center justify-center h-12">
        <span className="font-mono text-lg text-wire-ink">1,200,000</span>
        <span className="wire-label ml-2">listeners</span>
      </div>
    </div>
  );
}

function FriendPresence() {
  return (
    <div className="space-y-2">
      <Box label="now playing" h="h-16" />
      <Row>
        <Box label="●" className="w-12" h="h-12" />
        <Box label="friend · listening now" className="flex-1" h="h-12" />
      </Row>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="space-y-2">
      <span className="wire-label">friends feed</span>
      <Box label="friend played a track" h="h-9" />
      <Box label="friend played a track" h="h-9" />
      <Box label="friend made a playlist" h="h-9" />
    </div>
  );
}

function PublicProfile() {
  return (
    <div className="space-y-2">
      <Row>
        <Box label="●" className="w-14" h="h-14" />
        <div className="flex-1 space-y-1">
          <Box label="your name" h="h-6" />
          <Box label="visible to others" h="h-6" />
        </div>
      </Row>
      <Box label="your top tracks" h="h-10" />
    </div>
  );
}

function Reactions() {
  return (
    <div className="space-y-2">
      <Box label="now playing" h="h-16" />
      <Row>
        <Box label="♥ react" className="flex-1" h="h-9" />
        <Box label="💬 comment" className="flex-1" h="h-9" />
      </Row>
      <Box label="comment field" h="h-8" />
    </div>
  );
}

function PostStatus() {
  return (
    <div className="space-y-2">
      <Box label="what are you listening to?" h="h-10" />
      <Box label="now playing preview" h="h-12" />
      <Box label="post" h="h-9" />
    </div>
  );
}

function VisibleToFriends() {
  return (
    <div className="space-y-2">
      <Box label="now playing" h="h-16" />
      <Row>
        <Box label="toggle" className="w-16" h="h-8" />
        <Box label="friends can see this" className="flex-1" h="h-8" />
      </Row>
    </div>
  );
}

function FanRank() {
  return (
    <div className="space-y-2">
      <Box label="this artist" h="h-10" />
      <div className="wire-box flex items-center justify-center h-14">
        <span className="font-mono text-lg text-wire-ink">#7</span>
        <span className="wire-label ml-2">your rank · others can see it</span>
      </div>
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
};

export function Wireframe({ name }: { name: string }) {
  const Component = REGISTRY[name];
  if (!Component) {
    return <Box label={name} h="h-24" />;
  }
  return <Component />;
}

// A small thumbnail version for the compose tray / probe chips.
export function WireframeThumb({ name }: { name: string }) {
  return (
    <div className="pointer-events-none scale-[0.85] origin-top-left">
      <Wireframe name={name} />
    </div>
  );
}
