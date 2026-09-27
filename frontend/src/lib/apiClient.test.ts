import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type ErrorResponse } from "@/lib/apiClient";
import { AUTH_STORAGE_KEY, AuthStore } from "@/stores/AuthStore";

const envelope = (over: Partial<ErrorResponse>): ErrorResponse => ({
  code: "UNAUTHENTICATED",
  message: "Authentication required",
  details: [],
  timestamp: "2026-01-01T00:00:00Z",
  path: "/api/v1/me",
  ...over,
});

function jsonResponse(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe("ApiClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let api: ApiClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
  });

  it("attaches the bearer token from the AuthStore to authenticated calls", async () => {
    const store = new AuthStore(api, { storage: null, redirectToLogin: vi.fn() });
    store.setSession({
      token: "abc",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: "u1",
        email: "a@b.co",
        fullName: "A",
        role: "ADMIN",
        status: "ACTIVE",
        department: null,
        startDate: null,
        invitedAt: "x",
        activatedAt: null,
        createdBy: null,
        createdAt: "x",
        updatedAt: "x",
      },
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, store.user));

    await api.getMyProfile();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/me");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
  });

  it("on 401 clears the AuthStore, redirects to /login and rethrows the ApiError", async () => {
    const storage = new MemoryStorage();
    const redirect = vi.fn();
    const store = new AuthStore(api, { storage, redirectToLogin: redirect });
    store.setSession({
      token: "expired",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: "u1",
        email: "a@b.co",
        fullName: "A",
        role: "NEW_RECRUIT",
        status: "ACTIVE",
        department: null,
        startDate: null,
        invitedAt: "x",
        activatedAt: null,
        createdBy: null,
        createdAt: "x",
        updatedAt: "x",
      },
    });
    expect(storage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    fetchMock.mockResolvedValueOnce(jsonResponse(401, envelope({}), { "WWW-Authenticate": "Bearer" }));

    const err = await api.getMyProfile().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).code).toBe("UNAUTHENTICATED");
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("a 401 from the public login endpoint does not trigger the unauthorized handler", async () => {
    const redirect = vi.fn();
    const store = new AuthStore(api, { storage: null, redirectToLogin: redirect });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, envelope({ code: "INVALID_CREDENTIALS", message: "Invalid email or password", path: "/api/v1/auth/login" })),
    );

    await expect(api.login({ email: "a@b.co", password: "x" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(redirect).not.toHaveBeenCalled();
    expect(store.isAuthenticated).toBe(false);
  });

  it("maps a VALIDATION_FAILED envelope to per-field form errors", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        400,
        envelope({
          code: "VALIDATION_FAILED",
          message: "Validation failed",
          path: "/api/v1/auth/signup",
          details: [
            { field: "email", code: "INVALID_FORMAT", message: "must be a valid email address" },
            { field: "password", code: "INVALID_FORMAT", message: "must be 10-128 characters" },
            { field: "password", code: "REQUIRED", message: "duplicate is ignored" },
          ],
        }),
      ),
    );

    const err = (await api.signup({ email: "bad", password: "short" }).catch((e: unknown) => e)) as ApiError;
    expect(err.toFormErrors()).toEqual({
      form: undefined,
      fields: { email: "must be a valid email address", password: "must be 10-128 characters" },
    });
  });

  it("maps a business error without details to a form-level message", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, envelope({ code: "NOT_INVITED", message: "No invitation found for this email", path: "/api/v1/auth/signup" })),
    );
    const err = (await api.signup({ email: "x@y.co", password: "Str0ngPassword!" }).catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(403);
    expect(err.toFormErrors()).toEqual({ form: "No invitation found for this email", fields: {} });
  });

  it("returns undefined for 204 responses and wraps network failures", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.changeMyPassword({ currentPassword: "a", newPassword: "b" })).resolves.toBeUndefined();

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.getMyProfile()).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });
});
