// The box for the 6-digit code from an email: one box, the number keyboard, and the phone's code autofill. It keeps
// only digits, and runs `onComplete` as soon as the sixth digit is in, so nobody has to press a button.

import type { Ref } from 'react';
import { AuthField, type AuthFieldBox } from './AuthField';

/** How many digits a code has. */
export const CODE_LENGTH = 6;

/** Props for the code box. */
type CodeFieldProps = {
  /** The digits typed so far. */
  value: string;
  /** Runs as the person types, with digits only. */
  onChange: (value: string) => void;
  /** Runs with the full code once all six digits are in. */
  onComplete: (code: string) => void;
  /** A small line under the box. */
  note?: string;
  /** Lets the page move the cursor into this box. */
  inputRef?: Ref<AuthFieldBox>;
};

/** The 6-digit code box. */
export function CodeField({ value, onChange, onComplete, note, inputRef }: CodeFieldProps) {
  /** Keeps the digits and finishes at six. */
  const change = (typed: string) => {
    const digits = typed.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH && digits !== value) onComplete(digits);
  };
  return (
    <AuthField
      label="6-digit code"
      kind="code"
      value={value}
      onChange={change}
      placeholder="123456"
      note={note}
      returnKeyType="done"
      onSubmit={() => value.length === CODE_LENGTH && onComplete(value)}
      inputRef={inputRef}
    />
  );
}
