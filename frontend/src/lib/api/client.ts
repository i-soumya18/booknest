const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : "";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}


interface FetchOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuthRefresh = false, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include", // Send HttpOnly refresh_token cookie
  });

  // Transparent refresh and retry on 401 Unauthorized
  if (response.status === 401 && !skipAuthRefresh && endpoint !== "/api/v1/auth/refresh") {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newAccessToken = refreshData.tokens.access_token;
        setAccessToken(newAccessToken);

        // Retry original request with new access token ONCE
        headers["Authorization"] = `Bearer ${newAccessToken}`;
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: "include",
        });
      } else {
        // Refresh failed: clear state
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail?.error?.message || `API Error ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json();
}
