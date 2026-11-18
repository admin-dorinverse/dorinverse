// Lays out the Characters grid as rows: full rows of up to three cells, and, when sorted by name, a letter heading
// before each new first letter ("A", then the A characters, then "B"). Done once per change, never while scrolling.

import type { CharacterOrder } from '@/data/characterLibrary';
import type { MetCharacter } from '@/types/character';

/** One line of the grid: a letter heading, or a row of cells (blank spots fill a short last row). */
export type GridRow = { kind: 'letter'; letter: string } | { kind: 'cells'; key: string; cells: (MetCharacter | null)[] };

/** The first letter of a name, as a heading. */
function letterOf(name: string): string {
  const first = name.trim().match(/[A-Za-z]/);
  return first ? first[0].toUpperCase() : '#';
}

/** Splits the characters into grid rows, with letter headings when sorted by name. */
export function gridRows(characters: readonly MetCharacter[], order: CharacterOrder, columns: number): GridRow[] {
  const rows: GridRow[] = [];
  /** Adds a group of characters as rows of `columns`. */
  const addGroup = (group: MetCharacter[]) => {
    for (let i = 0; i < group.length; i += columns) {
      const cells: (MetCharacter | null)[] = group.slice(i, i + columns);
      while (cells.length < columns) cells.push(null);
      rows.push({ kind: 'cells', key: group[i].lookup, cells });
    }
  };
  if (order === 'newest') {
    addGroup([...characters]);
    return rows;
  }
  let group: MetCharacter[] = [];
  let letter = '';
  for (const c of characters) {
    const l = letterOf(c.name);
    if (l !== letter) {
      addGroup(group);
      group = [];
      letter = l;
      rows.push({ kind: 'letter', letter: l });
    }
    group.push(c);
  }
  addGroup(group);
  return rows;
}
