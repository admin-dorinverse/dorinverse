// Where the Weekly Word comes from and goes to: the week's clues, the person's Clue Book and their guesses. This is
// the one file that changes at hookup: pages and the sky's red book never decide any of it themselves.
//
// How it will work at hookup: the server holds the word and the clues. It hands out a clue only on its day, counts
// the three guesses a day, checks each guess, and decides the reward (bigger the sooner the word is guessed). The
// word never reaches the phone before it is guessed or revealed.
//
// Today (development): there is no server yet, so this file plays the server on the phone with a sample week
// (sample/mysteryWeek.ts), saved by storage/mysteryStore.ts. It trusts the phone's clock, which the server won't.

import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { MYSTERY_TEST_DAY_MS } from '@/data/devTesting';
import { mysteryMoment, type MysteryMoment } from '@/data/mysterySchedule';
import { sampleMysteryWeek } from '@/data/sample/mysteryWeek';
import { readMysteryRecord, saveMysteryRecord, type MysteryRecord } from '@/data/storage/mysteryStore';
import type { ClueSlot, ClueStatus, GuessResult, MysteryWeek, PastMystery } from '@/types/mystery';

/** Guesses allowed each day. */
export const TRIES_A_DAY = 3;

/** The week as last worked out, reused until something changes. */
let week: MysteryWeek | null = null;

/** The clue collected since the app opened, as "week:day", so it can wear its NEW badge. */
let newClue = '';

/** Pages and the red book listening for changes, and the timer and app listener that run while any listen. */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let appListener: { remove: () => void } | null = null;

/** A record for a week nobody has touched yet. It keeps the results of the week before (`before`). */
function emptyRecord(weekId: string, testStart: number | null, before: MysteryRecord | null): MysteryRecord {
  const last = before ? { collected: before.collected, solvedOn: before.solvedOn } : null;
  return { testStart, weekId, collected: [], tries: {}, solvedOn: null, revealSeen: false, last };
}

/** Where the week stands now, and the person's record for it (started over if the week is new). */
function load(now: number): { moment: MysteryMoment; record: MysteryRecord } {
  const saved = readMysteryRecord();
  const testStart = MYSTERY_TEST_DAY_MS ? (saved?.testStart ?? now) : null;
  const moment = mysteryMoment(now, MYSTERY_TEST_DAY_MS && testStart !== null ? { start: testStart, dayMs: MYSTERY_TEST_DAY_MS } : null);
  if (saved && saved.weekId === moment.weekId && saved.testStart === testStart) return { moment, record: saved };
  const record = emptyRecord(moment.weekId, testStart, saved);
  saveMysteryRecord(record);
  return { moment, record };
}

/** Where one day's clue stands. */
function statusOf(day: number, today: number, collected: readonly number[]): ClueStatus {
  if (collected.includes(day)) return 'collected';
  if (day === today) return 'waiting';
  return day < today ? 'missed' : 'later';
}

/** A finished week's pages: every clue shows, with its reference, and the ones not collected are marked missed. */
function finishedClues(collected: readonly number[]): ClueSlot[] {
  return sampleMysteryWeek.clues.map((c, i) => ({ day: i + 1, status: collected.includes(i + 1) ? 'collected' : 'missed', text: c.text, reference: c.reference }));
}

/** The pages of a week still going: only collected clues show their words, and no references yet. */
function openClues(today: number, collected: readonly number[]): ClueSlot[] {
  return sampleMysteryWeek.clues.map((c, i) => {
    const status = statusOf(i + 1, today, collected);
    return { day: i + 1, status, text: status === 'collected' ? c.text : null, reference: null };
  });
}

