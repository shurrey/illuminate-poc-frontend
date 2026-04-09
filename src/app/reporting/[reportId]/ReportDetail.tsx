"use client";

import { use, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { mockReports } from "@/data/mockReports";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ReportSidebar } from "@/components/ReportSidebar";
import { ReportControls } from "@/components/ReportControls";
import { ReportChartArea } from "@/components/ReportChartArea";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

const areaLabels: Record<string, string> = {
  learning: "Learning",
  teaching: "Teaching",
  leading: "Leading",
  "data-qa": "Data Q&A",
  custom: "Custom Reports",
};

export default function ReportDetail({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const { addRecentReport } = useUser();
  const report = mockReports.find((r) => r.id === reportId);

  useEffect(() => {
    if (report) {
      addRecentReport(report.id);
    }
  }, [report?.id]);

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <FileQuestion size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Report not found
        </h1>
        <p className="text-gray-500 mb-6">
          The report you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/reporting"
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          Back to Reports
        </Link>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Reporting", href: "/reporting" },
    { label: areaLabels[report.area] || report.area, href: `/reporting?area=${report.area}` },
    { label: report.title },
  ];

  return (
    <div className="flex flex-1">
      <ReportSidebar currentReportId={report.id} area={report.area} />

      <div className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Breadcrumb items={breadcrumbItems} />

          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">{report.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {report.title}
              </h1>
              <p className="text-sm text-gray-500">{report.description}</p>
            </div>
          </div>

          <ReportControls />
          <ReportChartArea reportId={report.id} />
        </div>
      </div>
    </div>
  );
}
