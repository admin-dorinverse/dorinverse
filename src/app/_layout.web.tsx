// The root of the app in the browser, which is only the web join page for Group Voice Calls (people without the
// app open a link to /call). It loads the fonts and holds the page stack; the phone's sky, lesson downloads and
// saved progress (in _layout.tsx) aren't part of the web page.

import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/data/queries/client';
import { call } from '@/theme/callColors';
import { fontFiles } from '@/theme/text';

/** Navigation colors: the call's own dark page shows through. */
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: call.page, card: call.page } };

/** The web root layout. Shows nothing until the fonts are ready, so text never jumps. */
export default function WebRootLayout() {
  const [fontsLoaded] = useFonts(fontFiles);
  if (!fontsLoaded) return <View style={styles.root} />;
  return (
    <View style={styles.root}>
      <ThemeProvider value={theme}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false, contentStyle: styles.root }} />
        </QueryClientProvider>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: call.page },
});
