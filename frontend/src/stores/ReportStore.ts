import { action, computed, makeObservable, observable, runInAction } from "mobx";
import type { ApiClient, ReportFormat, ReportQuery, ReportType, Role, UserSummary } from "@/lib/apiClient";
import { ApiError, REPORT_MAX_SPAN_DAYS, saveDownloadedFile } from "@/lib/apiClient";

export interface RecruitOption {
  id: string;
  fullName: string;
  email: string;
}

export interface ReportForm {
  recruitId: string;
  from: string;
  to: string;
  type: ReportType;
  format: ReportFormat;
}

export type ReportFormErrors = Partial<Record<"recruitId" | "from" | "to", string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(s: string): number | null {
  if (!ISO_DATE.test(s)) return null;
  const ms = Date.parse(`${s}T00:00:00Z`);
  return Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== s ? null : ms;
}

/** Inline validation mirroring the backend (INV-10): both dates required, `from <= to`, span ≤ 366 days. */
export function validateReportForm(form: ReportForm, recruitRequired: boolean): ReportFormErrors {
  const errors: ReportFormErrors = {};
  if (recruitRequired && !form.recruitId) errors.recruitId = "Select a recruit";
  const from = form.from ? parseIsoDate(form.from) : null;
  const to = form.to ? parseIsoDate(form.to) : null;
  if (!form.from) errors.from = "From date is required";
  else if (from === null) errors.from = "Enter a valid date";
  if (!form.to) errors.to = "To date is required";
  else if (to === null) errors.to = "Enter a valid date";
  if (from !== null && to !== null) {
    if (from > to) errors.to = "To date must be on or after the from date";
    else if ((to - from) / 86_400_000 > REPORT_MAX_SPAN_DAYS) errors.to = `Range must not exceed ${REPORT_MAX_SPAN_DAYS} days`;
  }
  return errors;
}

/** User-facing copy for report failures (REQ-FUNC-086). */
export function reportErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "NOT_ASSIGNED":
        return "You are not assigned to this recruit, so their report is not available.";
      case "FORBIDDEN":
        return "You are not allowed to generate this report. Feedback is only visible to the recruit, their manager and admins.";
      case "NOT_FOUND":
        return "This recruit does not exist.";
      case "VALIDATION_FAILED":
        return e.details.find((d) => d.message)?.message ?? e.message;
      case "NETWORK_ERROR":
        return "Report could not be generated: the server could not be reached.";
      default:
        return e.status >= 500 ? "Report could not be generated right now. Please try again." : `Report could not be generated: ${e.message}`;
    }
  }
  return "Report could not be generated. Please try again.";
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/**
 * `/reports` screen state (S8). Recruit options are scoped by role: recruits
 * report on themselves only, managers pick among their active recruits and
 * admins among every active recruit. `generate()` downloads the file through
 * the typed client (bearer attached) and only saves it on success.
 */
export class ReportStore {
  form: ReportForm = { recruitId: "", ...defaultRange(), type: "COMBINED", format: "PDF" };
  /** Field errors shown inline once the field was touched or a generate was attempted. */
  touched: Partial<Record<keyof ReportFormErrors, boolean>> = {};
  submitted = false;

  role: Role | null = null;
  recruits: RecruitOption[] = [];
  recruitsLoading = false;
  recruitsError: string | null = null;

  generating = false;
  error: string | null = null;
  /** Filename of the last successful download. */
  lastDownloaded: string | null = null;
  /** Set when the server dropped the feedback section (`X-Report-Omitted: feedback`). */
  feedbackOmitted = false;

  private recruitsSeq = 0;
  private generateSeq = 0;

  constructor(private readonly api: ApiClient) {
    makeObservable(this, {
      form: observable,
      touched: observable,
      submitted: observable,
      role: observable,
      recruits: observable,
      recruitsLoading: observable,
      recruitsError: observable,
      generating: observable,
      error: observable,
      lastDownloaded: observable,
      feedbackOmitted: observable,
      recruitRequired: computed,
      errors: computed,
      visibleErrors: computed,
      canGenerate: computed,
      setField: action,
      touch: action,
      init: action,
      loadRecruits: action,
      generate: action,
      clear: action,
    });
  }

  get recruitRequired(): boolean {
    return this.role !== "NEW_RECRUIT";
  }

  get errors(): ReportFormErrors {
    return validateReportForm(this.form, this.recruitRequired);
  }

