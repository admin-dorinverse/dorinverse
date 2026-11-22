// The Account page, opened from the "Signed in as" row on the Bible Crew tab: the username and email, Sign out,
// and Delete account (which asks once more in a sheet, since it can't be undone). Everything shown is already on
// the phone, so the page opens at once.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DeleteAccountSheet } from '@/components/account/DeleteAccountSheet';
import { AuthButton } from '@/components/common/AuthButton';
import { DrillHeader } from '@/components/common/DrillHeader';
import { GlassSurface } from '@/components/common/Glass';
import { StillSky } from '@/components/sky/StillSky';
import { useAccount } from '@/data/account';
import { signOut } from '@/data/accountActions';
import { text } from '@/theme/colors';
import { gutter, radius } from '@/theme/spacing';
import { fonts, textStyles } from '@/theme/text';

/** Props for one line of account details. */
type DetailProps = {
  /** What it is, like "Username". */
  label: string;
  /** Its value. */
  value: string;
};

/** One labelled line on the account card. */
function Detail({ label, value }: DetailProps) {
  return (
    <View style={styles.detail}>
      <Text style={[textStyles.tabSubtitle, styles.label]}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** The Account page. */
export default function AccountPage() {
  const router = useRouter();
  const { person, username } = useAccount();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Signs out; the sign-in page then shows by itself. */
  const leave = async () => {
    setBusy(true);
    await signOut();
  };

  return (
    <View style={styles.page}>
      <StillSky />
      <DrillHeader title="Account" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassSurface style={styles.card}>
          <Detail label="USERNAME" value={username ?? ''} />
          <Text style={[textStyles.body, styles.soft]}>This is the name everyone sees on family calls.</Text>
          {person?.email ? <Detail label="EMAIL" value={person.email} /> : null}
        </GlassSurface>
        <AuthButton look="quiet" label="Sign out" busy={busy} onPress={() => void leave()} />
        <AuthButton look="link" label="Delete my account" onPress={() => setDeleting(true)} />
      </ScrollView>
      <DeleteAccountSheet open={deleting} onClose={() => setDeleting(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { borderRadius: radius.card, padding: 20, gap: 12 },
  detail: { gap: 4 },
  label: { color: text.goldNote },
  value: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  soft: { color: text.onDarkSoft, fontSize: 13.5, lineHeight: 19 },
});
