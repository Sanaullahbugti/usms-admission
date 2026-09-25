const API =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");

export async function api<T>(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? "Request failed");
  return body as T;
}
