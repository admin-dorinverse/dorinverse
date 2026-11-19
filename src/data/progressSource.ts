// Where the person's lesson progress comes from and goes to: stops baked, verses revealed and cookies collected. This
// is the one file that changes at hookup: pages, stores and the other seams never decide progress themselves.
//
// How it will work at hookup:
// - The server decides what is baked, revealed and collected. bakeStop sends "this stop is finished"; the server
//   records the bake and the reveal and replies with the newly revealed verses' words (and the word lengths of the
//   still-covered verses in those chapters), so the phone downloads nothing else. collectCookie sends the pick; the
//   server records it and replies with the new card (a character, a place or a cookie) for the phone to save.
// - The progress and collected lists come in the one compressed download right after sign-in.
//
// Today (development): there is no server yet, so this file keeps the person's progress on the phone, in a record
// saved by a keeper the app connects at start (storage/progressStore.ts). The sample lists are the starting state;
// what the person earns by playing is added on top. The other seams read the earned lists from here, and the
// libraries then download only the new verses and cards, in one round, exactly as they do for any change.

import { stopVerseRefs, targetId } from '@/data/lessonLibrary';
import { sampleCollectedCharacters } from '@/data/sample/collectedCharacters';
import { sampleCollectedCookies } from '@/data/sample/collectedCookies';
import { sampleCollectedPlaces } from '@/data/sample/collectedPlaces';
import { sampleRevealedVerses } from '@/data/sample/revealedVerses';
import type { VerseRef } from '@/types/bible';
import type { CollectedEntry } from '@/types/character';
import type { CookieKey } from '@/types/cookie';
import type { LessonCookie, LessonId, LessonProgress, LessonStop, StopBaked } from '@/types/lesson';
import type { CollectedPlaceEntry } from '@/types/place';

/** DEVELOPMENT ONLY: what the pretend server remembers, earned by playing (the sample lists are not in it). */
export type ProgressRecord = {
  /** Stops baked per lesson. */
  baked: Record<LessonId, number>;
  /** Verses revealed by baking, in the order they were revealed. */
  verses: VerseRef[];
  /** Characters, places and cookies collected, oldest first. */
  characters: CollectedEntry[];
  places: CollectedPlaceEntry[];
  cookies: CookieKey[];
};

/** DEVELOPMENT ONLY: reads and saves the pretend server's record on the phone. */
export type ProgressKeeper = { read: () => Promise<ProgressRecord | null>; save: (record: ProgressRecord) => Promise<void> };

/** An empty record: nothing earned yet. */
const EMPTY: ProgressRecord = { baked: {}, verses: [], characters: [], places: [], cookies: [] };

/** The keeper the app connected, or null (timing scripts run with nothing earned). */
let keeper: ProgressKeeper | null = null;

/** The record, read once. */
let loading: Promise<ProgressRecord> | null = null;

/** DEVELOPMENT ONLY: connects where the record is saved. The app calls this once at start, before anything loads. */
export function connectProgressKeeper(next: ProgressKeeper): void {
  keeper = next;
  loading = null;
}

/** The record, read from the keeper the first time. */
function record(): Promise<ProgressRecord> {
  loading ??= (async () => {
    const saved = keeper ? await keeper.read().catch(() => null) : null;
    return saved ? { ...EMPTY, ...saved } : { ...EMPTY, baked: {} };
  })();
  return loading;
}

/** The last change, so changes run one after another and two quick ones never overwrite each other. */
let changing: Promise<unknown> = Promise.resolve();

/** Makes one change to the record (or none, when `work` gives back no record) and saves it. */
function change<T>(work: (r: ProgressRecord) => { next: ProgressRecord | null; result: T }): Promise<T> {
  const run = changing.then(async () => {
    const { next, result } = work(await record());
    if (next) {
      loading = Promise.resolve(next);
      if (keeper) await keeper.save(next);
    }
    return result;
  });
  changing = run.catch(() => {});
  return run;
}

/** Everything collected: the sample lists plus what the record holds, as "character:lookup" and so on. */
function collectedIn(r: ProgressRecord): Set<string> {
  const collected = new Set<string>();
  for (const c of [...sampleCollectedCharacters, ...r.characters]) collected.add(`character:${c.lookup}`);
  for (const p of [...sampleCollectedPlaces, ...r.places]) collected.add(`place:${p.lookup}`);
  for (const k of [...sampleCollectedCookies, ...r.cookies]) collected.add(`cookie:${k}`);
  return collected;
}

/** The person's progress: stops baked per lesson and everything collected (sample lists plus what they earned). */
export async function fetchProgress(): Promise<LessonProgress> {
  const r = await record();
  return { baked: { ...r.baked }, collected: collectedIn(r) };
}

/**
 * Bakes a stop. Stops bake in order, so baking one again changes nothing. Development: the stop's verses join the
 * revealed list here. Hookup: the server records it and replies with the revealed verses' words.
 */
export function bakeStop(lesson: LessonId, stop: LessonStop): Promise<StopBaked> {
  return change((r) => {
    const before = r.baked[lesson] ?? 0;
    if (stop.stop !== before + 1) return { next: null, result: { bakedStops: before, revealed: [] } };
    const known = new Set([...sampleRevealedVerses, ...r.verses]);
    const revealed = stopVerseRefs(stop.firstVerse, stop.lastVerse).filter((ref) => !known.has(ref));
    const next: ProgressRecord = { ...r, baked: { ...r.baked, [lesson]: stop.stop }, verses: [...r.verses, ...revealed] };
    return { next, result: { bakedStops: stop.stop, revealed } };
  });
}

/** Collects a pop-up's cookie. `foundIn` is where it was found, like "Judges 3". Collecting twice changes nothing. */
export function collectCookie(cookie: LessonCookie, foundIn: string): Promise<void> {
  return change((r) => {
    if (collectedIn(r).has(targetId(cookie.target))) return { next: null, result: undefined };
    const t = cookie.target;
    const next: ProgressRecord =
      t.kind === 'character'
        ? { ...r, characters: [...r.characters, { lookup: t.lookup, metIn: foundIn }] }
        : t.kind === 'place'
          ? { ...r, places: [...r.places, { lookup: t.lookup, foundIn }] }
          : { ...r, cookies: [...r.cookies, t.key] };
    return { next, result: undefined };
  });
}

/** Every verse the person revealed by baking. Read by bibleSource. */
export async function earnedVerses(): Promise<VerseRef[]> {
  return [...(await record()).verses];
}

/** Every character the person collected by playing, oldest first. Read by characterSource. */
export async function earnedCharacters(): Promise<CollectedEntry[]> {
  return (await record()).characters.map((c) => ({ ...c }));
}

/** Every place the person collected by playing, oldest first. Read by placeSource. */
export async function earnedPlaces(): Promise<CollectedPlaceEntry[]> {
  return (await record()).places.map((p) => ({ ...p }));
}

/** Every cookie (prophecy half, instruction, prayer, the Ten Commandments) collected by playing. Read by cookieSource. */
export async function earnedCookies(): Promise<CookieKey[]> {
  return [...(await record()).cookies];
}
