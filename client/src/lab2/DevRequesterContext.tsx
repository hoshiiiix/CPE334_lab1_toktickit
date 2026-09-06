import { createContext, useContext, useState, ReactNode } from "react";

const STORAGE_KEY = "toktickit.devRequesterId";

interface DevRequesterContextValue {
  requesterId: number | null;
  requesterName: string | null;
  selectRequester: (id: number, name: string) => void;
  clearRequester: () => void;
}

const DevRequesterContext = createContext<DevRequesterContextValue | undefined>(undefined);

// BR-03: the selection is a TESTING mechanism, not authentication, and is stored
// in sessionStorage so a new browser tab/session always starts unauthenticated.
export function DevRequesterProvider({ children }: { children: ReactNode }) {
  const [requesterId, setRequesterId] = useState<number | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? Number(JSON.parse(raw).id) : null;
  });
  const [requesterName, setRequesterName] = useState<string | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).name : null;
  });

  function selectRequester(id: number, name: string) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }));
    setRequesterId(id);
    setRequesterName(name);
  }

  function clearRequester() {
    sessionStorage.removeItem(STORAGE_KEY);
    setRequesterId(null);
    setRequesterName(null);
  }

  return (
    <DevRequesterContext.Provider
      value={{ requesterId, requesterName, selectRequester, clearRequester }}
    >
      {children}
    </DevRequesterContext.Provider>
  );
}

export function useDevRequester() {
  const ctx = useContext(DevRequesterContext);
  if (!ctx) throw new Error("useDevRequester must be used within DevRequesterProvider");
  return ctx;
}
