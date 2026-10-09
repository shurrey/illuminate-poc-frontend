"use client";

import { useCallback, useEffect, useState } from "react";
import { getCatalog } from "@/services/semanticApi";
import type { SemanticCatalog } from "@/types/semantic";

/** The catalog, loaded once; reload() revalidates it (cheap when unchanged, thanks to the ETag). */
export function useSemanticCatalog(): { catalog: SemanticCatalog | null; error: string | null; reload: () => void } {
  const [catalog, setCatalog] = useState<SemanticCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    getCatalog()
      .then((c) => { if (live) { setCatalog(c); setError(null); } })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load the catalog"));
    return () => { live = false; };
  }, [version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { catalog, error, reload };
}
