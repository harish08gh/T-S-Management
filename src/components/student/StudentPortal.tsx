import React, { useState, useEffect } from 'react';
import {
  Student,
  ClassLink,
  AttendanceRecord,
  CourseCompletionSettings,
  StudentTab
} from '../../types';
import {
  Link2,
  CalendarCheck2,
  GraduationCap,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Mail,
  Send,
  Timer,
  BookOpen,
  Lock,
  ArrowRight,
  ShieldCheck,
  User
} from 'lucide-react';

interface StudentPortalProps {
  currentStudent: Student;
  classLink: ClassLink;
  isClassLinkActive: boolean;
  attendanceRecords: AttendanceRecord[];
  completionSettings: CourseCompletionSettings;
  onStudentTouchLink: (studentId: string) => Promise<void>;
  todayStr: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentStudent,
  classLink,
  isClassLinkActive,
  attendanceRecords,
  completionSettings,
  onStudentTouchLink,
  todayStr
}) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('student_dashboard');
  const [showTouchConfirmModal, setShowTouchConfirmModal] = useState(false);
  const [attendanceJustMarked, setAttendanceJustMarked] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Check if current student has already registered attendance today
  const todayRecord = attendanceRecords.find(
    a => a.studentId === currentStudent.id && a.date === todayStr
  );
  const hasAttendedToday = todayRecord && todayRecord.attendance === 'Present';

  // Live countdown timer calculation for class link
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!classLink.expiresAt) return 'No expiry';
      const expiry = new Date(classLink.expiresAt).getTime();
      const diff = expiry - Date.now();

      if (diff <= 0) {
        setTimeLeftStr('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s left`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [classLink.expiresAt]);

  // Touch Link handler
  const handleInitiateTouchLink = () => {
    setShowTouchConfirmModal(true);
  };

  const handleConfirmTouchAndJoin = async () => {
    try {
      await onStudentTouchLink(currentStudent.id);
      setAttendanceJustMarked(true);
      setShowTouchConfirmModal(false);
      // Open meeting in new tab
      window.open(classLink.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Error logging touch link attendance:', e);
      window.open(classLink.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Check completion eligibility
  const isCompleted = currentStudent.completionPercentage >= 100 || currentStudent.status === 'Completed';

  // Format Course Completion Email Template for this specific student
  const studentSubject = completionSettings.subjectTemplate
    .replace('{student_name}', currentStudent.name)
    .replace('{course}', currentStudent.course)
    .replace('{student_id}', currentStudent.id);

  const studentBody = completionSettings.bodyTemplate
    .replace(/{student_name}/g, currentStudent.name)
    .replace(/{student_id}/g, currentStudent.id)
    .replace(/{course}/g, currentStudent.course)
    .replace(/{trainer_name}/g, currentStudent.trainerName)
    .replace(/{phone}/g, currentStudent.phone)
    .replace(/{email}/g, currentStudent.email || 'N/A')
    .replace(/{mode}/g, currentStudent.mode)
    .replace(/{type}/g, currentStudent.type)
    .replace(/{doj}/g, currentStudent.doj)
    .replace(/{doe}/g, currentStudent.doe || todayStr);

  const mailtoHref = `mailto:${encodeURIComponent(completionSettings.recipientEmail)}?cc=${encodeURIComponent(
    completionSettings.ccEmail || ''
  )}&subject=${encodeURIComponent(studentSubject)}&body=${encodeURIComponent(studentBody)}`;

  const handleCopyEmailBody = () => {
    navigator.clipboard.writeText(studentBody);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(classLink.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Student Profile Ribbon */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-[#0a6ed1] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {currentStudent.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1d2d3e]">{currentStudent.name}</h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {currentStudent.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentStudent.course} • Batch: {currentStudent.timing} ({currentStudent.mode})
              </p>
            </div>
          </div>

          {/* Quick Progress Badge */}
          <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Course Progress</div>
              <div className="text-base font-bold text-slate-800">{currentStudent.completionPercentage}%</div>
            </div>
            <div className="w-24 bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  isCompleted ? 'bg-emerald-500' : 'bg-[#0a6ed1]'
                }`}
                style={{ width: `${currentStudent.completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Student Navigation Sub-tabs */}
        <div className="max-w-7xl mx-auto mt-4 pt-2 border-t border-slate-100 flex space-x-2">
          <button
            onClick={() => setActiveTab('student_dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'student_dashboard'
                ? 'bg-[#0a6ed1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Class Link & Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('student_attendance')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'student_attendance'
                ? 'bg-[#0a6ed1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>My Attendance Register</span>
          </button>
          <button
            onClick={() => setActiveTab('student_completion')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'student_completion'
                ? 'bg-[#0a6ed1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isCompleted ? (
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Course Completion Process</span>
            {isCompleted && (
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full">
                Unlocked
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: STUDENT DASHBOARD & TOUCH LINK */}
      {activeTab === 'student_dashboard' && (
        <div className="space-y-6">
          {/* Active Class Link Card */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
            <div className="bg-[#1d2d3e] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-blue-300 tracking-wider">
                  Live Classroom Broadcast
                </span>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span>{classLink.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    isClassLinkActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-rose-500 text-white'
                  }`}>
                    {isClassLinkActive ? 'Live Now' : 'Link Expired'}
                  </span>
                </h2>
              </div>
              <div className="flex items-center space-x-2 text-xs text-blue-200">
                <Timer className="w-4 h-4 text-blue-300" />
                <span className="font-mono font-semibold">{timeLeftStr}</span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Attendance Status Banner */}
              {hasAttendedToday || attendanceJustMarked ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Attendance Verified: Present for Today ({todayStr})</span>
                      <p className="text-emerald-700 text-[11px]">
                        Your attendance was logged via Class Link Touch. Trainer can review your live session presence.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-emerald-200 text-emerald-800">
                    Logged
                  </span>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3 text-xs text-blue-900">
                  <Clock className="w-5 h-5 text-[#0a6ed1] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Attendance Check Required</span>
                    <p className="text-blue-800 text-[11px] mt-0.5">
                      Tapping the button below will prompt you to confirm your attendance as <strong>Present</strong> and then launch your live training session.
                    </p>
                  </div>
                </div>
              )}

              {/* Meeting Link URL & Action */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">Live Meeting URL:</div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="font-mono text-xs text-[#0a6ed1] select-all break-all bg-white p-2.5 rounded border border-slate-200 flex-1">
                    {classLink.url}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                    {/* TOUCH LINK ACTION BUTTON */}
                    <button
                      onClick={handleInitiateTouchLink}
                      disabled={!isClassLinkActive}
                      className={`px-5 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                        isClassLinkActive
                          ? 'bg-[#0a6ed1] hover:bg-[#0854a0] text-white hover:shadow-md'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Touch Link & Join Class</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Trainer Notes */}
              {classLink.notes && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded text-xs text-amber-900">
                  <span className="font-semibold block mb-0.5">Trainer Announcement:</span>
                  <p>{classLink.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Recent Attendance Log (View Mode) */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#eef2f6] flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CalendarCheck2 className="w-4 h-4 text-[#0a6ed1]" />
                <span>Recent Attendance History (View Mode)</span>
              </h3>
              <button
                onClick={() => setActiveTab('student_attendance')}
                className="text-xs font-semibold text-[#0a6ed1] hover:underline"
              >
                View Full Log &rarr;
              </button>
            </div>

            <div className="divide-y divide-[#f1f5f9]">
              {attendanceRecords.slice(0, 3).map(att => (
                <div key={att.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{att.topicCovered || 'Training Session'}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Date: {att.date}</span>
                      <span>•</span>
                      <span>Time: {att.time}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    att.attendance === 'Present'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {att.attendance}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE TRACKING (STUDENT VIEW MODE) */}
      {/* "students can see their attendence in view mode need to view only date, attendance, class time." */}
      {activeTab === 'student_attendance' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">My Attendance Records</h2>
              <p className="text-xs text-slate-500">
                Official view-only attendance transcript for {currentStudent.course}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
              <span>Total Sessions Logged:</span>
              <strong className="text-slate-800">{attendanceRecords.length}</strong>
            </div>
          </div>

          <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="fiori-table-header">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 min-w-[120px]">Date</th>
                    <th className="py-3 px-4 min-w-[120px]">Class Time</th>
                    <th className="py-3 px-4 min-w-[130px]">Attendance</th>
                    <th className="py-3 px-4 min-w-[240px]">Topic Covered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f6]">
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.map((att, idx) => (
                      <tr key={att.id} className="fiori-table-row">
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {att.date}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {att.time}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                            att.attendance === 'Present'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {att.attendance === 'Present' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                            )}
                            {att.attendance}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {att.topicCovered || 'Regular Curriculum Session'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No attendance entries recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#d9e0e7] text-xs text-slate-500 flex items-center justify-between">
              <span>Read-only transcript mode. Attendance is recorded when you touch the live class link.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COURSE COMPLETION PROCESS */}
      {/* "completion process: actually in my institution student need to send mail for course completion. trainer attach the mail template it need to visible for only completed student." */}
      {activeTab === 'student_completion' && (
        <div>
          {isCompleted ? (
            /* UNLOCKED: Visible ONLY for completed student */
            <div className="space-y-6">
              <div className="bg-emerald-700 text-white p-6 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-emerald-200" />
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-200">
                      Congratulations!
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">Course Completed (100%)</h2>
                  <p className="text-xs text-emerald-100 max-w-xl">
                    You have fulfilled all syllabus hours and final projects. Follow the instructions below to submit your official Course Completion request email to the evaluation department.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={mailtoHref}
                    className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-md text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Send className="w-4 h-4 text-emerald-700" />
                    <span>Send Email (Mail App)</span>
                  </a>
                </div>
              </div>

              {/* Official Template Attached by Trainer */}
              <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-[#0a6ed1]" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Official Course Completion Email Template
                    </h3>
                  </div>
                  <button
                    onClick={handleCopyEmailBody}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Email Body'}</span>
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  {/* Mail Headers */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-1.5 text-slate-700">
                    <div>
                      <span className="font-bold text-slate-800">To:</span>{' '}
                      <span className="font-mono text-blue-700">{completionSettings.recipientEmail}</span>
                    </div>
                    {completionSettings.ccEmail && (
                      <div>
                        <span className="font-bold text-slate-800">CC:</span>{' '}
                        <span className="font-mono text-slate-600">{completionSettings.ccEmail}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-slate-800">Subject:</span>{' '}
                      <span className="font-semibold text-slate-900">{studentSubject}</span>
                    </div>
                  </div>

                  {/* Pre-filled Mail Body */}
                  <div className="bg-white border border-slate-200 rounded p-4 font-mono text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap select-all">
                    {studentBody}
                  </div>

                  {/* Submission Checklist */}
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded space-y-2">
                    <span className="font-bold text-emerald-900 block text-xs">
                      Mandatory Submission Guidelines:
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-emerald-800 list-disc list-inside">
                      {completionSettings.guidelines.map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Launch Email Client Button */}
                  <div className="pt-2 flex justify-end">
                    <a
                      href={mailtoHref}
                      className="px-5 py-2.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>Compose & Send Completion Email</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* LOCKED: Shown for ongoing students who haven't finished 100% */
            <div className="bg-white border border-[#d9e0e7] rounded-lg p-8 shadow-xs text-center max-w-xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Course Completion In Progress</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                As per institution policy, the official <strong>Course Completion Email Template</strong> is unlocked only when your syllabus completion reaches <strong>100%</strong> and your trainer logs your <strong>Date of Ending (DOE)</strong>.
              </p>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Current Progress</span>
                  <span className="font-bold text-[#0a6ed1]">{currentStudent.completionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-[#0a6ed1] h-2 rounded-full transition-all"
                    style={{ width: `${currentStudent.completionPercentage}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Trainer: {currentStudent.trainerName}</span>
                  <span>DOJ: {currentStudent.doj}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 italic">
                Please continue attending your scheduled classes to achieve 100% completion.
              </div>
            </div>
          )}
        </div>
      )}

      {/* SPECIAL REQUIREMENT MODAL: STUDENT TOUCHES LINK -> CONFIRM ATTENDANCE AS PRESENT */}
      {showTouchConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1d2d3e] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Register Attendance & Join Class</h3>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed">
                You are about to enter today's session: <strong>{classLink.title}</strong>.
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mark Attendance as PRESENT?</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Session Date: <strong>{todayStr}</strong> • Batch Time: <strong>{currentStudent.timing}</strong>
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTouchConfirmModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTouchAndJoin}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Yes, Mark Present & Join Meeting</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
