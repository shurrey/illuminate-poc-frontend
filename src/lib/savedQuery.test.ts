import { describe, expect, it } from "vitest";
import {
  conversionFullyGoverned, hintLabel, hintOf, partsReferencedBy, queryRequestBody, savedQueryFromArtifact,
  sqlRunRequest, unmappedItems,
} from "./savedQuery";
import type { GovernedSavedQuery, SqlSavedQuery } from "@/types/queryBuilder";
import type { Artifact } from "@/types/chat";

const base = { id: "q1", name: "N", description: "D", createdAt: "2026-10-17T00:00:00Z", lastUsedAt: null };
const governed: GovernedSavedQuery = { ...base, prompt: "P", contract: { metrics: ["metric.a"] } };
const sql: SqlSavedQuery = {
  ...base, query_kind: "sql", sql: "select * from active", governed_parts: { active: { metrics: ["metric.a"] } },
};

describe("queryRequestBody", () => {
  it("sends a governed query's contract fields", () => {
    expect(queryRequestBody(governed)).toEqual({
      name: "N", description: "D", query_kind: "governed", prompt: "P", contract: { metrics: ["metric.a"] },
    });
  });
  it("sends an SQL query's SQL and governed parts, and nothing of the governed kind", () => {
    expect(queryRequestBody(sql)).toEqual({
      name: "N", description: "D", query_kind: "sql", sql: "select * from active",
      governed_parts: { active: { metrics: ["metric.a"] } },
    });
  });
  it("treats a query without a kind as governed", () => {
    expect(queryRequestBody({ ...governed, query_kind: undefined }).query_kind).toBe("governed");
  });
});

describe("sqlRunRequest", () => {
  it("omits governed when there are no parts", () => {
    expect(sqlRunRequest("select 1", {})).toEqual({ sql: "select 1" });
  });
  it("passes the parts as governed", () => {
    expect(sqlRunRequest("select * from a", { a: { metrics: ["m"] } })).toEqual({
      sql: "select * from a", governed: { a: { metrics: ["m"] } },
    });
  });
});

describe("hintOf", () => {
  it("uses the server's hint when present", () => {
    expect(hintOf({ ...sql, governance_hint: "ungoverned" })).toBe("ungoverned");
  });
  it("derives it otherwise", () => {
    expect(hintOf(governed)).toBe("governed");
    expect(hintOf(sql)).toBe("partial");
    expect(hintOf({ ...sql, governed_parts: {} })).toBe("ungoverned");
  });
  it("never reads an unknown server hint as governed", () => {
    expect(hintOf({ ...governed, governance_hint: "bogus" as never })).toBe("ungoverned");
  });
});

describe("hintLabel", () => {
  it("names each hint", () => {
    expect(hintLabel("governed")).toBe("Governed");
    expect(hintLabel("partial")).toBe("Partly governed");
    expect(hintLabel("ungoverned")).toBe("Ungoverned");
  });
});

const table = (extra: Partial<Artifact>): Artifact =>
  ({ id: "a1", type: "table", data: { columns: ["x"], rows: [] }, title: "Active courses", ...extra });
const opts = { id: "new", now: "2026-10-17T01:00:00Z" };

describe("savedQueryFromArtifact", () => {
  it("saves a governed result's contract", () => {
    const q = savedQueryFromArtifact(table({ kind: "semantic", query: { metrics: ["m"] }, sql: "compiled" }), opts);
    expect(q).toEqual({
      id: "new", name: "Active courses", description: "", prompt: "", contract: { metrics: ["m"] },
      query_kind: "governed", createdAt: opts.now, lastUsedAt: null,
    });
  });
  it("saves an SQL result's outer SQL and governed parts, not the executed SQL", () => {
    const q = savedQueryFromArtifact(table({
      kind: "sql", sql: "select * from p", executed_sql: "with p as (...) select * from p",
      governed_parts: { p: { metrics: ["m"] } },
    }), opts);
    expect(q).toEqual({
      id: "new", name: "Active courses", description: "", query_kind: "sql", sql: "select * from p",
      governed_parts: { p: { metrics: ["m"] } }, createdAt: opts.now, lastUsedAt: null,
    });
  });
  it("saves an SQL result without parts as ungoverned SQL", () => {
    const q = savedQueryFromArtifact(table({ kind: "sql", sql: "select 1" }), opts);
    expect(q).toMatchObject({ query_kind: "sql", sql: "select 1", governed_parts: {} });
  });
  it("never saves an SQL result's contract-looking fields as governed", () => {
    const q = savedQueryFromArtifact(table({ kind: "sql", sql: "select 1", query: { metrics: ["m"] } }), opts);
    expect(q?.query_kind).toBe("sql");
  });
  it("returns null for anything that is not a table with a query behind it", () => {
    expect(savedQueryFromArtifact(table({}), opts)).toBeNull();
    expect(savedQueryFromArtifact({ ...table({ kind: "sql", sql: "select 1" }), type: "chart" }, opts)).toBeNull();
  });
  it("names an untitled result", () => {
    expect(savedQueryFromArtifact(table({ kind: "sql", sql: "select 1", title: undefined }), opts)?.name)
      .toBe("Query result");
  });
});

describe("unmappedItems", () => {
  it("reads the bullets under 'Not mapped'", () => {
    const answer = "Mapped to metric.a.\n\n**Not mapped**\n- the join to notes\n* the HAVING filter\n\nResults may differ.";
    expect(unmappedItems(answer)).toEqual(["the join to notes", "the HAVING filter"]);
  });
  it("ignores 'none' and an absent section", () => {
    expect(unmappedItems("## Not mapped\n- None")).toEqual([]);
    expect(unmappedItems("Not mapped: nothing.\n")).toEqual([]);
    expect(unmappedItems("All of it maps.")).toEqual([]);
  });
});

describe("conversionFullyGoverned", () => {
  it("needs a contract and nothing unmapped", () => {
    expect(conversionFullyGoverned({ metrics: ["m"] }, "Not mapped\n- None")).toBe(true);
    expect(conversionFullyGoverned({ metrics: ["m"] }, "Not mapped\n- the join")).toBe(false);
    expect(conversionFullyGoverned(null, "Not mapped\n- None")).toBe(false);
  });
});

describe("partsReferencedBy", () => {
  const parts = { active: { metrics: ["m"] }, grades: { metrics: ["g"] } };
  it("keeps only the parts the SQL reads from", () => {
    expect(partsReferencedBy("select * from Active a join x on 1=1", parts)).toEqual({ active: { metrics: ["m"] } });
  });
  it("does not match a name inside a longer identifier", () => {
    expect(partsReferencedBy("select * from inactive_rows", parts)).toEqual({});
  });
  it("handles no parts", () => {
    expect(partsReferencedBy("select 1", undefined)).toEqual({});
  });
});
