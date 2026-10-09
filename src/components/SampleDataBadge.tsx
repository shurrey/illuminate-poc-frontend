/** Marks a surface whose numbers are illustrative, not drawn from the semantic layer. */
export function SampleDataBadge() {
  return (
    <span title="Illustrative data, not from your institution"
      className="ml-2 align-middle px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-medium uppercase tracking-wide">
      Sample data
    </span>
  );
}
