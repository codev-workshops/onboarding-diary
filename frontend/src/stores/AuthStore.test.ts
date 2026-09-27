import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type AuthResponse, type UserProfile } from "@/lib/apiClient";
import { AUTH_STORAGE_KEY, AuthStore } from "@/stores/AuthStore";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const user: UserProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "jane@example.com",
  fullName: "Jane Doe",
  role: "NEW_RECRUIT",
  status: "ACTIVE",
  department: null,
  startDate: null,
  invitedAt: "2026-01-01T00:00:00Z",
  activatedAt: "2026-01-02T00:00:00Z",
  createdBy: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const authResponse: AuthResponse = { token: "jwt-token", expiresAt: future, user };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AuthStore", () => {
  let storage: MemoryStorage;
  let fetchMock: ReturnType<typeof vi.fn>;
  let api: ApiClient;
  let redirect: ReturnType<typeof vi.fn>;
  let store: AuthStore;

  beforeEach(() => {
    storage = new MemoryStorage();
    fetchMock = vi.fn();
    api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    redirect = vi.fn();
    store = new AuthStore(api, { storage, redirectToLogin: redirect });
  });

  it("starts signed out and not hydrated", () => {
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.hydrated).toBe(false);
  });

  it("login sets token + user and persists to sessionStorage", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, authResponse));

    const result = await store.login({ email: " Jane@Example.com ", password: "Str0ngPassword!" });

    expect(result).toEqual(user);
    expect(store.token).toBe("jwt-token");
    expect(store.user).toEqual(user);
    expect(store.isAuthenticated).toBe(true);
    expect(store.role).toBe("NEW_RECRUIT");
    expect(JSON.parse(storage.getItem(AUTH_STORAGE_KEY)!)).toEqual(authResponse);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/auth/login");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("signup sets the session just like login", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, authResponse));
    await store.signup({ email: user.email, password: "Str0ngPassword!" });
    expect(store.isAuthenticated).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/v1/auth/signup");
  });

  it("failed login surfaces ApiError, leaves the store clear and does not redirect", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        details: [],
        timestamp: "now",
        path: "/api/v1/auth/login",
      }),
    );

    await expect(store.login({ email: user.email, password: "wrong" })).rejects.toBeInstanceOf(ApiError);
    expect(store.isAuthenticated).toBe(false);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("hydrate restores a non-expired session from sessionStorage", () => {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authResponse));
    store.hydrate();
    expect(store.hydrated).toBe(true);
    expect(store.token).toBe("jwt-token");
    expect(store.user).toEqual(user);
  });

  it("hydrate drops an expired or corrupt session", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...authResponse, expiresAt: past }));
    store.hydrate();
    expect(store.isAuthenticated).toBe(false);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();

    const other = new AuthStore(new ApiClient("http://api.test", fetchMock as unknown as typeof fetch), {
      storage,
      redirectToLogin: redirect,
    });
    storage.setItem(AUTH_STORAGE_KEY, "{not json");
    other.hydrate();
    expect(other.isAuthenticated).toBe(false);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("clear removes token, user and the persisted session", () => {
    store.setSession(authResponse);
    expect(storage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    store.clear();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("logout calls the API with the bearer token, then clears even if the call fails", async () => {
    store.setSession(authResponse);
    fetchMock.mockResolvedValueOnce(jsonResponse(500, undefined));
    await store.logout();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/auth/logout");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt-token");
    expect(store.isAuthenticated).toBe(false);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("hasRole checks against the server-provided role", () => {
    store.setSession({ ...authResponse, user: { ...user, role: "MANAGER" } });
    expect(store.hasRole("MANAGER", "ADMIN")).toBe(true);
    expect(store.hasRole("ADMIN")).toBe(false);
    store.clear();
    expect(store.hasRole("NEW_RECRUIT")).toBe(false);
  });

  it("updateProfile writes the returned user back into the store and storage", async () => {
    store.setSession(authResponse);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...user, fullName: "Jane D." }));
    await store.updateProfile({ fullName: "Jane D." });
    expect(store.user?.fullName).toBe("Jane D.");
    expect(JSON.parse(storage.getItem(AUTH_STORAGE_KEY)!).user.fullName).toBe("Jane D.");
  });
});
