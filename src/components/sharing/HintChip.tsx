import type { GovernanceHint } from "@/types/queryBuilder";
import { hintLabel } from "@/lib/savedQuery";

const HINT_STYLES: Record<GovernanceHint, string> = {
  governed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-800 border-amber-200",
  ungoverned: "bg-gray-100 text-gray-600 border-gray-200",
};

/** The list-time governance guess; a run's provenance bar is the real label. */
export function HintChip({ hint, sql }: { hint: GovernanceHint; sql?: boolean }) {
  return (
    <span title="The label its last run would carry; each run is labelled from what actually ran"
      className={`flex-shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-medium ${HINT_STYLES[hint]}`}>
      {sql ? `SQL · ${hintLabel(hint)}` : hintLabel(hint)}
    </span>
  );
}
