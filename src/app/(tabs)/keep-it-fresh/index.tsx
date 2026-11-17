// The Keep it fresh tab. Its real screens (trivia, verse memory and more) come in a later phase.

import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { chrome } from '@/theme/spacing';

/** The Keep it fresh page, for now a placeholder over the stars. */
export default function KeepItFreshPage() {
  return (
    <PlaceholderPage
      kicker="PRACTICE"
      title="Keep it fresh"
      note="Cookie Box Trivia, Verse Memory and more will live here. Coming in a later phase."
      topSpace={chrome.tabsTop}
    />
  );
}
