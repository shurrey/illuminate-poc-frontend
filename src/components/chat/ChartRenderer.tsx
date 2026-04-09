"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ChartConfig } from "@/types/chat";

const COLORS = ["#0066FF", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function ChartRenderer({ config, height = 300 }: { config: ChartConfig; height?: number }) {
  const data = useMemo(() => {
    return config.data.map((row) => ({
      ...row,
      x: row[config.x_axis],
      y: row[config.y_axis],
    }));
  }, [config]);

  const xLabel = config.x_label || config.x_axis;
  const yLabel = config.y_label || config.y_axis;

  switch (config.chart_type) {
    case "line":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={config.x_axis} tick={{ fontSize: 11 }} label={{ value: xLabel, position: "insideBottom", offset: -5, fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={config.y_axis} stroke="#0066FF" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey={config.y_axis} nameKey={config.x_axis} cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={config.x_axis} name={xLabel} tick={{ fontSize: 11 }} />
            <YAxis dataKey={config.y_axis} name={yLabel} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill="#0066FF" />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "bar":
    case "histogram":
    default:
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={config.x_axis} tick={{ fontSize: 11, angle: -45, textAnchor: "end" }} height={80} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey={config.y_axis} fill="#0066FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}
