// Character Connections, opened from Keep it fresh. A stand-in until the Bible Character Web is built.

import { useRouter } from 'expo-router';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

/** The Character Connections page, for now a stand-in over the stars. */
export default function ConnectionsPage() {
  const router = useRouter();
  return <PlaceholderPage kicker="KEEP IT FRESH" title="Character Connections" note="The Bible Character Web will live here: who knew whom, who crossed whom. Coming soon." onBack={() => router.back()} />;
}
