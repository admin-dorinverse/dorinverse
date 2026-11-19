// The Memorized list: the verses the person knows by heart, newest first, as cards. Tapping one opens it to
// practice again.

import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DrillHeader } from '@/components/common/DrillHeader';
import { VerseGrid, verseHeading } from '@/components/verse-memory/VerseGrid';
import type { VerseHit } from '@/data/bibleSearch';
import { useVerseLookup } from '@/data/queries/bible';
import { useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { reader } from '@/theme/colors';

/** The Memorized page. */
export default function MemorizedPage() {
  const router = useRouter();
  const lookup = useVerseLookup();
  const memorized = useMemorizedVerses();
  const verses = useMemo(() => (lookup ? memorized.map((ref) => lookup.get(ref)).filter((v): v is VerseHit => !!v) : []), [lookup, memorized]);

  /** Opens a verse to practice. */
  const open = useCallback((v: VerseHit) => router.push({ pathname: '/verse-memory/[ref]', params: { ref: v.ref } }), [router]);

  return (
    <View style={styles.page}>
      <DrillHeader title="Memorized" onBack={() => router.back()} />
      {lookup && (
        <VerseGrid
          verses={verses}
          onOpen={open}
          emptyNote={'Nothing memorized yet. Open a verse and tap “Mark memorized” when you’ve got it.'}
          header={verses.length ? <Text style={verseHeading}>Verses you know by heart.</Text> : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
});
