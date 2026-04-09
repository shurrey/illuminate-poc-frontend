export interface Report {
  id: string;
  title: string;
  description: string;
  area: "learning" | "teaching" | "leading" | "data-qa" | "custom";
  subArea?: string;
  tags: string[];
  popularity: number; // 0-100
  lastUpdated: string;
  icon: string;
}

export const mockReports: Report[] = [
  {
    id: "r1",
    title: "Student Engagement Dashboard",
    description:
      "Track student activity levels, login frequency, content interactions, and time-on-task across courses.",
    area: "learning",
    subArea: "Student Engagement",
    tags: ["engagement", "activity", "time-on-task"],
    popularity: 95,
    lastUpdated: "2026-03-18",
    icon: "📊",
  },
  {
    id: "r2",
    title: "Performance & Grades",
    description:
      "Analyze grade distributions, assignment scores, and performance trends over time.",
    area: "learning",
    subArea: "Performance & Grades",
    tags: ["grades", "performance", "assessment"],
    popularity: 92,
    lastUpdated: "2026-03-18",
    icon: "📈",
  },
  {
    id: "r3",
    title: "Social & Collaborative Learning",
    description:
      "Monitor discussion forum activity, group project engagement, and peer interaction patterns.",
    area: "learning",
    subArea: "Social/Collaborative",
    tags: ["discussion", "collaboration", "social"],
    popularity: 68,
    lastUpdated: "2026-03-17",
    icon: "💬",
  },
  {
    id: "r4",
    title: "Student Summary",
    description:
      "Individual student profiles with comprehensive activity, performance, and risk indicators.",
    area: "learning",
    subArea: "Student Summary",
    tags: ["student", "at-risk", "profile", "early-warning"],
    popularity: 88,
    lastUpdated: "2026-03-18",
    icon: "👤",
  },
  {
    id: "r5",
    title: "Teaching Effectiveness",
    description:
      "Course design analytics, content usage patterns, and instructional activity metrics.",
    area: "teaching",
    tags: ["teaching", "course-design", "effectiveness"],
    popularity: 75,
    lastUpdated: "2026-03-16",
    icon: "🎓",
  },
  {
    id: "r6",
    title: "Institutional Overview",
    description:
      "High-level institutional KPIs including enrollment, retention, and program performance.",
    area: "leading",
    tags: ["institutional", "enrollment", "retention", "overview"],
    popularity: 85,
    lastUpdated: "2026-03-18",
    icon: "🏛️",
  },
  {
    id: "r7",
    title: "Department Comparison",
    description:
      "Compare performance metrics across departments and programs.",
    area: "leading",
    tags: ["comparison", "department", "benchmark"],
    popularity: 72,
    lastUpdated: "2026-03-15",
    icon: "⚖️",
  },
  {
    id: "r8",
    title: "Data Q&A (Natural Language)",
    description:
      "Ask questions about your data in plain English. Powered by AI.",
    area: "data-qa",
    tags: ["nlq", "ai", "natural-language", "ask"],
    popularity: 60,
    lastUpdated: "2026-03-18",
    icon: "🤖",
  },
  {
    id: "r9",
    title: "Enrollment Trends",
    description:
      "Track enrollment patterns over time by program, department, and demographics.",
    area: "leading",
    tags: ["enrollment", "trends", "demographics"],
    popularity: 78,
    lastUpdated: "2026-03-17",
    icon: "📉",
  },
  {
    id: "r10",
    title: "Custom Report Builder",
    description:
      "Create custom reports using Snowflake data with pre-built templates.",
    area: "custom",
    tags: ["custom", "snowflake", "builder"],
    popularity: 45,
    lastUpdated: "2026-03-14",
    icon: "🔧",
  },
];

export const suggestedQuestions: string[] = [
  "Which students haven't logged in this week?",
  "How does my course engagement compare to last month?",
  "What's our current retention rate vs. last year?",
  "Which programs have the highest enrollment growth?",
  "Show me institution-wide engagement trends",
  "Compare completion rates across all departments",
];
