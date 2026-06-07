import type { Employee, LeaveRequest, JobPosting, Candidate, PayrollRecord, PerformanceReview, Goal, Attendance } from '@/types'

export const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', created_at: '2020-03-02', updated_at: '2026-03-01', first_name: 'Tyler', last_name: 'Kim', email: 't.kim@nexusco.io', phone: '+1 415 555 0101', department: 'Engineering', job_title: 'Principal Architect', employment_type: 'full_time', status: 'wfh', location: 'Remote', start_date: '2020-03-02', salary: 215000, skills: ['TypeScript', 'Rust', 'Go', 'Kubernetes', 'System Design'] },
  { id: '2', created_at: '2021-09-07', updated_at: '2026-03-01', first_name: 'Aisha', last_name: 'Roberts', email: 'a.roberts@nexusco.io', phone: '+1 212 555 0202', department: 'Sales', job_title: 'Sales Director', employment_type: 'full_time', status: 'active', location: 'New York', start_date: '2021-09-07', salary: 195000, skills: ['Enterprise Sales', 'CRM', 'Negotiation', 'Forecasting'] },
  { id: '3', created_at: '2022-01-15', updated_at: '2026-03-01', first_name: 'Jordan', last_name: 'Lee', email: 'j.lee@nexusco.io', phone: '+1 512 555 0303', department: 'Operations', job_title: 'Operations Manager', employment_type: 'full_time', status: 'active', location: 'Austin, TX', start_date: '2022-01-15', salary: 135000, skills: ['Process Optimization', 'Lean', 'JIRA', 'OKR Frameworks'] },
  { id: '4', created_at: '2023-06-03', updated_at: '2026-03-01', first_name: 'Priya', last_name: 'Nair', email: 'p.nair@nexusco.io', phone: '+1 650 555 0404', department: 'Design', job_title: 'Lead Product Designer', employment_type: 'full_time', status: 'on_leave', location: 'Remote', start_date: '2023-06-03', salary: 148000, skills: ['Figma', 'UX Research', 'Design Systems', 'Prototyping'] },
  { id: '5', created_at: '2023-08-18', updated_at: '2026-03-01', first_name: 'Layla', last_name: 'Martinez', email: 'l.martinez@nexusco.io', phone: '+1 773 555 0505', department: 'HR', job_title: 'HR Business Partner', employment_type: 'full_time', status: 'active', location: 'Chicago', start_date: '2023-08-18', salary: 115000, skills: ['Talent Acquisition', 'HRIS', 'Employment Law', 'L&D'] },
  { id: '6', created_at: '2019-02-12', updated_at: '2026-03-01', first_name: 'Ravi', last_name: 'Okonkwo', email: 'r.okonkwo@nexusco.io', phone: '+1 415 555 0606', department: 'Finance', job_title: 'CFO', employment_type: 'full_time', status: 'active', location: 'San Francisco', start_date: '2019-02-12', salary: 280000, skills: ['Financial Modeling', 'M&A', 'FP&A', 'Investor Relations'] },
  { id: '7', created_at: '2024-11-05', updated_at: '2026-03-01', first_name: 'Sofia', last_name: 'Wang', email: 's.wang@nexusco.io', phone: '+1 206 555 0707', department: 'Engineering', job_title: 'ML Engineer', employment_type: 'full_time', status: 'onboarding', location: 'Seattle', start_date: '2024-11-05', salary: 168000, skills: ['Python', 'PyTorch', 'MLOps', 'Data Science'] },
  { id: '8', created_at: '2026-03-13', updated_at: '2026-03-13', first_name: 'Marcus', last_name: 'Chen', email: 'm.chen@nexusco.io', phone: '+1 415 555 0808', department: 'Engineering', job_title: 'Sr. Backend Engineer', employment_type: 'full_time', status: 'onboarding', location: 'San Francisco', start_date: '2026-03-13', salary: 182000, skills: ['Node.js', 'PostgreSQL', 'Redis', 'AWS'] },
  { id: '9', created_at: '2021-04-12', updated_at: '2026-03-01', first_name: 'Daniel', last_name: 'Park', email: 'd.park@nexusco.io', department: 'Product', job_title: 'VP of Product', employment_type: 'full_time', status: 'active', location: 'San Francisco', start_date: '2021-04-12', salary: 225000, skills: ['Product Strategy', 'Roadmapping', 'Data Analysis'] },
  { id: '10', created_at: '2022-07-20', updated_at: '2026-03-01', first_name: 'Mei', last_name: 'Zhang', email: 'm.zhang@nexusco.io', department: 'Marketing', job_title: 'Head of Growth', employment_type: 'full_time', status: 'active', location: 'Austin, TX', start_date: '2022-07-20', salary: 155000, skills: ['Growth Hacking', 'SEO', 'Paid Ads', 'Analytics'] },
]

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr1', employee_id: '4', leave_type: 'annual', start_date: '2026-03-20', end_date: '2026-03-25', days: 4, reason: 'Family vacation', status: 'pending', created_at: '2026-03-10', employee: MOCK_EMPLOYEES[3] },
  { id: 'lr2', employee_id: '3', leave_type: 'sick', start_date: '2026-03-12', end_date: '2026-03-14', days: 3, reason: 'Medical appointment', status: 'approved', created_at: '2026-03-11', approved_by: '5', employee: MOCK_EMPLOYEES[2] },
  { id: 'lr3', employee_id: '1', leave_type: 'personal', start_date: '2026-03-28', end_date: '2026-03-28', days: 1, reason: 'Personal errands', status: 'pending', created_at: '2026-03-12', employee: MOCK_EMPLOYEES[0] },
  { id: 'lr4', employee_id: '2', leave_type: 'annual', start_date: '2026-04-07', end_date: '2026-04-11', days: 5, reason: 'Spring break', status: 'approved', created_at: '2026-03-01', employee: MOCK_EMPLOYEES[1] },
  { id: 'lr5', employee_id: '7', leave_type: 'sick', start_date: '2026-03-05', end_date: '2026-03-06', days: 2, reason: 'Flu', status: 'approved', created_at: '2026-03-04', employee: MOCK_EMPLOYEES[6] },
]

