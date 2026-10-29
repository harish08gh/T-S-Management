import { Student, DemoStudent, AttendanceRecord, ClassLink, CourseCompletionSettings } from '../types';

// Clean empty datasets as requested (no mock data)
export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_DEMO_STUDENTS: DemoStudent[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_CLASS_LINK: ClassLink = {
  id: 'link-default',
  title: 'Daily Live Classroom Session',
  url: 'https://meet.google.com/new',
  course: 'All Ongoing Batches',
  trainerName: 'PPSTrainer',
  durationOption: 'entire_day',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  active: true,
  notes: 'Please join on time. Your attendance will be registered upon joining.'
};

export const INITIAL_COMPLETION_SETTINGS: CourseCompletionSettings = {
  institutionName: 'PPS Software Solutions & Academy',
  recipientEmail: 'completions@pps-sw.com',
  ccEmail: 'trainer@pps-sw.com',
  subjectTemplate: 'Course Completion Request - {student_name} - {course} - [{student_id}]',
  bodyTemplate: `Respected Training Coordinator & Evaluation Team,

I have successfully completed 100% of my course curriculum, practical assignments, and final project under Trainer {trainer_name}.

Please find my student details below:
• Student Name: {student_name}
• Student ID: {student_id}
• Contact Phone: {phone}
• Registered Email: {email}
• Course Title: {course}
• Mode & Batch: {mode} ({type})
• Date of Joining (DOJ): {doj}
• Date of Completion (DOE): {doe}
• Trainer in Charge: {trainer_name}

Attached Deliverables:
1. Final Capstone Project Source Repository & Live Demo URL
2. Completed Lab Assignment Logs
3. Student Feedback Form

Kindly verify my records and issue my Course Completion Certificate & Placement Assistance credentials.

Thanking you,
Yours sincerely,
{student_name}`,
  guidelines: [
    'Verify that your Date of Ending (DOE) has been confirmed by your trainer.',
    'Ensure all weekly assignments and your final project repository link are ready.',
    'Send the email from your registered student email address.',
    'Attach any mandatory screenshots or project documentation as required by your instructor.'
  ],
  requiredAttachments: [
    'Final Capstone Project Repository / Zip link',
    'Self-declaration of attendance and project completion'
  ],
  updatedAt: new Date().toISOString()
};
