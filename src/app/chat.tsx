// The chat page, as in the Constellations design: the character's greeting, starter questions, their and the
// baker's bubbles, bouncing dots until their first words arrive, the reply filling in as it is written, and
// "New chat" to start over. It is Chat with Papa Dorin unless
// the link names a guest ("/chat?with=peter"). Test version: answers come from the owner's PC (see
// src/data/chatSource.ts); the chat stays on the phone and goes away when the page closes.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatForm } from '@/components/chat/ChatForm';
import { DrillHeader } from '@/components/common/DrillHeader';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { chatCharacter } from '@/data/chatCharacters';
import { askCharacter, type ChatMessage } from '@/data/chatSource';
import { sampleBaker } from '@/data/sample/baker';
import { chat } from '@/theme/chatColors';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** How often the reply on its way is redrawn while it streams in (20 times a second). */
const STREAM_REDRAW_MS = 50;

/** The thinking dots move slowly; 20 ticks a second is plenty. */
function calm(): boolean {
  'worklet';
  return false;
}

/** A shown message: a real one, or the character's reply on its way (null while no words have come yet). */
type Shown = { role: ChatMessage['role']; content: string | null };

/** The chat page. */
export default function ChatPage() {
  const router = useRouter();
  const who = chatCharacter(useLocalSearchParams<{ with?: string }>().with);
  const clock = useAmbientClock(calm);
  const list = useRef<FlatList<Shown>>(null);
  const asking = useRef<AbortController | null>(null);
  // The chat's id on the helper, so the character remembers it; none until the first reply.
  const session = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: who.greeting }]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  // The reply on its way: what has come so far, redrawn at most 20 times a second.
  const [partial, setPartial] = useState('');
  const latest = useRef('');
  const redraw = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown: Shown[] = busy ? [...messages, { role: 'assistant', content: partial || null }] : messages;

  /** Takes the reply so far and redraws it soon, not on every little piece. */
  const onText = useCallback((soFar: string) => {
    latest.current = soFar;
    redraw.current ??= setTimeout(() => {
      redraw.current = null;
      setPartial(latest.current);
    }, STREAM_REDRAW_MS);
  }, []);

  /** Clears the reply on its way. */
  const clearPartial = () => {
    if (redraw.current) clearTimeout(redraw.current);
    redraw.current = null;
    latest.current = '';
    setPartial('');
  };

  /** Sends a question and waits for the reply. */
  const send = useCallback(
    async (question: string) => {
      const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
      setMessages(next);
      setNote('');
      setBusy(true);
      const controller = new AbortController();
      asking.current = controller;
      try {
        const answer = await askCharacter(who, question, session.current, onText, controller.signal);
        session.current = answer.sessionId;
        setMessages((m) => [...m, { role: 'assistant', content: answer.reply }]);
        playSound('word');
      } catch (e) {
        if (!controller.signal.aborted) setNote(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        if (asking.current === controller) {
          asking.current = null;
          clearPartial();
          setBusy(false);
        }
      }
    },
    [messages, who, onText],
  );

  /** Stops the answer on its way. Whatever had already come in stays in the chat. */
  const stop = () => {
    asking.current?.abort();
    asking.current = null;
    const kept = latest.current.trim();
    if (kept) setMessages((m) => [...m, { role: 'assistant', content: kept }]);
    clearPartial();
    setBusy(false);
  };

  /** Starts a fresh chat with just the greeting. */
  const fresh = () => {
    playSound('tap');
    stop();
    setMessages([{ role: 'assistant', content: who.greeting }]);
    session.current = null;
    setNote('');
  };

  return (
    <View style={styles.page}>
      <DrillHeader
        title={who.name}
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
          renderItem={({ item }) => <ChatBubble mine={item.role === 'user'} who={who} text={item.content} initial={sampleBaker.name.charAt(0)} clock={clock} />}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.log}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            <>
              {messages.length === 1 && !busy && (
                <View style={styles.starters}>
                  {who.starters.map((s) => (
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
        <ChatForm name={who.name} busy={busy} onSend={(q) => void send(q)} onStop={stop} />
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
