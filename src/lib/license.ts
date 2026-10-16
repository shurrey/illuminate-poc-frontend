export type License = "core" | "premium";

export const LEARN_REFUSAL = "This query uses LEARN data, which is available with Illuminate Premium.";
export const PREVIEW_REFUSAL = "Data preview for LEARN tables is available with Illuminate Premium";

export interface PreviewState {
  visible: boolean;
  enabled: boolean;
  reason?: string;
}

export function isLearnSchema(schema: string): boolean {
  return schema.toUpperCase() === "LEARN";
}

/** An unknown license (tenant not loaded or failed) is treated as Core for LEARN. */
export function previewState(license: License | null, schema: string, isAdmin: boolean): PreviewState {
  if (!isAdmin) return { visible: false, enabled: false };
  if (license !== "premium" && isLearnSchema(schema)) {
    return { visible: true, enabled: false, reason: PREVIEW_REFUSAL };
  }
  return { visible: true, enabled: true };
}

// A LEARN schema qualifier: optionally quoted, not part of a longer identifier, followed by a dot.
// `$` is allowed before it so `$$LEARN.X$$` (dollar-quoted strings) matches.
const LEARN_QUALIFIER = /(?<!\w)"?learn"?\s*\./i;

/** Comments are blanked first so `LEARN/**\/.X` is caught; false positives are acceptable. */
export function referencesLearn(sql: string): boolean {
  return LEARN_QUALIFIER.test(sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " "));
}

export type DetailTab = "schema" | "data";

/** The Data tab is only effective while preview is enabled for the current table. */
export function effectiveTab(active: DetailTab, preview: PreviewState): DetailTab {
  return active === "data" && !preview.enabled ? "schema" : active;
}
