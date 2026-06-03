import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes — data changes infrequently, so returning to a
      // previously-visited tab can skip the refetch entirely.
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
