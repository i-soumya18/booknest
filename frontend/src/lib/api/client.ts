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


  // Transparent refresh and retry on 401 Unauthorized
  if (response.status === 401 && !skipAuthRefresh && endpoint !== "/api/v1/auth/refresh") {
    try {
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

          // Retry original request with new access token ONCE
          headers["Authorization"] = `Bearer ${newAccessToken}`;
          response = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: "include",
          });
        }
      } else {
        // Refresh failed: clear state
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
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

