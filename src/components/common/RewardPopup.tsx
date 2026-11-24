// The reward pop-up, like Duolingo's: a newly earned badge's medal grows in over a dark veil, with its name and a
// Continue button. RewardHost shows one at a time, only once an activity is over.

import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, ZoomIn } from 'react-native-reanimated';
import { AuthButton } from '@/components/common/AuthButton';
import { BadgeMedal } from '@/components/common/BadgeMedal';
import { playSound } from '@/components/common/sounds';
import type { Reward } from '@/data/queries/rewards';
import { badgeColors, badgeSizes } from '@/theme/badgeColors';
import { navy, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** How the medal comes in: one springy grow. */
const MEDAL_IN = ZoomIn.duration(600).easing(Easing.out(Easing.back(1.6)));

/** How the words and button come in, just after the medal. */
const WORDS_IN = FadeIn.delay(250).duration(300);

/** Props for the reward pop-up. */
type RewardPopupProps = {
  /** The reward shown. */
  reward: Reward;
  /** Moves on to the next reward, or closes when there are none. */
  onContinue: () => void;
};

/** One reward, full screen. */
export function RewardPopup({ reward, onContinue }: RewardPopupProps) {
  const { badge } = reward;
  useEffect(() => playSound('reveal'), [badge.id]);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onContinue} statusBarTranslucent>
      <View style={styles.veil}>
        <View style={styles.middle}>
          <Animated.View key={badge.id} entering={MEDAL_IN}>
            <BadgeMedal art={badge.art} earned size={badgeSizes.rewardMedal} artSize={badgeSizes.rewardArt} />
          </Animated.View>
          <Animated.View key={`${badge.id}-words`} entering={WORDS_IN} style={styles.words}>
            <Text style={styles.tag}>NEW BADGE</Text>
            <Text style={styles.name}>{badge.name}</Text>
          </Animated.View>
        </View>
        <Animated.View entering={WORDS_IN} style={styles.button}>
          <AuthButton label="Continue" onPress={onContinue} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: { flex: 1, backgroundColor: badgeColors.popupDim, paddingHorizontal: 28, paddingBottom: 48 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  words: { alignItems: 'center', gap: 10 },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: badgeColors.earnedRim,
    fontFamily: fonts.black,
    fontSize: 12,
    letterSpacing: 1,
    color: navy,
  },
  name: { fontFamily: fonts.black, fontSize: 30, color: text.onDark, textAlign: 'center' },
  button: { width: '100%', maxWidth: 420, alignSelf: 'center' },
});
