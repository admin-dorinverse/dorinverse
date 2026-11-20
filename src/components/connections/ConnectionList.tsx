// The list under a person's small web, as in the owner's artifact: one row per link, with the line's sample, the other
// person's name, the kind of link, and an arrow. Rows to people not collected yet are pale and can't be opened.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { LINK_LABELS } from '@/data/queries/characters';
import { webPage } from '@/theme/characterWebColors';
import { fonts } from '@/theme/text';
import { LinkSwatch } from './LinkSwatch';
import { fullName } from './WebBar';
import type { WebLink, WebNode } from './webModel';

/** Props for the list. */
type ConnectionListProps = {
  /** The person whose links these are. */
  node: WebNode;
  /** Their links, in order. */
  links: readonly WebLink[];
  /** Opens a link. */
  onLink: (link: WebLink) => void;
};

/** The connections list. */
export function ConnectionList({ node, links, onLink }: ConnectionListProps) {
  return (
    <View style={styles.list}>
      {links.map((l, i) => {
        const other = l.a === node ? l.b : l.a;
        const open = l.why !== undefined;
        return (
          <Pressable
            key={l.index}
            accessibilityRole="button"
            accessibilityState={{ disabled: !open }}
            disabled={!open}
            onPress={() => {
              playSound('tap');
              onLink(l);
            }}
            style={[styles.row, i === links.length - 1 && styles.last]}
          >
            <LinkSwatch type={l.type} width={30} height={12} />
            <View style={styles.who}>
              <Text style={[styles.name, !open && styles.locked]}>{fullName(other)}</Text>
              <Text style={styles.kind}>{open ? LINK_LABELS[l.type] : `${LINK_LABELS[l.type]} · Not met yet`}</Text>
            </View>
            {open && <Text style={styles.arrow}>›</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderColor: webPage.line, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: webPage.line },
  last: { borderBottomWidth: 0 },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: webPage.ink },
  locked: { color: webPage.lockedInk },
  kind: { fontFamily: fonts.body, fontSize: 13, color: webPage.muted },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: webPage.muted },
});
