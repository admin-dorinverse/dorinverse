// The bottom of a chat, as in the Constellations design: a round text box ("Ask Papa Dorin…", up to 600 letters,
// growing to a few lines) and a gold send button. While the answer is coming, the button turns red and stops it.

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { playSound } from '@/components/common/sounds';
import { chat } from '@/theme/chatColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** The longest a question may be, as in the design. */
const MAX_CHARS = 600;

/** Props for the form. */
type ChatFormProps = {
  /** Who the chat is with, for the text box's hint. */
  name: string;
  /** True while the answer is coming. */
  busy: boolean;
  /** Sends a question. */
  onSend: (text: string) => void;
  /** Stops the answer on its way. */
  onStop: () => void;
};

/** The text box and the send button. */
export function ChatForm({ name, busy, onSend, onStop }: ChatFormProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const ready = text.trim().length > 0;

  /** Sends the question, or stops the answer while he's busy. */
  const press = () => {
    playSound('tap');
    if (busy) return onStop();
    if (!ready) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={[styles.form, { paddingBottom: insets.bottom + 10 }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={`Ask ${name}…`}
        placeholderTextColor={chat.inputHint}
        maxLength={MAX_CHARS}
        multiline
        accessibilityLabel={`Message ${name}`}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? 'Stop' : 'Send'}
        disabled={!busy && !ready}
        onPress={press}
        style={[styles.send, busy && styles.stop, !busy && !ready && styles.off]}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24">
          {busy ? (
            <Rect x={7} y={7} width={10} height={10} rx={2} fill={chat.sendInk} />
          ) : (
            <Path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke={chat.sendInk} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, paddingHorizontal: 12, width: '100%', maxWidth: 620, alignSelf: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    maxHeight: 132,
    borderWidth: 1.5,
    borderColor: chat.inputEdge,
    borderRadius: 20,
    backgroundColor: chat.inputFill,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
    color: text.onDark,
  },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: chat.send, boxShadow: `0 0 14px ${chat.sendGlow}` },
  stop: { backgroundColor: chat.stop },
  off: { opacity: 0.4 },
});
