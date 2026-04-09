export interface ChangeEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: "info" | "warning" | "alert";
  category: string;
  link?: string;
  metric?: { label: string; oldValue: string; newValue: string; change: number };
}

export const mockChanges: ChangeEvent[] = [
  {
    id: "c1",
    title: "Student engagement dropped in ENG-101",
    description:
      "Weekly engagement fell from 85% to 74% — the largest single-week drop this term. Discussion posts down 22%.",
    timestamp: "2026-03-18T07:00:00Z",
    severity: "warning",
    category: "Engagement",
    link: "/reporting?area=learning&report=engagement",
    metric: { label: "Engagement", oldValue: "85%", newValue: "74%", change: -12.9 },
  },
  {
    id: "c2",
    title: "3 new students flagged as at-risk",
    description:
      "Maria Chen (ENG-101), James Wilson (MATH-201), and Priya Patel (ENG-101) now meet at-risk criteria based on combined engagement and grade indicators.",
    timestamp: "2026-03-18T06:30:00Z",
    severity: "alert",
    category: "Early Warning",
    link: "/reporting?area=learning&report=student-summary",
  },
  {
    id: "c3",
    title: "MATH-201 assignment completion above target",
    description:
      "Assignment completion rate reached 96%, exceeding the 90% department target for the third consecutive week.",
    timestamp: "2026-03-17T18:00:00Z",
    severity: "info",
    category: "Performance",
    link: "/reporting?area=learning&report=performance",
    metric: { label: "Completion", oldValue: "93%", newValue: "96%", change: 3.2 },
  },
  {
    id: "c4",
    title: "Department enrollment increased",
    description:
      "Computer Science department enrollment grew by 2.1% this week with 26 new late-add registrations.",
    timestamp: "2026-03-17T12:00:00Z",
    severity: "info",
    category: "Enrollment",
    link: "/reporting?area=leading",
    metric: { label: "Enrollment", oldValue: "1,258", newValue: "1,284", change: 2.1 },
  },
  {
    id: "c5",
    title: "Retention rate below institutional target",
    description:
      "The 87.3% retention rate is now 0.7 points below the 88% institutional target. This has been declining for 4 consecutive weeks.",
    timestamp: "2026-03-16T16:00:00Z",
    severity: "alert",
    category: "Retention",
    link: "/reporting?area=leading",
    metric: { label: "Retention", oldValue: "88.0%", newValue: "87.3%", change: -0.8 },
  },
  {
    id: "c6",
    title: "PSY-301 non-submission rate spiked",
    description:
      "12 students (15% of enrolled) missed the Week 8 deadline, compared to the usual 4-5 non-submissions.",
    timestamp: "2026-03-16T14:00:00Z",
    severity: "alert",
    category: "Performance",
    link: "/reporting?area=learning&report=performance",
  },
  {
    id: "c7",
    title: "Data Q&A usage surge",
    description:
      "Natural language queries increased 18.5% month-over-month. 'Student engagement' and 'grade distribution' are the top query topics.",
    timestamp: "2026-03-15T10:00:00Z",
    severity: "info",
    category: "Platform Usage",
    link: "/reporting?area=data-qa",
    metric: { label: "Queries", oldValue: "1,015", newValue: "1,203", change: 18.5 },
  },
  {
    id: "c8",
    title: "BIO-102 enrollment anomaly",
    description:
      "15% enrollment drop in BIO-102 is unusual for mid-term. 8 students withdrew in the past week.",
    timestamp: "2026-03-15T08:00:00Z",
    severity: "warning",
    category: "Enrollment",
    link: "/reporting?area=leading",
    metric: { label: "Enrollment", oldValue: "52", newValue: "44", change: -15.4 },
  },
];
