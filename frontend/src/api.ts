const TOKEN_KEY = "renalbuddy_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function errorMessage(data: unknown) {
  if (!data || typeof data !== "object" || !("detail" in data)) return "Something went wrong.";
  const detail = (data as { detail: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : "Check the form."))
      .join(" ");
  }
  return "Something went wrong.";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const base = import.meta.env.VITE_API_URL ?? "";
  const response = await fetch(`${base}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      setToken(null);
      window.dispatchEvent(new Event("renalbuddy-auth"));
    }
    throw new ApiError(response.status, errorMessage(data));
  }
  return data as T;
}
