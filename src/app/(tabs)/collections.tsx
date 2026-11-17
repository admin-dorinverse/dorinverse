// The Collections tab. Its real screens (Bible verses, characters, places and more) come in Phase 2.

import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { chrome } from '@/theme/spacing';

/** The Collections page, for now a placeholder over the stars. */
export default function CollectionsPage() {
  return (
    <PlaceholderPage
      kicker="YOUR BAKES"
      title="Collections"
      note="Bible verses, characters, places and more will live here. Coming in the next phase."
      topSpace={chrome.tabsTop}
    />
  );
}
