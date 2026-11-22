// The Group Voice Call page (test version), opened from the Bible Crew tab to start a new call (the starter is its
// host), or from an invite link (/call?room=call-…) to join one. It shows the joining screen, then the call.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CallJoin } from "@/components/call/CallJoin";
import { CallRoom } from "@/components/call/CallRoom";
import { DrillHeader } from "@/components/common/DrillHeader";
import { joinCall, startCall, type CallPass } from "@/data/callSource";
import { call } from "@/theme/callColors";

/** The line under the title on the joining screen. */
const SUBTITLE = "Talk together, and bring Papa Dorin in anytime";

/** The call page. */
export default function CallPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The call an invite link names; none means this person is starting a new call.
  const invited = useLocalSearchParams<{ room?: string }>().room ?? null;
  const [joined, setJoined] = useState<{
    pass: CallPass;
    muted: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  /** Starts a new call or joins the invited one, with the typed name. */
  const join = async (name: string, muted: boolean) => {
    setBusy(true);
    setNote("");
    try {
      setJoined({
        pass: invited ? await joinCall(invited, name) : await startCall(name),
        muted,
      });
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (joined) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
        <CallRoom
          pass={joined.pass}
          muted={joined.muted}
          onLeave={(ended) => {
            setJoined(null);
            if (ended) setNote("The get-together has ended.");
          }}
        />
      </View>
    );
  }
  return (
    <View style={styles.page}>
      <DrillHeader
        title="Group Voice Call"
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
      <CallJoin
        room={invited}
        title={invited ? "A get-together" : "Start a get-together"}
        subtitle={SUBTITLE}
        busy={busy}
        note={note}
        onJoin={(n, m) => void join(n, m)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: call.page },
});
