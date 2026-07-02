import type { HttpClient } from '../shared/services/create-base-service';
import { env } from './env';

const API_BASE_URL = env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const httpClient: HttpClient = {
  get: (url, config) => request(url, { ...config, method: 'GET' }),
  post: (url, body, config) => request(url, { ...config, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, config) => request(url, { ...config, method: 'PUT', body: JSON.stringify(body) }),
  delete: (url, config) => request(url, { ...config, method: 'DELETE' }),
};
