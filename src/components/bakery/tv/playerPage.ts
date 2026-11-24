// The YouTube player's address and the small web page that holds it on the phones. YouTube only plays inside an
// app when the player says which app it is in, so the page names the app by its bundle id.

/** The app's name as YouTube asks apps to give it: "https://" and the bundle id from app.json. */
export const PLAYER_HOME = 'https://com.dorinverse.app';

/** YouTube's no-cookie player for one video, starting at a second, playing at once, inside the page. */
export function embedAddress(videoId: string, startAt: number): string {
  const options = new URLSearchParams({
    autoplay: '1',
    start: String(Math.max(0, Math.floor(startAt))),
    playsinline: '1',
    rel: '0',
    origin: PLAYER_HOME,
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${options}`;
}

/** The phone's web page: just the player, filling it edge to edge on black. */
export function playerPage(videoId: string, startAt: number): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%}</style>
</head><body><iframe src="${embedAddress(videoId, startAt)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;
}
