"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { RootStore } from "@/stores/RootStore";

const StoreContext = createContext<RootStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new RootStore());
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStores(): RootStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStores must be used within a StoreProvider");
  }
  return store;
}
