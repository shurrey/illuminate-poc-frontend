"use client";

import { useEffect, useState } from "react";
import { getCatalog } from "@/services/semanticApi";
import type { SemanticCatalog } from "@/types/semantic";

export function useSemanticCatalog(): { catalog: SemanticCatalog | null; error: string | null } {
  const [catalog, setCatalog] = useState<SemanticCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getCatalog()
      .then((c) => live && setCatalog(c))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load the catalog"));
    return () => { live = false; };
  }, []);
  return { catalog, error };
}
