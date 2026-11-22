// Checks a username with the server while the person types: once they pause for a moment, never once per letter.
// It gives a short line for under the box, like "That name is free" or "Someone already has that name".

import { useEffect, useState } from 'react';
import { useDebounced } from '@/components/common/useDebounced';
import { checkUsername } from '@/data/accountActions';
import type { UsernameVerdict } from '@/types/account';

/** How long typing must pause before the server is asked, in milliseconds. */
const PAUSE_MS = 450;

/** The line under the box for each verdict. */
export const VERDICT_LINES: Record<UsernameVerdict, string> = {
  ok: 'That name is free.',
  taken: 'Someone already has that name. Try another.',
  invalid: 'That doesn’t fit the rules below.',
  not_allowed: 'That name isn’t allowed. Please pick another.',
};

/** What the check says right now: nothing yet, checking, a verdict, or no internet. */
export type UsernameCheck = { kind: 'idle' } | { kind: 'checking' } | { kind: 'verdict'; verdict: UsernameVerdict } | { kind: 'offline'; line: string };

/** Live check of a typed username. */
export function useUsernameCheck(typed: string): UsernameCheck {
  const name = typed.trim();
  const settled = useDebounced(name, PAUSE_MS);
  const [result, setResult] = useState<{ name: string; check: UsernameCheck }>({ name: '', check: { kind: 'idle' } });

  useEffect(() => {
    if (settled.length < 3) return;
    let gone = false;
    checkUsername(settled)
      .then((verdict) => !gone && setResult({ name: settled, check: { kind: 'verdict', verdict } }))
      .catch((e: Error) => !gone && setResult({ name: settled, check: { kind: 'offline', line: e.message } }));
    return () => {
      gone = true;
    };
  }, [settled]);

  if (name.length === 0) return { kind: 'idle' };
  if (name.length < 3) return { kind: 'verdict', verdict: 'invalid' };
  return result.name === name ? result.check : { kind: 'checking' };
}
