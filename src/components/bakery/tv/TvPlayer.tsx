// The YouTube player inside the TV, in the browser: YouTube's no-cookie player in a frame, started at the second
// the channel is at. Phones use TvPlayer.native.tsx instead.

import { memo, useState } from 'react';
import { embedAddress } from './playerPage';

/** Props for the player. */
type TvPlayerProps = {
  /** The YouTube video's id. */
  videoId: string;
  /** Where to start, in seconds. Read once when the player opens; the video then plays on by itself. */
  startAt: number;
};

/** The player. It opens again only when the video changes, never every second. */
export const TvPlayer = memo(
  function TvPlayer({ videoId, startAt }: TvPlayerProps) {
    const [src] = useState(() => embedAddress(videoId, startAt));
    return (
      <iframe
        src={src}
        title="Bakery TV"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    );
  },
  (a, b) => a.videoId === b.videoId,
);
