// A friend code page, opened by someone's QR code (dorinverse://friend/<code>) or the link they texted. It shows
// only their avatar and username, with Add friend (or how you already stand), until they say yes. In a browser the
// same address opens [code].web.tsx instead, which only hands the code to the app.

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DrillHeader } from '@/components/common/DrillHeader';
import { FriendLookView } from '@/components/friend/FriendLookView';
import { StillSky } from '@/components/sky/StillSky';
import { useFriendCodeLook } from '@/data/queries/friends';
import { gutter } from '@/theme/spacing';

/** What shows when a failure came with no words of its own. */
const SOMETHING_WRONG = 'Something went wrong. Please try again.';

/** The friend code page. */
export default function FriendCodePage() {
  const router = useRouter();
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const look = useFriendCodeLook(code);

  /** Goes back, or to the sky when the code opened the app straight onto this page. */
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.page}>
      <StillSky />
      <DrillHeader title="Friend code" onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <FriendLookView
          code={code}
          look={look.data}
          failed={look.isError ? look.error.message || SOMETHING_WRONG : null}
          retrying={look.isFetching}
          onRetry={() => void look.refetch()}
          onBack={back}
          onOpenUniverse={(id) => router.push(`/universe/${encodeURIComponent(id)}` as Href)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
