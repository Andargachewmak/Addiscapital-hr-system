// Central org model — single source of truth for departments and job titles.
// Used by the employee/recruitment forms and mirrored by the server seed.

export const DEPARTMENTS = [
  'Internal Audit',
  'Risk and Compliance',
  'Secretary',
  'Information Technology',
  'Plan, Marketing and Promotion',
  'Legal',
  'Ethics Officer',
  'Operation',
  'Branch Operations',
  'Finance',
  'Procurement',
  'HR',
] as const

// Org-wide leadership roles, selectable from any department.
export const LEADERSHIP_TITLES = ['CEO', 'Deputy Operation Manager', 'Deputy Manager'] as const

// The director (head) of each department.
const DIRECTOR: Record<string, string> = {
  'Internal Audit': 'Internal Audit Director',
  'Risk and Compliance': 'Risk and Compliance Director',
  'Secretary': 'Secretary Director',
  'Information Technology': 'IT Director',
  'Plan, Marketing and Promotion': 'Plan, Marketing and Promotion Director',
  'Legal': 'Legal Director',
  'Ethics Officer': 'Ethics Director',
  'Operation': 'Operation Director',
  'Branch Operations': 'Branch Operations Director',
  'Finance': 'Finance Director',
  'Procurement': 'Procurement Director',
  'HR': 'HR Director',
}

// Department-specific roles (excluding the director, which is prepended automatically).
const ROLES: Record<string, string[]> = {
  'Internal Audit': ['Internal Audit Team Coordinator', 'Senior Internal Auditor', 'Junior Internal Auditor'],
  'Risk and Compliance': ['Risk and Compliance Team Coordinator', 'Senior Risk and Compliance Officer', 'Junior Risk and Compliance Officer'],
  'Secretary': ['Executive Secretary', 'Senior Secretary', 'Junior Secretary'],
  'Information Technology': ['Senior System Developer', 'Junior System Developer', 'System Administrator'],
  'Plan, Marketing and Promotion': ['Marketing Team Coordinator', 'Plan Team Coordinator', 'Senior Plan, Marketing and Promotion Officer', 'Junior Plan, Marketing and Promotion Officer'],
  'Legal': ['Legal Team Coordinator', 'Senior Legal Officer', 'Junior Legal Officer'],
  'Ethics Officer': ['Ethics Team Coordinator', 'Senior Ethics Officer', 'Junior Ethics Officer'],
  'Operation': ['KYC Team Coordinator Officer', 'Senior KYC Officer', 'Junior KYC Officer', 'Senior Insurance Officer', 'Engineer Team Coordinator', 'Senior Engineer', 'Junior Engineer'],
  'Branch Operations': ['Branch Manager', 'Deputy Branch Manager', 'Senior Branch Officer', 'Junior Branch Officer'],
  'Finance': ['General Ledger Team Coordinator', 'Treasury and Fund Team Coordinator', 'Senior Finance Officer', 'Junior Finance Officer', 'Cashier'],
  'Procurement': ['Procurement Team Coordinator', 'Senior Procurement Officer', 'Junior Procurement Officer'],
  'HR': ['HR Team Coordinator', 'Building Management Officer', 'Asset Management Team Coordinator', 'Senior Asset Management Officer', 'Junior Asset Management Officer', 'Driver'],
}

// Director first, then the department's roles (de-duplicated).
export const JOB_TITLES_BY_DEPT: Record<string, string[]> = Object.fromEntries(
  DEPARTMENTS.map((d) => {
    const dir = DIRECTOR[d]
    const rest = (ROLES[d] || []).filter((t) => t !== dir)
    return [d, [dir, ...rest]]
  }),
)

// Titles available when a department is selected (department roles + leadership).
export function jobTitlesFor(dept?: string): string[] {
  const deptTitles = (dept && JOB_TITLES_BY_DEPT[dept]) || []
  return [...deptTitles, ...LEADERSHIP_TITLES]
}

export const ALL_JOB_TITLES: string[] = Array.from(
  new Set(DEPARTMENTS.flatMap((d) => JOB_TITLES_BY_DEPT[d]).concat([...LEADERSHIP_TITLES])),
)

// Color per department, used for charts/badges (falls back to gray elsewhere).
export const DEPT_COLOR: Record<string, string> = {
  'Internal Audit': '#6C63FF',
  'Risk and Compliance': '#00D4AA',
  'Secretary': '#F5A623',
  'Information Technology': '#3B82F6',
  'Plan, Marketing and Promotion': '#E86FA0',
  'Legal': '#8B85FF',
  'Ethics Officer': '#4FA3E8',
  'Operation': '#3DD68C',
  'Branch Operations': '#0EA5E9',
  'Finance': '#FF5F5F',
  'Procurement': '#F59E0B',
  'HR': '#14B8A6',
}
