import { reaction } from "mobx";
import { ApiClient } from "@/lib/apiClient";
import { AdminStore } from "@/stores/AdminStore";
import { AssignmentStore } from "@/stores/AssignmentStore";
import { AuthStore } from "@/stores/AuthStore";
import { HealthStore } from "@/stores/HealthStore";
import { TaskStore } from "@/stores/TaskStore";
import { IssueStore } from "@/stores/IssueStore";
import { FeedbackStore } from "@/stores/FeedbackStore";
import { NoteStore } from "@/stores/NoteStore";
import { DashboardStore } from "@/stores/DashboardStore";
import { ReportStore } from "@/stores/ReportStore";

/** Anything holding server-derived data for the signed-in user. */
interface UserScopedStore {
  clear(): void;
}

/**
 * Single root store; components reach stores through `useStores()`.
 *
 * Adding a slice store is additive: one import above, one `readonly` field and
 * one `this.register(new XStore(api))` line in the constructor. `register`
 * enrols the store for clearing on sign-out / user switch, so no other code
 * changes (see frontend/AGENTS.md "Additive extension points").
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
  // ---- entry stores (S3+): one field per slice, appended below -----------------
  readonly tasks: TaskStore;
  readonly issues: IssueStore;
  readonly feedback: FeedbackStore;
  readonly notes: NoteStore;
  readonly dashboard: DashboardStore;
  /** S8 — `/reports`. */
  readonly reports: ReportStore;

  private readonly userScoped: UserScopedStore[] = [];

  constructor(api: ApiClient = new ApiClient()) {
    this.api = api;
    this.auth = new AuthStore(api);
    this.health = new HealthStore(api);
    this.admin = this.register(new AdminStore(api));
    this.assignments = this.register(new AssignmentStore(api));
    // ---- entry stores (S3+): one line per slice, appended below -----------------
    this.tasks = this.register(new TaskStore(api));
    this.issues = this.register(new IssueStore(api));
    this.feedback = this.register(new FeedbackStore(api));
    this.notes = this.register(new NoteStore(api));
    this.dashboard = this.register(new DashboardStore(api));
    this.reports = this.register(new ReportStore(api));

    // Server-derived data must not survive a sign-out or user switch.
    reaction(
      () => this.auth.user?.id ?? null,
      () => this.userScoped.forEach((s) => s.clear()),
    );
  }

  private register<S extends UserScopedStore>(store: S): S {
    this.userScoped.push(store);
    return store;
  }
}
