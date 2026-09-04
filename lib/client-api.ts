export async function api<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => ({ message: "Unexpected response" }));
  if (!response.ok || payload.status === false) throw new Error(payload.message || "Request failed");
  return payload.data as T;
}
