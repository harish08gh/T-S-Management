import React, { useState, useEffect, useMemo } from 'react';
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
  BookOpen,
  Coffee,
  SunMedium,
  CalendarOff,
  X,
  Check,
  Zap,
  PlayCircle
} from 'lucide-react';
import { Student, DemoStudent, AttendanceRecord, ClassLink, TrainerTab, TrainerSystemSettings, ClassMode } from '../../types';
import {
  isWeekend as checkIsWeekend,
  getDayMode,
  getStudentEffectiveTiming,
  isStudentScheduledOnDate,
  getStudentNextClassInfo
} from '../../utils/scheduleUtils';

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
  onSaveStudent?: (student: Student) => void;
  todayStr: string;
  settings?: TrainerSystemSettings;
}

// Time parsing helper functions
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) {
    const singleMatch = timeStr.trim().match(/(\d{1,2})(?:\s*(AM|PM))/i);
    if (!singleMatch) return null;
    let hour = parseInt(singleMatch[1], 10);
    const meridiem = singleMatch[2]?.toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour * 60;
  }
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour * 60 + min;
}

function parseClassRange(timingStr: string): { startMin: number; endMin: number } | null {
  if (!timingStr) return null;
  const parts = timingStr.split(/[-–—to]/i);
  const startMin = parseTimeToMinutes(parts[0]);
  if (startMin === null) return null;
  let endMin = parts[1] ? parseTimeToMinutes(parts[1]) : startMin + 60;
  if (endMin === null) endMin = startMin + 60;
  return { startMin, endMin };
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
  onSaveStudent,
  todayStr,
  settings
}) => {
  const [selectedTopicInput, setSelectedTopicInput] = useState<{ [id: string]: string }>({});

  // Real-time clock for active & upcoming class tracking
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000); // 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Modal: Temporary Timing Change for today
  const [tempTimingStudent, setTempTimingStudent] = useState<Student | null>(null);
  const [tempTimingInput, setTempTimingInput] = useState<string>('11:00 AM - 12:30 PM');
  const [tempReasonInput, setTempReasonInput] = useState<string>('Temporary timing adjustment for today');

  const openTempTimingModal = (student: Student) => {
    const existing = student.tempTimingOverrides?.[todayStr];
    setTempTimingStudent(student);
    setTempTimingInput(existing ? existing.timing : student.timing || '09:00 AM - 10:30 AM');
    setTempReasonInput(existing?.reason || 'Temporary timing change for today');
  };

  const handleSaveTempTiming = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempTimingStudent || !tempTimingInput || !onSaveStudent) return;
    const current = { ...(tempTimingStudent.tempTimingOverrides || {}) };
    current[todayStr] = {
      timing: tempTimingInput.trim(),
      reason: tempReasonInput.trim() || 'Temporary timing change',
      setAt: new Date().toISOString()
    };
    onSaveStudent({
      ...tempTimingStudent,
      tempTimingOverrides: current
    });
    setTempTimingStudent(null);
  };

  const handleClearTempTiming = () => {
    if (!tempTimingStudent || !tempTimingStudent.tempTimingOverrides || !onSaveStudent) return;
    const current = { ...tempTimingStudent.tempTimingOverrides };
    delete current[todayStr];
    onSaveStudent({
      ...tempTimingStudent,
      tempTimingOverrides: current
    });
    setTempTimingStudent(null);
  };

  // Schedule display filter
  const [batchScheduleFilter, setBatchScheduleFilter] = useState<'today_batch' | 'all' | 'weekdays' | 'weekend'>('today_batch');

  const ongoingStudents = students.filter(s => s.status === 'Ongoing' && !s.isIrregular);
  const irregularStudents = students.filter(s => s.isIrregular);
  const completedStudents = students.filter(s => s.status === 'Completed');

  // Day Name & Mode (Weekdays vs Weekend)
  const dayName = new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const isWeekend = checkIsWeekend(todayStr);
  const todayBatchMode: ClassMode = isWeekend ? 'Weekend' : 'Weekdays';

  // Ongoing students scheduled for classes today based on Weekday/Weekend timing
  const scheduledTodayStudents = useMemo(() => {
    return ongoingStudents.filter(s => isStudentScheduledOnDate(s, todayStr));
  }, [ongoingStudents, todayStr]);

  // Attendance for today
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const presentTodayCount = todayAttendance.filter(a => a.attendance === 'Present').length;
  // Calculate attendance rate relative to students who actually have class today
  const attendanceRate = scheduledTodayStudents.length > 0
    ? Math.round((presentTodayCount / scheduledTodayStudents.length) * 100)
    : (ongoingStudents.length > 0 ? Math.round((presentTodayCount / ongoingStudents.length) * 100) : 0);

  // Pending students: ONLY students scheduled for class today who have not touched link or been marked
  const markedStudentIds = new Set(todayAttendance.map(a => a.studentId));
  const pendingAttendanceStudents = scheduledTodayStudents.filter(s => !markedStudentIds.has(s.id));

  // Demos
  const convertedDemos = demos.filter(d => d.status === 'Converted').length;
  const pendingDemos = demos.filter(d => d.status === 'Pending').length;

  // Average completion of ongoing students
  const avgCompletion = ongoingStudents.length > 0
    ? Math.round(ongoingStudents.reduce((acc, s) => acc + s.completionPercentage, 0) / ongoingStudents.length)
    : 0;

  // --- REAL-TIME CLASS TIMING & ACTIVE/UPCOMING CLASSIFICATION ---
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Trainer Shift & Schedule Status
  const isWeekOffToday = (settings?.weekOffDays || ['Sunday']).includes(dayName);
  const trainerLeaveToday = (settings?.leaves || []).find(l => l.date === todayStr);

  const lunchStartMin = parseTimeToMinutes(settings?.lunchBreak?.start || '01:00 PM');
  const lunchEndMin = parseTimeToMinutes(settings?.lunchBreak?.end || '02:00 PM');
  const isLunchBreakNow =
    lunchStartMin !== null && lunchEndMin !== null && currentMinutes >= lunchStartMin && currentMinutes < lunchEndMin;

  const currentShift = isWeekend ? settings?.shiftTimingWeekend : settings?.shiftTimingWeekday;

  // Process all ongoing students with effective timing and scheduling info
  const timedOngoingStudents = useMemo(() => {
    return ongoingStudents.map(student => {
      const todayOverride = student.tempTimingOverrides?.[todayStr];
      const effectiveTiming = getStudentEffectiveTiming(student, todayStr);
      const isScheduledToday = isStudentScheduledOnDate(student, todayStr);
      const nextClassInfo = getStudentNextClassInfo(student, todayStr);

      const range = parseClassRange(effectiveTiming);
      const startMin = range ? range.startMin : 540;
      const endMin = range ? range.endMin : 630;
      const duration = endMin - startMin;

      // Status relative to current time (applicable on days classes are conducted)
      const isActive = isScheduledToday && currentMinutes >= startMin && currentMinutes < endMin;
      const isUpcoming = isScheduledToday && startMin > currentMinutes;
      const isCompleted = isScheduledToday && endMin <= currentMinutes;
      const diffMinutes = isUpcoming ? startMin - currentMinutes : 0;
      const elapsedMinutes = isActive ? currentMinutes - startMin : 0;
      const progressPercent = isActive && duration > 0 ? Math.min(100, Math.round((elapsedMinutes / duration) * 100)) : 0;

      // Check if attendance already marked today
      const todayAttRecord = todayAttendance.find(a => a.studentId === student.id);

      return {
        student,
        effectiveTiming,
        isOverride: !!todayOverride,
        overrideReason: todayOverride?.reason,
        isScheduledToday,
        nextClassInfo,
        startMin,
        endMin,
        duration,
        isActive,
        isUpcoming,
        isCompleted,
        diffMinutes,
        elapsedMinutes,
        progressPercent,
        todayAttRecord
      };
    }).sort((a, b) => a.startMin - b.startMin);
  }, [ongoingStudents, todayStr, currentMinutes, todayAttendance]);

  // Active & Upcoming are strictly classes scheduled for today!
  const activeClasses = timedOngoingStudents.filter(c => c.isScheduledToday && c.isActive);
  const upcomingClasses = timedOngoingStudents.filter(c => c.isScheduledToday && c.isUpcoming);
  const nextUpcomingClass = upcomingClasses.length > 0 ? upcomingClasses[0] : null;
  const completedClasses = timedOngoingStudents.filter(c => c.isScheduledToday && c.isCompleted);

  // Filtered view for Today's Class Schedule list
  const displayedScheduleBatches = useMemo(() => {
    if (batchScheduleFilter === 'today_batch') {
      return timedOngoingStudents.filter(c => c.isScheduledToday);
    } else if (batchScheduleFilter === 'weekdays') {
      return timedOngoingStudents.filter(c => c.student.mode === 'Weekdays');
    } else if (batchScheduleFilter === 'weekend') {
      return timedOngoingStudents.filter(c => c.student.mode === 'Weekend');
    }
    return timedOngoingStudents;
  }, [timedOngoingStudents, batchScheduleFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header with Shift & Schedule Info */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">Trainer Cockpit</span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-mono font-medium text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#0a6ed1]" />
                Live: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Overview & Daily Progress</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span className="text-slate-500">Active Date: <strong>{todayStr} ({dayName})</strong></span>

              {/* Day & Batch Mode Indicator Tag */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border font-semibold text-[11px] ${
                isWeekend
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}>
                <span>Active Conduct Mode: <strong>{todayBatchMode} Batches</strong> ({isWeekend ? 'Sat & Sun' : 'Mon – Fri'})</span>
              </span>

              {/* Shift Tag */}
              {currentShift && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                  <span>Shift: {currentShift.start} – {currentShift.end}</span>
                </span>
              )}

              {/* Lunch Break Active Tag */}
              {isLunchBreakNow && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 font-semibold text-[11px] animate-pulse">
                  <Coffee className="w-3 h-3 text-amber-700" />
                  <span>Trainer Lunch Break Now</span>
                </span>
              )}

              {/* Week-Off Tag */}
              {isWeekOffToday && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-300 font-bold text-[11px]">
                  <SunMedium className="w-3 h-3 text-purple-700" />
                  <span>Trainer Week-Off</span>
                </span>
              )}

              {/* Leave Tag */}
              {trainerLeaveToday && (
                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300 font-bold text-[11px]">
                  <CalendarOff className="w-3 h-3 text-rose-700" />
                  <span>Trainer On Leave: {trainerLeaveToday.reason}</span>
                </span>
              )}
            </div>
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
                  Pending Attendance Verification ({pendingAttendanceStudents.length} Students in {todayBatchMode} Batch)
                </h3>
                <p className="text-xs text-amber-800">
                  These ongoing students scheduled for today's <strong>{todayBatchMode} session</strong> have not touched the class link for {todayStr} ({dayName}). Please mark them as Present or Absent:
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
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                      {getStudentEffectiveTiming(std, todayStr)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{std.course}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.2 rounded font-semibold ${
                      std.mode === 'Weekend' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {std.mode}
                    </span>
                    <span>• {std.type}</span>
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

      {/* REAL-TIME ACTIVE & UPCOMING CLASS MONITOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#0a6ed1]" />
            <h2 className="text-base font-bold text-slate-800">
              Live Class Schedule & Real-Time Monitoring
            </h2>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('class_schedule')}
            className="text-xs font-semibold text-[#0a6ed1] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Class Schedule</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Active & Next Upcoming Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Class Right Now Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeClasses.length > 0
              ? 'bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white border-emerald-300 shadow-sm'
              : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    activeClasses.length > 0 ? 'bg-emerald-400' : 'bg-slate-300'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    activeClasses.length > 0 ? 'bg-emerald-600' : 'bg-slate-400'
                  }`}></span>
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  activeClasses.length > 0 ? 'text-emerald-800' : 'text-slate-600'
                }`}>
                  {activeClasses.length > 0 ? 'Active Class in Session' : 'Current Session Status'}
                </span>
              </div>

              {activeClasses.length > 0 && (
                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                  LIVE NOW
                </span>
              )}
            </div>

            {activeClasses.length > 0 ? (
              <div className="mt-3 space-y-3">
                {activeClasses.map(active => (
                  <div key={active.student.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>{active.student.name}</span>
                          {active.isOverride && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                              ⚡ Temp Timing
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{active.student.course} • {active.student.mode} ({active.student.type})</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        {active.effectiveTiming}
                      </span>
                    </div>

                    {/* Progress Bar in class */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>Elapsed: {active.elapsedMinutes} mins</span>
                        <span>Remaining: {Math.max(0, active.duration - active.elapsedMinutes)} mins</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${active.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={classLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Join Session</span>
                      </a>
                      {!active.todayAttRecord ? (
                        <button
                          onClick={() => onQuickMarkAttendance(active.student.id, 'Present')}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark Present</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-800 bg-emerald-100 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" /> Marked {active.todayAttRecord.attendance}
                        </span>
                      )}
                      <button
                        onClick={() => openTempTimingModal(active.student)}
                        className="text-xs text-slate-600 hover:text-slate-900 underline ml-auto cursor-pointer"
                      >
                        Adjust Timing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-5 text-center space-y-1">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <div className="text-xs font-semibold text-slate-700">No active class at this moment</div>
                <div className="text-[11px] text-slate-400">
                  {isLunchBreakNow
                    ? 'Trainer is currently on lunch break.'
                    : nextUpcomingClass
                    ? `Next class scheduled at ${nextUpcomingClass.effectiveTiming.split(/[-–]/)[0]?.trim()}.`
                    : 'All ongoing batches for today have finished.'}
                </div>
              </div>
            )}
          </div>

          {/* Next Upcoming Class Card */}
          <div className="p-4 rounded-xl border bg-white border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Next Upcoming Class Today
                  </span>
                </div>
                {nextUpcomingClass && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    nextUpcomingClass.diffMinutes <= 30
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    Starts in {nextUpcomingClass.diffMinutes} mins
                  </span>
                )}
              </div>

              {nextUpcomingClass ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <span>{nextUpcomingClass.student.name}</span>
                        {nextUpcomingClass.isOverride && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                            ⚡ Temp Changed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {nextUpcomingClass.student.course} • Mode: {nextUpcomingClass.student.mode} ({nextUpcomingClass.student.type})
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {nextUpcomingClass.effectiveTiming}
                    </span>
                  </div>

                  {nextUpcomingClass.isOverride && nextUpcomingClass.overrideReason && (
                    <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900">
                      <strong>Reason for timing change:</strong> {nextUpcomingClass.overrideReason}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 pt-1">
                    Student Contact: <span className="font-mono text-slate-700 font-semibold">{nextUpcomingClass.student.phone}</span>
                  </div>
                </div>
              ) : (
                <div className="py-5 text-center space-y-1">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-1" />
                  <div className="text-xs font-semibold text-slate-700">No more upcoming classes today</div>
                  <div className="text-[11px] text-slate-400">
                    All scheduled batches for {todayStr} have already commenced or ended.
                  </div>
                </div>
              )}
            </div>

            {nextUpcomingClass && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => openTempTimingModal(nextUpcomingClass.student)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Change Timing for Today</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('class_schedule')}
                  className="text-xs text-[#0a6ed1] font-semibold hover:underline"
                >
                  Full Schedule &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Today's Full Chronological Batches & Broadcast/Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's Batches Chronological Timeline */}
        <div className="lg:col-span-2 bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#eef2f6] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Class Schedule & Timings</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isWeekend ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {todayBatchMode} Mode Active
              </span>
            </div>

            {/* Filter Pills for Weekdays vs Weekend Batches */}
            <div className="flex items-center space-x-1 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBatchScheduleFilter('today_batch')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  batchScheduleFilter === 'today_batch'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today's Batch ({timedOngoingStudents.filter(c => c.isScheduledToday).length})
              </button>
              <button
                type="button"
                onClick={() => setBatchScheduleFilter('all')}
                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                  batchScheduleFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({timedOngoingStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setBatchScheduleFilter('weekdays')}
                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                  batchScheduleFilter === 'weekdays'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekdays ({timedOngoingStudents.filter(c => c.student.mode === 'Weekdays').length})
              </button>
              <button
                type="button"
                onClick={() => setBatchScheduleFilter('weekend')}
                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                  batchScheduleFilter === 'weekend'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekend ({timedOngoingStudents.filter(c => c.student.mode === 'Weekend').length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#f1f5f9]">
            {displayedScheduleBatches.length > 0 ? (
              displayedScheduleBatches.map(({ student, effectiveTiming, isOverride, isScheduledToday, nextClassInfo, isActive, isUpcoming, isCompleted, diffMinutes }) => (
                <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-semibold text-xs text-slate-900">{student.name}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                        {student.course}
                      </span>

                      {/* Mode Badge */}
                      <span className={`text-[10px] px-2 py-0.2 rounded font-semibold border ${
                        student.mode === 'Weekend'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {student.mode} Batch
                      </span>

                      {/* Status Badges */}
                      {isScheduledToday ? (
                        <>
                          {isActive && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.2 rounded-full font-bold animate-pulse">
                              🟢 In Progress
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.2 rounded-full font-medium">
                              {diffMinutes <= 60 ? `Starts in ${diffMinutes}m` : 'Upcoming Today'}
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.2 rounded-full font-normal">
                              Ended earlier
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.2 rounded font-medium">
                          Off-day today • Next: {nextClassInfo.dayName} ({nextClassInfo.timing})
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-800 font-semibold">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {effectiveTiming}
                      </span>
                      {isOverride && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                          ⚡ Temp Change
                        </span>
                      )}
                      <span>•</span>
                      <span>Type: {student.type}</span>
                      <span>•</span>
                      <span>Contact: {student.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => openTempTimingModal(student)}
                      className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded border border-slate-200 transition-colors font-medium cursor-pointer"
                      title="Set or change temporary timing for today"
                    >
                      {isOverride ? 'Edit Timing' : 'Change Timing'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('class_schedule')}
                      className="px-2 py-1 text-[11px] text-[#0a6ed1] hover:underline"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No students found for this filter.
              </div>
            )}
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

      {/* MODAL: QUICK TEMPORARY TIMING CHANGE FROM DASHBOARD */}
      {tempTimingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-amber-600">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Change Timing for Today ({todayStr})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTempTimingStudent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
              <div className="font-bold text-slate-800">
                {tempTimingStudent.name} • <span className="font-normal text-slate-600">{tempTimingStudent.course}</span>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-2">
                <span>Regular Batch Timing:</span>
                <span className="font-mono font-semibold text-slate-800">{tempTimingStudent.timing}</span>
              </div>
            </div>

            <form onSubmit={handleSaveTempTiming} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  New Temporary Timing for Today *
                </label>
                <input
                  type="text"
                  required
                  value={tempTimingInput}
                  onChange={e => setTempTimingInput(e.target.value)}
                  placeholder="e.g. 11:00 AM - 12:30 PM"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                {/* Quick Presets */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {['09:00 AM - 10:30 AM', '11:00 AM - 12:30 PM', '02:00 PM - 03:30 PM', '04:00 PM - 05:30 PM', '06:00 PM - 07:30 PM'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTempTimingInput(preset)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {preset.split('-')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Reason for Today's Change (Optional)
                </label>
                <input
                  type="text"
                  value={tempReasonInput}
                  onChange={e => setTempReasonInput(e.target.value)}
                  placeholder="e.g. Student requested postponement, extra session"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {tempTimingStudent.tempTimingOverrides?.[todayStr] ? (
                  <button
                    type="button"
                    onClick={handleClearTempTiming}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    Reset to Regular Timing
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setTempTimingStudent(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Timing</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
