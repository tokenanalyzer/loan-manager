import type { SearchResponse } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/** Global Search API client — a thin wrapper over `GET /v1/search`, already grouped server-side. */
export async function fetchSearchResults(query: string): Promise<SearchResponse> {
  const { data } = await apiClient.get<SearchResponse>('/v1/search', { params: { q: query } });
  return data;
}
