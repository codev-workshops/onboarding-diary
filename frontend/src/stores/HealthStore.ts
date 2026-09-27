import { makeAutoObservable, runInAction } from "mobx";
import type { ApiClient, HealthStatus } from "@/lib/apiClient";

export type HealthState = "idle" | "loading" | HealthStatus | "unreachable";

export class HealthStore {
  state: HealthState = "idle";
  checkedAt: Date | null = null;
  error: string | null = null;
  private requestSeq = 0;

  constructor(private readonly api: ApiClient) {
    makeAutoObservable<HealthStore, "requestSeq">(this, { requestSeq: false });
  }

  async check() {
    const seq = ++this.requestSeq;
    this.state = "loading";
    this.error = null;
    try {
      const res = await this.api.health();
      if (seq !== this.requestSeq) return;
      runInAction(() => {
        this.state = res.status;
        this.checkedAt = new Date();
      });
    } catch (e) {
      if (seq !== this.requestSeq) return;
      runInAction(() => {
        this.state = "unreachable";
        this.error = e instanceof Error ? e.message : String(e);
        this.checkedAt = new Date();
      });
    }
  }
}
