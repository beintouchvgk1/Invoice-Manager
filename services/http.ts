type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !body || !body.success) {
    const message = body && "error" in body ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body.data;
}

export const http = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: <T>(url: string, data?: unknown) => request<T>(url, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
