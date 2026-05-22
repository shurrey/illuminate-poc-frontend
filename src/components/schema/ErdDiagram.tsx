"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SchemaInfo, Relationship } from "@/services/dictionaryApi";
import { DOMAIN_COLORS } from "./DomainSidebar";
import { Download, Maximize2, Minimize2 } from "lucide-react";

/** Sanitize a name for Mermaid (no dots, dashes, or leading numbers) */
function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

function buildSchemaDiagram(
  schemaId: string,
  schema: SchemaInfo,
  relationships: Relationship[]
): string {
  const tables = Object.keys(schema.tables).sort();
  const schemaRels = relationships.filter(
    (r) => r.sourceSchema === schemaId || r.targetSchema === schemaId
  );

  const seen = new Set<string>();
  const uniqueRels: Relationship[] = [];
  for (const r of schemaRels) {
    const key = `${r.sourceSchema}.${r.sourceTable}.${r.sourceColumn}->${r.targetSchema}.${r.targetTable}.${r.targetColumn}`;
    if (!seen.has(key)) { seen.add(key); uniqueRels.push(r); }
  }

  let diagram = "erDiagram\n";

  for (const tableName of tables) {
    const table = schema.tables[tableName];
    const cols = Object.entries(table.columns);
    // Show key columns first, then first few non-key columns
    const keyCols = cols.filter(([name]) => name.endsWith("_ID") || name === "PK1" || name === "ID");
    const otherCols = cols.filter(([name]) => !name.endsWith("_ID") && name !== "PK1" && name !== "ID");
    const showCols = [...keyCols.slice(0, 4), ...otherCols.slice(0, Math.max(1, 4 - keyCols.length))];

    const safe = sanitize(tableName);
    diagram += `    ${safe} {\n`;
    for (const [colName, col] of showCols) {
      const type = sanitize(col.dataType || "TEXT");
      diagram += `        ${type} ${sanitize(colName)}\n`;
    }
    const remaining = cols.length - showCols.length;
    if (remaining > 0) {
      diagram += `        _ellipsis_ and_${remaining}_more\n`;
    }
    diagram += `    }\n`;
  }

  const addedExternal = new Set<string>();
  for (const rel of uniqueRels) {
    const srcName = rel.sourceSchema === schemaId ? sanitize(rel.sourceTable) : sanitize(`${rel.sourceSchema}__${rel.sourceTable}`);
    const tgtName = rel.targetSchema === schemaId ? sanitize(rel.targetTable) : sanitize(`${rel.targetSchema}__${rel.targetTable}`);

    if (rel.sourceSchema !== schemaId && !addedExternal.has(srcName)) {
      diagram += `    ${srcName} {\n        TEXT ${sanitize(rel.sourceColumn)}\n    }\n`;
      addedExternal.add(srcName);
    }
    if (rel.targetSchema !== schemaId && !addedExternal.has(tgtName)) {
      diagram += `    ${tgtName} {\n        TEXT ${sanitize(rel.targetColumn)}\n    }\n`;
      addedExternal.add(tgtName);
    }

    diagram += `    ${srcName} }o--|| ${tgtName} : "${sanitize(rel.sourceColumn)}"\n`;
  }

  return diagram;
}

function buildCrossSchemaDigram(
  allSchemas: Record<string, SchemaInfo>,
  relationships: Relationship[]
): string {
  let diagram = "erDiagram\n";

  // Each schema is an entity showing its tables as attributes
  for (const [schemaId, schema] of Object.entries(allSchemas)) {
    const tables = Object.keys(schema.tables).sort();
    const safe = sanitize(schemaId);
    diagram += `    ${safe} {\n`;
    for (const t of tables.slice(0, 8)) {
      diagram += `        table ${sanitize(t)}\n`;
    }
    const remaining = tables.length - 8;
    if (remaining > 0) {
      diagram += `        _ellipsis_ and_${remaining}_more\n`;
    }
    diagram += `    }\n`;
  }

  // Cross-schema relationships (deduplicated at schema level)
  const schemaPairs = new Set<string>();
  for (const r of relationships) {
    if (r.sourceSchema !== r.targetSchema) {
      const pair = [r.sourceSchema, r.targetSchema].sort().join("->");
      if (!schemaPairs.has(pair)) {
        schemaPairs.add(pair);
        diagram += `    ${sanitize(r.sourceSchema)} }o--|| ${sanitize(r.targetSchema)} : "FK"\n`;
      }
    }
  }

  return diagram;
}

export function ErdDiagram({
  schemaId,
  schema,
  relationships,
  allSchemas,
  showCrossSchema,
}: {
  schemaId: string;
  schema: SchemaInfo;
  relationships: Relationship[];
  allSchemas?: Record<string, SchemaInfo>;
  showCrossSchema?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const diagramKey = showCrossSchema ? "all" : schemaId;

  useEffect(() => {
    setRendered(false);
    setError(null);

    let cancelled = false;

    async function render() {
      if (!containerRef.current) return;

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: showCrossSchema ? "#0066FF" : (DOMAIN_COLORS[schemaId] || "#6366f1"),
            primaryTextColor: "#1a1a2e",
            primaryBorderColor: "#d1d5db",
            lineColor: "#9ca3af",
            secondaryColor: "#f0f1f3",
            tertiaryColor: "#ffffff",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "12px",
          },
          er: {
            layoutDirection: "TB",
            minEntityWidth: 100,
            entityPadding: 15,
            useMaxWidth: false,
          },
        });

        const definition = showCrossSchema && allSchemas
          ? buildCrossSchemaDigram(allSchemas, relationships)
          : buildSchemaDiagram(schemaId, schema, relationships);

        const { svg } = await mermaid.render(`erd-${diagramKey}-${Date.now()}`, definition);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render ERD");
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [diagramKey, schemaId, schema, relationships, allSchemas, showCrossSchema]);

  const downloadSvg = useCallback(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    // Ensure dimensions are explicit for standalone SVG
    const bbox = svg.getBoundingClientRect();
    clone.setAttribute("width", String(bbox.width));
    clone.setAttribute("height", String(bbox.height));
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagramKey}-erd.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [diagramKey]);

  const downloadPng = useCallback(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const bbox = svg.getBoundingClientRect();
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("width", String(bbox.width));
    clone.setAttribute("height", String(bbox.height));
    const svgData = new XMLSerializer().serializeToString(clone);

    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = bbox.width * scale;
    canvas.height = bbox.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${diagramKey}-erd.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [diagramKey]);

  const wrapperClass = fullscreen
    ? "fixed inset-0 z-50 bg-white flex flex-col"
    : "flex flex-col h-full";

  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0 bg-white">
        <div className="text-xs text-gray-400">
          {showCrossSchema ? "All Schemas" : schemaId} &middot; Entity Relationship Diagram
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={downloadSvg}
            disabled={!rendered}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors disabled:opacity-40"
            title="Download SVG"
          >
            <Download size={13} /> SVG
          </button>
          <button
            onClick={downloadPng}
            disabled={!rendered}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors disabled:opacity-40"
            title="Download PNG"
          >
            <Download size={13} /> PNG
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-2">Failed to render ERD</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        ) : !rendered ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0066FF] mr-3" />
            <span className="text-sm">Generating diagram...</span>
          </div>
        ) : null}
        <div ref={containerRef} className="flex justify-center" />
      </div>
    </div>
  );
}
