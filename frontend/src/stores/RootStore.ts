import { ApiClient, apiClient } from "@/lib/apiClient";
import { HealthStore } from "@/stores/HealthStore";

/**
 * Single root store. Slice stores (AuthStore, DiaryStore, ...) are added here
 * as they are introduced; components reach them through `useStores()`.
 */
export class RootStore {
  readonly api: ApiClient;
  readonly health: HealthStore;

  constructor(api: ApiClient = apiClient) {
    this.api = api;
    this.health = new HealthStore(api);
  }
}
