// The YouTube player inside the TV, on the phones: a web view holding YouTube's no-cookie player, started at the
// second the channel is at. Links that would leave the player (the YouTube logo, other videos) are blocked.

import { memo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { playerPage, PLAYER_HOME } from './playerPage';

/** Props for the player. */
type TvPlayerProps = {
  /** The YouTube video's id. */
  videoId: string;
  /** Where to start, in seconds. Read once when the player opens; the video then plays on by itself. */
  startAt: number;
};

/** True for loads the player needs: its own page, YouTube's player and anything inside it. */
function allowed(request: WebViewNavigation & { isTopFrame?: boolean }): boolean {
  if (request.isTopFrame === false) return true;
  return request.url.startsWith(PLAYER_HOME) || request.url.startsWith('about:') || request.url.includes('youtube-nocookie.com/embed/');
}

/** The player. It opens again only when the video changes, never every second. */
export const TvPlayer = memo(
  function TvPlayer({ videoId, startAt }: TvPlayerProps) {
    const [html] = useState(() => playerPage(videoId, startAt));
    return (
      <WebView
        source={{ html, baseUrl: PLAYER_HOME }}
        style={styles.player}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={allowed}
      />
    );
  },
  (a, b) => a.videoId === b.videoId,
);

const styles = StyleSheet.create({
  player: { flex: 1, backgroundColor: 'transparent' },
});
