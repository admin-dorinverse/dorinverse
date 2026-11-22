// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Supabase functions run on Deno, with their own imports; they're checked by Deno, not the app's lint.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
