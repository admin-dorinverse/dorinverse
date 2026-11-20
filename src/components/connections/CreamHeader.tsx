// The top of a person's or a link's page, as in the owner's artifact: a back arrow and the title, on cream with a
// thin line under it.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { webPage } from '@/theme/characterWebColors';
import { fonts, readingFont } from '@/theme/text';

/** Props for the header. */
type CreamHeaderProps = {
  /** The page title, like a person's name or "Aaron & Moses". */
  title: string;
  /** Goes back. */
  onBack: () => void;
};

/** The cream page header. */
export function CreamHeader({ title, onBack }: CreamHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => {
          playSound('tap');
          onBack();
        }}
        style={styles.back}
      >
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 4, paddingRight: 12, paddingBottom: 6, backgroundColor: webPage.background, borderBottomWidth: 1, borderBottomColor: webPage.line },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontFamily: fonts.black, fontSize: 34, lineHeight: 38, color: webPage.ink },
  title: { flex: 1, fontFamily: readingFont, fontSize: 18, color: webPage.ink },
});
