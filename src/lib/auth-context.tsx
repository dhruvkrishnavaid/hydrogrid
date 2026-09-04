import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type React from "react";

import { api, getStoredToken, setStoredToken } from "./api-client";
import type { SiteRecord, UserRole } from "./types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  role: UserRole;
  sites: Array<SiteRecord>;
  activeSiteId: string | null;
  activeSite: SiteRecord | null;
  isStationEntered: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setActiveSiteId: (siteId: string) => void;
  enterStation: (siteId: string) => void;
  exitStation: () => void;
  refreshSites: (overrideToken?: string) => Promise<Array<SiteRecord>>;
  useDemoPersona: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS: Record<
  UserRole,
  { email: string; pass: string; id: string }
> = {
  ADMIN: {
    email: "admin@hydrogrid.local",
    pass: "HydroAdmin2026!Demo",
    id: "b2aa668a-a16b-405b-89ce-7c912f29fb20",
  },
  OPERATOR: {
    email: "operator@hydrogrid.local",
    pass: "HydroOperator2026!Demo",
    id: "5f783b88-7799-4736-a2d1-7330129408e5",
  },
  VIEWER: {
    email: "viewer@hydrogrid.local",
    pass: "HydroViewer2026!Demo",
    id: "cc651fbe-31fc-4ed8-b4be-bc6346b7dd52",
  },
};

export const DEFAULT_DEMO_SITE_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_FALLBACK_SITE: SiteRecord = {
  id: DEFAULT_DEMO_SITE_ID,
  name: "Node Zero — IIITD Pilot",
  location: "IIIT-Delhi Campus (Okhla), South East Delhi",
  status: "ONLINE",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>({
    id: DEMO_CREDENTIALS.ADMIN.id,
    email: DEMO_CREDENTIALS.ADMIN.email,
    role: "ADMIN",
  });

  const [sites, setSites] = useState<Array<SiteRecord>>([]);
  const [activeSiteId, setActiveSiteIdState] = useState<string | null>(
    DEFAULT_DEMO_SITE_ID,
  );

  // Edge mode: station is always entered directly without blocking gate screens
  const [isStationEntered, setIsStationEntered] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const role: UserRole = user?.role ?? "ADMIN";

  const refreshSites = useCallback(
    async (overrideToken?: string): Promise<Array<SiteRecord>> => {
      const currentToken = overrideToken ?? getStoredToken();
      if (!currentToken) {
        setSites([]);
        return [];
      }

      try {
        const res = await api.getSites();
        const loadedSites = res.sites || [];
        setSites(loadedSites);
        if (loadedSites.length > 0) {
          setActiveSiteIdState((prev) => {
            const exists = loadedSites.some((s) => s.id === prev);
            const targetId = exists ? prev : loadedSites[0].id;
            if (typeof window !== "undefined" && targetId) {
              window.localStorage.setItem(
                "hydrogrid_active_station_id",
                targetId,
              );
            }
            return targetId;
          });
        } else {
          setActiveSiteIdState(null);
        }
        return loadedSites;
      } catch (err: unknown) {
        console.warn("Failed to fetch sites:", err);
        setSites([]);
        return [];
      }
    },
    [],
  );

  const useDemoPersona = useCallback(
    async (targetRole: UserRole) => {
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        const cred = DEMO_CREDENTIALS[targetRole];
        const accessToken = `demo-${targetRole.toLowerCase()}-token`;
        const userId = cred.id;

        const authUser: AuthUser = {
          id: userId,
          email: cred.email,
          role: targetRole,
        };

        setToken(accessToken);
        setUser(authUser);
        setStoredToken(accessToken);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "hydrogrid_auth_user",
            JSON.stringify(authUser),
          );
        }

        await refreshSites(accessToken);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Authentication error";
        setAuthError(msg);
        console.error("Demo persona sign in failed:", err);
      } finally {
        setIsAuthenticating(false);
      }
    },
    [refreshSites],
  );

  // Initial Auth Bootstrap
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setIsLoading(true);
      if (typeof window !== "undefined") {
        const storedUser = window.localStorage.getItem("hydrogrid_auth_user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser) as AuthUser;
            if (mounted) setUser(parsed);
          } catch {
            // ignore
          }
        }
        const storedStationId = window.localStorage.getItem(
          "hydrogrid_active_station_id",
        );
        if (storedStationId && mounted) {
          setActiveSiteIdState(storedStationId);
        }
      }

      if (existingToken) {
        if (mounted) setToken(existingToken);
        const loaded = await refreshSites(existingToken);
        if (mounted && loaded.length > 0) {
          setIsLoading(false);
          return;
        }
      }

      // If no token or existing token failed to load sites, authenticate default ADMIN demo persona
      if (mounted) {
        await useDemoPersona("ADMIN");
        setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [useDemoPersona, refreshSites]);

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    setStoredToken(newToken);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "hydrogrid_auth_user",
        JSON.stringify(newUser),
      );
    }
    refreshSites(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setStoredToken(null);
    setSites([]);
    setActiveSiteIdState(DEFAULT_DEMO_SITE_ID);
    setIsStationEntered(true);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("hydrogrid_auth_user");
      window.localStorage.removeItem("hydrogrid_active_station_id");
      window.localStorage.setItem("hydrogrid_station_entered", "true");
    }
  };

  const setActiveSiteId = (siteId: string) => {
    setActiveSiteIdState(siteId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hydrogrid_active_station_id", siteId);
    }
  };

  const enterStation = (siteId: string) => {
    setActiveSiteId(siteId);
    setIsStationEntered(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hydrogrid_station_entered", "true");
    }
  };

  const exitStation = () => {
    // Edge mode: Station remains entered to prevent blocking gate screen
    setIsStationEntered(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hydrogrid_station_entered", "true");
    }
  };

  const activeSite =
    sites.find((s) => s.id === activeSiteId) ??
    (sites.length > 0 ? sites[0] : DEFAULT_FALLBACK_SITE);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        sites,
        activeSiteId: activeSite?.id ?? null,
        activeSite,
        isStationEntered,
        isLoading,
        isAuthenticating,
        authError,
        login,
        logout,
        setActiveSiteId,
        enterStation,
        exitStation,
        refreshSites,
        useDemoPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
