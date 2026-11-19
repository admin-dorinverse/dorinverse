// One stop's player. The player itself comes in the next step; for now this page only goes back.

import { useRouter } from 'expo-router';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

/** The stop's player page, for now a placeholder. */
export default function StopPage() {
  const router = useRouter();
  return <PlaceholderPage kicker="STOP" title="Baking" note="The player comes next." onBack={() => router.back()} />;
}
