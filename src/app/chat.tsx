// Chat with Papa Dorin, opened from Keep it fresh. A stand-in until the chat is hooked up.

import { useRouter } from 'expo-router';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

/** The Chat with Papa Dorin page, for now a stand-in over the stars. */
export default function ChatPage() {
  const router = useRouter();
  return <PlaceholderPage kicker="KEEP IT FRESH" title="Chat with Papa Dorin" note="Ask Papa Dorin anything about the Bible. Coming soon." onBack={() => router.back()} />;
}
