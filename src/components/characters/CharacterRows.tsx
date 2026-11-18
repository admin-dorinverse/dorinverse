// The rows under a character's page top: section headings, key moments, relationships with other collected
// characters, the "more to discover" line, and places (which open a collected place's page). Each is one small
// row, so the page list can draw only the rows on screen.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import type { LinkRow } from '@/data/queries/characters';
import { characters, reader, text } from '@/theme/colors';
import { fonts, textStyles } from '@/theme/text';
import type { CharacterLookup, CharacterPlace, KeyMoment } from '@/types/character';
import type { PlaceLookup } from '@/types/place';
import { CharacterBadge } from './CharacterBadge';

/** Props for a section heading. */
type SectionHeadingProps = {
  /** The heading, in capitals, like "KEY MOMENTS". */
  title: string;
};

/** A small heading above a section. */
export function SectionHeading({ title }: SectionHeadingProps) {
  return <Text style={styles.heading}>{title}</Text>;
}

/** Props for a key moment. */
type MomentRowProps = {
  /** The moment shown. */
  moment: KeyMoment;
};

/** One key moment: a sparkle, its title, what happened, and where to read it. */
export const MomentRow = memo(function MomentRow({ moment }: MomentRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>✨</Text>
      <View style={styles.grow}>
        <Text style={styles.title}>{moment.title}</Text>
        <Text style={styles.body}>{moment.description}</Text>
        <Text style={styles.passage}>{moment.place ? `${moment.passage} · ${moment.place}` : moment.passage}</Text>
      </View>
    </View>
  );
});

/** Props for a relationship. */
type RelationRowProps = {
  /** The other character, the kinds of link and why. */
  link: LinkRow;
  /** Opens the other character's page. */
  onOpen: (lookup: CharacterLookup) => void;
};

/** One relationship with another collected character. Tapping opens their page. */
export const RelationRow = memo(function RelationRow({ link, onOpen }: RelationRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${link.other.name}`}
      onPress={() => {
        playSound('tap');
        onOpen(link.other.lookup);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <CharacterBadge name={link.other.name} size={36} />
      <View style={styles.grow}>
        <Text style={styles.title}>
          {link.other.name} <Text style={styles.label}>{link.labels.join(' · ')}</Text>
        </Text>
        {link.whys.map((why) => (
          <Text key={why} style={styles.body}>
            {why}
          </Text>
        ))}
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
});

/** Props for the "more to discover" line. */
type DiscoverLineProps = {
  /** How many linked characters are not collected yet. */
  count: number;
};

/** A line saying how many more connections are waiting in lessons not done yet. No names. */
export function DiscoverLine({ count }: DiscoverLineProps) {
  return <Text style={styles.discover}>{count === 1 ? '1 more connection to discover' : `${count} more connections to discover`}</Text>;
}

/** Props for a place. */
type PlaceRowProps = {
  /** The place shown. */
  place: CharacterPlace;
  /** The place's lookup when the person has collected it, or undefined when not (then the row is plain text). */
  placeLookup?: PlaceLookup;
  /** Opens a collected place's page. */
  onOpen: (lookup: PlaceLookup) => void;
};

/** One place in the character's story, with how many of their verses name it. Tapping opens it when collected. */
export const PlaceRow = memo(function PlaceRow({ place, placeLookup, onOpen }: PlaceRowProps) {
  const inside = (
    <>
      <Text style={styles.icon}>📍</Text>
      <Text style={[styles.title, styles.grow]}>{place.name}</Text>
      {place.verseCount > 0 && <Text style={styles.label}>{place.verseCount === 1 ? '1 verse' : `${place.verseCount} verses`}</Text>}
      {placeLookup && <Text style={[styles.arrow, styles.placeArrow]}>›</Text>}
    </>
  );
  if (!placeLookup) return <View style={[styles.row, styles.placeRow]}>{inside}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${place.name}`}
      onPress={() => {
        playSound('tap');
        onOpen(placeLookup);
      }}
      style={({ pressed }) => [styles.row, styles.placeRow, pressed && styles.pressed]}
    >
      {inside}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.black, fontSize: 13, letterSpacing: 1.2, color: text.goldNote, marginTop: 22, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  placeRow: { alignItems: 'center' },
  pressed: { opacity: 0.7 },
  grow: { flex: 1 },
  icon: { fontSize: 16, lineHeight: 21 },
  title: { fontFamily: fonts.black, fontSize: 15, lineHeight: 21, color: text.onDark },
  label: { fontFamily: fonts.extraBold, fontSize: 12, color: characters.accent },
  body: { ...textStyles.body, fontSize: 14, lineHeight: 20, color: text.onDarkSoft, marginTop: 2 },
  passage: { fontFamily: fonts.extraBold, fontSize: 12, color: reader.verseNumber, marginTop: 4 },
  arrow: { fontFamily: fonts.black, fontSize: 20, lineHeight: 36, color: characters.soft },
  placeArrow: { lineHeight: 21 },
  discover: { fontFamily: fonts.extraBold, fontSize: 13, color: characters.soft, textAlign: 'center', marginTop: 2, marginBottom: 4 },
});
