export interface AuthUser {
  username: string;
  fullName?: string;
  email?: string;
  role: string; // 'user' | 'admin'
  token?: string;
  authProvider?: "password" | "google";
}

const AUTH_KEY = "hydrogrid_user_session";

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser, remember = true): void {
  if (typeof window === "undefined") return;
  const target = remember ? localStorage : sessionStorage;
  target.setItem(AUTH_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("hydrogrid_auth_change"));
}

export function clearAuthUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new CustomEvent("hydrogrid_auth_change"));
}

export function isAuthenticated(): boolean {
  return !!getAuthUser();
}

export function isAdmin(): boolean {
  const user = getAuthUser();
  return !!user && user.role === "admin";
}

/**
 * Initiate Real Google OAuth authentication flow
 */
export async function initiateGoogleAuth(): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch("/api/auth/google");
    const data = await response.json();

    if (data.configured && data.authUrl) {
      window.location.href = data.authUrl;
      return { success: true };
    }

    return {
      success: false,
      message: data.message || "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.",
    };
  } catch {
    return {
      success: false,
      message: "Unable to contact authentication server.",
    };
  }
}
