// Lays out a collected grid (Characters, Places) as rows: full rows of up to three cells, and, when sorted by name,
// a letter heading before each new first letter ("A", then the A names, then "B"). Done once per change, never
// while scrolling.

import type { ListOrder } from '@/data/collectedLists';

/** What a grid cell needs to be laid out: a unique lookup and a name. */
export type GridItem = { lookup: string; name: string };

/** One line of the grid: a letter heading, or a row of cells (blank spots fill a short last row). */
export type GridRow<T extends GridItem> = { kind: 'letter'; letter: string } | { kind: 'cells'; key: string; cells: (T | null)[] };

/** The first letter of a name, as a heading. */
function letterOf(name: string): string {
  const first = name.trim().match(/[A-Za-z]/);
  return first ? first[0].toUpperCase() : '#';
}

/** Splits the items into grid rows, with letter headings when sorted by name. */
export function gridRows<T extends GridItem>(items: readonly T[], order: ListOrder, columns: number): GridRow<T>[] {
  const rows: GridRow<T>[] = [];
  /** Adds a group of items as rows of `columns`. */
  const addGroup = (group: T[]) => {
    for (let i = 0; i < group.length; i += columns) {
      const cells: (T | null)[] = group.slice(i, i + columns);
      while (cells.length < columns) cells.push(null);
      rows.push({ kind: 'cells', key: group[i].lookup, cells });
    }
  };
  if (order === 'newest') {
    addGroup([...items]);
    return rows;
  }
  let group: T[] = [];
  let letter = '';
  for (const item of items) {
    const l = letterOf(item.name);
    if (l !== letter) {
      addGroup(group);
      group = [];
      letter = l;
      rows.push({ kind: 'letter', letter: l });
    }
    group.push(item);
  }
  addGroup(group);
  return rows;
}
