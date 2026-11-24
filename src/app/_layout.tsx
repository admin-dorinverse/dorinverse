// The root of the app: loads the fonts, starts loading the person's lesson progress, the lesson outline, the Bible
// reader's saved verses and the collected character and place cards (and place photos) and cookies (prophecy,
// instructions, prayers) in the background, turns on gestures, starts the shared sky, and holds the page stack.
// It is also the sign-in gate (see AccountGate below): signed out shows the sign-in pages, signed in without a
// username shows the pick-a-username page, and otherwise the app.

import '@/components/common/skiaIds';
import '@/data/callSetup';
import '@/data/cryptoSetup';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider, type Href } from 'expo-router';
import { useRouteNode } from 'expo-router/build/Route';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { RewardHost } from '@/components/common/RewardHost';
import { FriendPushHost } from '@/components/notifications/FriendPushHost';
import { OpenWaitingFriendLink } from '@/components/sign-in/OpenWaitingFriendLink';
import { SkyProvider } from '@/components/sky/SkyProvider';
import { startAccount, useAccount } from '@/data/account';
import { startBibleLoad } from '@/data/queries/bible';
import { startCharactersLoad } from '@/data/queries/characters';
import { startCookiesLoad } from '@/data/queries/cookies';
import { startFriendNews } from '@/data/queries/friends';
import { startLessonsLoad } from '@/data/queries/lessons';
import { startPlacesLoad } from '@/data/queries/places';
import { startProgressLoad } from '@/data/queries/progress';
import { queryClient } from '@/data/queries/client';
import { sky } from '@/theme/colors';
import { fontFiles } from '@/theme/text';

/** Navigation colors: see-through pages so the sky shows behind the tabs. */
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent' } };

/**
 * The pages anyone may open, signed in or not: /call (Group Voice Call invite links work with no account),
 * and /auth-callback (where Google and Apple sign-in come back).
 * Every other page needs a signed-in person with a username, so a new page is protected without being listed.
 */
const OPEN_PAGES = ['call', 'auth-callback'];

/** The sign-in pages, for people who are signed out. */
const SIGN_IN_PAGES = ['sign-in/index', 'sign-in/create', 'sign-in/confirm', 'sign-in/forgot'];

/** The pick-a-username page's route name. */
const USERNAME_PAGE = 'sign-in/username';

/** The sign-in page's real address (never "/sign-in/index"; see the note in src/app/(tabs)/_layout.tsx). */
const SIGN_IN = '/sign-in' as Href;

/** The pick-a-username page's address. */
const PICK_USERNAME = '/sign-in/username' as Href;

/**
 * The app's pages by route name: every page the router found in src/app (a folder with its own _layout, like
 * (tabs), counts as one), minus the open and sign-in pages. The router's built-in pages (page not found, the dev
 * sitemap) are left as they are.
 */
function useAppPages(): string[] {
  const node = useRouteNode();
  return useMemo(() => {
    const notApp = new Set([...OPEN_PAGES, ...SIGN_IN_PAGES, USERNAME_PAGE]);
    return (node?.children ?? []).filter((child) => !child.internal && !child.generated && !notApp.has(child.route)).map((child) => child.route);
  }, [node]);
}

/**
 * The sign-in gate and the page stack. Each group of pages shows only at its step; opening one at the wrong step
 * goes to the right page instead. This is the one place to change if a welcome demo comes before signing in.
 * A friend link opened before the person is ready opens once they reach the sky (OpenWaitingFriendLink).
 */
function AccountGate() {
  const { step } = useAccount();
  const appPages = useAppPages();
  return (
    <>
      <OpenWaitingFriendLink step={step} />
      <FriendPushHost step={step} />
      {step === 'ready' && <RewardHost />}
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.page }}>
        <Stack.Protected guard={step === 'signedOut'} redirectTo={step === 'needsUsername' ? PICK_USERNAME : '/'}>
          {SIGN_IN_PAGES.map((name) => (
            <Stack.Screen key={name} name={name} />
          ))}
        </Stack.Protected>
        <Stack.Protected guard={step === 'needsUsername'} redirectTo={step === 'signedOut' ? SIGN_IN : '/'}>
          <Stack.Screen name={USERNAME_PAGE} />
        </Stack.Protected>
        <Stack.Protected guard={step === 'ready'} redirectTo={step === 'signedOut' ? SIGN_IN : PICK_USERNAME}>
          {appPages.map((name) => (
            <Stack.Screen key={name} name={name} />
          ))}
        </Stack.Protected>
      </Stack>
    </>
  );
}

/**
 * The app's root layout. Shows nothing until the fonts are ready, so text never jumps, and until the saved
 * sign-in is read from the phone (a moment, with no network), so the right first page opens.
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontFiles);
  const { step } = useAccount();
  // Progress comes first, so every library sees what was earned. Then the lesson outline, the Bible verses, collected
  // character and place cards and collected cookies load from the phone (downloading only what is missing) while the
  // app opens; collected places' photos go into the photo cache.
  useEffect(() => {
    startAccount();
    startProgressLoad();
    startLessonsLoad();
    startBibleLoad();
    startCharactersLoad();
    startCookiesLoad();
    startPlacesLoad();
    startFriendNews();
  }, []);
  if (!fontsLoaded || step === 'loading') return null;
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={theme}>
        <QueryClientProvider client={queryClient}>
          <SkyProvider>
            <AccountGate />
          </SkyProvider>
        </QueryClientProvider>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: sky.top },
  page: { backgroundColor: 'transparent' },
});
