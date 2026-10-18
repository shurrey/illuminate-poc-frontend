export interface McpSnippets {
  claude_desktop: string;
  claude_code: string;
  vscode: string;
}

export interface SnippetView {
  key: keyof McpSnippets;
  label: string;
  hint: string;
  text: string;
  copyText: string;
}

const ORDER: { key: keyof McpSnippets; label: string; hint: string }[] = [
  { key: "claude_desktop", label: "Claude Desktop", hint: "Settings, Connectors, Add custom connector, then paste this URL." },
  { key: "claude_code", label: "Claude Code", hint: "Run this in a terminal." },
  { key: "vscode", label: "VS Code", hint: "Add this to .vscode/mcp.json." },
];

export function orderedSnippets(snippets: McpSnippets): SnippetView[] {
  return ORDER.map(({ key, label, hint }) => ({ key, label, hint, text: snippets[key], copyText: snippets[key] }));
}
