export const engagementOverTime = [
  { week: "Week 1", engagement: 78, logins: 245, submissions: 120 },
  { week: "Week 2", engagement: 82, logins: 260, submissions: 135 },
  { week: "Week 3", engagement: 75, logins: 230, submissions: 110 },
  { week: "Week 4", engagement: 88, logins: 290, submissions: 155 },
  { week: "Week 5", engagement: 91, logins: 310, submissions: 168 },
  { week: "Week 6", engagement: 85, logins: 275, submissions: 142 },
  { week: "Week 7", engagement: 93, logins: 320, submissions: 175 },
  { week: "Week 8", engagement: 89, logins: 300, submissions: 160 },
];

export const gradeDistribution = [
  { grade: "A", count: 42, percentage: 28 },
  { grade: "B", count: 55, percentage: 37 },
  { grade: "C", count: 30, percentage: 20 },
  { grade: "D", count: 15, percentage: 10 },
  { grade: "F", count: 8, percentage: 5 },
];

export const activityPatterns = [
  { hour: "6am", monday: 12, tuesday: 15, wednesday: 10, thursday: 18, friday: 8 },
  { hour: "9am", monday: 45, tuesday: 52, wednesday: 48, thursday: 50, friday: 42 },
  { hour: "12pm", monday: 65, tuesday: 70, wednesday: 62, thursday: 68, friday: 55 },
  { hour: "3pm", monday: 55, tuesday: 58, wednesday: 50, thursday: 60, friday: 40 },
  { hour: "6pm", monday: 38, tuesday: 42, wednesday: 35, thursday: 40, friday: 25 },
  { hour: "9pm", monday: 28, tuesday: 30, wednesday: 25, thursday: 32, friday: 18 },
];

export const reportTabs: Record<string, { label: string; chartType: "line" | "bar" | "area" }[]> = {
  r1: [
    { label: "Course Access", chartType: "line" },
    { label: "Engagement with Course Content", chartType: "area" },
    { label: "Activity Patterns", chartType: "bar" },
  ],
  r2: [
    { label: "Grade Distribution", chartType: "bar" },
    { label: "Performance Trends", chartType: "line" },
    { label: "Assignment Scores", chartType: "area" },
  ],
  r3: [
    { label: "Discussion Activity", chartType: "bar" },
    { label: "Collaboration Trends", chartType: "line" },
  ],
  r4: [
    { label: "Student Overview", chartType: "area" },
    { label: "Risk Indicators", chartType: "bar" },
  ],
  r5: [
    { label: "Course Design", chartType: "bar" },
    { label: "Content Usage", chartType: "area" },
  ],
  r6: [
    { label: "Enrollment", chartType: "line" },
    { label: "Retention", chartType: "area" },
    { label: "Program Performance", chartType: "bar" },
  ],
  r7: [
    { label: "Department Comparison", chartType: "bar" },
    { label: "Benchmark Trends", chartType: "line" },
  ],
  r8: [
    { label: "Query History", chartType: "line" },
    { label: "Popular Questions", chartType: "bar" },
  ],
  r9: [
    { label: "Enrollment Trends", chartType: "line" },
    { label: "Demographics", chartType: "bar" },
  ],
  r10: [
    { label: "Report Builder", chartType: "bar" },
  ],
};
