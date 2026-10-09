import { CheckCircle2, X } from "lucide-react";

export function SavedNotice({ name, hint, onView, onDismiss }: {
  name: string;
  hint?: string;
  onView?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div role="status" className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
      <CheckCircle2 size={16} className="flex-shrink-0" />
      <span className="flex-1">Saved <strong>{name}</strong> to My Queries.{hint ? ` ${hint}` : ""}</span>
      {onView && <button onClick={onView} className="font-medium text-emerald-700 hover:underline">View in My Queries</button>}
      <button onClick={onDismiss} aria-label="Dismiss" className="text-emerald-600 hover:text-emerald-800"><X size={14} /></button>
    </div>
  );
}
