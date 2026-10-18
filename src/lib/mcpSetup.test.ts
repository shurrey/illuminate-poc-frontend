import { describe, expect, it } from "vitest";
import { orderedSnippets, type McpSnippets } from "./mcpSetup";

const snippets: McpSnippets = { vscode: "{...}", claude_code: "claude mcp add", claude_desktop: "https://x/mcp" };

describe("orderedSnippets", () => {
  it("orders Claude Desktop, Claude Code, then VS Code with labels", () => {
    expect(orderedSnippets(snippets).map((s) => s.label)).toEqual(["Claude Desktop", "Claude Code", "VS Code"]);
  });

  it("carries each snippet's text, and the copy text equals it", () => {
    const [desktop] = orderedSnippets(snippets);
    expect(desktop.text).toBe("https://x/mcp");
    expect(desktop.copyText).toBe("https://x/mcp");
  });

  it("explains where Claude Desktop's URL goes", () => {
    expect(orderedSnippets(snippets)[0].hint).toMatch(/connector/i);
  });
});
