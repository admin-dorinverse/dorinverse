// Verse Trivia, opened from its Keep it fresh card. A stand-in until it is built.

import { useRouter } from 'expo-router';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

/** The Verse Trivia page, for now a stand-in over the stars. */
export default function VerseTriviaPage() {
  const router = useRouter();
  return <PlaceholderPage kicker="TRIVIA" title="Verse Trivia" note="Build verses word by word: Solo, Build Together and Versus. Coming soon." onBack={() => router.back()} />;
}
