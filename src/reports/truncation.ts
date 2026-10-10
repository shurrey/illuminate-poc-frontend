/** Whether a query's rows may be incomplete: it returned exactly its limit (100 by default), or the server capped it. */
export function wasCut(run: { rows: unknown[]; contract: { limit?: number }; truncated?: boolean }): boolean {
  return !!run.truncated || run.rows.length >= (run.contract.limit ?? 100);
}