/** Works out the week as the person sees it. */
function build(now: number): MysteryWeek {
  const { moment, record } = load(now);
  const clues = moment.revealed ? finishedClues(record.collected) : openClues(moment.today, record.collected);
  // The sample has one word, so last week's word is the same one.
  const lastWeek: PastMystery | null = record.last ? { word: sampleMysteryWeek.word, clues: finishedClues(record.last.collected), solvedOn: record.last.solvedOn } : null;
  const known = record.solvedOn !== null || moment.revealed;
  return {
    id: moment.weekId,
    today: moment.today,
    clues,
    newClue: newClue === `${moment.weekId}:${moment.today}` ? moment.today : null,
    triesLeft: TRIES_A_DAY - (record.tries[moment.today] ?? 0),
    solvedOn: record.solvedOn,
    revealed: moment.revealed,
    word: known ? sampleMysteryWeek.word : null,
    hasNews: clues[moment.today - 1].status === 'waiting' || (moment.revealed && !record.revealSeen),
    lastWeek,
    changesAt: moment.changesAt,
  };
}

/** The week right now. */
function current(): MysteryWeek {
  week ??= build(Date.now());
  // A week worked out before its last change is stale (the timer only runs while someone listens).
  if (Date.now() >= week.changesAt) week = build(Date.now());
  return week;
}

/** Sets the timer for the week's next change, while anyone is listening. */
function setTimer(): void {
  if (timer) clearTimeout(timer);
  timer = listeners.size > 0 ? setTimeout(refresh, Math.max(250, current().changesAt - Date.now() + 50)) : null;
}

/** Works the week out again, sets the timer for its next change, and tells everyone listening. */
function refresh(): void {
  week = build(Date.now());
  setTimer();
  listeners.forEach((l) => l());
}

/** Saves a changed record and tells everyone listening. */
function commit(record: MysteryRecord): void {
  saveMysteryRecord(record);
  refresh();
}

/** Puts today's clue in the Clue Book. Returns true if it was newly collected. Once the word is revealed it is too late. */
export function collectTodaysClue(): boolean {
  const { moment, record } = load(Date.now());
  if (moment.revealed || record.collected.includes(moment.today)) return false;
  newClue = `${moment.weekId}:${moment.today}`;
  commit({ ...record, collected: [...record.collected, moment.today] });
  return true;
}

/** Makes a guess the same whatever its capitals, spaces or marks. */
function plain(guess: string): string {
  return guess.toLowerCase().replace(/[^a-z]/g, '');
}

/** Checks a guess. It uses one of today's tries unless guessing is closed or none are left. */
export function guessWord(guess: string): GuessResult {
  const { moment, record } = load(Date.now());
  const used = record.tries[moment.today] ?? 0;
  const left = TRIES_A_DAY - used;
  if (moment.revealed || record.solvedOn !== null || left <= 0 || plain(guess) === '') return { outcome: 'closed', triesLeft: Math.max(0, left) };
  const right = plain(guess) === plain(sampleMysteryWeek.word);
  commit({ ...record, tries: { ...record.tries, [moment.today]: used + 1 }, solvedOn: right ? moment.today : null });
  return { outcome: right ? 'right' : 'wrong', triesLeft: left - 1 };
}

/** Notes that the person has seen this week's reveal, so the red book stops calling for it. Returns true the first time. */
export function markRevealSeen(): boolean {
  const { moment, record } = load(Date.now());
  if (!moment.revealed || record.revealSeen) return false;
  commit({ ...record, revealSeen: true });
  return true;
}

/** DEVELOPMENT ONLY: starts the sped-up test week over from Monday, with an empty Clue Book. */
export function restartTestWeek(): void {
  if (!MYSTERY_TEST_DAY_MS) return;
  const now = Date.now();
  commit(emptyRecord(mysteryMoment(now, { start: now, dayMs: MYSTERY_TEST_DAY_MS }).weekId, now, readMysteryRecord()));
}

/** Starts listening. The timer and the app listener run only while someone listens. */
function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (listeners.size === 1) {
    // Timers stall while the app is in the background, so the week is worked out again on return.
    appListener = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    setTimer();
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size > 0) return;
    setTimer();
    appListener?.remove();
    appListener = null;
  };
}

/** This week's mystery. The page redraws when a clue is collected, a guess is made, or the day changes. */
export function useMysteryWeek(): MysteryWeek {
  return useSyncExternalStore(subscribe, current);
}
