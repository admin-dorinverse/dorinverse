// The middle of a badge's page, like Duolingo's: the big medal with its level's number, the day it was earned, and
// "You earned Baker by finishing 13 lessons!" A badge not earned yet shows faded, with what earning it takes.

import { StyleSheet, Text, View } from 'react-native';
import { BadgeMedal } from '@/components/common/BadgeMedal';
import { badgeDeed, medalMark } from '@/data/badgeList';
import { badgeColors, badgeSizes } from '@/theme/badgeColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { ShownBadge } from '@/types/badges';

/** Props for the badge's page middle. */
type BadgeDetailProps = {
  /** The badge, with the level reached. */
  badge: ShownBadge;
  /** The day its level was reached, like "OCT 16, 2026", or null when not known or not earned. */
  reachedOn: string | null;
};

/** The medal, the date and the sentence. */
export function BadgeDetail({ badge, reachedOn }: BadgeDetailProps) {
  const earned = badge.level > 0;
  const deed = badgeDeed(badge, badge.level);
  return (
    <View style={styles.middle}>
      <BadgeMedal art={badge.art} earned={earned} mark={medalMark(badge, badge.level)} size={badgeSizes.pageMedal} artSize={badgeSizes.pageArt} />
      {earned && reachedOn && <Text style={styles.date}>{reachedOn}</Text>}
      <Text style={styles.sentence}>
        {earned ? 'You earned ' : 'Earn '}
        <Text style={styles.name}>{badge.name}</Text>
        {` by ${deed}${earned ? '!' : '.'}`}
      </Text>
    </View>
  );
}

/** The words a shared badge sends, like "I earned the Baker badge on Dorinverse by finishing 13 lessons!" */
export function badgeShareWords(badge: ShownBadge): string {
  return `I earned the ${badge.name} badge on Dorinverse by ${badgeDeed(badge, badge.level)}!`;
}

const styles = StyleSheet.create({
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 28 },
  date: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: badgeColors.dateFill,
    fontFamily: fonts.black,
    fontSize: 14,
    letterSpacing: 0.6,
    color: badgeColors.earnedRim,
  },
  sentence: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 30, color: text.onDarkSoft, textAlign: 'center' },
  name: { fontFamily: fonts.black, color: text.onDark },
});
