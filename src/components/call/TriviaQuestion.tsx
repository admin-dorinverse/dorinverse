// Trivia's question screen, as in the call mockups (screen 5): the heading with your score, Papa Dorin in the clock
// ring with the seconds left, the question card, the answer tiles (each with its own color, shape and letter, and
// YOUR PICK on yours), and at the bottom how many have answered with their faces, their picks kept hidden. While
// people are still picking it names who it's waiting on; once everyone is in it turns green. The host can show the
// answer now instead of waiting.

import type { Participant } from 'livekit-client';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { call, callTriviaColors } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { TriviaState } from '@/types/call';
import { CallAvatar } from './CallPerson';
import { TriviaClock } from './TriviaClock';
import { AnswerShape } from './TriviaIcons';
import { letterOf, TriviaHeader, TriviaButton } from './TriviaParts';

/** How many small avatars the "have answered" bar shows. */
const AVATARS = 4;

/** Props for the question screen. */
type TriviaQuestionProps = {
  /** The game, while he reads or everyone answers. */
  game: TriviaState;
  /** This person's score. */
  score: number;
  /** The answer this person picked, or null. */
  myPick: number | null;
  /** Picks an answer. */
  onPick: (position: number) => void;
  /** Everyone on the call except Papa Dorin. */
  people: Participant[];
  /** Host only: shows the answer now; null for everyone else. */
  onShowNow: (() => void) | null;
};

/** "Waiting on Sam", "Waiting on Sam and Mia", or "Waiting on Sam, Mia and 2 more". */
function waitingLine(names: string[]): string {
  if (names.length <= 2) return `Waiting on ${names.join(' and ')}`;
  return `Waiting on ${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

/** The question screen. */
export function TriviaQuestion({ game, score, myPick, onPick, people, onShowNow }: TriviaQuestionProps) {
  const open = game.phase === 'answering' && myPick === null;
  // The faces of the people who have answered (what they picked stays hidden).
  const answeredFaces = people.filter((p) => game.answeredBy.includes(p.identity));
  const waiting = people.filter((p) => !game.answeredBy.includes(p.identity)).map((p) => p.name || 'Guest');
  const allIn = game.phase === 'answering' && people.length > 0 && waiting.length === 0;
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <TriviaHeader game={game} score={score} />
      <TriviaClock deadline={game.phase === 'answering' ? game.deadline : null} />
      <View style={styles.card}>
        <Text style={styles.question}>{game.question}</Text>
      </View>
      <View style={styles.tiles}>
        {game.answers.map((a) => (
          <Tile key={a.position} position={a.position} label={a.text} picked={myPick === a.position} enabled={open} onPress={() => onPick(a.position)} />
        ))}
      </View>
      <View style={styles.grow} />
      {game.phase === 'answering' && (
        <Text style={[styles.waiting, allIn && styles.allIn]}>{allIn ? 'Everyone has answered ✓' : waitingLine(waiting)}</Text>
      )}
      <View style={[styles.answered, allIn && styles.answeredAllIn]}>
        <View style={styles.faces}>
          {answeredFaces.slice(0, AVATARS).map((p, i) => (
            <View key={p.identity} style={[styles.faceEdge, i > 0 && styles.overlap]}>
              <CallAvatar name={p.name || 'Guest'} size={30} />
            </View>
          ))}
        </View>
        <Text style={styles.answeredText}>{`${game.answered} of ${people.length} ${game.answered === 1 && people.length === 1 ? 'has' : 'have'} answered`}</Text>
        <Text style={styles.hidden}>Picks stay hidden</Text>
      </View>
      {onShowNow && game.phase === 'answering' && <TriviaButton gold={allIn} height={48} label="Show the answer now" onPress={onShowNow} />}
    </ScrollView>
  );
}

/** Props for one answer tile. */
type TileProps = {
  /** Its position (1 is A). */
  position: number;
  /** The answer's words. */
  label: string;
  /** True when it's this person's pick. */
  picked: boolean;
  /** True while it can still be picked. */
  enabled: boolean;
  /** The tap. */
  onPress: () => void;
};

/** One answer: its color, shape, letter and words, ringed in white with YOUR PICK once picked. */
function Tile({ position, label, picked, enabled, onPress }: TileProps) {
  const i = position - 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${letterOf(position)}, ${label}${picked ? ', your pick' : ''}`}
      accessibilityState={{ disabled: !enabled, selected: picked }}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.tile, { backgroundColor: callTriviaColors.tiles[i], boxShadow: picked ? PICKED_SHADOW : `0 4px 0 ${callTriviaColors.tileEdges[i]}` }]}
    >
      <AnswerShape position={position} color={call.ink} />
      <Text style={styles.letter}>{letterOf(position)}</Text>
      <Text style={styles.label}>{label}</Text>
      {picked && <Text style={styles.yourPick}>YOUR PICK</Text>}
    </Pressable>
  );
}

/** The white ring, white edge and gold glow around your pick. */
const PICKED_SHADOW = `0 0 0 4px ${callTriviaColors.pickRing}, 0 4px 0 4px ${callTriviaColors.pickRing}, 0 0 22px 6px ${callTriviaColors.pickGlow}`;

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: 8, paddingBottom: 12, gap: 16 },
  card: { borderRadius: 22, borderWidth: 1, borderColor: callTriviaColors.cardEdge, backgroundColor: callTriviaColors.card, paddingVertical: 18, paddingHorizontal: 16 },
  question: { fontFamily: fonts.black, fontSize: 21, lineHeight: 28, color: text.onDark },
  tiles: { gap: 10, paddingHorizontal: 4 },
  tile: { minHeight: 62, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  letter: { width: 18, fontFamily: fonts.black, fontSize: 15, color: call.ink },
  label: { flex: 1, fontFamily: fonts.extraBold, fontSize: 18, lineHeight: 23, color: call.ink },
  yourPick: { borderRadius: 999, overflow: 'hidden', backgroundColor: call.ink, color: text.onDark, paddingVertical: 4, paddingHorizontal: 10, fontFamily: fonts.black, fontSize: 11.5 },
  grow: { flex: 1 },
  answered: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: call.glassFillSoft, paddingVertical: 10, paddingHorizontal: 14 },
  faces: { flexDirection: 'row' },
  faceEdge: { borderRadius: 17, borderWidth: 2, borderColor: call.page },
  overlap: { marginLeft: -7 },
  answeredText: { flex: 1, fontFamily: fonts.extraBold, fontSize: 13.5, color: text.onDark },
  hidden: { fontFamily: fonts.bold, fontSize: 12, color: callTriviaColors.soft },
  waiting: { fontFamily: fonts.extraBold, fontSize: 13.5, color: callTriviaColors.soft, textAlign: 'center' },
  allIn: { color: callTriviaColors.right },
  answeredAllIn: { borderWidth: 1.5, borderColor: callTriviaColors.right, backgroundColor: callTriviaColors.rightFill },
});
