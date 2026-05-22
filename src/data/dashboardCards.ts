export interface DashboardCard {
  id: string;
  label: string;
  description: string;
  longDescription: string;
  prompt: string;
  /**
   * Raw SQL. Required for user-created cards and as a fallback for built-in
   * cards when the metric endpoint is unavailable. The hook prefers
   * `metric_id` when set.
   */
  query: string;
  /**
   * Canonical metric id (e.g. `metric.dashboard.active_students.v1`). When
   * present, the hook calls /api/v1/dashboard/metric instead of executing
   * the raw `query` — definition lives server-side in the canonical YAML,
   * with single-source-of-truth provenance.
   */
  metric_id?: string;
  valueKey: string;
  changeKey?: string;
  format: "number" | "percent" | "grade";
  invertTrend?: boolean;
  reportLink?: string;
  isBuiltIn?: boolean;      // true for default cards, false for user-created
  enabled?: boolean;         // whether the card is visible on the dashboard
}

export const dashboardCards: DashboardCard[] = [
  {
    id: "total-enrollment",
    metric_id: "metric.dashboard.active_students.v1",
    label: "Active Students",
    description: "Students enrolled in active courses this term",
    longDescription: "Counts distinct students who are actively enrolled (STUDENT_IND = TRUE, ACTIVE = '1') in courses belonging to the currently running academic term(s). The comparison value shows enrollment from the most recently completed prior term. This metric is a leading indicator of institutional health — sustained growth suggests effective recruitment and retention, while decline may signal issues with student experience, program relevance, or seasonal enrollment patterns.",
    prompt: "Analyze the active student enrollment for the current term. How does it compare to the previous term? Break down the enrollment by department or program if possible. What factors might be driving any changes?",
    query: `WITH current_terms AS (
  SELECT ID
  FROM CDM_LMS.TERM
  WHERE ROW_DELETED_TIME IS NULL
    AND START_TIME IS NOT NULL
    AND END_TIME IS NOT NULL
    AND CURRENT_TIMESTAMP() BETWEEN START_TIME AND END_TIME
),
previous_terms AS (
  SELECT ID
  FROM CDM_LMS.TERM
  WHERE ROW_DELETED_TIME IS NULL
    AND END_TIME IS NOT NULL
    AND END_TIME < (SELECT MIN(START_TIME) FROM CDM_LMS.TERM
                    WHERE ID IN (SELECT ID FROM current_terms))
  QUALIFY ROW_NUMBER() OVER (ORDER BY END_TIME DESC) = 1
),
current_students AS (
  SELECT COUNT(DISTINCT pc.PERSON_ID) AS student_count
  FROM CDM_LMS.PERSON_COURSE pc
  JOIN CDM_LMS.COURSE c
    ON c.ID = pc.COURSE_ID AND c.ROW_DELETED_TIME IS NULL
  WHERE c.TERM_ID IN (SELECT ID FROM current_terms)
    AND pc.STUDENT_IND = TRUE
    AND pc.ACTIVE = '1'
    AND pc.ROW_DELETED_TIME IS NULL
),
previous_students AS (
  SELECT COUNT(DISTINCT pc.PERSON_ID) AS student_count
  FROM CDM_LMS.PERSON_COURSE pc
  JOIN CDM_LMS.COURSE c
    ON c.ID = pc.COURSE_ID AND c.ROW_DELETED_TIME IS NULL
  WHERE c.TERM_ID IN (SELECT ID FROM previous_terms)
    AND pc.STUDENT_IND = TRUE
    AND pc.ACTIVE = '1'
    AND pc.ROW_DELETED_TIME IS NULL
)
SELECT
  cs.student_count AS current_term_students,
  ps.student_count AS previous_term_students,
  cs.student_count - ps.student_count AS change_abs,
  ROUND(
    (cs.student_count - ps.student_count) * 100.0
    / NULLIF(ps.student_count, 0),
    2
  ) AS change_pct
FROM current_students cs
CROSS JOIN previous_students ps`,
    valueKey: "CURRENT_TERM_STUDENTS",
    changeKey: "CHANGE_PCT",
    format: "number",
    reportLink: "/reporting?area=leading",
  },
  {
    id: "retention-rate",
    metric_id: "metric.dashboard.retention_rate.v1",
    label: "Retention Rate",
    description: "Term-over-term student retention",
    longDescription: "Measures the percentage of students who were enrolled in the previous 90-day window and returned for the current 90-day window. Uses rolling enrollment windows rather than academic terms to provide a consistent view across institutions with different term structures. A declining retention rate may indicate issues with student satisfaction, academic support, or course quality that warrant further investigation.",
    prompt: "Analyze student retention trends. What is the current retention rate and how has it changed over the last few periods? Are there specific programs or student demographics where retention is notably higher or lower?",
    query: `WITH windowed_enrollments AS (
  SELECT DISTINCT
    CASE
      WHEN pc.ENROLLMENT_TIME >= DATEADD('day', -90,  CURRENT_TIMESTAMP()) THEN 0
      WHEN pc.ENROLLMENT_TIME >= DATEADD('day', -180, CURRENT_TIMESTAMP()) THEN 1
      WHEN pc.ENROLLMENT_TIME >= DATEADD('day', -270, CURRENT_TIMESTAMP()) THEN 2
    END AS window_rank,
    pc.PERSON_ID
  FROM CDM_LMS.PERSON_COURSE pc
  WHERE pc.STUDENT_IND = TRUE
    AND pc.ROW_DELETED_TIME IS NULL
    AND pc.ENROLLMENT_TIME >= DATEADD('day', -270, CURRENT_TIMESTAMP())
),
window_totals AS (
  SELECT window_rank, COUNT(DISTINCT PERSON_ID) AS student_count
  FROM windowed_enrollments
  GROUP BY window_rank
),
retention AS (
  SELECT
    later.window_rank AS later_rank,
    COUNT(DISTINCT later.PERSON_ID) AS retained_students
  FROM windowed_enrollments later
  JOIN windowed_enrollments earlier
    ON later.PERSON_ID = earlier.PERSON_ID
   AND earlier.window_rank = later.window_rank + 1
  WHERE later.window_rank IN (0, 1)
  GROUP BY later.window_rank
),
rates AS (
  SELECT
    r.later_rank,
    ROUND(r.retained_students * 100.0 / NULLIF(earlier.student_count, 0), 2) AS retention_pct
  FROM retention r
  JOIN window_totals earlier ON earlier.window_rank = r.later_rank + 1
)
SELECT
  MAX(CASE WHEN later_rank = 0 THEN retention_pct END) AS current_retention_pct,
  MAX(CASE WHEN later_rank = 1 THEN retention_pct END) AS previous_retention_pct,
  ROUND(
    MAX(CASE WHEN later_rank = 0 THEN retention_pct END)
    - MAX(CASE WHEN later_rank = 1 THEN retention_pct END),
    2
  ) AS retention_pct_diff
FROM rates`,
    valueKey: "CURRENT_RETENTION_PCT",
    changeKey: "RETENTION_PCT_DIFF",
    format: "percent",
    reportLink: "/reporting?area=leading",
  },
  {
    id: "platform-engagement",
    metric_id: "metric.dashboard.platform_engagement.v1",
    label: "Platform Engagement",
    description: "Students with platform activity in the last 7 days",
    longDescription: "Calculates the percentage of actively enrolled students who accessed the LMS platform within the most recent 7-day window, compared to the prior 7-day window. The activity anchor is based on the latest observed access timestamp to ensure meaningful results even with stale sample data. This metric reflects how actively students are using the learning platform — low engagement may correlate with poor outcomes and is often an early warning signal for at-risk students.",
    prompt: "Analyze platform engagement trends for active students. What percentage of students are engaging with the platform? Are there courses or time periods with notably low engagement? What might be contributing to any drop-off?",
    query: `WITH active_students AS (
  SELECT DISTINCT pc.PERSON_ID
  FROM CDM_LMS.PERSON_COURSE pc
  JOIN CDM_LMS.COURSE c
    ON c.ID = pc.COURSE_ID
   AND c.ROW_DELETED_TIME IS NULL
  JOIN CDM_LMS.TERM t
    ON t.ID = c.TERM_ID
   AND t.ROW_DELETED_TIME IS NULL
  WHERE pc.STUDENT_IND = TRUE
    AND pc.ROW_DELETED_TIME IS NULL
    AND t.START_TIME IS NOT NULL
    AND t.END_TIME IS NOT NULL
    AND CURRENT_TIMESTAMP() BETWEEN t.START_TIME AND t.END_TIME
),
as_of AS (
  SELECT MAX(ACCESSED_TIME) AS anchor_time
  FROM CDM_LMS.ACTIVITY
  WHERE ROW_DELETED_TIME IS NULL
),
engaged_current AS (
  SELECT COUNT(DISTINCT a.PERSON_ID) AS engaged_count
  FROM CDM_LMS.ACTIVITY a
  JOIN active_students s ON s.PERSON_ID = a.PERSON_ID
  CROSS JOIN as_of
  WHERE a.ROW_DELETED_TIME IS NULL
    AND a.ACCESSED_TIME >  DATEADD('day', -7, as_of.anchor_time)
    AND a.ACCESSED_TIME <= as_of.anchor_time
),
engaged_previous AS (
  SELECT COUNT(DISTINCT a.PERSON_ID) AS engaged_count
  FROM CDM_LMS.ACTIVITY a
  JOIN active_students s ON s.PERSON_ID = a.PERSON_ID
  CROSS JOIN as_of
  WHERE a.ROW_DELETED_TIME IS NULL
    AND a.ACCESSED_TIME >  DATEADD('day', -14, as_of.anchor_time)
    AND a.ACCESSED_TIME <= DATEADD('day', -7,  as_of.anchor_time)
),
denom AS (
  SELECT COUNT(*) AS total FROM active_students
)
SELECT
  ROUND(ec.engaged_count * 100.0 / NULLIF(d.total, 0), 2) AS current_engagement_pct,
  ROUND(ep.engaged_count * 100.0 / NULLIF(d.total, 0), 2) AS previous_engagement_pct,
  ROUND(
    (ec.engaged_count * 100.0 / NULLIF(d.total, 0))
    - (ep.engaged_count * 100.0 / NULLIF(d.total, 0)),
    2
  ) AS engagement_pct_diff
FROM engaged_current ec
CROSS JOIN engaged_previous ep
CROSS JOIN denom d`,
    valueKey: "CURRENT_ENGAGEMENT_PCT",
    changeKey: "ENGAGEMENT_PCT_DIFF",
    format: "percent",
    reportLink: "/reporting?area=learning",
  },
  {
    id: "active-courses",
    metric_id: "metric.dashboard.active_courses.v1",
    label: "Active Courses",
    description: "Courses with student activity in the last 7 days",
    longDescription: "Counts the number of available courses in currently running terms that had at least one student access event in the last 7 days, compared to the prior 7-day window. A course is considered active if it is marked as available and belongs to a term whose start and end dates encompass the current timestamp. This metric helps identify whether course offerings are being utilized and can surface courses that may need attention or intervention.",
    prompt: "Show me details about active courses this term. Which courses have the most student activity? Are there any available courses with zero activity that might need attention?",
    query: `WITH active_courses AS (
  SELECT c.ID AS course_id
  FROM CDM_LMS.COURSE c
  JOIN CDM_LMS.TERM t
    ON t.ID = c.TERM_ID
   AND t.ROW_DELETED_TIME IS NULL
  WHERE c.ROW_DELETED_TIME IS NULL
    AND c.AVAILABLE_IND = TRUE
    AND t.START_TIME IS NOT NULL
    AND t.END_TIME IS NOT NULL
    AND CURRENT_TIMESTAMP() BETWEEN t.START_TIME AND t.END_TIME
),
as_of AS (
  SELECT MAX(ACCESSED_TIME) AS anchor_time
  FROM CDM_LMS.ACTIVITY
  WHERE ROW_DELETED_TIME IS NULL
),
active_current AS (
  SELECT COUNT(DISTINCT a.COURSE_ID) AS course_count
  FROM CDM_LMS.ACTIVITY a
  JOIN active_courses ac ON ac.course_id = a.COURSE_ID
  CROSS JOIN as_of
  WHERE a.ROW_DELETED_TIME IS NULL
    AND a.ACCESSED_TIME >  DATEADD('day', -7, as_of.anchor_time)
    AND a.ACCESSED_TIME <= as_of.anchor_time
),
active_previous AS (
  SELECT COUNT(DISTINCT a.COURSE_ID) AS course_count
  FROM CDM_LMS.ACTIVITY a
  JOIN active_courses ac ON ac.course_id = a.COURSE_ID
  CROSS JOIN as_of
  WHERE a.ROW_DELETED_TIME IS NULL
    AND a.ACCESSED_TIME >  DATEADD('day', -14, as_of.anchor_time)
    AND a.ACCESSED_TIME <= DATEADD('day', -7,  as_of.anchor_time)
)
SELECT
  ac.course_count AS current_active_courses,
  ap.course_count AS previous_active_courses,
  ac.course_count - ap.course_count AS active_courses_diff
FROM active_current ac
CROSS JOIN active_previous ap`,
    valueKey: "CURRENT_ACTIVE_COURSES",
    changeKey: "ACTIVE_COURSES_DIFF",
    format: "number",
    reportLink: "/reporting?area=teaching",
  },
  {
    id: "instructor-engagement",
    metric_id: "metric.dashboard.instructor_engagement.v1",
    label: "Instructor Engagement",
    description: "Courses with instructor grading activity this week",
    longDescription: "Measures the percentage of active courses where a primary instructor (role 'P') or teaching assistant (role 'T') manually entered at least one grade in the last 7 days. Only manual grades are counted — automated or system-generated grades are excluded. This is an early-warning indicator for Regular and Substantive Interaction (RSI) compliance risk. Low instructor engagement may indicate courses that need administrative follow-up.",
    prompt: "Analyze instructor engagement across active courses. What percentage of courses have seen manual grading activity from instructors this week? Are there departments or instructors with notably low engagement that might need follow-up?",
    query: `WITH active_courses AS (
  SELECT c.ID AS course_id
  FROM CDM_LMS.COURSE c
  JOIN CDM_LMS.TERM t
    ON t.ID = c.TERM_ID
   AND t.ROW_DELETED_TIME IS NULL
  WHERE c.ROW_DELETED_TIME IS NULL
    AND (c.AVAILABLE_IND = TRUE OR c.AVAILABLE_TO_STUDENTS_IND = TRUE)
    AND t.START_TIME IS NOT NULL
    AND t.END_TIME IS NOT NULL
    AND CURRENT_TIMESTAMP() BETWEEN t.START_TIME AND t.END_TIME
),
as_of AS (
  SELECT MAX(LAST_GRADED_TIME) AS anchor_time
  FROM CDM_LMS.GRADE
  WHERE ROW_DELETED_TIME IS NULL
),
instructor_grading AS (
  SELECT
    pc.COURSE_ID,
    g.LAST_GRADED_TIME
  FROM CDM_LMS.GRADE g
  JOIN CDM_LMS.PERSON_COURSE pc
    ON pc.ID = g.PERSON_COURSE_ID
   AND pc.ROW_DELETED_TIME IS NULL
  WHERE g.ROW_DELETED_TIME IS NULL
    AND g.MANUAL_IND = TRUE
    AND g.MODIFIER_ROLE IN ('P', 'T')
    AND g.LAST_GRADED_TIME IS NOT NULL
),
engaged_current AS (
  SELECT COUNT(DISTINCT ig.COURSE_ID) AS course_count
  FROM instructor_grading ig
  JOIN active_courses ac ON ac.course_id = ig.COURSE_ID
  CROSS JOIN as_of
  WHERE ig.LAST_GRADED_TIME >  DATEADD('day', -7, as_of.anchor_time)
    AND ig.LAST_GRADED_TIME <= as_of.anchor_time
),
engaged_previous AS (
  SELECT COUNT(DISTINCT ig.COURSE_ID) AS course_count
  FROM instructor_grading ig
  JOIN active_courses ac ON ac.course_id = ig.COURSE_ID
  CROSS JOIN as_of
  WHERE ig.LAST_GRADED_TIME >  DATEADD('day', -14, as_of.anchor_time)
    AND ig.LAST_GRADED_TIME <= DATEADD('day', -7,  as_of.anchor_time)
),
denom AS (
  SELECT COUNT(*) AS total FROM active_courses
)
SELECT
  ROUND(ec.course_count * 100.0 / NULLIF(d.total, 0), 2) AS current_engagement_pct,
  ROUND(ep.course_count * 100.0 / NULLIF(d.total, 0), 2) AS previous_engagement_pct,
  ROUND(
    (ec.course_count * 100.0 / NULLIF(d.total, 0))
    - (ep.course_count * 100.0 / NULLIF(d.total, 0)),
    2
  ) AS engagement_pct_diff
FROM engaged_current ec
CROSS JOIN engaged_previous ep
CROSS JOIN denom d`,
    valueKey: "CURRENT_ENGAGEMENT_PCT",
    changeKey: "ENGAGEMENT_PCT_DIFF",
    format: "percent",
    reportLink: "/reporting?area=teaching",
  },
  {
    id: "classic-holdouts",
    metric_id: "metric.dashboard.classic_holdouts.v1",
    label: "Classic Courses Still Active",
    description: "Classic courses with activity this week",
    longDescription: "Counts the number of Original Experience (Classic, DESIGN_MODE = 'C') courses that had student or instructor activity in the last 7 days. The goal is to drive this number to zero before the Classic experience sunset date. The comparison shows week-over-week change — a decreasing trend indicates successful migration progress. Courses still showing activity should be prioritized for migration planning and instructor outreach.",
    prompt: "Show me the Classic (Original Experience) courses that still have activity. Which courses had the most activity this week? Can you identify the instructors teaching these courses so we can prioritize migration outreach?",
    query: `WITH classic_courses AS (
  SELECT c.ID AS course_id
  FROM CDM_LMS.COURSE c
  WHERE c.ROW_DELETED_TIME IS NULL
    AND (c.AVAILABLE_IND = TRUE OR c.AVAILABLE_TO_STUDENTS_IND = TRUE)
    AND c.DESIGN_MODE = 'C'
),
as_of AS (
  SELECT MAX(LAST_ACCESSED_TIME) AS anchor_time
  FROM CDM_LMS.COURSE_ACTIVITY
  WHERE ROW_DELETED_TIME IS NULL
),
current_window AS (
  SELECT COUNT(DISTINCT ca.COURSE_ID) AS classic_course_count
  FROM CDM_LMS.COURSE_ACTIVITY ca
  JOIN classic_courses cc ON cc.course_id = ca.COURSE_ID
  CROSS JOIN as_of
  WHERE ca.ROW_DELETED_TIME IS NULL
    AND ca.LAST_ACCESSED_TIME >  DATEADD('day', -7, as_of.anchor_time)
    AND ca.LAST_ACCESSED_TIME <= as_of.anchor_time
),
previous_window AS (
  SELECT COUNT(DISTINCT ca.COURSE_ID) AS classic_course_count
  FROM CDM_LMS.COURSE_ACTIVITY ca
  JOIN classic_courses cc ON cc.course_id = ca.COURSE_ID
  CROSS JOIN as_of
  WHERE ca.ROW_DELETED_TIME IS NULL
    AND ca.LAST_ACCESSED_TIME >  DATEADD('day', -14, as_of.anchor_time)
    AND ca.LAST_ACCESSED_TIME <= DATEADD('day', -7,  as_of.anchor_time)
)
SELECT
  cw.classic_course_count AS current_classic_courses,
  pw.classic_course_count AS previous_classic_courses,
  cw.classic_course_count - pw.classic_course_count AS classic_courses_diff
FROM current_window cw
CROSS JOIN previous_window pw`,
    valueKey: "CURRENT_CLASSIC_COURSES",
    changeKey: "CLASSIC_COURSES_DIFF",
    format: "number",
    invertTrend: true,
    reportLink: "/reporting?area=migration",
  },
];
