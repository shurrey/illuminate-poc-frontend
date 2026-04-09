export interface Notification {
  id: string;
  category: "alert" | "insight" | "update";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  severity?: "info" | "warning" | "critical";
}

export const mockNotifications: Notification[] = [
  {
    id: "n1",
    category: "alert",
    title: "At-Risk Students Increased",
    message:
      "3 new students flagged as at-risk in ENG-101 and MATH-201 based on engagement and grade trends.",
    timestamp: "2026-03-18T08:30:00Z",
    read: false,
    link: "/reporting?area=learning&report=student-summary",
    severity: "warning",
  },
  {
    id: "n2",
    category: "insight",
    title: "Weekly Engagement Summary",
    message:
      "Your courses averaged 78% engagement this week, down from 83% last week. Discussion activity saw the largest drop (-8.2%).",
    timestamp: "2026-03-17T18:00:00Z",
    read: false,
    link: "/reporting?area=learning&report=engagement",
    severity: "info",
  },
  {
    id: "n3",
    category: "alert",
    title: "Assignment Non-Submission Spike",
    message:
      "12 students missed the Week 8 assignment deadline in PSY-301. This is 3x the usual non-submission rate.",
    timestamp: "2026-03-17T14:22:00Z",
    read: false,
    link: "/reporting?area=learning&report=performance",
    severity: "critical",
  },
  {
    id: "n4",
    category: "insight",
    title: "Department Performance Up",
    message:
      "Computer Science department average performance improved 1.2% this term. 4 of 5 core courses show positive trends.",
    timestamp: "2026-03-17T09:00:00Z",
    read: true,
    link: "/reporting?area=leading",
    severity: "info",
  },
  {
    id: "n5",
    category: "alert",
    title: "Retention Rate Declining",
    message:
      "Institutional retention rate dropped to 87.3%, below the 88% target threshold. Engineering and Arts programs show the steepest decline.",
    timestamp: "2026-03-16T16:45:00Z",
    read: false,
    link: "/reporting?area=leading",
    severity: "critical",
  },
  {
    id: "n6",
    category: "update",
    title: "New Report Available",
    message:
      "The Spring 2026 Mid-Term Progress report is now available in the Leading section.",
    timestamp: "2026-03-16T10:00:00Z",
    read: true,
    link: "/reporting?area=leading",
  },
  {
    id: "n7",
    category: "insight",
    title: "Data Q&A Adoption Growing",
    message:
      "Natural language queries increased 18.5% this month. Top queries relate to student engagement and grade distributions.",
    timestamp: "2026-03-15T12:00:00Z",
    read: true,
    link: "/reporting?area=data-qa",
    severity: "info",
  },
  {
    id: "n8",
    category: "alert",
    title: "Enrollment Anomaly Detected",
    message:
      "BIO-102 enrollment dropped 15% week-over-week. This is unusual for this point in the term.",
    timestamp: "2026-03-15T08:30:00Z",
    read: true,
    link: "/reporting?area=leading",
    severity: "warning",
  },
];
