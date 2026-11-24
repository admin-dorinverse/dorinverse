// What people can do with their account: sign in or make an account with email and password (confirmed with a
// 6-digit code from an email), reset a forgotten password with an emailed code, pick a username, sign out and
// delete the account. Each one throws an Error with a friendly line when it fails, ready to show on the page.

import { isAuthApiError } from '@supabase/supabase-js';
import { database } from '@/data/database';
import { friendlyAccountError, NO_INTERNET } from '@/data/accountErrors';
import { holdAccount, signedOutHere, usernameSaved } from '@/data/account';
import { forgetPushToken } from '@/data/friendPush';
import { PASSWORD_MIN } from '@/data/signInOptions';
import type { UsernameVerdict } from '@/types/account';

/** Throws the friendly line for an error. While testing, the real error also goes to the PC's dev server log. */
function fail(error: unknown): never {
  if (__DEV__) console.warn('[account]', error);
  throw new Error(friendlyAccountError(error));
}

/** Waits for a call to the server; if it breaks instead of answering, that becomes a friendly line too. */
async function ask<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    fail(error);
  }
}

/** True when an email looks like one: something, an @, something, a dot, something. */
function looksLikeEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

/** Checks the email and password look right before asking the server. */
function checkTyped(email: string, password: string): void {
  if (!looksLikeEmail(email)) throw new Error('That email doesn’t look right. Check it and try again.');
  if (password.length < PASSWORD_MIN) throw new Error(`Your password needs at least ${PASSWORD_MIN} characters.`);
}

/** Checks a typed code is six digits before asking the server. */
function checkCode(code: string): void {
  if (!/^\d{6}$/.test(code)) throw new Error('Type the 6-digit code from the email.');
}

/** How signing in or making an account ended: signed in, or the email still needs its 6-digit code. */
export type EmailSignInResult = 'signedIn' | 'confirm';

/**
 * Signs in with email and password. An account whose email isn't confirmed yet gets a new code and comes back
 * as 'confirm', so the page can open the code page.
 */
export async function signInWithEmail(email: string, password: string): Promise<EmailSignInResult> {
  if (!email.trim() || !password) throw new Error('Type your email and password.');
  const { error } = await ask(database.auth.signInWithPassword({ email: email.trim(), password }));
  if (isAuthApiError(error) && error.code === 'email_not_confirmed') {
    await database.auth.resend({ type: 'signup', email: email.trim() }).catch(() => {});
    return 'confirm';
  }
  if (error) fail(error);
  return 'signedIn';
}

/**
 * Makes a new account with email and password. The server emails a 6-digit code, so it comes back as 'confirm'.
 * An email that already has an account looks just the same (the server keeps which emails exist private), and
 * the code page suggests signing in instead.
 */
export async function createAccount(email: string, password: string): Promise<EmailSignInResult> {
  checkTyped(email.trim(), password);
  const { data, error } = await ask(database.auth.signUp({ email: email.trim(), password }));
  if (error) fail(error);
  return data.session ? 'signedIn' : 'confirm';
}

/** Confirms a new account's email with the 6-digit code; the person is then signed in. */
export async function confirmEmail(email: string, code: string): Promise<void> {
  checkCode(code);
  const { error } = await ask(database.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' }));
  if (error) fail(error);
}

/** Emails a new code for confirming a new account. */
export async function resendEmailCode(email: string): Promise<void> {
  const { error } = await ask(database.auth.resend({ type: 'signup', email: email.trim() }));
  if (error) fail(error);
}

/** Emails a 6-digit code for setting a new password. */
export async function sendResetCode(email: string): Promise<void> {
  if (!looksLikeEmail(email.trim())) throw new Error('That email doesn’t look right. Check it and try again.');
  const { error } = await ask(database.auth.resetPasswordForEmail(email.trim()));
  if (error) fail(error);
}

/**
 * Sets a new password with the emailed code. The code signs the person in for a moment, so the account is held on
 * the page until the new password is saved, then lets them into the app. If the code worked but the password was
 * refused, the error says so (`codeWorked`), and the retry passes `codeUsed` to only save the password.
 */
export async function resetWithCode(email: string, code: string, password: string, codeUsed: boolean): Promise<void> {
  if (password.length < PASSWORD_MIN) throw new Error(`Your new password needs at least ${PASSWORD_MIN} characters.`);
  if (!codeUsed) {
    checkCode(code);
    holdAccount(true);
    const { error } = await database.auth
      .verifyOtp({ email: email.trim(), token: code, type: 'recovery' })
      .catch((broke: unknown) => ({ error: broke }));
    if (error) {
      holdAccount(false);
      fail(error);
    }
  }
  const { error } = await database.auth.updateUser({ password }).catch((broke: unknown) => ({ error: broke }));
  if (error) {
    if (__DEV__) console.warn('[account]', error);
    throw Object.assign(new Error(friendlyAccountError(error)), { codeWorked: true });
  }
  holdAccount(false);
}

/** Ends a reset page's hold when the person leaves it: they stay signed in, with their old password. */
export function leaveReset(): void {
  holdAccount(false);
}

/** Asks the server whether a username can be used. */
export async function checkUsername(username: string): Promise<UsernameVerdict> {
  const { data, error } = await database.rpc('username_check', { p_username: username });
  if (error) throw new Error(NO_INTERNET);
  return data as UsernameVerdict;
}

/** Saves the person's username. Returns the server's verdict; on 'ok' the person moves on to the app. */
export async function chooseUsername(username: string): Promise<UsernameVerdict> {
  const { data, error } = await database.rpc('set_username', { p_username: username });
  if (error) throw new Error(NO_INTERNET);
  const verdict = data as UsernameVerdict;
  if (verdict === 'ok') usernameSaved(username);
  return verdict;
}

/** Signs out on this phone. It works with no internet too; first the phone's notification token leaves the server. */
export async function signOut(): Promise<void> {
  await forgetPushToken();
  await database.auth.signOut({ scope: 'local' }).catch(() => {});
  signedOutHere();
}

/** Deletes the account and everything in it on the server, then signs out on this phone. */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await database.functions.invoke<{ ok?: boolean; error?: string }>('delete-account', { method: 'POST' });
  if (error || !data?.ok) {
    // The server's own line (like "Please sign in again.") is shown as it is; no answer at all means no internet.
    const said = await (error?.context as Response | undefined)?.json?.().catch(() => null);
    throw new Error(typeof said?.error === 'string' ? said.error : data?.error ?? NO_INTERNET);
  }
  await signOut();
}
