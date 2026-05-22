import type { QueryParameter } from "@/types/chat";

/**
 * Extract :bind_variable placeholders from SQL and return QueryParameter objects.
 * Ignores :param inside string literals and comments.
 * If explicit parameters are provided, merges them (explicit wins).
 */
export function extractBindVariables(sql: string, explicit?: QueryParameter[]): QueryParameter[] {
  // Build a map of explicitly provided parameters
  const explicitMap = new Map<string, QueryParameter>();
  if (explicit) {
    explicit.forEach((p) => explicitMap.set(p.name.toUpperCase(), p));
  }

  // Strip string literals and comments to avoid false positives
  const cleaned = sql
    .replace(/'[^']*'/g, "''")           // remove string contents
    .replace(/--[^\n]*/g, "")            // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, "");   // remove block comments

  // Find all :PARAM_NAME patterns (word chars after colon, not ::cast)
  const regex = /(?<!:):([A-Za-z_]\w*)/g;
  const found = new Set<string>();
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    found.add(match[1].toUpperCase());
  }

  if (found.size === 0) return explicit || [];

  // Build parameters — use explicit metadata if available, otherwise infer
  const params: QueryParameter[] = [];
  for (const name of found) {
    if (explicitMap.has(name)) {
      params.push(explicitMap.get(name)!);
    } else {
      // Infer a reasonable label and type from the name
      const label = name
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const lowerName = name.toLowerCase();
      let type: QueryParameter["type"] = "text";
      if (lowerName.includes("date") || lowerName.includes("time")) type = "date";
      else if (lowerName.includes("id") || lowerName.includes("count") || lowerName.includes("threshold") || lowerName.includes("min") || lowerName.includes("max") || lowerName.includes("limit")) type = "number";

      params.push({
        name: name,
        label,
        type,
        required: true,
        placeholder: `Enter ${label.toLowerCase()}`,
      });
    }
  }

  return params;
}

/**
 * Replace :PARAM bind variables in SQL with literal values for execution.
 */
export function substituteParams(sql: string, values: Record<string, string>): string {
  let result = sql;
  for (const [name, value] of Object.entries(values)) {
    if (!value && value !== "0") continue;
    // Replace :NAME with the value — quote strings, leave numbers bare
    const isNumeric = /^\d+(\.\d+)?$/.test(value);
    const replacement = isNumeric ? value : `'${value.replace(/'/g, "''")}'`;
    const regex = new RegExp(`:${name}\\b`, "gi");
    result = result.replace(regex, replacement);
  }
  return result;
}
