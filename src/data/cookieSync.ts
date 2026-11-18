// Brings the phone's cookies up to date when the app starts. It compares the collected list with the cookies the
// phone already holds and downloads only missing ones, in one round. When the phone holds every cookie, it makes no
// download at all. The phone store is passed in, so this works the same in the app and in timing checks.

import { heldLinkNos, makeCookieLibrary, sameCookieList } from '@/data/cookieLibrary';
import { fetchCollectedCookies, fetchCookies } from '@/data/cookieSource';
import type { Cookie, CookieKey, CookieLibrary, ProphecyLinkOutline } from '@/types/cookie';

/** What the phone holds: the collected list (null before the first load), every saved cookie, and the link outlines. */
export type SavedCookies = {
  list: CookieKey[] | null;
  cookies: Record<CookieKey, Cookie>;
  links: Record<number, ProphecyLinkOutline>;
};

/** Saves a new collected list, the cookies that are new, and every link outline to keep (the rest are dropped). */
export type SaveCookies = (list: readonly CookieKey[], added: readonly Cookie[], links: readonly ProphecyLinkOutline[]) => Promise<void>;

/** What a sync did: the library to show, how many cookies it downloaded (0 when none were missing), and whether anything changed. */
export type CookieSyncResult = { library: CookieLibrary; downloaded: number; changed: boolean };

/** The saved cookies and outlines that belong to the list, so nothing uncollected stays on the phone. */
function keepOnly(list: readonly CookieKey[], cookies: Record<CookieKey, Cookie>, links: Record<number, ProphecyLinkOutline>) {
  const kept: Record<CookieKey, Cookie> = {};
  for (const key of list) if (cookies[key]) kept[key] = cookies[key];
  const nos = heldLinkNos(Object.values(kept));
  const keptLinks: Record<number, ProphecyLinkOutline> = {};
  for (const no of nos) if (links[no]) keptLinks[no] = links[no];
  return { cookies: kept, links: keptLinks };
}

/**
 * Checks the collected list against the phone and downloads only missing cookies. If a download fails but the
 * phone has a saved copy, the saved copy is used, so the pages work offline.
 */
export async function syncCookies(saved: SavedCookies, save: SaveCookies): Promise<CookieSyncResult> {
  const offline = () => ({ library: makeCookieLibrary(saved.list ?? [], saved.cookies, saved.links), downloaded: 0, changed: false });
  let list: CookieKey[];
  try {
    list = await fetchCollectedCookies();
  } catch (error) {
    if (!saved.list) throw error;
    return offline();
  }
  const missing = list.filter((key) => !saved.cookies[key]);
  const listChanged = !saved.list || !sameCookieList(saved.list, list);
  if (missing.length === 0) {
    const kept = keepOnly(list, saved.cookies, saved.links);
    if (listChanged) await save(list, [], Object.values(kept.links));
    return { library: makeCookieLibrary(list, kept.cookies, kept.links), downloaded: 0, changed: listChanged };
  }
  let added: Awaited<ReturnType<typeof fetchCookies>>;
  try {
    added = await fetchCookies(missing);
  } catch (error) {
    // Offline: keep showing what the phone has; the next start tries again.
    if (!saved.list) throw error;
    return offline();
  }
  const cookies = { ...saved.cookies };
  for (const cookie of added.cookies) cookies[cookie.key] = cookie;
  const links = { ...saved.links };
  for (const link of added.links) links[link.linkNo] = link;
  const kept = keepOnly(list, cookies, links);
  await save(list, added.cookies, Object.values(kept.links));
  return { library: makeCookieLibrary(list, kept.cookies, kept.links), downloaded: added.cookies.length, changed: true };
}
