"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getSnowflakeConfig, updateSnowflakeConfig,
  type SnowflakeConfig, type SnowflakeConfigUpdate,
} from "@/services/configApi";
import Link from "next/link";
import {
  Settings, User, Bell, Shield, Globe, Database,
  Layers,
  Copy, Check, Download, Eye, EyeOff, Pencil, Save,
  Loader2, ChevronDown, ChevronUp, X,
} from "lucide-react";

const sections = [
  { icon: User, title: "Profile", description: "Manage your account details, display name, and avatar" },
  { icon: Bell, title: "Notifications", description: "Configure alert preferences, email digests, and notification channels" },
  { icon: Shield, title: "Privacy & Security", description: "Two-factor authentication, session management, and data privacy controls" },
  { icon: Globe, title: "Language & Region", description: "Set your preferred language, timezone, and date format" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 text-gray-400 hover:text-[#0066FF] rounded transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

// ── Snowflake Configuration ───────────────────────────────

const configFields: { key: keyof Omit<SnowflakeConfig, "has_password">; label: string; env: string }[] = [
  { key: "account", label: "Account", env: "SNOWFLAKE_ACCOUNT" },
  { key: "user", label: "User", env: "SNOWFLAKE_USER" },
  { key: "database", label: "Database", env: "SNOWFLAKE_DATABASE" },
  { key: "warehouse", label: "Warehouse", env: "SNOWFLAKE_WAREHOUSE" },
  { key: "role", label: "Role", env: "SNOWFLAKE_ROLE" },
];

function SnowflakeConfigPanel() {
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<SnowflakeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Standalone password change (view mode)
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwValue, setPwValue] = useState("");
  const [showPwValue, setShowPwValue] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handlePasswordSave = async () => {
    if (!pwValue.trim()) return;
    setPwSaving(true);
    setPwError(null);
    try {
      await updateSnowflakeConfig({ password: pwValue });
      setPwSuccess(true);
      setPwValue("");
      setChangingPassword(false);
      await loadConfig();
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwSaving(false);
    }
  };

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSnowflakeConfig();
      setConfig(data);
      // Pre-fill edit values
      const values: Record<string, string> = {};
      configFields.forEach((f) => { values[f.key] = data[f.key] || ""; });
      setEditValues(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded && !config && !loading) loadConfig();
  }, [expanded, config, loading, loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    // Build update payload — only changed fields
    const updates: SnowflakeConfigUpdate = {};
    configFields.forEach((f) => {
      if (editValues[f.key] !== config[f.key]) {
        (updates as Record<string, string>)[f.key] = editValues[f.key];
      }
    });
    if (newPassword) updates.password = newPassword;

    if (Object.keys(updates).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }

    try {
      await updateSnowflakeConfig(updates);
      setSaveSuccess(true);
      setNewPassword("");
      setEditing(false);
      await loadConfig(); // Refresh
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (config) {
      const values: Record<string, string> = {};
      configFields.forEach((f) => { values[f.key] = config[f.key] || ""; });
      setEditValues(values);
    }
    setNewPassword("");
    setEditing(false);
  };

  const downloadEnv = () => {
    if (!config) return;
    const lines = configFields.map((f) => `${f.env}=${config[f.key] || ""}`);
    lines.splice(2, 0, "SNOWFLAKE_PASSWORD="); // placeholder after user
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "snowflake.env"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    if (!config) return;
    const obj: Record<string, string> = {};
    configFields.forEach((f) => { obj[f.env] = config[f.key] || ""; });
    obj["SNOWFLAKE_PASSWORD"] = "";
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "snowflake-credentials.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    if (!config) return;
    const lines = configFields.map((f) => `${f.env}=${config[f.key] || ""}`);
    lines.splice(2, 0, "SNOWFLAKE_PASSWORD=");
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden md:col-span-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Database size={20} className="text-gray-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">Snowflake Configuration</h3>
          <p className="text-sm text-gray-500 mt-0.5">View and manage data warehouse connection settings</p>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading configuration...
            </div>
          ) : error && !config ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          ) : config ? (
            <>
              {/* Config table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-44">Parameter</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      {!editing && <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase w-16" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {configFields.map((field) => (
                      <tr key={field.key} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-xs font-mono text-gray-400">{field.env}</div>
                          <div className="text-sm font-medium text-gray-900">{field.label}</div>
                        </td>
                        <td className="px-4 py-3">
                          {editing ? (
                            <input
                              type="text"
                              value={editValues[field.key] || ""}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                            />
                          ) : (
                            <span className="text-sm font-mono text-gray-700">{config[field.key] || "—"}</span>
                          )}
                        </td>
                        {!editing && (
                          <td className="px-4 py-3 text-right">
                            <CopyButton text={config[field.key] || ""} />
                          </td>
                        )}
                      </tr>
                    ))}

                    {/* Password row */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-gray-400">SNOWFLAKE_PASSWORD</div>
                        <div className="text-sm font-medium text-gray-900">Password</div>
                      </td>
                      <td className="px-4 py-3" colSpan={editing ? 1 : undefined}>
                        {editing ? (
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder={config.has_password ? "Leave blank to keep current" : "Enter password"}
                              className="w-full px-2.5 py-1.5 pr-8 rounded border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                            />
                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        ) : changingPassword ? (
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showPwValue ? "text" : "password"}
                                value={pwValue}
                                onChange={(e) => setPwValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSave(); }}
                                placeholder="Enter new password"
                                autoFocus
                                className="w-full px-2.5 py-1.5 pr-8 rounded border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                              />
                              <button onClick={() => setShowPwValue(!showPwValue)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPwValue ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                            <button
                              onClick={handlePasswordSave}
                              disabled={pwSaving || !pwValue.trim()}
                              className="px-2.5 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                            >
                              {pwSaving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                            </button>
                            <button
                              onClick={() => { setChangingPassword(false); setPwValue(""); setPwError(null); }}
                              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-mono text-gray-500">
                            {config.has_password ? "••••••••••••" : "Not set"}
                          </span>
                        )}
                        {pwError && <p className="text-xs text-red-600 mt-1">{pwError}</p>}
                        {pwSuccess && <p className="text-xs text-emerald-600 mt-1">Password updated</p>}
                      </td>
                      {!editing && !changingPassword && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setChangingPassword(true)}
                            className="text-xs text-[#0066FF] hover:text-[#0052cc] font-medium transition-colors"
                          >
                            Change
                          </button>
                        </td>
                      )}
                      {!editing && changingPassword && <td />}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Error / Success */}
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-3">{error}</div>}
              {saveSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 mb-3">Configuration updated. Snowflake connection has been refreshed.</div>}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <X size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-[#0066FF]/30 hover:text-[#0066FF] transition-colors"
                    >
                      <Pencil size={13} /> Edit Configuration
                    </button>
                    <button onClick={copyAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-[#0066FF]/30 hover:text-[#0066FF] transition-colors">
                      <Copy size={13} /> Copy All
                    </button>
                    <button onClick={downloadEnv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-[#0066FF]/30 hover:text-[#0066FF] transition-colors">
                      <Download size={13} /> .env
                    </button>
                    <button onClick={downloadJson} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-[#0066FF]/30 hover:text-[#0066FF] transition-colors">
                      <Download size={13} /> JSON
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Changes take effect immediately. The backend will reconnect to Snowflake with the new credentials on the next query.
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={20} className="text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-500 mt-1">
          Manage your account preferences and application configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0066FF]/10 transition-colors">
                  <Icon size={20} className="text-gray-500 group-hover:text-[#0066FF] transition-colors" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#0066FF] transition-colors">{section.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Metric Definitions — clickable card linking to the overlay editor */}
        <Link
          href="/admin/definitions"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all cursor-pointer group block"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0066FF]/10 transition-colors">
              <Layers size={20} className="text-gray-500 group-hover:text-[#0066FF] transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#0066FF] transition-colors">
                Metric Definitions
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Override Blackboard&apos;s canonical metric definitions with
                your institution&apos;s own — retention windows, FTE divisor,
                completion-rate filters. Edits go live immediately.
              </p>
            </div>
          </div>
        </Link>

        <SnowflakeConfigPanel />
      </div>
    </div>
  );
}
