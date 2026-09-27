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
