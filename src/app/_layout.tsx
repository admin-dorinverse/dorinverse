// The root of the app: loads the fonts, starts loading the Bible reader's saved verses in the background,
// turns on gestures, starts the shared sky, and holds the page stack.

import '@/components/common/skiaIds';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SkyProvider } from '@/components/sky/SkyProvider';
import { startBibleLoad } from '@/data/queries/bible';
import { queryClient } from '@/data/queries/client';
import { sky } from '@/theme/colors';
import { fontFiles } from '@/theme/text';

/** Navigation colors: see-through pages so the sky shows behind the tabs. */
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent' } };

/** The app's root layout. Shows nothing until the fonts are ready, so text never jumps. */
export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontFiles);
  // The Bible verses load from the phone (downloading only what is missing) while the app opens.
  useEffect(startBibleLoad, []);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={theme}>
        <QueryClientProvider client={queryClient}>
          <SkyProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: styles.page }} />
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
