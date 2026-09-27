"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { RootStore } from "@/stores/RootStore";

const StoreContext = createContext<RootStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new RootStore());
  const router = useRouter();

  useEffect(() => {
    store.auth.setRedirectToLogin(() => router.replace("/login"));
    store.auth.hydrate();
  }, [store, router]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStores(): RootStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStores must be used within a StoreProvider");
  }
  return store;
}
