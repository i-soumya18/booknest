function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // On any non-localhost host (e.g. production domain), always route via same-origin relative URLs
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "";
}

let accessToken: string | null = null;

if (typeof window !== "undefined") {
  try {
    accessToken = localStorage.getItem("booknest_token");
  } catch {
    // Ignore storage restrictions
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        localStorage.setItem("booknest_token", token);
      } else {
        localStorage.removeItem("booknest_token");
      }
    } catch {
      // Ignore
    }
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const refreshResponse = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (refreshResponse.ok) {
        const refreshText = await refreshResponse.text();
        const refreshData = refreshText ? JSON.parse(refreshText) : null;
        const newAccessToken = refreshData?.tokens?.access_token;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          return newAccessToken;
        }
      }
      setAccessToken(null);
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface FetchOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuthRefresh = false, ...fetchOptions } = options;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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

  // Transparent refresh and retry on 401 Unauthorized (exclude auth actions to avoid invalid refresh cascades)
  const isAuthEndpoint =
    endpoint === "/api/v1/auth/refresh" ||
    endpoint === "/api/v1/auth/login" ||
    endpoint === "/api/v1/auth/signup" ||
    endpoint === "/api/v1/auth/logout";

  if (response.status === 401 && !skipAuthRefresh && !isAuthEndpoint) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Retry original request with new access token ONCE
      headers["Authorization"] = `Bearer ${newAccessToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include",
      });
    }
  }

  const rawText = await response.text();
  let parsedData: any = null;
  if (rawText) {
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      parsedData?.detail?.error?.message ||
      (typeof parsedData?.detail === "string" ? parsedData.detail : null) ||
      `API Error ${response.status}: ${rawText || response.statusText}`;
    throw new Error(errorMessage);
  }

  return (parsedData ?? ({} as any)) as T;
}

export async function uploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (percentage: number) => void
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;

    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    }

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data: any = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        const errorMsg =
          data?.detail?.error?.message ||
          (typeof data?.detail === "string" ? data.detail : null) ||
          `Upload failed with status ${xhr.status}`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error occurred during upload"));
    };

    xhr.send(formData);
  });
}

export async function fetchBlob(endpoint: string): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  let res = await fetch(url, { headers, credentials: "include" });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { headers, credentials: "include" });
    }
  }
  if (!res.ok) {
    let errorDetail = "";
    try {
      const errJson = await res.json();
      errorDetail = errJson?.detail?.error?.message || errJson?.detail || "";
    } catch {
      // Ignore
    }
    throw new Error(errorDetail || `Failed to fetch file: ${res.status} ${res.statusText}`);
  }
  const blob = await res.blob();
  const mimeType = res.headers.get("content-type") || blob.type || "application/pdf";
  const disposition = res.headers.get("content-disposition") || "";
  let filename = "book";
  const match = disposition.match(/filename="?([^";]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }
  return { blob, mimeType, filename };
}

export function sendKeepAlivePatch(endpoint: string, data: Record<string, any>): void {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  try {
    fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {
      // Ignore background keepalive failures
    });
  } catch {
    // Ignore
  }
}

