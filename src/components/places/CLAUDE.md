# places

Pieces of the Places pages: a place's photo (or the plain look when it has none), the grid cell, a place's page
top with the photo credit, the rows under it (collected characters, "more to discover"), and the list of rows.
The grid's top and rows are shared with Characters (`common/CollectedGridHeader.tsx`, `common/gridRows.ts`), and
headings and key moments use the Characters pages' rows.
Pages get place data only through src/data/queries/places.ts. Photos are drawn with expo-image from the phone's
disk cache; they are fetched when the app starts, never on a tap. Only collected characters are ever named; the
rest are only counted. Every photo shows its credit, as its license asks.
