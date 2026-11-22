// The "Send a new code" button under a code box. After each email it waits 60 seconds, counting down once a
// second ("Send a new code in 42s"), so nobody is flooded with emails; the server has its own limit too.

import { useEffect, useState } from 'react';
import { AuthButton } from '@/components/common/AuthButton';

/** How long to wait between code emails, in seconds. */
const WAIT_SECONDS = 60;

/** Props for the resend button. */
type ResendCodeProps = {
  /** When the last code was sent (a time from Date.now()). The wait counts from here. */
  sentAt: number;
  /** Sends a new code; the page sets a new `sentAt` once it's sent. */
  onResend: () => void;
  /** True while the new code is being sent. */
  busy: boolean;
};

/** Seconds left before another code can be sent, at the time `now`. */
function secondsLeft(sentAt: number, now: number): number {
  return Math.max(0, Math.ceil((sentAt + WAIT_SECONDS * 1000 - now) / 1000));
}

/** The resend button with its countdown. */
export function ResendCode({ sentAt, onResend, busy }: ResendCodeProps) {
  const [now, setNow] = useState(() => Date.now());
  const left = secondsLeft(sentAt, Math.max(now, sentAt));

  // Counts down once a second, and stops once the wait is over or the page closes.
  useEffect(() => {
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (secondsLeft(sentAt, time) === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  return <AuthButton look="link" label={left > 0 ? `Send a new code in ${left}s` : 'Send a new code'} disabled={left > 0} busy={busy} onPress={onResend} />;
}
