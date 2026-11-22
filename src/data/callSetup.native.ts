// Turns on LiveKit's phone audio and networking parts once, when the app starts. LiveKit's calls need it before
// anything joins a call. The web build has these parts built in, so callSetup.ts does nothing there.

import { registerGlobals } from '@livekit/react-native';

registerGlobals();
