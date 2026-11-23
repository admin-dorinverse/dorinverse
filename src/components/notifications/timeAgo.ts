// How long ago a piece of news came, in plain words: "Just now", "5 min ago", "3 hours ago", "Yesterday",
// "4 days ago", or a date like "Mar 3" for older news (with the year when it isn't this year).

/** Short month names for older dates. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One minute, one hour and one day in milliseconds. */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Midnight at the start of the day this time falls on, on the phone's clock. */
function startOfDay(time: number): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

/** How long before `now` the server's date text `when` was, in plain words. */
export function timeAgo(when: string, now: number): string {
  const time = Date.parse(when);
  if (Number.isNaN(time)) return '';
  const gone = now - time;
  if (gone < MINUTE) return 'Just now';
  if (gone < HOUR) return `${Math.floor(gone / MINUTE)} min ago`;
  // Whole days between the two calendar days, so 11 pm yesterday reads "Yesterday", not "1 hour ago".
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY);
  if (days === 0) {
    const hours = Math.floor(gone / HOUR);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const date = new Date(time);
  const dayAndMonth = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === new Date(now).getFullYear() ? dayAndMonth : `${dayAndMonth}, ${date.getFullYear()}`;
}
