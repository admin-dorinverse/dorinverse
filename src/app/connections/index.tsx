// Character Connections, opened from its Collections card: the owner's Bible Character Web, rebuilt. Everyone sits at
// their spot as a cream card, joined by colored lines for each kind of link; people not collected yet are greyed out
// and can't be opened. Drag and pinch to look around; tap a person or a line to open their page.

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinkFilterMenu, filterLabel } from '@/components/connections/LinkFilterMenu';
import { setShownLinks, useShownLinks, useWeb } from '@/components/connections/useWeb';
import { WebBar } from '@/components/connections/WebBar';
import { WebCanvas, type WebCanvasControls } from '@/components/connections/WebCanvas';
import type { WebLink, WebNode } from '@/components/connections/webModel';
import { ZoomButtons } from '@/components/connections/ZoomButtons';
import { LoadState } from '@/components/common/LoadState';
import { webPage } from '@/theme/characterWebColors';

/** Where the filter list's top sits, under the bar. */
const MENU_TOP_GAP = 6;

/** The Character Connections web page. */
export default function ConnectionsPage() {
  const router = useRouter();
  const { web, failed, retry } = useWeb();
  const shown = useShownLinks();
  const canvas = useRef<WebCanvasControls>(null);
  const [filtering, setFiltering] = useState(false);
  const [barHeight, setBarHeight] = useState(0);

  /** Opens a person's page. People not collected yet can't be opened. */
  const openPerson = (node: WebNode) => {
    if (node.character) router.push({ pathname: '/connections/[lookup]', params: { lookup: node.lookup } });
  };
  /** Opens a link's page, only when both people are collected. */
  const openLink = (l: WebLink) => {
    if (l.why !== undefined) router.push({ pathname: '/connections/link', params: { index: String(l.index) } });
  };

  return (
    <View style={styles.page}>
      <View onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)} style={styles.barSlot}>
        <WebBar nodes={web?.nodes ?? []} filterLabel={filterLabel(shown)} onBack={() => router.back()} onPick={openPerson} onFilter={() => setFiltering(true)} />
      </View>
      {failed ? (
        <LoadState failed onRetry={retry} />
      ) : (
        web && (
          <View style={styles.stage}>
            <WebCanvas ref={canvas} web={web} onPerson={openPerson} onLink={openLink} />
            <ZoomButtons onZoom={(f) => canvas.current?.zoom(f)} onFit={() => canvas.current?.fit()} />
          </View>
        )
      )}
      {filtering && web && (
        <LinkFilterMenu top={barHeight + MENU_TOP_GAP} shown={shown} counts={web.counts} total={web.total} onChange={setShownLinks} onClose={() => setFiltering(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: webPage.background },
  barSlot: { zIndex: 5 },
  stage: { flex: 1 },
});
