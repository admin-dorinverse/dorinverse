// Chat with Papa Dorin, as in the Constellations design: his greeting, starter questions, his and the baker's bubbles,
// bouncing dots while he thinks, and "New chat" to start over. Test version: answers come from the owner's PC (see
// src/data/chatSource.ts); the chat stays on the phone and goes away when the page closes.

import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatForm } from '@/components/chat/ChatForm';
import { DrillHeader } from '@/components/common/DrillHeader';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { askPapaDorin, type ChatMessage } from '@/data/chatSource';
import { sampleBaker } from '@/data/sample/baker';
import { chat } from '@/theme/chatColors';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Papa Dorin's greeting, from the design. */
const GREETING =
  'Well, look who walked into my bakery! Pull up a stool, baker. Ask me anything about the Bible: a person, a story, a verse that has you scratching your head. I will tell you what Scripture says, with the reference. Mm-hm.';

/** The starter questions under the greeting, from the design. */
const STARTERS = ['Why did Jonah run the other way?', 'Who was Deborah?', 'What is the Marriage Supper of the Lamb?', 'Tell me about David and Goliath.'];

/** The thinking dots move slowly; 20 ticks a second is plenty. */
function calm(): boolean {
  'worklet';
  return false;
}

/** A shown message: a real one, or Papa Dorin still thinking (no text yet). */
type Shown = { role: ChatMessage['role']; content: string | null };

/** The chat page. */
export default function ChatPage() {
  const router = useRouter();
  const clock = useAmbientClock(calm);
  const list = useRef<FlatList<Shown>>(null);
  const asking = useRef<AbortController | null>(null);
  // The chat's id on the helper, so Papa Dorin remembers it; none until the first reply.
  const session = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: GREETING }]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const shown: Shown[] = busy ? [...messages, { role: 'assistant', content: null }] : messages;

  /** Sends a question and waits for Papa Dorin's reply. */
  const send = useCallback(
    async (question: string) => {
      const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
      setMessages(next);
      setNote('');
      setBusy(true);
      const controller = new AbortController();
      asking.current = controller;
      try {
        const answer = await askPapaDorin(question, session.current, controller.signal);
        session.current = answer.sessionId;
        setMessages((m) => [...m, { role: 'assistant', content: answer.reply }]);
        playSound('word');
      } catch (e) {
        if (!controller.signal.aborted) setNote(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        if (asking.current === controller) asking.current = null;
        setBusy(false);
      }
    },
    [messages],
  );

  /** Stops the answer on its way. */
  const stop = () => {
    asking.current?.abort();
    asking.current = null;
    setBusy(false);
  };

  /** Starts a fresh chat with just his greeting. */
  const fresh = () => {
    playSound('tap');
    stop();
    setMessages([{ role: 'assistant', content: GREETING }]);
    session.current = null;
    setNote('');
  };

  return (
    <View style={styles.page}>
      <DrillHeader
        title="Papa Dorin"
        onBack={() => {
          stop();
          router.back();
        }}
        right={
          <Pressable accessibilityRole="button" onPress={fresh} style={styles.newChat}>
            <Text style={styles.newChatText}>New chat</Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={shown}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <ChatBubble mine={item.role === 'user'} text={item.content} initial={sampleBaker.name.charAt(0)} clock={clock} />}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.log}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            <>
              {messages.length === 1 && !busy && (
                <View style={styles.starters}>
                  {STARTERS.map((s) => (
                    <Pressable key={s} accessibilityRole="button" onPress={() => void send(s)} style={styles.starter}>
                      <Text style={styles.starterText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {note !== '' && <Text style={styles.note}>{note}</Text>}
            </>
          }
        />
        <ChatForm busy={busy} onSend={(q) => void send(q)} onStop={stop} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  body: { flex: 1 },
  log: { gap: 12, paddingVertical: 12, paddingHorizontal: 14, width: '100%', maxWidth: 620, alignSelf: 'center' },
  newChat: { borderRadius: 999, borderWidth: 1, borderColor: chat.newEdge, backgroundColor: chat.newFill, paddingVertical: 9, paddingHorizontal: 13 },
  newChatText: { fontFamily: fonts.black, fontSize: 13, color: text.onDark },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 35, marginTop: 12 },
  starter: { borderRadius: 999, borderWidth: 1, borderColor: chat.starterEdge, backgroundColor: chat.starterFill, paddingVertical: 9, paddingHorizontal: 13 },
  starterText: { fontFamily: fonts.extraBold, fontSize: 13.5, color: text.onDark },
  note: { alignSelf: 'center', maxWidth: '86%', textAlign: 'center', marginTop: 12, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: chat.noteFill, fontFamily: fonts.extraBold, fontSize: 13, color: chat.noteInk },
});