export const MOCK_JOB_POSTINGS: JobPosting[] = [
  { id: 'j1', title: 'Senior Full-Stack Engineer', department: 'Engineering', location: 'Remote', employment_type: 'full_time', description: 'Build scalable systems for our growing platform.', requirements: ['5+ yrs TypeScript', 'React + Node.js', 'PostgreSQL', 'Cloud (AWS/GCP)'], salary_min: 160000, salary_max: 200000, status: 'open', applicant_count: 32, created_at: '2026-02-15', updated_at: '2026-03-10' },
  { id: 'j2', title: 'Head of Product Design', department: 'Design', location: 'San Francisco', employment_type: 'full_time', description: 'Lead our design team and define our product vision.', requirements: ['8+ yrs Product Design', 'Design Systems', 'Leadership', 'Figma'], salary_min: 170000, salary_max: 210000, status: 'open', applicant_count: 18, created_at: '2026-02-20', updated_at: '2026-03-08' },
  { id: 'j3', title: 'Senior Sales Manager — EMEA', department: 'Sales', location: 'London', employment_type: 'full_time', description: 'Drive enterprise sales across the EMEA region.', requirements: ['7+ yrs B2B Sales', 'EMEA experience', 'SaaS', 'CRM mastery'], salary_min: 110000, salary_max: 140000, status: 'open', applicant_count: 24, created_at: '2026-03-01', updated_at: '2026-03-12' },
  { id: 'j4', title: 'DevOps Engineer', department: 'Engineering', location: 'Remote', employment_type: 'full_time', description: 'Own our CI/CD and infrastructure automation.', requirements: ['Kubernetes', 'Terraform', 'AWS', 'GitHub Actions'], salary_min: 145000, salary_max: 175000, status: 'open', applicant_count: 11, created_at: '2026-03-05', updated_at: '2026-03-12' },
  { id: 'j5', title: 'Marketing Analytics Lead', department: 'Marketing', location: 'Austin', employment_type: 'full_time', description: 'Build our data-driven marketing engine.', requirements: ['SQL', 'Looker/Tableau', 'Attribution Modeling', 'Python'], salary_min: 130000, salary_max: 160000, status: 'open', applicant_count: 27, created_at: '2026-03-02', updated_at: '2026-03-11' },
  { id: 'j6', title: 'HR Business Partner', department: 'HR', location: 'Chicago', employment_type: 'full_time', description: 'Support our rapidly growing operations team.', requirements: ['SHRM Certified', 'HRIS experience', 'Employee Relations'], salary_min: 110000, salary_max: 130000, status: 'open', applicant_count: 9, created_at: '2026-03-08', updated_at: '2026-03-12' },
]

