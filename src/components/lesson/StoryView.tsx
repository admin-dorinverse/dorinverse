// A story card in the player: Papa Dorin tells the next piece of the passage in his speech bubble, with its verse
// reference and its explained words and sayings to tap. Each cookie its verses tell that the person has not collected
// yet shows as its name in the words, glowing gold with a sparkle (or, when its name isn't in the words, as a sparkle
// beside the verse reference). Tapping it opens a quick look; collecting it sends it to Collections, and its name
// turns back into plain words.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { markText, targetId } from '@/data/queries/lessons';
import { collectCookie, useProgress } from '@/data/queries/progress';
import { cream } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import type { LessonCookie, StoryCard } from '@/types/lesson';
import { CookiePicture, prefetchCookiePhotos } from './CookiePicture';
import { CookieWord } from './CookieWord';
import { CreamSheet } from './CreamSheet';
import { DorinSpeak } from './DorinSpeak';
import { FlyCookie } from './FlyCookie';
import { MarkedText, type MarkTap } from './MarkedText';
import { WordSheet } from './WordSheet';

/** Props for a story card. */
type StoryViewProps = {
  /** The card. */
  card: StoryCard;
  /** Where the lesson starts, like "Judges 3", saved with what is collected. */
  foundIn: string;
  /** Papa Dorin's height. */
  dorinHeight: number;
};

/** The sparkles never need 60 ticks a second. */
function neverBusy(): boolean {
  'worklet';
  return false;
}

/** The name a cookie is found by in the words: a character's or place's name. Other cookies have none. */
function nameOf(k: LessonCookie): string | null {
  return k.target.kind === 'cookie' ? null : k.title;
}

/** A story card. */
export function StoryView({ card, foundIn, dorinHeight }: StoryViewProps) {
  const collected = useProgress().data?.collected;
  const [tap, setTap] = useState<MarkTap | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<LessonCookie | null>(null);
  const [justGot, setJustGot] = useState<ReadonlySet<string>>(new Set());
  const [flying, setFlying] = useState(0);
  // The sparkles' timer runs only while the card has a cookie to collect.
  const hasCookies = useSharedValue(false);
  const clock = useAmbientClock(neverBusy, () => {
    'worklet';
    return hasCookies.get();
  });

  // The cookies still to collect, the names to find for them, and which of them aren't named in the words.
  const pending = useMemo(() => card.cookies.filter((k) => !justGot.has(k.key) && !collected?.has(targetId(k.target))), [card.cookies, justGot, collected]);
  const names = useMemo(() => pending.map(nameOf), [pending]);
  const loose = useMemo(() => {
    const found = new Set(markText(card.text, card.words, card.idioms, names).flatMap((p) => (p.cookie !== undefined ? [p.cookie] : [])));
    return pending.filter((_, i) => !found.has(i));
  }, [card.text, card.words, card.idioms, names, pending]);

  useEffect(() => hasCookies.set(pending.length > 0), [hasCookies, pending.length]);
  // Place photos are fetched as soon as the card shows, so a quick look opens with its photo there.
  useEffect(() => prefetchCookiePhotos(card.cookies), [card.cookies]);

  /** Opens a word's or saying's meaning. */
  const openTap = (t: MarkTap) => {
    playSound('word');
    setSeen((s) => new Set([...s, `${t.kind}:${t.index}`]));
    setTap(t);
  };
  /** Opens a cookie's quick look. */
  const openCookie = (k: LessonCookie) => {
    playSound('tap');
    setOpened(k);
  };
  const landed = useCallback(() => setFlying((n) => n - 1), []);

  return (
    <View>
      <DorinSpeak length={card.text.length} height={dorinHeight}>
        <MarkedText
          text={card.text}
          words={card.words}
          idioms={card.idioms}
          seen={seen}
          onTap={openTap}
          style={styles.words}
          cookieNames={names}
          onCookie={(i) => openCookie(pending[i])}
          clock={clock}
        />
        <View style={styles.citeRow}>
          <Text style={styles.cite}>{card.verses}</Text>
          {loose.map((k) => (
            <CookieWord key={k.key} text={k.label} style={styles.looseWord} clock={clock} onPress={() => openCookie(k)} />
          ))}
        </View>
      </DorinSpeak>
      {Array.from({ length: flying }, (_, i) => (
        <FlyCookie key={i} onDone={landed} />
      ))}
      <WordSheet card={card} tap={tap} onClose={() => setTap(null)} />
      <CreamSheet
        open={!!opened}
        onClose={() => setOpened(null)}
        kind={opened?.label ?? ''}
        title={opened ? (opened.tag ? `${opened.title}, ${opened.tag}` : opened.title) : ''}
        body={opened ? (opened.summary ?? opened.detail) : null}
        note={opened?.reference ?? null}
        picture={opened ? <CookiePicture cookie={opened} clock={clock} /> : undefined}
        button="Collect"
        onButton={() => {
          if (!opened) return;
          playSound('collect');
          setJustGot((s) => new Set([...s, opened.key]));
          setFlying((n) => n + 1);
          void collectCookie(opened, foundIn);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  words: { fontFamily: fonts.body, fontSize: 17.5, lineHeight: 27, color: cream.ink },
  citeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  cite: { fontFamily: fonts.extraBold, fontSize: 13, color: cream.cite },
  looseWord: { fontFamily: fonts.extraBold, fontSize: 13, lineHeight: 20 },
});
