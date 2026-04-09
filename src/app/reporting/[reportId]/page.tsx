import { mockReports } from "@/data/mockReports";
import ReportDetail from "./ReportDetail";

export function generateStaticParams() {
  return mockReports.map((r) => ({ reportId: r.id }));
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  return <ReportDetail params={params} />;
}
