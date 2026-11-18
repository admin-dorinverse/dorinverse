# characters

Pieces of the Characters pages: the round letter badge, the grid cell, the recently viewed chips, a character's
head and the rows under it (key moments, relationships, places). The grid's count, search box, book and order chips
and its rows are shared with Places, in `common/`.
Pages get character data only through src/data/queries/characters.ts. Only collected characters are ever named;
links to characters not collected yet are only counted. A place row opens the place's page only when the person
has collected that place.
