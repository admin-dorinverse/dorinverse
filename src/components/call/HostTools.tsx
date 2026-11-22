// The host's tools on the call screen, as in the call mockups: "HOST TOOLS" and three buttons, Show a verse, Do a
// lesson and Trivia, each in its own color, and under them "Quiet, please" to mute everyone else at once. Only the
// host sees them.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { playSound } from '@/components/common/sounds';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { QuietButton } from './QuietButton';

/** Which tool the host tapped. */
export type HostTool = 'verse' | 'lesson' | 'trivia';

/** Props for the host's tools. */
type HostToolsProps = {
  /** Opens that tool's picker. */
  onPick: (tool: HostTool) => void;
  /** Mutes everyone else; gives back how many were muted. */
  onQuiet: () => Promise<number>;
};

/** Each tool's label and colors (from the mockups: gold, green, pink). */
const TOOLS: { tool: HostTool; label: string; ink: string; fill: string; edge: string }[] = [
  { tool: 'verse', label: 'Show a verse', ink: call.toolVerse, fill: call.toolVerseFill, edge: call.toolVerseEdge },
  { tool: 'lesson', label: 'Do a lesson', ink: call.toolLesson, fill: call.toolLessonFill, edge: call.toolLessonEdge },
  { tool: 'trivia', label: 'Trivia', ink: call.toolTrivia, fill: call.toolTriviaFill, edge: call.toolTriviaEdge },
];

/** A tool's small line picture: an open book, a lesson book, or a question mark in a circle. */
function ToolIcon({ tool, color }: { tool: HostTool; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {tool === 'verse' && (
        <>
          <Path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5Z" />
          <Path d="M12 6.5v13" />
        </>
      )}
      {tool === 'lesson' && (
        <>
          <Path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2Z" />
          <Path d="M8 7h6M8 11h6" />
        </>
      )}
      {tool === 'trivia' && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5" />
          <Path d="M12 16.5v.5" />
        </>
      )}
    </Svg>
  );
}

/** The host's tools. */
export function HostTools({ onPick, onQuiet }: HostToolsProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>HOST TOOLS</Text>
      <View style={styles.row}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.tool}
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              onPick(t.tool);
            }}
            style={[styles.tool, { backgroundColor: t.fill, borderColor: t.edge }]}
          >
            <ToolIcon tool={t.tool} color={t.ink} />
            <Text style={styles.label}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <QuietButton onQuiet={onQuiet} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: { fontFamily: fonts.extraBold, fontSize: 11.5, letterSpacing: 1.2, color: text.onDarkSoft },
  row: { flexDirection: 'row', gap: 8 },
  tool: { flex: 1, height: 64, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontFamily: fonts.extraBold, fontSize: 13.5, color: text.onDark },
});
