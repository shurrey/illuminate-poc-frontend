import type { QueryContract, SemanticCatalog } from "@/types/semantic";

/** ratio values are fractions (0.25 → 25.0%); percent values are already 0–100. */
export type CardFormat = "number" | "ratio" | "percent";

export interface DashboardCard {
  id: string;
  label: string;
  description: string;
  longDescription: string;
  prompt: string;
  /** One metric or measure, no dimensions: the card shows the single value it returns. */
  contract: QueryContract;
  format: CardFormat;
  reportLink?: string;
  isBuiltIn?: boolean;
  enabled?: boolean;
}

/** The result column holding a contract's first metric or measure. */
export function valueColumn(contract: QueryContract): string | undefined {
  const metric = contract.metrics?.[0];
  if (metric) return metric.split(".")[1];
  return contract.measures?.[0]?.split(":")[1];
}

/** The contract reduced to one value: breakdowns, ordering and limits dropped, filters kept. */
export function kpiContract(contract: QueryContract): QueryContract {
  const ref = contract.metrics?.[0] ? { metrics: [contract.metrics[0]] } : { measures: (contract.measures ?? []).slice(0, 1) };
  return { ...ref, ...(contract.filters?.length ? { filters: contract.filters } : {}), ...(contract.time_range ? { time_range: contract.time_range } : {}) };
}

/** The card format implied by the measure's unit. */
export function formatFor(contract: QueryContract, catalog: SemanticCatalog): CardFormat {
  const metric = catalog.metrics.find((m) => m.id === contract.metrics?.[0]);
  const ref = metric?.measure ?? contract.measures?.[0] ?? "";
  const [datasetId, name] = ref.split(":");
  const unit = catalog.datasets.find((d) => d.id === datasetId)?.measures.find((m) => m.name === name)?.unit;
  return unit === "ratio" ? "ratio" : unit === "percent" ? "percent" : "number";
}

export function formatCardValue(value: unknown, format: CardFormat): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (format === "ratio") return `${(n * 100).toFixed(1)}%`;
  if (format === "percent") return `${n.toFixed(1)}%`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function metricCard(id: string, metric: string, label: string, description: string, longDescription: string,
                    prompt: string, format: CardFormat, reportLink: string): DashboardCard {
  return { id, label, description, longDescription, prompt, contract: { metrics: [metric] }, format, reportLink };
}

export const dashboardCards: DashboardCard[] = [
  metricCard("active-students", "metric.active_students.v1", "Active Students",
    "Students with course activity in the course window",
    "Students with an available, enabled enrollment and course activity inside the course window, in courses that have an instructor and have not been deleted.",
    "How many active students do we have, broken down by term? Which terms stand out?",
    "number", "/reporting?area=leading"),
  metricCard("student-engagement", "metric.student_engagement_rate.v1", "Student Engagement",
    "Share of student enrollments with course activity",
    "Share of student enrollments with course activity in the course window.",
    "What is the student engagement rate by term and by course design mode? Where is it lowest?",
    "ratio", "/reporting?area=learning"),
  metricCard("weekly-engagement", "metric.weekly_engagement_rate.v1", "Active in the Last 7 Days",
    "Share of students in ongoing courses who accessed them this week",
    "Share of students with an active enrollment in an ongoing course whose last course access was in the last 7 days.",
    "What share of students in ongoing courses were active in the last 7 days, by course? Which courses have the lowest share?",
    "ratio", "/reporting?area=learning"),
  metricCard("courses-with-activity", "metric.courses_with_student_activity.v1", "Courses with Student Activity",
    "Reportable courses where students have been active",
    "Reportable courses where at least one student has had course activity in the course window.",
    "How many courses have student activity, by term? What share of reportable courses is that?",
    "number", "/reporting?area=teaching"),
  metricCard("classic-courses", "metric.classic_courses.v1", "Classic Courses",
    "Top-level courses still in the Original course view",
    "Top-level courses still in the Original (Classic) course view.",
    "How many courses are still in the Classic course view, by term? How does that compare to Ultra?",
    "number", "/reporting?area=migration"),
  metricCard("average-grade", "metric.average_grade.v1", "Average Grade",
    "Average course grade across graded enrollments",
    "Average course grade percentage across graded student enrollments in reportable courses.",
    "What is the average grade by term and by grade band? Which terms have the most failing students?",
    "percent", "/reporting?area=learning"),
];
