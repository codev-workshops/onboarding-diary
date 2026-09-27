---
name: frontend-mobx-conventions
description: MobX store conventions for the Next.js frontend (store shape, root store/context, observer components, SSE into stores).
---

# Frontend MobX conventions

## Store shape

```ts
import { makeAutoObservable, runInAction } from "mobx";

export class DiaryStore {
  entries: DiaryEntry[] = [];
  loading = false;

  constructor(private api: ApiClient) {
    makeAutoObservable(this);
  }

  async load() {
    this.loading = true;
    const entries = await this.api.listEntries();
    runInAction(() => {
      this.entries = entries;
      this.loading = false;
    });
  }
}
```

## Root store + context

```ts
export class RootStore {
  auth = new AuthStore(api);
  diary = new DiaryStore(api);
}
export const StoreContext = createContext<RootStore | null>(null);
export const useStores = () => useContext(StoreContext)!;
```

## Components

```tsx
export const EntryList = observer(() => {
  const { diary } = useStores();
  return <ul>{diary.entries.map(e => <li key={e.id}>{e.title}</li>)}</ul>;
});
```

## Calling the API from a store (S1 pattern)

```ts
// 1. add a typed method to src/lib/apiClient.ts (one per openapi operationId)
listTasks(): Promise<Task[]> { return this.request<Task[]>("GET", "/tasks"); }

// 2. call it from a store action; the client already attaches the bearer
//    token from AuthStore and clears/redirects on 401
async load() {
  this.loading = true;
  try {
    const tasks = await this.api.listTasks();
    runInAction(() => { this.tasks = tasks; });
  } catch (e) {
    runInAction(() => { this.errors = toFormErrors(e); }); // ApiError -> { form?, fields }
  } finally {
    runInAction(() => { this.loading = false; });
  }
}
```

Guard pages with `<RequireAuth>` / `<RequireRole roles={["ADMIN"]}>`; read the
current user via `useStores().auth.user` — never from the token.

## SSE into a store

```ts
subscribe() {
  this.source = new EventSource(`${API_URL}/events`);
  this.source.onmessage = (ev) =>
    runInAction(() => this.entries.push(JSON.parse(ev.data)));
}
close() { this.source?.close(); }
```

Rules: mutate state only in actions; wrap components in `observer`; keep
transient UI state local; close streams on unmount/logout.
