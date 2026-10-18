import { describe, expect, it } from "vitest";
import {
  addRecipient, canShareCard, draftOf, hiddenForRole, isDirty, isPinnedShared, isShared, ownersNoteLine, pickable,
  pinnedShareIds, recipientDiff, removeRecipient, searchTerm, setTenant, shareRequestBody, shareStatus, sharedEntries,
  keepShared, toSharedEntry,
} from "./sharing";

const ann = { sub: "s-ann", name: "Ann" };
const bob = { sub: "s-bob", name: "Bob" };

describe("share draft", () => {
  it("starts from the server's share view", () => {
    expect(draftOf({ share_id: "sh_1", recipients: [ann], tenant: true })).toEqual({ recipients: [ann], tenant: true });
  });

  it("starts empty when the item is not shared", () => {
    expect(draftOf({ share_id: null, recipients: [], tenant: false })).toEqual({ recipients: [], tenant: false });
  });

  it("adds a recipient once, keeping only sub and name", () => {
    const d = addRecipient({ recipients: [], tenant: false }, { ...ann, email: "ann@x.edu" });
    expect(d.recipients).toEqual([ann]);
    expect(addRecipient(d, ann)).toBe(d);
  });

  it("removes a recipient by sub", () => {
    expect(removeRecipient({ recipients: [ann, bob], tenant: false }, "s-ann").recipients).toEqual([bob]);
  });

  it("toggles everyone in the tenant", () => {
    expect(setTenant({ recipients: [ann], tenant: false }, true)).toEqual({ recipients: [ann], tenant: true });
  });

  it("builds the PUT body from subs and the tenant flag", () => {
    expect(shareRequestBody({ recipients: [ann, bob], tenant: false })).toEqual({ recipients: ["s-ann", "s-bob"], tenant: false });
  });

  it("is shared when it has a recipient or the tenant flag", () => {
    expect(isShared({ recipients: [], tenant: false })).toBe(false);
    expect(isShared({ recipients: [], tenant: true })).toBe(true);
    expect(isShared({ recipients: [ann], tenant: false })).toBe(true);
  });
});

describe("recipientDiff", () => {
  it("lists who was added and removed and whether the tenant flag changed", () => {
    const before = { recipients: [ann], tenant: false };
    const after = { recipients: [bob], tenant: true };
    expect(recipientDiff(before, after)).toEqual({ added: [bob], removed: [ann], tenantChanged: true });
  });

  it("ignores reordering", () => {
    const diff = recipientDiff({ recipients: [ann, bob], tenant: false }, { recipients: [bob, ann], tenant: false });
    expect(diff).toEqual({ added: [], removed: [], tenantChanged: false });
    expect(isDirty({ recipients: [ann, bob], tenant: false }, { recipients: [bob, ann], tenant: false })).toBe(false);
  });

  it("is dirty after any change", () => {
    expect(isDirty({ recipients: [], tenant: false }, { recipients: [], tenant: true })).toBe(true);
    expect(isDirty({ recipients: [ann], tenant: false }, { recipients: [], tenant: false })).toBe(true);
  });
});

describe("people picker", () => {
  it("searches only for a non-blank term, trimmed", () => {
    expect(searchTerm("   ")).toBeNull();
    expect(searchTerm("  ann ")).toBe("ann");
  });

  it("omits people already chosen from the results", () => {
    const results = [{ ...ann, email: "a@x" }, { ...bob, email: "b@x" }];
    expect(pickable(results, { recipients: [ann], tenant: false })).toEqual([{ ...bob, email: "b@x" }]);
  });
});

describe("shareStatus", () => {
  it("names the tenant when shared with everyone", () => {
    expect(shareStatus({ tenant: true, count: 2 }, "State U")).toBe("Shared with everyone at State U");
    expect(shareStatus({ tenant: true, count: 0 })).toBe("Shared with everyone in your organization");
  });

  it("counts people", () => {
    expect(shareStatus({ tenant: false, count: 1 })).toBe("Shared with 1 person");
    expect(shareStatus({ tenant: false, count: 3 })).toBe("Shared with 3 people");
  });

  it("is null when not shared or the summary is missing or malformed", () => {
    expect(shareStatus({ tenant: false, count: 0 })).toBeNull();
    expect(shareStatus(undefined)).toBeNull();
    expect(shareStatus(true)).toBeNull();
  });
});

