import { action, makeObservable, observable, override, runInAction } from "mobx";
import type { ApiClient, Feedback, FeedbackCreateRequest, FeedbackType, FeedbackUpdateRequest, ListFeedbackQuery } from "@/lib/apiClient";
import { ApiError, FEEDBACK_TYPES } from "@/lib/apiClient";
import { EntryStore, type EntryFilters } from "@/stores/EntryStore";

export interface FeedbackFilters extends EntryFilters {
  type: FeedbackType | "";
}

export const DEFAULT_FEEDBACK_FILTERS: FeedbackFilters = { from: "", to: "", type: "" };
export const DEFAULT_FEEDBACK_SORT = "entryDate,desc";

export function isFeedbackType(v: string | null | undefined): v is FeedbackType {
  return v != null && (FEEDBACK_TYPES as readonly string[]).includes(v);
}

/** User-facing copy for the feedback error catalog (REQ-FUNC-050..054). */
export function feedbackErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "NOT_FOUND":
        return "This feedback note does not exist or you cannot access it.";
      case "CONFLICT":
        return "This note was changed by someone else. Review the latest version and try again.";
      case "NOT_ASSIGNED":
        return "You are not assigned to this recruit, so their feedback is not visible to you.";
      case "FORBIDDEN":
        return "You are not allowed to do that.";
      case "VALIDATION_FAILED": {
        const fields = e.details.filter((d) => d.field).map((d) => `${d.field} ${d.message}`);
        return fields.length ? `Check the filters: ${fields.join("; ")}.` : e.message;
      }
      default:
        return e.message;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

/**
 * Feedback notes (REQ-FUNC-050..054), built on the S3 `EntryStore<T>`.
 *
 * `visibility` caches, per recruit, whether the signed-in manager/admin may see
 * that recruit's feedback (D3). It is filled by `probeVisibility`, a `size=1`
 * list call: 200 → visible, 403 NOT_ASSIGNED → hidden. The `/recruits/{id}`
 * Feedback tab is only rendered when the probe says `true`.
 */
export class FeedbackStore extends EntryStore<Feedback, FeedbackCreateRequest, FeedbackUpdateRequest, FeedbackFilters, ListFeedbackQuery> {
  /** recruitId → may the current user read that recruit's feedback (`undefined` = not probed yet). */
  visibility: Record<string, boolean> = {};
  /** Bumped by `clear()` so a probe started under the previous user cannot repopulate the cache. */
  private probeGeneration = 0;

  constructor(api: ApiClient) {
    super(api.feedback, DEFAULT_FEEDBACK_FILTERS, DEFAULT_FEEDBACK_SORT);
    makeObservable(this, { visibility: observable, probeVisibility: action, clear: override });
  }

  protected override errorMessage(e: unknown): string {
    return feedbackErrorMessage(e);
  }

  protected filterQuery(filters: FeedbackFilters): Pick<ListFeedbackQuery, "type"> {
    return { type: filters.type || undefined };
  }

  protected override matchesFilters(note: Feedback, filters: FeedbackFilters): boolean {
    return super.matchesFilters(note, filters) && (!filters.type || note.type === filters.type);
  }

  /** `true` / `false` once known for `recruitId`, `null` while unknown. */
  isVisible(recruitId: string): boolean | null {
    return this.visibility[recruitId] ?? null;
  }

  /**
   * Asks the API (list probe) whether `recruitId`'s feedback is visible; a 403
   * hides it, other failures leave the cached answer untouched. Callers re-probe
   * on every mount so the answer tracks the live assignment.
   */
  async probeVisibility(recruitId: string): Promise<boolean | null> {
    const generation = this.probeGeneration;
    let result: boolean | null;
    try {
      await this.api.list({ recruitId, size: 1 });
      result = true;
    } catch (e) {
      result = e instanceof ApiError && (e.status === 403 || e.status === 404) ? false : null;
    }
    if (generation !== this.probeGeneration) return null;
    if (result !== null) {
      const visible = result;
      runInAction(() => {
        this.visibility[recruitId] = visible;
      });
    }
    return result;
  }

  override clear() {
    super.clear();
    this.probeGeneration += 1;
    this.visibility = {};
  }
}
