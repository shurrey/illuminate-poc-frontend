"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

const filters = [
  {
    label: "Course Term",
    options: ["All Terms", "Spring 2026", "Fall 2025", "Summer 2025"],
  },
  {
    label: "Date Filter Type",
    options: ["Relative", "Absolute", "Academic Calendar"],
  },
  {
    label: "Date Range From",
    options: ["Last 7 days", "Last 30 days", "Last 90 days", "Last 12 months"],
  },
  {
    label: "Institutional Hierarchy Level 1",
    options: ["All Colleges", "College of Arts & Sciences", "College of Engineering", "College of Business"],
  },
  {
    label: "Institutional Hierarchy Level 2",
    options: ["All Departments", "Computer Science", "Mathematics", "English"],
  },
  {
    label: "Course Modality",
    options: ["All Modalities", "Online", "In-Person", "Hybrid"],
  },
  {
    label: "Course ID",
    options: ["All Courses", "CS-101", "MATH-201", "ENG-102", "BIO-301"],
  },
];

export function ReportControls() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-gray-400" />
          Controls
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filters.map((filter) => (
              <div key={filter.label}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {filter.label}
                </label>
                <select className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {filter.options.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              Reset
            </button>
            <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