describe("shared-with-me entries", () => {
  const query = {
    share_id: "sh_0123456789abcdef", item_kind: "query", name: "Active students", owners_note: "Weekly check",
    owner: { name: "Ann" }, query_kind: "governed", governance_hint: "governed", shared_at: "2026-10-17T00:00:00Z",
  };

  it("maps a query", () => {
    expect(toSharedEntry(query)).toEqual({
      shareId: "sh_0123456789abcdef", kind: "query", title: "Active students", ownerName: "Ann", note: "Weekly check",
      hint: "governed", isSql: false, format: undefined, sharedAt: "2026-10-17T00:00:00Z",
    });
  });

  it("maps a card by its label and format, labelled governed", () => {
    const card = { share_id: "sh_1", item_kind: "card", label: "Retention", owners_note: "", owner: { name: "Bob" }, format: "ratio" };
    expect(toSharedEntry(card)).toMatchObject({ kind: "card", title: "Retention", note: null, hint: "governed", format: "ratio", sharedAt: null });
  });

  it("never labels an SQL query governed", () => {
    expect(toSharedEntry({ ...query, query_kind: "sql", governance_hint: "governed" })).toMatchObject({ isSql: true, hint: "partial" });
    expect(toSharedEntry({ ...query, query_kind: "sql", governance_hint: undefined })).toMatchObject({ hint: "ungoverned" });
  });

  it("reads an unknown hint as ungoverned", () => {
    expect(toSharedEntry({ ...query, governance_hint: "mostly" })?.hint).toBe("ungoverned");
  });

  it("falls back for a missing name or owner", () => {
    expect(toSharedEntry({ share_id: "sh_2", item_kind: "query" })).toMatchObject({ title: "Untitled", ownerName: "A colleague" });
  });

  it("drops entries without a share id or with an unknown kind", () => {
    expect(toSharedEntry({ item_kind: "query" })).toBeNull();
    expect(toSharedEntry({ share_id: "sh_3", item_kind: "report" })).toBeNull();
    expect(toSharedEntry(null)).toBeNull();
  });

  it("reads the list response and filters by kind", () => {
    const body = { items: [query, { share_id: "sh_4", item_kind: "card", label: "L" }, { bad: true }] };
    expect(sharedEntries(body).map((e) => e.shareId)).toEqual(["sh_0123456789abcdef", "sh_4"]);
    expect(sharedEntries(body, "card").map((e) => e.shareId)).toEqual(["sh_4"]);
    expect(sharedEntries({})).toEqual([]);
  });

  it("writes the owner's note line only when there is a note", () => {
    expect(ownersNoteLine("  Weekly check ")).toBe("Owner's note: Weekly check");
    expect(ownersNoteLine("  ")).toBeNull();
    expect(ownersNoteLine(null)).toBeNull();
  });
});

type Detail = Parameters<typeof hiddenForRole>[0] & Record<string, unknown>;
const view = (d: Detail) => d;

describe("hiddenForRole", () => {
  it("is true for a redacted view with masked values", () => {
    expect(hiddenForRole(view({ redacted: true, sql: "select * from t where name = '…'" }))).toBe(true);
    expect(hiddenForRole(view({ redacted: true, contract: { filters: [{ dimension: "d", op: "eq", values: ["…"] }] } }))).toBe(true);
  });

  it("is true when the SQL text was withheld", () => {
    expect(hiddenForRole(view({ redacted: true, sql: null, note: "hidden" }))).toBe(true);
  });

  it("is false for a redacted view where nothing was masked", () => {
    expect(hiddenForRole(view({ redacted: true, contract: { metrics: ["m.a"] } }))).toBe(false);
  });

  it("is false for an unredacted view even if a value contains an ellipsis", () => {
    expect(hiddenForRole(view({ redacted: false, sql: "select '…'" }))).toBe(false);
  });
});

describe("pinned shared cards", () => {
  it("recognises a pinned shared card by its flag and id", () => {
    expect(isPinnedShared({ id: "sh_0123456789abcdef", shared: true })).toBe(true);
    expect(isPinnedShared({ id: "c_0123456789ab", shared: { tenant: true, count: 0 } })).toBe(false);
    expect(isPinnedShared({ id: "sh_1" })).toBe(false);
  });

  it("collects the share ids already on the home page", () => {
    const cards = [{ id: "sh_a", shared: true as const }, { id: "c_1" }, { id: "active" }];
    expect([...pinnedShareIds(cards)]).toEqual(["sh_a"]);
  });

  it("shares only the user's own custom cards", () => {
    expect(canShareCard({ id: "c_1", isBuiltIn: false })).toBe(true);
    expect(canShareCard({ id: "active", isBuiltIn: true })).toBe(false);
    expect(canShareCard({ id: "sh_a", isBuiltIn: false, shared: true })).toBe(false);
  });
});

type Item = { id: string; name?: string; shared?: { tenant: boolean; count: number } };

describe("keepShared", () => {
  it("carries the previous share summary onto an update response that lacks one", () => {
    const saved = keepShared<Item>({ id: "q_1", shared: { tenant: true, count: 0 } }, { id: "q_1", name: "New" });
    expect(saved).toEqual({ id: "q_1", name: "New", shared: { tenant: true, count: 0 } });
  });

  it("keeps a summary the response does carry", () => {
    expect(keepShared<Item>({ id: "q_1", shared: { tenant: true, count: 0 } }, { id: "q_1", shared: { tenant: false, count: 2 } }))
      .toEqual({ id: "q_1", shared: { tenant: false, count: 2 } });
  });

  it("adds nothing when there was no previous summary", () => {
    expect(keepShared<Item>(undefined, { id: "q_1" })).toEqual({ id: "q_1" });
    expect(keepShared<Item>({ id: "q_1" }, { id: "q_1" })).toEqual({ id: "q_1" });
  });
});
