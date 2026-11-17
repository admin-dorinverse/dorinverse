This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Lesson content (dough maker)

The rules for building Bible lessons live in `scripts/dough-maker/lesson-docs/`. Start with its `README.md`, which says which file to load for each step. The approved prophecy links are in `scripts/dough-maker/data/prophecy-links.json`.

Every output the lesson run makes (the passage list, the tracker, each step's saved stages, and every lesson step) goes under `scripts/dough-maker/output/`, which is kept in git. Use `OUTPUT` from `scripts/dough-maker/run/events.mjs`. Only the run's bookkeeping (events, limits, logs, prompts) goes in the git-ignored `scripts/dough-maker/run/.cache/`. Commit the outputs after a run or a hand fix.

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Code rules

This repo is written for people first. Anyone who opens it should know where things are and why.

**Clear and consistent**
- Code reads clearly on its own. Names say what a thing is or does.
- Every file starts with a short comment saying what it is for.
- Every function, component, type and prop gets a short comment above it.
- A comment is 3 sentences or fewer and makes one point.
- A file is never more than 300 lines, styles included. If it grows past that, split it into smaller
  pieces that each do one job. Never move code to another file just to get under the limit.
- Do things the same way everywhere: styling, data types, names, folder layout.
  Before writing something new, find how the repo already does it and do it that way.

**Where things go**
- `src/app/`: the pages. A file is one page; a folder is a page with more pages inside.
- `src/components/`: pieces pages are built from. `common/` is for pieces many pages use;
  other folders match the page they belong to.
- `src/theme/`: colors, spacing and text styles. Every page uses these; no colors or sizes typed by hand.
- `src/data/`: getting and saving data. `database.ts` connects to Supabase, `queries/` asks for data
  (TanStack Query), `storage/` saves on the phone (expo-sqlite, encrypted).
- `src/types/`: the shape of each kind of data.

**Speed, security and cost come together**
- A change that makes the app slower or less safe is not a fix.
- Every page must run smooth and stay cool on a cheap phone. Before a page is called done, it is opened on a real phone and checked: smooth, and not warm after 2 minutes.
- Animations only move, grow or fade things. Anything that redraws itself says how often: 20 times a second for slow things, 60 only while something moves fast, never every screen refresh. All animation stops when its page is hidden or the app is in the background.
- No live blur over anything that moves.
- Long lists (chapters, verses, characters, places, questions) draw only what is on screen.
- Work that gives the same answer every time (a picture, a size, a list) is done once and reused, never redone every frame.
- Images are WebP and at most 150 KB. Sounds are .m4a and at most 100 KB. Videos stream from the server and are never packed into the app.
- A check script fails the commit if an image or sound is too big or a file in `src/` is over 300 lines.
- Download only what the user opens. Save it on the phone and download again only if it changed.
- The server decides points, collections and the 15-unfinished-lesson cap. The phone never does.
- Never commit secrets (keys, passwords, `.env` files). Check before every commit.

**Bible accuracy**
- Bible text and lesson content come from the database, never typed into the app code.
