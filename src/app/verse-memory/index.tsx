// The Memorization Tool, opened from the Verse Memory card on Bible Crew: a row to the verses already memorized,
// then every verse the person has collected, as cards. Tapping one opens it to practice. The 🔍 button searches.
// Everything is already on the phone.

import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DrillHeader, RoundButton } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { MemorizedRow } from '@/components/verse-memory/MemorizedRow';
import { VerseGrid, verseHeading } from '@/components/verse-memory/VerseGrid';
import type { VerseHit } from '@/data/bibleSearch';
import { useBibleLibrary, useSearchIndex } from '@/data/queries/bible';
import { reader } from '@/theme/colors';

/** The Memorization Tool's first page. */
export default function VerseMemoryPage() {
  const router = useRouter();
  const library = useBibleLibrary();
  const verses = useSearchIndex();

  /** Opens a verse to practice. */
  const open = useCallback((v: VerseHit) => router.push({ pathname: '/verse-memory/[ref]', params: { ref: v.ref } }), [router]);

  return (
    <View style={styles.page}>
      <DrillHeader
        title="Memorization Tool"
        onBack={() => router.back()}
        right={
          <RoundButton label="Search verses" onPress={() => router.push('/verse-memory/search')}>
            <Text>🔍</Text>
          </RoundButton>
        }
      />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : (
        verses && (
          <VerseGrid
            verses={verses}
            onOpen={open}
            emptyNote="Verses you reveal in lessons show up here, ready to learn by heart."
            header={
              <View>
                <MemorizedRow onPress={() => router.push('/verse-memory/memorized')} />
                <Text style={verseHeading}>Choose a verse you have collected</Text>
              </View>
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
});
