import { GITEA_API_URL } from "./config";

export type GiteaClient = {
  baseUrl: string;
  token: string;
  fetch: (path: string, options?: RequestInit) => Promise<Response>;
  get: <T = any>(path: string) => Promise<T>;
  post: <T = any>(path: string, body?: any) => Promise<T>;
  patch: <T = any>(path: string, body?: any) => Promise<T>;
  delete: (path: string) => Promise<void>;
};

/**
 * Creates a Gitea API client with helper methods
 * @param token - Gitea personal access token
 * @returns GiteaClient instance with REST methods
 */
export function createGiteaClient(token: string): GiteaClient {
  const baseUrl = GITEA_API_URL;

  const fetchApi = async (
    path: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gitea API error ${response.status}: ${errorBody}`);
    }

    return response;
  };

  return {
    baseUrl,
    token,
    fetch: fetchApi,

    async get<T = any>(path: string): Promise<T> {
      const response = await fetchApi(path, { method: "GET" });
      return response.json() as Promise<T>;
    },

    async post<T = any>(path: string, body?: any): Promise<T> {
      const response = await fetchApi(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json() as Promise<T>;
    },

    async patch<T = any>(path: string, body?: any): Promise<T> {
      const response = await fetchApi(path, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json() as Promise<T>;
    },

    async delete(path: string): Promise<void> {
      await fetchApi(path, { method: "DELETE" });
    },
  };
}

/**
 * Temporary compatibility wrapper - maintains Octokit-like structure
 * This allows gradual migration of code that uses octokit.rest
 * TODO: Remove once all code is migrated to use GiteaClient directly
 */
export type Octokits = {
  rest: any; // Placeholder for compatibility
  graphql: any; // Placeholder - Gitea doesn't use GraphQL
};

export function createOctokit(token: string): Octokits {
  const giteaClient = createGiteaClient(token);

  // Return a minimal compatibility object
  // Most code will be rewritten to use giteaClient directly
  return {
    rest: {
      _giteaClient: giteaClient, // Store client for migration
    },
    graphql: null, // Gitea doesn't use GraphQL
  };
}
