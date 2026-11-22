// The call itself, as in the call mockups, on the phone and in the browser: joins with the pass and starts the call
// audio. It shows what the host is showing: the call screen (Papa Dorin's card, everyone's avatars and, for the
// host, the host's tools), a verse, a lesson together, or trivia. Mute, Speaker and Leave are always at the bottom.

import { DisconnectReason, RoomEvent } from 'livekit-client';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { endCall, quietEveryone, type CallPass } from '@/data/callSource';
import { call } from '@/theme/callColors';
import { gutter } from '@/theme/spacing';
import { AnsweringView } from './AnsweringView';
import { AskingView } from './AskingView';
import { CallControls } from './CallControls';
import { CallHeader } from './CallHeader';
import { CallPerson } from './CallPerson';
import { DorinCard } from './DorinCard';
import { HOST_PREFIX } from '@/types/call';
import type { ShowProps } from './showProps';
import { HostTools, type HostTool } from './HostTools';
import { LessonPicker } from './LessonPicker';
import { LessonShow } from './LessonShow';
import { AudioSession, CallAudio, LiveKitRoom, useLocalParticipant, useParticipants, useRoomContext } from './livekit';
import { TriviaShow } from './TriviaShow';
import { useCallShow } from './useCallShow';
import { usePapaDorin } from './usePapaDorin';
import { useTapToTalk } from './useTapToTalk';
import { VersePicker } from './VersePicker';
import { VerseShow } from './VerseShow';

/** Props for the call. */
type CallRoomProps = {
  /** The pass to join it (with the call's name). */
  pass: CallPass;
  /** True to join with the microphone off. */
  muted: boolean;
  /** Runs when this person leaves, and again with `ended` true when the host ended the get-together. */
  onLeave: (ended: boolean) => void;
};

/** The call: joins it and shows what's inside. */
export function CallRoom({ pass, muted, onLeave }: CallRoomProps) {
  // The phone's call audio runs only while this page is open.
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);
  return (
    <LiveKitRoom serverUrl={pass.url} token={pass.token} connect audio={!muted} video={false} onDisconnected={() => onLeave(false)}>
      <CallAudio />
      <CallInside room={pass.room} token={pass.token} onEnded={() => onLeave(true)} />
    </LiveKitRoom>
  );
}

/** Props for what's inside the call. */
type CallInsideProps = {
  /** The call's name. */
  room: string;
  /** This person's pass, which proves to the server that the host is the host ("Quiet, please"). */
  token: string;
  /** Runs when the host ended the get-together (the call closed for everyone). */
  onEnded: () => void;
};

