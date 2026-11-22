// Which ways to sign in the app offers besides email and password. Google and Apple need the owner's keys switched
// on in Supabase first (Authentication > Sign In / Providers); until then their buttons stay hidden.
// To switch one on: turn the provider on in Supabase, then set its line below to true and make a new build.

/** Shows the "Continue with Google" button. On since 2026-11-22 (Google is switched on in the staging project). */
export const GOOGLE_SIGN_IN_ON = true;

/** Shows the Sign in with Apple button (Apple's own button on iPhones, a browser sign-in on Android). */
export const APPLE_SIGN_IN_ON = false;

/** The shortest password allowed, the same as the server's rule. */
export const PASSWORD_MIN = 8;

/** The username rules, the same as the server's: 3 to 20 letters, numbers or underscores, starting with a letter. */
export const USERNAME_RULES = '3 to 20 characters: letters, numbers and _ only, starting with a letter.';

/** The longest username, so the box stops there. */
export const USERNAME_MAX = 20;
