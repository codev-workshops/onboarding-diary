import { makeAutoObservable, runInAction } from "mobx";
import type { ApiClient, HealthStatus } from "@/lib/apiClient";

export type HealthState = "idle" | "loading" | HealthStatus | "unreachable";

export class HealthStore {
  state: HealthState = "idle";
  checkedAt: Date | null = null;
  error: string | null = null;

  constructor(private readonly api: ApiClient) {
    makeAutoObservable(this);
  }

  async check() {
    this.state = "loading";
    this.error = null;
    try {
      const res = await this.api.health();
      runInAction(() => {
        this.state = res.status;
        this.checkedAt = new Date();
      });
    } catch (e) {
      runInAction(() => {
        this.state = "unreachable";
        this.error = e instanceof Error ? e.message : String(e);
        this.checkedAt = new Date();
      });
    }
  }
}
