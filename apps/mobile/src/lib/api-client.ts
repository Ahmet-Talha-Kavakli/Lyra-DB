import { API_BASE_URL } from '@/constants/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
};

/**
 * Lightweight API client for communicating with the NestJS backend.
 * Automatically attaches Clerk auth token when available.
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, token } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(response.status, error.message ?? 'Request failed');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string, token?: string | null) {
    return this.request<T>(endpoint, { token });
  }

  post<T>(endpoint: string, body: unknown, token?: string | null) {
    return this.request<T>(endpoint, { method: 'POST', body, token });
  }

  put<T>(endpoint: string, body: unknown, token?: string | null) {
    return this.request<T>(endpoint, { method: 'PUT', body, token });
  }

  patch<T>(endpoint: string, body: unknown, token?: string | null) {
    return this.request<T>(endpoint, { method: 'PATCH', body, token });
  }

  delete<T>(endpoint: string, token?: string | null) {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
