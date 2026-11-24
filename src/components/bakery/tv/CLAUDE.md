# bakery/tv

Pieces of the Bakery TV page: the wooden TV, the YouTube player inside it (`TvPlayer.native.tsx` on the phones,
`TvPlayer.tsx` in the browser, both from `playerPage.ts`), one guide row with its "Remind me" button, the sums
that work out what plays now from the server's schedule, and a once-a-second clock that stops while the page is
hidden. The schedule comes from `src/data/queries/tv.ts` (`tv_schedule` with its `tv_program` videos).
Reminders only show on screen for now; nothing is saved or sent.
