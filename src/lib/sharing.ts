import type { CardFormat } from "@/data/dashboardCards";
import type { GovernanceHint } from "@/types/queryBuilder";

export type ItemKind = "query" | "card";
export interface DirectoryUser { sub: string; name: string; email: string }
export interface Recipient { sub: string; name: string }
/** GET/PUT …/share; share_id is null when the item is not shared. */
export interface ShareView { share_id: string | null; recipients: Recipient[]; tenant: boolean }
/** What an owner's list carries per item. */
export interface ShareSummary { tenant: boolean; count: number }
export interface ShareDraft { recipients: Recipient[]; tenant: boolean }

export const draftOf = (view: ShareView): ShareDraft =>
  ({ recipients: view.recipients.map(({ sub, name }) => ({ sub, name })), tenant: view.tenant });

export function addRecipient(d: ShareDraft, { sub, name }: Recipient | DirectoryUser): ShareDraft {
  if (d.recipients.some((r) => r.sub === sub)) return d;
  return { ...d, recipients: [...d.recipients, { sub, name }] };
}

export const removeRecipient = (d: ShareDraft, sub: string): ShareDraft =>
  ({ ...d, recipients: d.recipients.filter((r) => r.sub !== sub) });

export const setTenant = (d: ShareDraft, tenant: boolean): ShareDraft => ({ ...d, tenant });

export const shareRequestBody = (d: ShareDraft) => ({ recipients: d.recipients.map((r) => r.sub), tenant: d.tenant });

export const isShared = (d: ShareDraft) => d.tenant || d.recipients.length > 0;

export function recipientDiff(before: ShareDraft, after: ShareDraft) {
  const had = new Set(before.recipients.map((r) => r.sub));
  const has = new Set(after.recipients.map((r) => r.sub));
  return {
    added: after.recipients.filter((r) => !had.has(r.sub)),
    removed: before.recipients.filter((r) => !has.has(r.sub)),
    tenantChanged: before.tenant !== after.tenant,
  };
}

export function isDirty(before: ShareDraft, after: ShareDraft): boolean {
  const { added, removed, tenantChanged } = recipientDiff(before, after);
  return tenantChanged || added.length > 0 || removed.length > 0;
}

/** The directory search term, or null when there is nothing to search for. */
export function searchTerm(q: string): string | null {
  const t = q.trim();
  return t ? t : null;
}

export const pickable = (results: DirectoryUser[], d: ShareDraft) =>
  results.filter((u) => !d.recipients.some((r) => r.sub === u.sub));

const isSummary = (s: unknown): s is ShareSummary =>
  !!s && typeof s === "object" && typeof (s as ShareSummary).tenant === "boolean" && typeof (s as ShareSummary).count === "number";

/** The owner-facing line for an item's share, or null when it isn't shared. */
export function shareStatus(summary: unknown, tenantName?: string | null): string | null {
  if (!isSummary(summary)) return null;
  if (summary.tenant) return `Shared with everyone ${tenantName ? `at ${tenantName}` : "in your organization"}`;
  if (summary.count > 0) return `Shared with ${summary.count} ${summary.count === 1 ? "person" : "people"}`;
  return null;
}

export interface SharedEntry {
  shareId: string;
  kind: ItemKind;
  title: string;
  ownerName: string;
  note: string | null;
  hint: GovernanceHint;
  isSql: boolean;
  format?: CardFormat;
  sharedAt: string | null;
}

const HINTS: GovernanceHint[] = ["governed", "partial", "ungoverned"];
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** A card is a governed contract; an SQL query is at most partly governed; anything unrecognised is ungoverned. */
function sharedHint(kind: ItemKind, isSql: boolean, raw: unknown): GovernanceHint {
  if (kind === "card") return "governed";
  const hint = HINTS.includes(raw as GovernanceHint) ? (raw as GovernanceHint) : "ungoverned";
  return isSql && hint === "governed" ? "partial" : hint;
}

/** One GET /shared item for display, or null when it is malformed. */
export function toSharedEntry(raw: unknown): SharedEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const shareId = str(r.share_id);
  const kind = r.item_kind === "query" || r.item_kind === "card" ? r.item_kind : null;
  if (!shareId || !kind) return null;
  const isSql = kind === "query" && r.query_kind === "sql";
  const owner = r.owner && typeof r.owner === "object" ? str((r.owner as Record<string, unknown>).name) : null;
  return {
    shareId, kind,
    title: str(kind === "card" ? r.label : r.name) ?? "Untitled",
    ownerName: owner ?? "A colleague",
    note: str(r.owners_note),
    hint: sharedHint(kind, isSql, r.governance_hint),
    isSql,
    format: kind === "card" ? (r.format as CardFormat) : undefined,
    sharedAt: str(r.shared_at),
  };
}

export function sharedEntries(body: unknown, kind?: ItemKind): SharedEntry[] {
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items.map(toSharedEntry).filter((e): e is SharedEntry => !!e && (!kind || e.kind === kind));
}

export const ownersNoteLine = (note: string | null | undefined) => {
  const n = str(note);
  return n ? `Owner's note: ${n}` : null;
};

/** True when the server masked values in this view (`…` stands in for each one) or withheld the SQL entirely. */
export function hiddenForRole(detail: { redacted?: boolean; sql?: string | null }): boolean {
  if (detail.redacted !== true) return false;
  return detail.sql === null || JSON.stringify(detail).includes("…");
}

interface CardLike { id: string; isBuiltIn?: boolean; shared?: unknown }

export const isPinnedShared = (card: CardLike) => card.shared === true && card.id.startsWith("sh_");

export const pinnedShareIds = (cards: CardLike[]) => new Set(cards.filter(isPinnedShared).map((c) => c.id));

export const canShareCard = (card: CardLike) => !card.isBuiltIn && !isPinnedShared(card);

/** An update response replacing a listed item; the response carries no share summary, so the previous one is kept. */
export function keepShared<T extends { shared?: unknown }>(prev: Partial<T> | undefined, saved: T): T {
  if (saved.shared !== undefined || prev?.shared === undefined) return saved;
  return { ...saved, shared: prev.shared };
}
