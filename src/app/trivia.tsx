// Cookie Box Trivia, opened from its Keep it fresh card. A stand-in until the game is built.

import { useRouter } from 'expo-router';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

/** The Cookie Box Trivia page, for now a stand-in over the stars. */
export default function TriviaPage() {
  const router = useRouter();
  return <PlaceholderPage kicker="TRIVIA" title="Cookie Box Trivia" note="Questions from every lesson you've finished: Solo, Build Together and Versus. Coming soon." onBack={() => router.back()} />;
}
