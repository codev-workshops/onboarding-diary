import { ApiClient, apiClient } from "@/lib/apiClient";
import { AuthStore } from "@/stores/AuthStore";
import { HealthStore } from "@/stores/HealthStore";

/**
 * Single root store. Slice stores (DiaryStore, ...) are added here as they are
 * introduced; components reach them through `useStores()`.
 */
export class RootStore {
  readonly api: ApiClient;
  readonly auth: AuthStore;
  readonly health: HealthStore;

  constructor(api: ApiClient = apiClient) {
    this.api = api;
    this.auth = new AuthStore(api);
    this.health = new HealthStore(api);
  }
}
