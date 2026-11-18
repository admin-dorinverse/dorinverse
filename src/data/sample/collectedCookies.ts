// Sample data for building the Prophecy, Instructions and Prayers pages: which cookies the person has collected,
// oldest first. Fake data for the UI only: the real list comes from the server, which is the only place that
// decides what has been collected. Keys only; every cookie's words come from the database.

import type { CookieKey } from '@/types/cookie';

/**
 * Collected cookie keys, oldest first, roughly in the order a person would meet them in lessons. Prophecy links 1, 2
 * and 19 are joined (link 1 still has a second fulfillment to find); links 4 and 6 have only the promise and link
 * 15 only the fulfillment.
 */
export const sampleCollectedCookies: CookieKey[] = [
  'prophecy:1:promise:Genesis 22:18',
  'prayer:Genesis 24:12-14',
  'ten_commandments',
  'prophecy:6:promise:Deuteronomy 18:15',
  'prayer:Judges 13:8',
  'prayer:2 Kings 6:17',
  'prophecy:19:promise:Isaiah 53:5',
  'prayer:Daniel 9:4-19',
  'prophecy:2:promise:Micah 5:2',
  'prophecy:4:promise:Zechariah 9:9',
  'prophecy:2:fulfillment:Matthew 2:5-6',
  'instruction:Matthew 4:19',
  'prayer:Matthew 26:39',
  'instruction:Mark 16:15',
  'instruction:Luke 18:16',
  'prophecy:1:fulfillment:Acts 3:25',
  'prophecy:15:fulfillment:Acts 8:32-35',
  'instruction:Romans 12:20',
  'instruction:Romans 13:9',
  'instruction:Ephesians 6:1',
  'instruction:James 1:22',
  'prophecy:19:fulfillment:1 Peter 2:24',
  'instruction:1 John 4:7',
];
