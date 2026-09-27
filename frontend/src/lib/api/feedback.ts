import type { ApiTransport, EntryApi, EntryBase, EntryListQuery, Page } from "@/lib/api/core";
import { toQuery } from "@/lib/api/core";

// ---- S5: feedback notes contract (docs/openapi.yaml `Feedback*`) ------------------

export const FEEDBACK_TYPES = ["POSITIVE", "SUGGESTION", "CONCERN"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/**
 * Sensitive note (D3): readable only by the authoring recruit, an ADMIN or the
 * recruit's *currently* assigned manager. Non-visible ids are 404 on detail.
 */
export interface Feedback extends EntryBase {
  subject: string;
  type: FeedbackType;
  details: string;
  /** Optimistic-lock counter; send it back as `If-Match: "<version>"` on PUT. */
  version: number;
}

/** ETag value for `If-Match` from a note's `version`. */
export const feedbackEtag = (note: Pick<Feedback, "version">): string => `"${note.version}"`;

export interface FeedbackCreateRequest {
  entryDate: string;
  subject: string;
  type: FeedbackType;
  details: string;
}

export type FeedbackUpdateRequest = FeedbackCreateRequest;

export interface ListFeedbackQuery extends EntryListQuery {
  type?: FeedbackType;
}

/** Typed `/feedback` resource; registered once on `ApiClient` as `api.feedback`. */
export class FeedbackApi implements EntryApi<Feedback, FeedbackCreateRequest, FeedbackUpdateRequest, ListFeedbackQuery> {
  constructor(private readonly http: ApiTransport) {}

  /** operationId: listFeedback */
  list(query: ListFeedbackQuery = {}): Promise<Page<Feedback>> {
    return this.http.request<Page<Feedback>>("GET", `/feedback${toQuery(query)}`);
  }

  /** operationId: createFeedback */
  create(body: FeedbackCreateRequest): Promise<Feedback> {
    return this.http.request<Feedback>("POST", "/feedback", { body });
  }

  /** operationId: getFeedback */
  get(feedbackId: string): Promise<Feedback> {
    return this.http.request<Feedback>("GET", `/feedback/${feedbackId}`);
  }

  /** operationId: updateFeedback */
  update(feedbackId: string, body: FeedbackUpdateRequest, ifMatch?: string): Promise<Feedback> {
    return this.http.request<Feedback>("PUT", `/feedback/${feedbackId}`, { body, headers: ifMatch ? { "If-Match": ifMatch } : undefined });
  }

  /** operationId: deleteFeedback */
  remove(feedbackId: string): Promise<void> {
    return this.http.request<void>("DELETE", `/feedback/${feedbackId}`);
  }
}
