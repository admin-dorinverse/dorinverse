// Cookie Box Trivia, opened from the sky's Games area. A stand-in until the game is built.

import { useRouter } from 'expo-router';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

/** The Cookie Box Trivia page, for now a stand-in over the stars. */
export default function TriviaPage() {
  const router = useRouter();
  return <PlaceholderPage kicker="GAMES" title="Cookie Box Trivia" note="Questions from every lesson you've finished: Solo, Build Together and Versus. Coming soon." onBack={() => router.back()} />;
}
