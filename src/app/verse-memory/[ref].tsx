// One verse to learn by heart, as in the prototype's Memorization Tool: the five practice modes across the top
// (Read, Hide, Recall, Bank, Record), the verse on a cream index card, and each mode's controls under it.
// "Mark memorized" sits at the top right. The verse's words are already on the phone.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrillHeader } from '@/components/common/DrillHeader';
import { BankMode } from '@/components/verse-memory/BankMode';
import { HideMode, ReadMode } from '@/components/verse-memory/HideMode';
import { MemorizedButton } from '@/components/verse-memory/MemorizedButton';
import { ModeTabs, type PracticeMode } from '@/components/verse-memory/ModeTabs';
import { verseWords } from '@/components/verse-memory/practiceWords';
import { RecallMode } from '@/components/verse-memory/RecallMode';
import { RecordMode } from '@/components/verse-memory/RecordMode';
import { useVerseLookup } from '@/data/queries/bible';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Each mode's screen piece. */
const MODE_VIEWS = { read: ReadMode, cover: HideMode, recall: RecallMode, bank: BankMode, record: RecordMode } as const;

/** The practice page for one verse. */
export default function VersePracticePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const verse = useVerseLookup()?.get(ref);
  const words = useMemo(() => (verse ? verseWords(verse.text) : []), [verse]);
  const [mode, setMode] = useState<PracticeMode>('read');
  const ModeView = MODE_VIEWS[mode];

  return (
    <View style={styles.page}>
      <DrillHeader title={verse?.label ?? 'Verse'} onBack={() => router.back()} right={verse && <MemorizedButton verseRef={verse.ref} label={verse.label} />} />
      {verse ? (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          <ModeTabs mode={mode} onPick={setMode} />
          {/* A new mode starts fresh, as in the prototype. */}
          <ModeView key={mode} reference={verse.label} words={words} />
        </ScrollView>
      ) : (
        <Text style={styles.missing}>This verse is not on the phone yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  body: { paddingHorizontal: gutter, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  missing: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
