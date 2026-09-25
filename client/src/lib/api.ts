const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as {
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: { fieldErrors?: Record<string, string[] | undefined> };
    };
  };
  if (!response.ok) {
    const fieldErrors: Record<string, string[]> = {};
    const raw = body.error?.details?.fieldErrors ?? {};
    for (const [key, messages] of Object.entries(raw)) {
      if (messages?.length) {
        fieldErrors[key] = messages;
      }
    }
    throw new ApiError(
      response.status,
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "Request failed",
      fieldErrors,
    );
  }
  return body.data as T;
}

export function documentFileUrl(docType: string) {
  return `${API_URL}/v1/applications/me/documents/${encodeURIComponent(docType)}/file`;
}
