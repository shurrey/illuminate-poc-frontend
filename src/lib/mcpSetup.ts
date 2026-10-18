export interface McpSnippets {
  claude_desktop: string;
  claude_code: string;
  vscode: string;
}

export interface SnippetView {
  key: keyof McpSnippets;
  label: string;
  text: string;
  copyText: string;
}

const ORDER: { key: keyof McpSnippets; label: string }[] = [
  { key: "claude_desktop", label: "Claude Desktop" },
  { key: "claude_code", label: "Claude Code" },
  { key: "vscode", label: "VS Code" },
];

export function orderedSnippets(snippets: McpSnippets): SnippetView[] {
  return ORDER.map(({ key, label }) => ({ key, label, text: snippets[key], copyText: snippets[key] }));
}
