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
const LEARN_QUALIFIER = /(?<![\w$])"?learn"?\s*\./i;

export function referencesLearn(sql: string): boolean {
  return LEARN_QUALIFIER.test(sql);
}
