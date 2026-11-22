// Turns what went wrong with an account into a short, friendly line people can act on, like "That email or
// password doesn't match." Pages show these lines; the server's own wording never reaches the screen.

import { isAuthApiError, isAuthError, isAuthPKCECodeVerifierMissingError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/** What the person sees when the phone can't reach the server. */
export const NO_INTERNET = 'Can’t reach Dorinverse right now. Check your internet and try again.';

/** Friendly lines for the server's error codes. */
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'That email or password doesn’t match. Check them and try again.',
  user_already_exists: 'That email already has an account. Try signing in instead.',
  email_exists: 'That email already has an account. Try signing in instead.',
  weak_password: 'That password is too easy to guess. Try a longer one with a mix of letters and numbers.',
  same_password: 'That’s your old password. Pick a new one.',
  email_address_invalid: 'That email doesn’t look right. Check it and try again.',
  validation_failed: 'That email doesn’t look right. Check it and try again.',
  otp_expired: 'That code didn’t work or has expired. Check it or send a new one.',
  email_not_confirmed: 'Your email isn’t confirmed yet. Type the code we emailed you.',
  flow_state_expired: 'That link is too old. Please ask for a new one.',
  flow_state_not_found: 'That link was already used. Please ask for a new one.',
  over_request_rate_limit: 'Too many tries in a row. Wait a minute, then try again.',
  over_email_send_rate_limit: 'We just sent an email. Wait a minute before asking for another.',
  user_banned: 'This account can’t sign in right now.',
  signup_disabled: 'New accounts can’t be made right now. Please try again later.',
};

/** A friendly line for any account error. */
export function friendlyAccountError(error: unknown): string {
  if (isAuthRetryableFetchError(error)) return NO_INTERNET;
  if (isAuthPKCECodeVerifierMissingError(error)) return 'Open the link on the phone where you asked for it, or ask for a new one there.';
  if (isAuthApiError(error) && error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  if (isAuthError(error) && /fetch|network/i.test(error.message)) return NO_INTERNET;
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return NO_INTERNET;
  return 'Something went wrong. Please try again.';
}
