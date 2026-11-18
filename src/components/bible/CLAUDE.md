# bible

Pieces of the Bible reader pages: book rows, chapter tiles, the chapter text with stardust-covered words,
the reader controls, sheets and search results. Covered words are text in the Stardust font
(made by scripts/app/make-stardust-font.mjs), never pictures or views, so a chapter draws at once.
Pages get Bible data only through src/data/queries/bible.ts; covered verses arrive as word lengths, never words.
