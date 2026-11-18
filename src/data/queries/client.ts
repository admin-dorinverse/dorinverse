// The app's one TanStack Query client: it remembers downloaded data while the app is open and retries
// a failed download a couple of times before showing an error.

import { QueryClient } from '@tanstack/react-query';

/** The shared query client, given to every page by the root layout. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false },
  },
});