export const MOCK_CANDIDATES: Candidate[] = [
  { id: 'c1', job_id: 'j1', first_name: 'Amara', last_name: 'Osei', email: 'a.osei@email.com', stage: 'interview', score: 87, created_at: '2026-02-20', updated_at: '2026-03-10' },
  { id: 'c2', job_id: 'j1', first_name: 'Felix', last_name: 'Bauer', email: 'f.bauer@email.com', stage: 'assessment', score: 91, created_at: '2026-02-22', updated_at: '2026-03-11' },
  { id: 'c3', job_id: 'j2', first_name: 'Yuna', last_name: 'Sato', email: 'y.sato@email.com', stage: 'offer', score: 94, created_at: '2026-02-25', updated_at: '2026-03-12' },
  { id: 'c4', job_id: 'j3', first_name: 'Carlos', last_name: 'Mendez', email: 'c.mendez@email.com', stage: 'screening', score: 78, created_at: '2026-03-05', updated_at: '2026-03-10' },
  { id: 'c5', job_id: 'j4', first_name: 'Ingrid', last_name: 'Larsen', email: 'i.larsen@email.com', stage: 'applied', created_at: '2026-03-12', updated_at: '2026-03-12' },
]

export const MOCK_PAYROLL: PayrollRecord[] = [
  { id: 'p1', created_at: '2026-03-01', employee_id: '6', period_start: '2026-03-01', period_end: '2026-03-31', base_salary: 23333, bonus: 0, deductions: 4200, net_pay: 19133, status: 'processed', processed_at: '2026-03-13' },
  { id: 'p2', created_at: '2026-03-01', employee_id: '9', period_start: '2026-03-01', period_end: '2026-03-31', base_salary: 18750, bonus: 0, deductions: 3300, net_pay: 15450, status: 'processed', processed_at: '2026-03-13' },
  { id: 'p3', created_at: '2026-03-01', employee_id: '1', period_start: '2026-03-01', period_end: '2026-03-31', base_salary: 17917, bonus: 0, deductions: 3200, net_pay: 14717, status: 'processed', processed_at: '2026-03-13' },
  { id: 'p4', created_at: '2026-03-01', employee_id: '2', period_start: '2026-03-01', period_end: '2026-03-31', base_salary: 16250, bonus: 4200, deductions: 3600, net_pay: 16850, status: 'processed', processed_at: '2026-03-13' },
  { id: 'p5', created_at: '2026-03-01', employee_id: '8', period_start: '2026-03-01', period_end: '2026-03-31', base_salary: 15167, bonus: 3000, deductions: 2800, net_pay: 15367, status: 'processed', processed_at: '2026-03-13' },
  { id: 'p6', created_at: '2026-03-01', employee_id: '4', period_start: '2026-03-01', period_end: '2026-03-31', base_salary: 12333, bonus: 0, deductions: 2200, net_pay: 10133, status: 'processed', processed_at: '2026-03-13' },
]

export const MOCK_REVIEWS: PerformanceReview[] = [
  { id: 'r1', created_at: '2026-03-01', employee_id: '1', reviewer_id: '9', period: 'Q1 2026', score: 9.8, goals_score: 9.5, skills_score: 10.0, culture_score: 9.8, status: 'submitted', comments: 'Exceptional architectural work on the new microservices migration.' },
  { id: 'r2', created_at: '2026-03-01', employee_id: '2', reviewer_id: '9', period: 'Q1 2026', score: 9.5, goals_score: 9.8, skills_score: 9.2, culture_score: 9.5, status: 'submitted', comments: '127% of quota. Outstanding EMEA expansion.' },
  { id: 'r3', created_at: '2026-03-01', employee_id: '3', reviewer_id: '9', period: 'Q1 2026', score: 9.2, goals_score: 9.0, skills_score: 9.4, culture_score: 9.2, status: 'submitted', comments: 'Drove major process efficiency improvements across logistics.' },
  { id: 'r4', created_at: '2026-03-01', employee_id: '4', reviewer_id: '9', period: 'Q1 2026', score: 9.0, goals_score: 8.8, skills_score: 9.2, culture_score: 9.0, status: 'submitted', comments: 'Redesigned core user flows. NPS improved +14 points.' },
  { id: 'r5', created_at: '2026-03-01', employee_id: '10', reviewer_id: '9', period: 'Q1 2026', score: 8.4, goals_score: 8.2, skills_score: 8.6, culture_score: 8.4, status: 'draft' },
]

