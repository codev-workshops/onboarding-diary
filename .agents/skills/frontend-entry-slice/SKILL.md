---
name: frontend-entry-slice
description: Checklist for adding a new recruit entry slice (S4 questions, S5 issues, S6 reflections...) to the Next.js frontend by copying the S3 task slice and appending one line per shared registry — never editing shared code.
---

# Adding an entry slice (copy S3, append to registries)

The S3 task slice is the reference. For a new resource `<res>` (e.g. `questions`)
create the files in the left column and append **exactly one line** at each
marker in the right column. Nothing else in shared code changes.

| Create (slice-owned) | Append (shared, one line) |
|----------------------|---------------------------|
| `src/lib/api/<res>.ts` | `src/lib/apiClient.ts`: `export * from "@/lib/api/<res>";` + `readonly <res> = new <Res>Api(this);` |
| `src/stores/<Res>Store.ts` | `src/stores/RootStore.ts`: `readonly <res>: <Res>Store;` + `this.<res> = this.register(new <Res>Store(api));` |
| `src/features/<res>/registry.tsx` | `src/lib/registry/index.ts`: `registerNavItems(<RES>_NAV_ITEM);` and `registerRecruitTabs(<RES>_RECRUIT_TAB);` |
| `src/features/<res>/{labels.tsx,<res>Form.ts,<Res>ListView.tsx}` | — |
| `src/app/<res>/page.tsx`, `src/app/<res>/new/page.tsx`, `src/app/<res>/[id]/page.tsx` | — |
| `src/stores/<Res>Store.test.ts`, `src/features/<res>/<res>Form.test.ts` | — |

## 1. API module

```ts
// src/lib/api/questions.ts
import { type ApiTransport, type EntryApi, type EntryBase, type EntryListQuery, type Page, toQuery } from "@/lib/api/core";

export type QuestionStatus = "OPEN" | "ANSWERED";
export interface Question extends EntryBase { text: string; status: QuestionStatus; /* ... */ }
export interface QuestionCreateRequest { entryDate: string; text: string; /* ... */ }
export interface QuestionUpdateRequest extends QuestionCreateRequest { status: QuestionStatus }
export interface ListQuestionsQuery extends EntryListQuery { status?: QuestionStatus }

export class QuestionsApi implements EntryApi<Question, QuestionCreateRequest, QuestionUpdateRequest, ListQuestionsQuery> {
  constructor(private readonly http: ApiTransport) {}
  list(q: ListQuestionsQuery = {}) { return this.http.request<Page<Question>>("GET", `/questions${toQuery(q)}`); }
  get(id: string) { return this.http.request<Question>("GET", `/questions/${id}`); }
  create(body: QuestionCreateRequest) { return this.http.request<Question>("POST", "/questions", { body }); }
  update(id: string, body: QuestionUpdateRequest) { return this.http.request<Question>("PUT", `/questions/${id}`, { body }); }
  remove(id: string) { return this.http.request<void>("DELETE", `/questions/${id}`); }
}
```

## 2. Store

```ts
// src/stores/QuestionStore.ts
export interface QuestionFilters extends EntryFilters { status: QuestionStatus | "" }
export const DEFAULT_QUESTION_FILTERS: QuestionFilters = { from: "", to: "", status: "" };

export class QuestionStore extends EntryStore<Question, QuestionCreateRequest, QuestionUpdateRequest, QuestionFilters, ListQuestionsQuery> {
  constructor(api: ApiClient) { super(api.questions, DEFAULT_QUESTION_FILTERS, "entryDate,desc"); }
  protected filterQuery(f: QuestionFilters) { return { status: f.status || undefined }; }
  protected override matchesFilters(q: Question, f: QuestionFilters) {
    return super.matchesFilters(q, f) && (!f.status || q.status === f.status);
  }
}
```

`EntryStore` already gives you `load/loadOne/create/update/remove/clear`,
`setFilters/setPage/setSort/setRecruitId`, `query`, `hasActiveFilters`,
sequence-guarded async and optimistic list patching. Do not re-implement.

## 3. Screens and registry entry

- List page: `FilterBar` (field defs) + `EntryList` + `useUrlFilters({ defaults, defaultSort, sanitize, sortOptions })`.
  `sanitize` uses `isIsoDate` for date keys and the slice's enum guards;
  `sortOptions` is the list of sort values the backend whitelists. Mirror the
  store's clamped page back to the URL as `TaskListView` does.
  Build a `<Res>ListView` that takes `{ recruitId?, readOnly?, hrefFor }` so the
  same component serves `/<res>` (recruit) and the `/recruits/{id}` tab
  (manager/admin, read-only). See `src/features/tasks/TaskListView.tsx`.
- New/edit: `EntryForm` with `fields`, `validate`, `onSubmit` (throw `ApiError`
  to get field errors mapped through `toFormErrors`).
- Detail: `ConfirmDialog` for delete; recruit-only edit; admin delete; managers
  read-only (backend returns 403 anyway).
- `src/features/<res>/registry.tsx` exports `<RES>_NAV_ITEM: NavItem`
  (`roles: ["NEW_RECRUIT"]`, `order` = slice hundreds) and
  `<RES>_RECRUIT_TAB: RecruitTab` (`id`, `label`, `order`, `component`).

## 4. Guardrails

- Never edit `AppShell.tsx`, `src/app/recruits/[id]/page.tsx`,
  `EntryStore.ts`, `src/components/entries/*` or `useUrlFilters.ts` for a
  slice. Need a new generic capability? Add an optional prop with a default
  that preserves current behaviour, in its own small PR.
- Filter keys are URL keys; keep them identical to the backend query params.
- Tests: copy `src/stores/TaskStore.test.ts` (filters → query string,
  optimistic create/update/remove) and `src/features/tasks/taskForm.test.ts`
  (client validation + `VALIDATION_FAILED`/`INVALID_STATE_TRANSITION` mapping).
- Run `npm test && npm run lint && npm run build` before opening the PR.
