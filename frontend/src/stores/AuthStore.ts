import { makeAutoObservable, runInAction } from "mobx";
import type {
  ApiClient,
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdateRequest,
  Role,
  SignupRequest,
  UserProfile,
} from "@/lib/apiClient";

export const AUTH_STORAGE_KEY = "onboarding-diary.auth";

interface PersistedSession {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface AuthStoreOptions {
  storage?: StorageLike | null;
  /** Called after a 401 cleared the session; StoreProvider wires the Next router here. */
  redirectToLogin?: () => void;
}

function defaultStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

/**
 * Holds the bearer token and the current user. The token lives in memory and
 * is mirrored to sessionStorage so a reload within the tab keeps the session.
 * Registers itself with the ApiClient so every call carries the token and any
 * 401 clears the store and redirects to /login.
 */
export class AuthStore {
  token: string | null = null;
  expiresAt: string | null = null;
  user: UserProfile | null = null;
  /** True once `hydrate()` ran on the client; guards wait for it. */
  hydrated = false;

  private readonly storage: StorageLike | null;
  private redirectToLogin: () => void;

  constructor(
    private readonly api: ApiClient,
    options: AuthStoreOptions = {},
  ) {
    this.storage = options.storage === undefined ? defaultStorage() : options.storage;
    this.redirectToLogin = options.redirectToLogin ?? (() => undefined);
    makeAutoObservable<AuthStore, "api" | "storage" | "redirectToLogin">(this, {
      api: false,
      storage: false,
      redirectToLogin: false,
      setRedirectToLogin: false,
    });
    api.setAuthHandlers({
      getToken: () => this.token,
      onUnauthorized: () => this.handleUnauthorized(),
    });
  }

  /** Router-aware navigation used after a 401; set once by StoreProvider. */
  setRedirectToLogin(fn: () => void) {
    this.redirectToLogin = fn;
  }

  get isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  get role(): Role | null {
    return this.user?.role ?? null;
  }

  hasRole(...roles: Role[]): boolean {
    return this.role !== null && roles.includes(this.role);
  }

  /** Restores the session from sessionStorage (client only). Idempotent. */
  hydrate() {
    if (this.hydrated) return;
    const raw = this.storage?.getItem(AUTH_STORAGE_KEY) ?? null;
    if (raw) {
      try {
        const saved = JSON.parse(raw) as PersistedSession;
        if (saved.token && saved.user && new Date(saved.expiresAt).getTime() > Date.now()) {
          this.token = saved.token;
          this.expiresAt = saved.expiresAt;
          this.user = saved.user;
        } else {
          this.storage?.removeItem(AUTH_STORAGE_KEY);
        }
      } catch {
        this.storage?.removeItem(AUTH_STORAGE_KEY);
      }
    }
    this.hydrated = true;
  }

  async login(request: LoginRequest): Promise<UserProfile> {
    const res = await this.api.login(request);
    this.setSession(res);
    return res.user;
  }

  async signup(request: SignupRequest): Promise<UserProfile> {
    const res = await this.api.signup(request);
    this.setSession(res);
    return res.user;
  }

  /** Best-effort server logout, then always clears local state. */
  async logout(): Promise<void> {
    try {
      if (this.token) await this.api.logout();
    } catch {
      // token may already be invalid; local clear is what matters
    } finally {
      this.clear();
    }
  }

  async refreshProfile(): Promise<UserProfile> {
    const user = await this.api.getMyProfile();
    this.setUser(user);
    return user;
  }

  async updateProfile(request: ProfileUpdateRequest): Promise<UserProfile> {
    const user = await this.api.updateMyProfile(request);
    this.setUser(user);
    return user;
  }

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await this.api.changeMyPassword(request);
  }

  /** Drops token + user from memory and sessionStorage. */
  clear() {
    this.token = null;
    this.expiresAt = null;
    this.user = null;
    this.storage?.removeItem(AUTH_STORAGE_KEY);
  }

  setSession(res: AuthResponse) {
    this.token = res.token;
    this.expiresAt = res.expiresAt;
    this.user = res.user;
    this.hydrated = true;
    this.persist();
  }

  private setUser(user: UserProfile) {
    runInAction(() => {
      this.user = user;
      this.persist();
    });
  }

  private handleUnauthorized() {
    const wasAuthenticated = this.isAuthenticated;
    this.clear();
    if (wasAuthenticated) this.redirectToLogin();
  }

  private persist() {
    if (!this.storage) return;
    if (this.token && this.user && this.expiresAt) {
      const session: PersistedSession = { token: this.token, expiresAt: this.expiresAt, user: this.user };
      this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      this.storage.removeItem(AUTH_STORAGE_KEY);
    }
  }
}
