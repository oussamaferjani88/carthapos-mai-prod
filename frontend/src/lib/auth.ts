export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";
const CLIENT_KEY = "authClient";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export type AuthClient = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  client: AuthClient | null;
};

export function saveAuthSession({ token, user, client }: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (client) {
    localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
  } else {
    localStorage.removeItem(CLIENT_KEY);
  }
  clearAccessModeIdentity();

  // Legacy mirror for existing pages that still read `localStorage.user`.
  // Always derived from real backend data, never a stale/fabricated profile.
  const legacyUser = {
    id: client?.id || user.id,
    name: client?.name || user.username,
    email: client?.email || user.email,
    companyName: client?.name || undefined,
  };
  localStorage.setItem("user", JSON.stringify(legacyUser));
  localStorage.setItem("isAuthenticated", "true");
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getAuthClient(): AuthClient | null {
  try {
    const raw = localStorage.getItem(CLIENT_KEY) || sessionStorage.getItem(CLIENT_KEY);
    return raw ? (JSON.parse(raw) as AuthClient) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Remove the AccessMode identity keys (currentUserId / currentUserName /
 * currentUserEmail / accessMode) plus the legacy mock `user` profile.
 * These must never survive between users.
 */
export function clearAccessModeIdentity(): void {
  for (const key of ["currentUserId", "currentUserName", "currentUserEmail", "accessMode", "user", "isAuthenticated"]) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function clearAuth(): void {
  for (const key of [TOKEN_KEY, USER_KEY, CLIENT_KEY]) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  clearAccessModeIdentity();
}

export async function apiLogin(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || json?.message || "Échec de la connexion");
  }
  const data = json?.data;
  if (!data?.token) {
    throw new Error("Réponse de connexion invalide (token manquant)");
  }
  return { token: data.token, user: data.user, client: data.client || null };
}

export async function apiRegister(payload: {
  username: string;
  email: string;
  password: string;
  businessName?: string;
  phone?: string;
}): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || json?.message || "Échec de l'inscription");
  }
  const data = json?.data;
  if (!data?.token) {
    throw new Error("Réponse d'inscription invalide (token manquant)");
  }
  return { token: data.token, user: data.user, client: data.client || null };
}
