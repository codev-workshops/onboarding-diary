import { reaction } from "mobx";
import { ApiClient } from "@/lib/apiClient";
import { AdminStore } from "@/stores/AdminStore";
import { AssignmentStore } from "@/stores/AssignmentStore";
import { AuthStore } from "@/stores/AuthStore";
import { HealthStore } from "@/stores/HealthStore";

/**
 * Single root store. Slice stores (DiaryStore, ...) are added here as they are
 * introduced; components reach them through `useStores()`.
 *
 * Each RootStore owns its own ApiClient: AuthStore registers token/401 handlers
 * on it, so sharing a module-level client between RootStore instances (React
 * StrictMode double-invokes the useState initializer) would leave the live
 * store's handlers overwritten by a discarded one.
 */
export class RootStore {
  readonly api: ApiClient;
  readonly auth: AuthStore;
  readonly health: HealthStore;
  readonly admin: AdminStore;
  readonly assignments: AssignmentStore;

  constructor(api: ApiClient = new ApiClient()) {
    this.api = api;
    this.auth = new AuthStore(api);
    this.health = new HealthStore(api);
    this.admin = new AdminStore(api);
    this.assignments = new AssignmentStore(api);
    // Server-derived admin/assignment data must not survive a sign-out or user switch.
    reaction(
      () => this.auth.user?.id ?? null,
      () => {
        this.admin.clear();
        this.assignments.clear();
      },
    );
  }
}
