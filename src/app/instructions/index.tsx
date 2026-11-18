// The Instructions for Today page, opened from its Collections card: how many instructions the person has
// collected, chips to filter by who gave them, the Ten Commandments pack when collected, then the collected
// commands. It shows 25 at first and 25 more as the person scrolls; only the cards on screen are drawn.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountChipsHeader, type ChipOption } from '@/components/common/CountChipsHeader';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { CommandmentsPack } from '@/components/instructions/CommandmentsPack';
import { InstructionCard } from '@/components/instructions/InstructionCard';
import { filterInstructions, useCookieLibrary } from '@/data/queries/cookies';
import { instructions as instructionColors, reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** How many commands are shown at first, and how many more each time the list nears its end. */
const PAGE = 25;

/** The words under the big count. */
const COUNT_LABEL = ['instruction collected', 'instructions collected'] as const;

/** The chip that shows everyone's commands. */
const ALL = 'all';

/** The Instructions list page. */
export default function InstructionsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useCookieLibrary();
  const [giver, setGiver] = useState<string>(ALL);
  // How many commands show for the picked chip; changing it starts again at 25.
  const [paging, setPaging] = useState({ giver: ALL, shown: PAGE });
  const shown = paging.giver === giver ? paging.shown : PAGE;

  const data = library.data;
  const chips = useMemo<ChipOption<string>[]>(() => [{ id: ALL, label: 'All' }, ...(data?.givers ?? []).map((g) => ({ id: g, label: g }))], [data]);
  const matching = useMemo(() => (data ? filterInstructions(data.instructions, giver === ALL ? null : giver) : []), [data, giver]);
  const visible = useMemo(() => matching.slice(0, shown), [matching, shown]);
  const pack = giver === ALL ? data?.commandments : null;
  const count = data ? data.instructions.length + (data.commandments?.lines.length ?? 0) : 0;

  /** Shows 25 more commands when the list nears its end. */
  const showMore = () => {
    if (shown < matching.length) setPaging({ giver, shown: shown + PAGE });
  };

  return (
    <View style={styles.page}>
      <DrillHeader title="Instructions for Today" onBack={() => router.back()} />
      {library.isError && !data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : (
        data && (
          <FlatList
            data={visible}
            keyExtractor={(c) => c.key}
            renderItem={({ item }) => <InstructionCard cookie={item} />}
            ListHeaderComponent={
              <CountChipsHeader count={count} label={COUNT_LABEL} colors={instructionColors} chips={chips} picked={giver} onPick={setGiver}>
                {pack && <CommandmentsPack pack={pack} />}
                {pack && visible.length > 0 && <Text style={styles.heading}>Commands for believers</Text>}
              </CountChipsHeader>
            }
            ListEmptyComponent={pack ? undefined : <Text style={styles.empty}>Instructions you find in lessons show up here.</Text>}
            onEndReached={showMore}
            onEndReachedThreshold={0.6}
            initialNumToRender={8}
            windowSize={7}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  list: { paddingHorizontal: gutter, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  heading: { fontFamily: fonts.black, fontSize: 18, color: instructionColors.accent, marginTop: 8 },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
