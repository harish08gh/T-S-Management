export type StudentStatus = 'Ongoing' | 'Demo' | 'Completed';
export type ClassMode = 'Weekdays' | 'Weekend';
export type ClassType = 'Online' | 'Offline';
export type DemoStatus = 'Converted' | 'Not Converted' | 'Pending';
export type AttendanceStatus = 'Present' | 'Absent';

export interface Student {
  id: string;
  sno?: number;
  name: string;
  phone: string;
  email: string;
  course: string;
  doj: string; // YYYY-MM-DD
  doe?: string; // YYYY-MM-DD (Date of Ending - if completed)
  status: StudentStatus;
  mode: ClassMode;
  type: ClassType;
  timing: string;
  completionPercentage: number; // 0 - 100
  trainerName: string;
  remark: string;
  isIrregular: boolean;
  irregularReason?: string;
  lastActiveDate?: string;
  avatar?: string;
}

export interface DemoStudent {
  id: string;
  sno?: number;
  name: string;
  phone: string;
  email?: string;
  date: string; // YYYY-MM-DD
  time: string;
  course: string;
  exp: string; // e.g., "Fresher", "1-3 Years", "Career Switch"
  mode: ClassType;
  feedback: string;
  status: DemoStatus;
  trainerName: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  date: string; // YYYY-MM-DD
  time: string;
  attendance: AttendanceStatus;
  topicCovered: string; // fillable by trainer
  markedBy: 'Student (Touch Link)' | 'Trainer (Dashboard)' | 'Trainer (Attendance Page)';
  markedAt: string;
}

export interface ClassLink {
  id: string;
  title: string;
  url: string;
  course: string; // 'All Ongoing' or specific course
  trainerName: string;
  durationOption: '1_hour' | '2_hours' | '4_hours' | 'entire_day' | 'custom';
  createdAt: string; // ISO
  expiresAt: string; // ISO
  active: boolean;
  notes?: string;
}

export interface CourseCompletionSettings {
  institutionName: string;
  recipientEmail: string;
  ccEmail?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  guidelines: string[];
  requiredAttachments: string[];
  updatedAt: string;
}

export type TrainerTab =
  | 'dashboard'
  | 'student_details'
  | 'demo_management'
  | 'attendance_tracking'
  | 'class_schedule'
  | 'irregular_students'
  | 'completion_template'
  | 'class_links'
  | 'settings';

export type StudentTab =
  | 'student_dashboard'
  | 'student_attendance'
  | 'student_completion';

export type UserRole = 'trainer' | 'student';

export interface TrainerSystemSettings {
  trainerName: string;
  trainerEmail: string;
  trainerPhone: string;
  trainerPassword: string;
  studentPassword: string;
  institutionName: string;
  institutionEmail: string;
  institutionPhone?: string;
  institutionWebsite?: string;
  defaultLinkDuration: '1_hour' | '2_hours' | '4_hours' | 'entire_day';
  minAttendancePercentForCompletion: number;
  irregularThresholdDays: number;
}