/** What the host is showing, the host's pickers, and the buttons. */
function CallInside({ room, token, onEnded }: CallInsideProps) {
  const lk = useRoomContext();
  // The phone's LiveKit doesn't say why a call closed, so the reason is read here: the host ending it closes the room.
  useEffect(() => {
    const closed = (reason?: DisconnectReason) => {
      if (reason === DisconnectReason.ROOM_DELETED) onEnded();
    };
    lk.on(RoomEvent.Disconnected, closed);
    return () => {
      lk.off(RoomEvent.Disconnected, closed);
    };
  }, [lk, onEnded]);
  const insets = useSafeAreaInsets();
  const { localParticipant } = useLocalParticipant();
  const people = useParticipants().filter((p) => !p.isAgent);
  const dorin = usePapaDorin(room);
  const { show, isHost, setShow } = useCallShow();
  const [picking, setPicking] = useState<HostTool | null>(null);
  const me = localParticipant.identity;
  // The title everyone sees: the host's name, like "Mom's get-together".
  const hostName = people.find((p) => p.identity.startsWith(HOST_PREFIX))?.name;
  const title = hostName ? `${hostName}'s get-together` : 'Get-together';
  /** Host: closes the call for everyone; everyone's call then ends on its own. */
  const onEndCall = () => {
    if (isHost) void endCall(room, token).catch(() => {});
  };
  const shown = { title, isHost, setShow, people, me, dorin, onEndCall };

  return (
    <View style={styles.page}>
      {show.kind === 'lobby' && <Lobby {...shown} room={room} onTool={setPicking} onQuiet={() => quietEveryone(room, token)} />}
      {show.kind === 'verse' && <VerseShow {...shown} show={show} />}
      {show.kind === 'lesson' && <LessonShow {...shown} show={show} />}
      {show.kind === 'trivia' && <TriviaShow {...shown} show={show} />}
      {show.kind !== 'lesson' && (
        <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
          <CallControls />
        </View>
      )}
      {picking === 'verse' && (
        <VersePicker
          onPick={(next) => {
            setPicking(null);
            setShow(next);
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {(picking === 'lesson' || picking === 'trivia') && (
        <LessonPicker
          purpose={picking}
          onPick={(passageId) => {
            setPicking(null);
            setShow(picking === 'lesson' ? { kind: 'lesson', passageId, stop: 1, card: 1, step: 'card' } : { kind: 'trivia', passageId });
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </View>
  );
}

/** Props for the call screen: the shown-screen inputs (without a shown state) and the host's tool taps. */
type LobbyProps = Omit<ShowProps<null>, 'show' | 'setShow'> & {
  /** The call's name, for the Invite link. */
  room: string;
  /** The host tapped one of the tools. */
  onTool: (tool: HostTool) => void;
  /** The host tapped "Quiet, please"; gives back how many were muted. */
  onQuiet: () => Promise<number>;
};

/** The call screen: Papa Dorin's card, everyone's avatars, the host's tools, and the asking and answering screens. */
function Lobby({ title, isHost, people, me, dorin, room, onTool, onQuiet }: LobbyProps) {
  const { localParticipant } = useLocalParticipant();
  const tapMode = useTapToTalk();
  const asking = dorin.status === 'coming' ? dorin.holding : dorin.status === 'listening';
  const answering = dorin.status === 'thinking' || dorin.status === 'talking';
  return (
    <>
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={!dorin.holding}>
        <CallHeader title={title} count={people.length} room={room} />
        <DorinCard
          status={dorin.status}
          note={dorin.note}
          tapMode={tapMode}
          onHold={dorin.startAsking}
          onLetGo={dorin.stopAsking}
          onTap={dorin.holding ? dorin.stopAsking : dorin.startAsking}
          closedLine={dorin.closedLine}
        />
        <View style={styles.grid}>
          {people.map((p) => (
            <CallPerson key={p.identity} person={p} label={p.identity === me ? `${p.name || 'Guest'} (you)` : undefined} tag={p.identity.startsWith(HOST_PREFIX) ? 'HOST' : undefined} />
          ))}
        </View>
        {isHost && <HostTools onPick={onTool} onQuiet={onQuiet} />}
      </ScrollView>
      {asking && (
        <AskingView
          title={title}
          status={dorin.status}
          asker={dorin.holding ? localParticipant : dorin.asker}
          mine={dorin.holding}
          heard={dorin.words.heard}
          others={people.filter((p) => p.identity !== (dorin.holding ? me : dorin.asker?.identity))}
          tapMode={tapMode}
          onDone={dorin.stopAsking}
        />
      )}
      {answering && !asking && (
        <AnsweringView title={title} count={people.length} thinking={dorin.status === 'thinking'} asker={dorin.asker} me={me} words={dorin.words} people={people} dorin={dorin} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: call.page, backgroundImage: `radial-gradient(120% 70% at 50% 0%, ${call.pageGlow[0]} 0%, ${call.pageGlow[1]} 55%, ${call.pageGlow[2]} 100%)` },
  content: { paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 110, gap: 18, width: '100%', maxWidth: 560, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 4 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: gutter, paddingTop: 10, backgroundColor: call.page },
});