export const MOCK_GOALS: Goal[] = [
  { id: 'g1', created_at: '2026-01-01', employee_id: '1', title: 'Complete microservices migration', target_date: '2026-06-30', progress: 68, status: 'on_track' },
  { id: 'g2', created_at: '2026-01-01', employee_id: '2', title: 'Close $8M ARR in EMEA', target_date: '2026-12-31', progress: 52, status: 'on_track' },
  { id: 'g3', created_at: '2026-01-01', employee_id: '4', title: 'Launch new design system v3', target_date: '2026-04-15', progress: 40, status: 'at_risk' },
  { id: 'g4', created_at: '2026-01-01', employee_id: '3', title: 'Reduce ops costs by 15%', target_date: '2026-12-31', progress: 28, status: 'on_track' },
  { id: 'g5', created_at: '2026-01-01', employee_id: '7', title: 'Deploy ML recommendation engine', target_date: '2026-03-31', progress: 85, status: 'on_track' },
  { id: 'g6', created_at: '2026-01-01', employee_id: '5', title: 'Reduce time-to-hire by 20%', target_date: '2026-12-31', progress: 60, status: 'on_track' },
]

export const HEADCOUNT_TREND = [
  { month: 'Apr', count: 218 },
  { month: 'May', count: 221 },
  { month: 'Jun', count: 224 },
  { month: 'Jul', count: 226 },
  { month: 'Aug', count: 229 },
  { month: 'Sep', count: 233 },
  { month: 'Oct', count: 236 },
  { month: 'Nov', count: 238 },
  { month: 'Dec', count: 239 },
  { month: 'Jan', count: 242 },
  { month: 'Feb', count: 245 },
  { month: 'Mar', count: 248 },
]

export const DEPT_HEADCOUNT = [
  { department: 'Engineering', count: 75, color: '#6C63FF' },
  { department: 'Sales', count: 50, color: '#00D4AA' },
  { department: 'Operations', count: 38, color: '#F5A623' },
  { department: 'Finance', count: 38, color: '#FF5F5F' },
  { department: 'Design', count: 25, color: '#E86FA0' },
  { department: 'HR', count: 22, color: '#3DD68C' },
]

export const TURNOVER_TREND = [
  { month: 'Apr', rate: 4.8 }, { month: 'May', rate: 4.5 }, { month: 'Jun', rate: 5.1 },
  { month: 'Jul', rate: 5.3 }, { month: 'Aug', rate: 4.7 }, { month: 'Sep', rate: 4.2 },
  { month: 'Oct', rate: 4.0 }, { month: 'Nov', rate: 3.7 }, { month: 'Dec', rate: 3.5 },
  { month: 'Jan', rate: 3.3 }, { month: 'Feb', rate: 3.1 }, { month: 'Mar', rate: 3.2 },
]

export const PIPELINE_STAGES = [
  { name: 'Applied', count: 87, color: '#6C63FF' },
  { name: 'Screening', count: 64, color: '#4FA3E8' },
  { name: 'Interview', count: 45, color: '#00D4AA' },
  { name: 'Assessment', count: 28, color: '#F5A623' },
  { name: 'Offer', count: 19, color: '#3DD68C' },
]

export const ACTIVITY_FEED = [
  { id: 1, type: 'hire', text: 'Marcus Chen joined as Senior Backend Engineer', time: '2 hours ago', dept: 'Engineering', color: 'bg-emerald-400' },
  { id: 2, type: 'leave', text: 'Priya Nair submitted PTO request for Mar 20–25', time: '4 hours ago', dept: 'Design', color: 'bg-amber-400' },
  { id: 3, type: 'training', text: 'Jordan Lee completed Leadership Training Module 3', time: 'Yesterday', dept: 'Operations', color: 'bg-brand-400' },
  { id: 4, type: 'payroll', text: 'March payroll of $1.24M processed successfully', time: 'Yesterday', dept: 'Finance', color: 'bg-teal-400' },
  { id: 5, type: 'recruitment', text: '3 candidates advanced to final round interview', time: '2 days ago', dept: 'Recruitment', color: 'bg-red-400' },
]

export const UPCOMING_EVENTS = [
  { id: 1, title: 'Engineering All-Hands Meeting', date: 'Mon Mar 16', time: '10:00 AM', detail: 'Zoom · 75 attendees', color: 'border-brand-400' },
  { id: 2, title: 'Q2 Budget Review — HR', date: 'Tue Mar 17', time: '2:00 PM', detail: 'Conference Room B', color: 'border-amber-400' },
  { id: 3, title: '3 Final Round Interviews', date: 'Wed Mar 18', time: 'All Day', detail: 'Design Lead, PM, Sr. DevOps', color: 'border-teal-400' },
  { id: 4, title: 'New Hire Onboarding (2 Employees)', date: 'Thu Mar 19', time: '9:00 AM', detail: 'HR Suite', color: 'border-emerald-400' },
  { id: 5, title: 'Culture Survey Deadline', date: 'Fri Mar 20', time: 'EOD', detail: '218 of 248 completed', color: 'border-pink-400' },
]
