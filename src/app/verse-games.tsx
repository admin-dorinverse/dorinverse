// The verse games, opened from the sky's Games area. A stand-in until the games are built.

import { useRouter } from 'expo-router';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

/** The Verse Games page, for now a stand-in over the stars. */
export default function VerseGamesPage() {
  const router = useRouter();
  return <PlaceholderPage kicker="GAMES" title="Verse Games" note="Build verses word by word: Solo, Build Together and Versus. Coming soon." onBack={() => router.back()} />;
}
