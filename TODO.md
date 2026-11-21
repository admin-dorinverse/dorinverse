# Things to do

Work the owner has asked for later, so it isn't forgotten. Take an item off when it's done.

## Character Connections

- **Use BSB in the web.** The web's people, links and "why" lines came from the owner's artifact, which was written
  against the KJV (`design/character-web/`, `scripts/character-web/links.json`). Update the web's passages and wording
  to the BSB, the app's translation. Today the link pages already show BSB verse words (revealed verses only), but the
  passage references and why lines are still the KJV-based ones. (Asked 2026-11-19.)

## Keep it fresh

- **Papa Dorin points bakers to lessons when they ask** ("Can you point me to a lesson about Ruth?"). Two ways, owner to
  pick: (A) give him a "find lessons" tool (its one-line description needs the owner's approval, since he reads it), so he
  answers in his voice and a tappable lesson card shows; or (B) the app spots the request and shows lesson cards under his
  reply without him knowing. Search by lesson title, passage and collected people; topics need the theme tags first.
  Never add instructions to his notes for this. (Asked 2026-11-19.)

- **Hook up Chat with Papa Dorin for everyone.** The test version works for the owner only, through their Claude
  subscription on the PC (Claude Sonnet 5.5, low effort, papa-dorin.md as written). Still to do: a server function with
  an Anthropic API key (owner sets a spending cap), sign-in, and chat cookies (25 free a month for subscribers, packs
  sold for real money; prices to rework for Sonnet).

## Trivia (on Keep it fresh)

- **Build Cookie Box Trivia** (Solo, Build Together, Versus). Today it opens a stand-in page.
- **Build Verse Trivia** (Solo, Build Together, Versus). Today it opens a stand-in page.

## Gather (subscribers) and the Weekly Mystery (everyone)

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
  - Next: free voice samples from ElevenLabs and Cartesia for the owner to hear; confirm prices on each company's own
    page; check LiveKit works with Expo; plan trivia so groups don't see repeats (track what each group has played; new
    kinds made from the verses, like finish the verse, who said it, put it in order).
- **Weekly Mystery**: free for everyone, and the daily habit. A Bible mystery each week with one clue a day from Papa
  Dorin; guess anytime; the answer is revealed at the end of the week. A missed clue is gone for good unless a friend
  passes it to you. Clues are collected in a Clue Book, one page per mystery; all 7 is a full set. The reveal shows free
  users what Gather families did together. (Agreed 2026-11-20.)

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
