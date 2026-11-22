# call

Pieces of the Group Voice Call page (`src/app/call.tsx`), built from the call mockups
(https://claude.ai/artifact/24FbD2bZtizzefPFYwVtVJ). The same screens run in the phone app and in the browser
(the web join page for people without the app). The few parts that differ come in pairs: `livekit.ts` and
`useMicLevel.native.ts` for the phone, `livekit.web.ts` and `useMicLevel.ts` for the browser. Every other file
imports LiveKit only through `./livekit`.
