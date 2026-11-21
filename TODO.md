# Things to do

Work the owner has asked for later, so it isn't forgotten. Take an item off when it's done.

## Character Connections

- **Use BSB in the web.** The web's people, links and "why" lines came from the owner's artifact, which was written
  against the KJV (`design/character-web/`, `scripts/character-web/links.json`). Update the web's passages and wording
  to the BSB, the app's translation. Today the link pages already show BSB verse words (revealed verses only), but the
  passage references and why lines are still the KJV-based ones. (Asked 2026-11-19.)

## Bible Crew (the tools tab, was Keep it fresh)

- **Pick the tab's final name.** "Bible Crew" is the working name; the owner wants a fun word in place of "study".
  (2026-11-21.)

- **Make Verse Memory feel like a buddy**, to fit the tab. (Owner's idea, 2026-11-21.)

- **Weekly guest chat.** The test version is built: Peter, with starter notes in
  `scripts/app/papa-dorin-chat/guests/peter.md`, on the owner's PC like Papa Dorin. Still to do: the owner's own notes
  and picture for each guest (Peter shows a round "P" badge for now), the server saying who is on each week, and the
  same hookup as Papa Dorin's chat. (2026-11-21.)

- **Papa Dorin points bakers to lessons when they ask** ("Can you point me to a lesson about Ruth?"). Two ways, owner to
  pick: (A) give him a "find lessons" tool (its one-line description needs the owner's approval, since he reads it), so he
  answers in his voice and a tappable lesson card shows; or (B) the app spots the request and shows lesson cards under his
  reply without him knowing. Search by lesson title, passage and collected people; topics need the theme tags first.
  Never add instructions to his notes for this. (Asked 2026-11-19.)

- **Hook up Chat with Papa Dorin for everyone.** The test version works for the owner only, through their Claude
  subscription on the PC (Claude Sonnet 5.5, low effort, papa-dorin.md as written). Still to do: a server function with
  an Anthropic API key (owner sets a spending cap), sign-in, and chat cookies (25 free a month for subscribers, packs
  sold for real money; prices to rework for Sonnet).

## Gather (subscribers) and the Weekly Word (everyone)

- **Gather** (working name): a family gets together around the Bible, wherever they are. The host (a subscriber) taps
  "Start a get-together" and texts one link; guests tap it and join the same voice call free, in the app or the phone's
  browser, with no account. The host moves the verse and everyone sees the whole chapter with that verse lit up. The
  host can bring in Papa Dorin, in his own real voice, to ask questions or give his opinion, then he hosts family trivia
  read out loud while everyone taps answers. Same Room mode: no call, Papa Dorin on the TV, everyone taps on their phones.
  (Agreed 2026-11-20.)
  - Lessons together: the host can open a lesson on the call, and everyone goes through it together, step by step, on
    their own screens, with Papa Dorin there when they want him. (Added 2026-11-20.)
  - Count get-togethers, not minutes: some included each month, extra packs sold, maybe a bigger Family plan. The
    server counts them and keeps trivia scores, never the phone.
  - Tech leaning: LiveKit for the call (its data packets carry verse moves, questions and taps); Supabase Realtime
    Broadcast for Same Room only; talk-to-text from the phone's free built-in speech recognition; Papa Dorin's voice from
    ElevenLabs or Cartesia. Rough cost per get-together: 30 to 55 cents. No company is approved yet, and nothing is
    set up without the owner's go.
  - The call screen (owner, 2026-11-21): voice only is fine if LiveKit allows it. Guests without the app type their
    name before joining and get a default avatar with their initials; app users show their app avatar. With nothing
    on screen, everyone's avatar shows; whoever is talking glows. With a verse, lesson or question on screen, only the
    3 most recent talkers show, the rest behind a "show more". Papa Dorin's avatar always shows; tapping it means only
    that person's mic is heard by him, so no other voices get into his text.
  - Trivia on the call (owner, 2026-11-21): everyone sees the question and picks their own answer. Papa Dorin reads
    the question and the answers, then the time limit starts. After answering, it shows the share for each answer
    and who picked what. Nothing moves on until the host does: the host can have the right answer explained, then go
    to the next question. It ends on a winner screen that highlights the winner's avatar. People can stay on the
    call a little while after.
  - Not decided: what happens after a session (start another, or go on to Bible study or a lesson on the same call),
    since the plan is to charge by the session, not the minute.
  - Papa Dorin's voice (owner, 2026-11-21): made on ElevenLabs, deep, fatherly, light French accent, English words
    only. Always the full-quality voice model, never Turbo/Flash, for lessons and for calls. Needed at hookup: the
    saved voice's ID: `kU3EUOxxqWQNBkU9dldC` (not secret). The API key `staging-dorinverse` (Text to Speech
    only) is saved in Supabase's secrets as `ELEVENLABS_API_KEY` (2026-11-21).
  - Lesson audio for subscribers (owner's idea, 2026-11-21, not started): Papa Dorin reads the story cards and the
    Big Idea only. About 5.1 million letters, made once and streamed; about $409 at ElevenLabs' pay-as-you-go price
    ($0.08 per 1,000 letters, checked 2026-11-21). Hosting not priced. Needs the owner's go before any spending.
  - LiveKit set up (2026-11-21): project `staging-dorinverse` (wss://dorinverse-sr3bt97n.livekit.cloud) for testing.
    `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are saved in Supabase's Edge Function secrets. Before
    launch: a second project `production-dorinverse` with its own keys, in the live Supabase project's secrets.
  - Anthropic API set up (2026-11-21): a separate Console account for the business, $5 of credit, key saved in
    Supabase's secrets as `ANTHROPIC_API_KEY`. Papa Dorin on Opus 5.5, low effort (the owner picked it over Sonnet
    low); his chat replies now stream in as they're written.
  - The owner is looking into LiveKit and ElevenLabs. Before building: study how other voice-call apps show avatars
    and who is talking, and stop to check everything is ready.
  - Next: free voice samples from ElevenLabs and Cartesia for the owner to hear; confirm prices on each company's own
    page; check LiveKit works with Expo; plan trivia so groups don't see repeats (track what each group has played; new
    kinds made from the verses, like finish the verse, who said it, put it in order).
- **Weekly Word** (was Weekly Mystery): free for everyone, and the daily habit. The test version is built
  (2026-11-21): a red Clue Book glows in the sky when today's clue is waiting; opening it shows a "Collect clue" button for today's
  clue (a clue is only collected by tapping it) and every clue so far, with 3 guesses a day. Clues come Monday to Sunday, and the word is revealed Sunday at 6 PM. A
  missed clue is gone. It runs on the phone with one sample word ("manna") and a test switch that makes a day last a
  minute (`MYSTERY_TEST_DAY_MS` in `src/data/devTesting.ts`). Still to do:
  - Decide the reward (the sooner the guess, the bigger it is).
  - **Hookup, so the whole app sees the same word** (plan agreed 2026-11-21). Only `src/data/mysterySource.ts`
    changes in the app.
    - One clock for everyone, like Bakery TV: each clue and the reveal happen at the same moment worldwide, not at
      each person's own midnight. The clock is Central Time (owner, 2026-11-21). Still to discuss: what hour the day
      turns over and the word is revealed. Show the times in each person's local time.
    - A table in the database with each week's word, its seven clues and their references, written ahead of time
      (who writes them is still open).
    - The server hands out only today's clue, so the word and later clues never reach the phone early.
    - The server checks each guess, counts the 3 tries a day and decides the reward.
    - Needs sign-in first, so the server knows whose Clue Book and tries they are.
  - Friends passing a missed clue (agreed 2026-11-20; needs sign-in and friends).
  - Keep past weeks in the Clue Book, one page per mystery; all 7 clues is a full set.
  - The reveal shows free users what Gather families did together.

## Places map (MapLibre + MapTiler)

- **Owner is leaning toward not doing the map** (2026-11-20): the free place picture already shows the place.

- **Owner first:** create an Apple ID with admin@dorinverse.com and enroll in the Apple Developer Program as an Individual
  ($99/yr, only needed to run builds on the iPhone); sign up for MapTiler (free) and Expo (free). An Android phone could
  test it without Apple (EAS installable build, free).
- **Then me:** add MapLibre, set up EAS build settings and the first iPhone development build, check place coordinates come
  down with the cards, and build the map: night-sky style made in MapTiler (modern roads, borders and city names hidden),
  places as stars, collected ones bright, tap to open. Show 2-3 looks to pick from. The credit line must stay visible.

## Business (before launch)

- Texas LLC (Form 205 on SOSDirect, about $300) with a registered agent service whose address and mail scanning cover
  the agent and business address, so the owner's home stays private; EIN; business bank account; business phone (e.g.
  Google Voice); D-U-N-S number; then switch the Apple account to Organization (or open a new one). Google Play ($25 once)
  when publishing on Android; Organization accounts skip Google's 12-tester rule. Ask an accountant about taxes, the home
  office deduction and moving states. (Discussed 2026-11-20.)
