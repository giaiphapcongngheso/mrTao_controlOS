import { useQuery } from '@tanstack/react-query';
import { issuesService } from '../../../services/issues-service';

export const issuesQueryKeys = {
  all: ['issues'] as const,
};

export function useIssuesQuery() {
  return useQuery({
    queryKey: issuesQueryKeys.all,
    queryFn: issuesService.getAll,
    enabled: false,
  });
}
