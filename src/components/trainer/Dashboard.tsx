import React, { useState } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  UserX,
  TrendingUp,
  Percent,
  Link as LinkIcon,
  Sparkles,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import { Student, DemoStudent, AttendanceRecord, ClassLink, TrainerTab } from '../../types';

interface DashboardProps {
  students: Student[];
  demos: DemoStudent[];
  attendance: AttendanceRecord[];
  classLink: ClassLink;
  isClassLinkActive: boolean;
  onNavigateTab: (tab: TrainerTab) => void;
  onQuickMarkAttendance: (studentId: string, status: 'Present' | 'Absent') => void;
  onQuickUpdateCompletion: (studentId: string, delta: number) => void;
  onOpenClassLinkModal: () => void;
  todayStr: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  demos,
  attendance,
  classLink,
  isClassLinkActive,
  onNavigateTab,
  onQuickMarkAttendance,
  onQuickUpdateCompletion,
  onOpenClassLinkModal,
  todayStr
}) => {
  const [selectedTopicInput, setSelectedTopicInput] = useState<{ [id: string]: string }>({});

  const ongoingStudents = students.filter(s => s.status === 'Ongoing' && !s.isIrregular);
  const irregularStudents = students.filter(s => s.isIrregular);
  const completedStudents = students.filter(s => s.status === 'Completed');

  // Attendance for today
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const presentTodayCount = todayAttendance.filter(a => a.attendance === 'Present').length;
  const attendanceRate = ongoingStudents.length > 0
    ? Math.round((presentTodayCount / ongoingStudents.length) * 100)
    : 0;

  // Pending students: ongoing students who have NOT touched link or been marked today
  const markedStudentIds = new Set(todayAttendance.map(a => a.studentId));
  const pendingAttendanceStudents = ongoingStudents.filter(s => !markedStudentIds.has(s.id));

  // Demos
  const convertedDemos = demos.filter(d => d.status === 'Converted').length;
  const pendingDemos = demos.filter(d => d.status === 'Pending').length;

  // Average completion of ongoing students
  const avgCompletion = ongoingStudents.length > 0
    ? Math.round(ongoingStudents.reduce((acc, s) => acc + s.completionPercentage, 0) / ongoingStudents.length)
    : 0;

  // Upcoming classes today
  const upcomingClasses = ongoingStudents.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* SAP Fiori Page Header */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">Trainer Cockpit</div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Overview & Daily Progress</h1>
            <p className="text-xs text-slate-500 mt-1">
              Active Session Date: {todayStr} • Training & Attendance Management
            </p>
          </div>

          {/* Quick Broadcast Class Link Status */}
          <div className="flex items-center gap-3 bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 sm:px-4">
            <div className={`w-3 h-3 rounded-full ${isClassLinkActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-400'}`}></div>
            <div className="text-left text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                Class Link: {isClassLinkActive ? (
                  <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded text-[11px]">Active</span>
                ) : (
                  <span className="text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded text-[11px]">Expired / Inactive</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                {classLink.url}
              </div>
            </div>
            <button
              onClick={onOpenClassLinkModal}
              className="ml-auto text-xs font-medium text-[#0a6ed1] hover:text-[#0854a0] bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
            >
              Update Link
            </button>
          </div>
        </div>
      </div>

      {/* KPI Tiles (SAP Fiori Dynamic Launchpad Standard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Ongoing Students */}
        <div
          onClick={() => onNavigateTab('class_schedule')}
          className="fiori-tile p-4 cursor-pointer hover:border-[#0a6ed1]"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Ongoing Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-slate-800 tracking-tight">{ongoingStudents.length}</div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Total Enrolled: {students.length}</span>
            <span className="text-blue-600 font-medium flex items-center">
              View <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Tile 2: Today's Attendance Rate */}
        <div
          onClick={() => onNavigateTab('attendance_tracking')}
          className="fiori-tile p-4 cursor-pointer hover:border-emerald-500"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Attendance Today</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-700 tracking-tight">
            {attendanceRate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{presentTodayCount} Present / {ongoingStudents.length} Active</span>
            <span className="text-emerald-600 font-medium flex items-center">
              Track <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Tile 3: Demo Conversions */}
        <div
          onClick={() => onNavigateTab('demo_management')}
          className="fiori-tile p-4 cursor-pointer hover:border-amber-500"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Demo Pipeline</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-700 tracking-tight">
            {convertedDemos} <span className="text-xs font-normal text-slate-500">converted</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{pendingDemos} pending trials</span>
            <span className="text-amber-600 font-medium flex items-center">
              Manage <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Tile 4: Average Completion Progress */}
        <div
          onClick={() => onNavigateTab('class_schedule')}
          className="fiori-tile p-4 cursor-pointer hover:border-indigo-500"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Avg Course Progress</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-indigo-700 tracking-tight">
            {avgCompletion}%
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{completedStudents.length} graduated students</span>
            <span className="text-indigo-600 font-medium flex items-center">
              Schedule <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* SPECIAL REQUIREMENT 1: PENDING ATTENDANCE VERIFICATION ALERT */}
      {/* If students didn't touch link, prompt trainer at dashboard to mark present/absent */}
      {pendingAttendanceStudents.length > 0 ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Pending Attendance Verification ({pendingAttendanceStudents.length} Students)
                </h3>
                <p className="text-xs text-amber-800">
                  These ongoing students have not touched the class link for today ({todayStr}). Please mark them as Present or Absent:
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('attendance_tracking')}
              className="text-xs font-semibold text-amber-900 hover:text-amber-950 underline self-start sm:self-auto"
            >
              Open Full Attendance Table &rarr;
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingAttendanceStudents.map((std) => (
              <div
                key={std.id}
                className="bg-white border border-amber-200/80 rounded-md p-3.5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800">{std.name}</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {std.timing}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{std.course}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>Mode: {std.mode} ({std.type})</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-amber-700 italic">No touch recorded</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onQuickMarkAttendance(std.id, 'Present')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors shadow-xs"
                      title="Mark as Present"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Present</span>
                    </button>
                    <button
                      onClick={() => onQuickMarkAttendance(std.id, 'Absent')}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors shadow-xs"
                      title="Mark as Absent"
                    >
                      <UserX className="w-3 h-3" />
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>
              All ongoing students have either joined via class link or had attendance verified for today ({todayStr}).
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('attendance_tracking')}
            className="text-emerald-700 font-semibold hover:underline"
          >
            Review Attendance Sheet
          </button>
        </div>
      )}

      {/* SPECIAL REQUIREMENT 2: END-OF-DAY DAILY COMPLETION PERCENTAGE REMINDER */}
      {/* "need remaind daily completion percentage at the end of the day" */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#eef2f6] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#fafbfc]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0a6ed1] flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Daily Completion Percentage Tracker</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full">
                  End of Day Reminder
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Ensure ongoing student syllabus progress is logged before closing today's training sessions.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('class_schedule')}
            className="text-xs font-semibold text-[#0a6ed1] hover:text-[#0854a0] flex items-center gap-1"
          >
            <span>Full Schedule & Ending Dates</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#f1f5f9]">
          {ongoingStudents.map((std) => (
            <div key={std.id} className="p-4 hover:bg-[#f8fafc] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-[240px]">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-slate-900">{std.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                    {std.timing}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate">{std.course}</div>
              </div>

              {/* Progress Bar & Quick Adjuster */}
              <div className="flex-1 max-w-md">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 text-[11px]">Current Progress:</span>
                  <span className="font-bold text-slate-800">{std.completionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      std.completionPercentage >= 100
                        ? 'bg-emerald-500'
                        : std.completionPercentage >= 70
                        ? 'bg-blue-600'
                        : std.completionPercentage >= 40
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${std.completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Quick 1-click end of day increment buttons */}
              <div className="flex items-center space-x-1.5 self-end md:self-auto">
                <button
                  onClick={() => onQuickUpdateCompletion(std.id, 5)}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded border border-slate-200 transition-colors"
                  title="Add +5% completion for today's covered syllabus"
                >
                  +5% Today
                </button>
                <button
                  onClick={() => onQuickUpdateCompletion(std.id, 10)}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded border border-slate-200 transition-colors"
                  title="Add +10% completion for today's covered syllabus"
                >
                  +10%
                </button>
                <button
                  onClick={() => onNavigateTab('class_schedule')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded transition-colors"
                  title="Open schedule to set exact % or Date of Ending (DOE)"
                >
                  Set DOE / Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Upcoming Batches & Live Class Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upcoming Batches */}
        <div className="lg:col-span-2 bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#eef2f6] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Ongoing Class Schedule Today</h3>
            </div>
            <button
              onClick={() => onNavigateTab('class_schedule')}
              className="text-xs font-semibold text-[#0a6ed1] hover:underline"
            >
              View All Batches &rarr;
            </button>
          </div>

          <div className="divide-y divide-[#f1f5f9]">
            {upcomingClasses.map((std) => (
              <div key={std.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-slate-900">{std.name}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                      {std.course}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                      <Clock className="w-3 h-3 text-slate-400" /> {std.timing}
                    </span>
                    <span>•</span>
                    <span>Trainer: {std.trainerName}</span>
                    <span>•</span>
                    <span>Mode: {std.mode} ({std.type})</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-700">{std.completionPercentage}% Done</div>
                  <div className="text-[10px] text-slate-400">DOJ: {std.doj}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Broadcast & Irregular Summary Tile */}
        <div className="space-y-4">
          {/* Active Class Link Card */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Active Daily Class Link</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isClassLinkActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isClassLinkActive ? 'Live for Students' : 'Expired'}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-800 truncate">{classLink.title}</div>
              <div className="mt-1 font-mono text-xs bg-slate-50 border border-slate-200 rounded p-2 text-blue-700 truncate select-all">
                {classLink.url}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Duration: {classLink.durationOption.replace('_', ' ')}</span>
                <span className="text-[10px] text-slate-400">
                  Expires: {new Date(classLink.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <a
                href={classLink.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white py-1.5 px-3 rounded text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch Meeting</span>
              </a>
              <button
                onClick={onOpenClassLinkModal}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded text-xs font-semibold border border-slate-200"
              >
                Configure
              </button>
            </div>
          </div>

          {/* Irregular Alert Card */}
          {irregularStudents.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Irregular Students Alert
                </span>
                <span className="text-xs font-mono font-bold bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded">
                  {irregularStudents.length}
                </span>
              </div>
              <p className="text-xs text-rose-800">
                {irregularStudents.length} student(s) marked as irregular due to missed batches or attendance issues.
              </p>
              <button
                onClick={() => onNavigateTab('irregular_students')}
                className="mt-3 w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-1.5 rounded transition-colors text-center"
              >
                Review Irregular Students List &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