  get visibleErrors(): ReportFormErrors {
    const out: ReportFormErrors = {};
    for (const key of Object.keys(this.errors) as (keyof ReportFormErrors)[]) {
      if (this.submitted || this.touched[key]) out[key] = this.errors[key];
    }
    return out;
  }

  get canGenerate(): boolean {
    return !this.generating && Object.keys(this.errors).length === 0;
  }

  setField<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    this.form[key] = value;
    this.error = null;
  }

  touch(key: keyof ReportFormErrors) {
    this.touched[key] = true;
  }

  /** Called by the screen with the signed-in role; preselects `recruitId` from `/recruits/{id}` when given. */
  init(role: Role, recruitId?: string | null) {
    if (this.role !== role) {
      this.role = role;
      this.recruits = [];
      this.recruitsError = null;
    }
    if (recruitId) this.form.recruitId = recruitId;
    if (role === "NEW_RECRUIT") this.form.recruitId = "";
    else void this.loadRecruits();
  }

  async loadRecruits(): Promise<void> {
    if (this.role === null || this.role === "NEW_RECRUIT") return;
    const role = this.role;
    const seq = ++this.recruitsSeq;
    this.recruitsLoading = true;
    this.recruitsError = null;
    try {
      const options = role === "ADMIN" ? await this.loadAllRecruits() : await this.loadMyRecruits();
      if (seq !== this.recruitsSeq) return;
      runInAction(() => {
        this.recruits = options;
        this.recruitsLoading = false;
        if (this.form.recruitId && !options.some((r) => r.id === this.form.recruitId)) {
          this.recruits = [...options, { id: this.form.recruitId, fullName: "Selected recruit", email: this.form.recruitId }];
        }
      });
    } catch (e) {
      if (seq !== this.recruitsSeq) return;
      runInAction(() => {
        this.recruitsLoading = false;
        this.recruitsError = e instanceof ApiError ? e.message : "Could not load recruits";
      });
    }
  }

  private async loadMyRecruits(): Promise<RecruitOption[]> {
    const out: RecruitOption[] = [];
    for (let page = 0, pages = 1; page < pages; page++) {
      const res = await this.api.listMyRecruits({ page, size: 100, sort: "fullName,asc" });
      pages = res.totalPages;
      out.push(...res.items.map((r) => toOption(r.recruit)));
    }
    return out;
  }

  private async loadAllRecruits(): Promise<RecruitOption[]> {
    const out: RecruitOption[] = [];
    for (let page = 0, pages = 1; page < pages; page++) {
      const res = await this.api.listUsers({ role: "NEW_RECRUIT", status: "ACTIVE", page, size: 100, sort: "fullName,asc" });
      pages = res.totalPages;
      out.push(...res.items.map(toOption));
    }
    return out;
  }

  /** Validates, fetches the document and triggers the browser download. Resolves `true` on success. */
  async generate(): Promise<boolean> {
    this.submitted = true;
    if (Object.keys(this.errors).length > 0 || this.generating) return false;
    const query: ReportQuery = {
      recruitId: this.form.recruitId || undefined,
      from: this.form.from,
      to: this.form.to,
      type: this.form.type,
      format: this.form.format,
    };
    const seq = ++this.generateSeq;
    this.generating = true;
    this.error = null;
    this.feedbackOmitted = false;
    try {
      const report = await this.api.reports.generate(query);
      if (seq !== this.generateSeq) return false;
      saveDownloadedFile(report);
      runInAction(() => {
        this.generating = false;
        this.lastDownloaded = report.filename;
        this.feedbackOmitted = report.feedbackOmitted;
      });
      return true;
    } catch (e) {
      if (seq !== this.generateSeq) return false;
      runInAction(() => {
        this.generating = false;
        this.error = reportErrorMessage(e);
      });
      return false;
    }
  }

  /** Error banner "Retry": re-runs the last generate with the current form. */
  retry(): Promise<boolean> {
    return this.generate();
  }

  clear() {
    this.recruitsSeq += 1;
    this.generateSeq += 1;
    this.form = { recruitId: "", ...defaultRange(), type: "COMBINED", format: "PDF" };
    this.touched = {};
    this.submitted = false;
    this.role = null;
    this.recruits = [];
    this.recruitsLoading = false;
    this.recruitsError = null;
    this.generating = false;
    this.error = null;
    this.lastDownloaded = null;
    this.feedbackOmitted = false;
  }
}

function toOption(u: UserSummary): RecruitOption {
  return { id: u.id, fullName: u.fullName, email: u.email };
}
