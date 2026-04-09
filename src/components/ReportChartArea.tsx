"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  engagementOverTime,
  gradeDistribution,
  activityPatterns,
  reportTabs,
} from "@/data/mockChartData";

function LineChartView() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={engagementOverTime}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="logins" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartView() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={gradeDistribution}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AreaChartView() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={engagementOverTime}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="engagement" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
        <Area type="monotone" dataKey="submissions" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Chart({ chartType }: { chartType: "line" | "bar" | "area" }) {
  if (chartType === "line") return <LineChartView />;
  if (chartType === "bar") return <BarChartView />;
  return <AreaChartView />;
}

export function ReportChartArea({ reportId }: { reportId: string }) {
  const tabs = reportTabs[reportId] || reportTabs["r1"];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      {/* Heading */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        How active are students?
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Visualization of report data across selected filters
      </p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              i === activeTab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <Chart chartType={tabs[activeTab].chartType} />
      </div>
    </div>
  );
}
