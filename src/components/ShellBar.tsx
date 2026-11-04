import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  GraduationCap,
  Bell,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  Clock,
  LogOut,
  Menu,
  X,
  AlertCircle,
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  ExternalLink,
  Link2,
  Users,
  Sparkles,
  TrendingUp,
  CheckCheck,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { UserRole, Student, TrainerTab, DemoStudent, AttendanceRecord, ClassLink } from '../types';
import { isStudentScheduledOnDate, getStudentEffectiveTiming, parseClassRange } from '../utils/scheduleUtils';

interface ShellBarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  selectedStudent: Student | null;
  allStudents: Student[];
  onSelectStudent: (student: Student) => void;
  syncStatus: string;
  isSynced: boolean;
  onRefreshData: () => void;
  pendingAttendanceCount: number;
  irregularCount: number;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  onNavigateTab?: (tab: TrainerTab) => void;
  demos?: DemoStudent[];
  attendance?: AttendanceRecord[];
  classLink?: ClassLink;
  todayStr?: string;
  onOpenClassLinkModal?: () => void;
}

interface NotificationItem {
  id: string;
  category: 'attendance' | 'schedule' | 'irregular' | 'link' | 'completion' | 'demo';
  title: string;
  description: string;
  severity: 'urgent' | 'warning' | 'info' | 'success';
  timestamp: string;
  actionLabel?: string;
  targetTab?: TrainerTab;
  onAction?: () => void;
}

export const ShellBar: React.FC<ShellBarProps> = ({
  currentRole,
  onRoleChange,
  selectedStudent,
  allStudents,
  onSelectStudent,
  syncStatus,
  isSynced,
  onRefreshData,
  pendingAttendanceCount,
  irregularCount,
  onLogout,
  onToggleSidebar,
  onNavigateTab,
  demos = [],
  attendance = [],
  classLink,
  todayStr = new Date().toISOString().split('T')[0],
  onOpenClassLinkModal
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'urgent' | 'schedule'>('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  // Compute live real-time notifications for the trainer
  const notifications: NotificationItem[] = useMemo(() => {
    if (currentRole !== 'trainer') return [];

    const list: NotificationItem[] = [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const ongoingStudents = allStudents.filter(s => s.status !== 'Completed' && !s.isIrregular);
    const irregularStudents = allStudents.filter(s => s.isIrregular);

    // 1. Pending Attendance for today's scheduled students
    const todayAttendance = attendance.filter(a => a.date === todayStr);
    const markedStudentIds = new Set(todayAttendance.map(a => a.studentId));
    const scheduledToday = ongoingStudents.filter(s => isStudentScheduledOnDate(s, todayStr));
    const pendingStudents = scheduledToday.filter(s => !markedStudentIds.has(s.id));

    if (pendingStudents.length > 0) {
      list.push({
        id: 'notif-pending-attendance-summary',
        category: 'attendance',
        title: `${pendingStudents.length} Pending Attendance Check${pendingStudents.length > 1 ? 's' : ''}`,
        description: `Students scheduled today (${pendingStudents.slice(0, 3).map(s => s.name).join(', ')}${pendingStudents.length > 3 ? ` +${pendingStudents.length - 3} more` : ''}) have not checked in.`,
        severity: 'urgent',
        timestamp: 'Today',
        actionLabel: 'Verify Attendance',
        targetTab: 'attendance_tracking'
      });

      // Add individual top pending student alerts
      pendingStudents.slice(0, 4).forEach(s => {
        const timing = getStudentEffectiveTiming(s, todayStr);
        list.push({
          id: `notif-pending-std-${s.id}`,
          category: 'attendance',
          title: `Attendance Unmarked: ${s.name}`,
          description: `Batch: ${timing} • Course: ${s.course} (${s.mode}). Please record attendance.`,
          severity: 'urgent',
          timestamp: timing,
          actionLabel: 'Mark Attendance',
          targetTab: 'attendance_tracking'
        });
      });
    }

    // 2. Classes active right now or starting in < 60 mins
    scheduledToday.forEach(s => {
      const timing = getStudentEffectiveTiming(s, todayStr);
      const range = parseClassRange(timing);
      if (range) {
        const { startMin, endMin } = range;
        if (currentMinutes >= startMin && currentMinutes < endMin) {
          list.push({
            id: `notif-active-class-${s.id}`,
            category: 'schedule',
            title: `Live Class in Session: ${s.name}`,
            description: `${s.course} class is live right now (${timing}). Remaining: ${endMin - currentMinutes} mins.`,
            severity: 'urgent',
            timestamp: 'LIVE NOW',
            actionLabel: 'Go to Dashboard',
            targetTab: 'dashboard'
          });
        } else if (startMin > currentMinutes && startMin - currentMinutes <= 60) {
          const diff = startMin - currentMinutes;
          list.push({
            id: `notif-upcoming-class-${s.id}`,
            category: 'schedule',
            title: `Class Starting Soon: ${s.name}`,
            description: `${s.course} session begins in ${diff} minutes (${timing}).`,
            severity: 'warning',
            timestamp: `In ${diff}m`,
            actionLabel: 'View Schedule',
            targetTab: 'class_schedule'
          });
        }
      }
    });

    // 3. Daily Class Link Status
    const isLinkExpired = classLink?.expiresAt && new Date(classLink.expiresAt).getTime() <= Date.now();
    if (!classLink || !classLink.url || !classLink.active || isLinkExpired) {
      list.push({
        id: 'notif-class-link-needed',
        category: 'link',
        title: 'Daily Class Meeting Link Needs Update',
        description: "Today's daily meeting link has not been refreshed by the trainer yet. Students cannot enter class.",
        severity: 'warning',
        timestamp: 'Action Needed',
        actionLabel: 'Update Link',
        onAction: () => onOpenClassLinkModal?.()
      });
    } else {
      list.push({
        id: 'notif-class-link-active',
        category: 'link',
        title: 'Daily Class Link is Live & Active',
        description: `Broadcasting: "${classLink.title}" with valid access.`,
        severity: 'info',
        timestamp: 'Active Today',
        actionLabel: 'Manage Link',
        targetTab: 'class_links'
      });
    }

    // 4. Irregular / Long Leave students
    if (irregularStudents.length > 0) {
      list.push({
        id: 'notif-irregular-roster',
        category: 'irregular',
        title: `${irregularStudents.length} Students in Irregular Roster`,
        description: `Students on long leave or hold (${irregularStudents.slice(0, 3).map(s => s.name).join(', ')}).`,
        severity: 'warning',
        timestamp: 'Follow-up',
        actionLabel: 'Review Roster',
        targetTab: 'irregular_students'
      });
    }

    // 5. Students nearing 100% completion (>= 90%)
    const nearCompletion = ongoingStudents.filter(s => s.completionPercentage >= 90 && s.completionPercentage < 100);
    if (nearCompletion.length > 0) {
      nearCompletion.forEach(s => {
        list.push({
          id: `notif-near-complete-${s.id}`,
          category: 'completion',
          title: `Near Completion: ${s.name} (${s.completionPercentage}%)`,
          description: `${s.course} syllabus is almost finished. Schedule final review and prepare DOE.`,
          severity: 'info',
          timestamp: `${s.completionPercentage}% Complete`,
          actionLabel: 'Schedule & DOE',
          targetTab: 'class_schedule'
        });
      });
    }

    // 6. Converted Demos awaiting full batch schedule
    const convertedDemos = demos.filter(d => d.status === 'Converted');
    if (convertedDemos.length > 0) {
      list.push({
        id: 'notif-converted-demos',
        category: 'demo',
        title: `${convertedDemos.length} Converted Demo Student${convertedDemos.length > 1 ? 's' : ''}`,
        description: `${convertedDemos.map(d => d.name).slice(0, 3).join(', ')} converted and ready for batch assignment.`,
        severity: 'info',
        timestamp: 'Pipeline',
        actionLabel: 'View Demos',
        targetTab: 'demo_management'
      });
    }

    return list;
  }, [allStudents, attendance, demos, classLink, todayStr, currentRole, onOpenClassLinkModal]);

  // Filtered notifications
  const visibleNotifications = useMemo(() => {
    return notifications
      .filter(n => !dismissedIds.includes(n.id))
      .filter(n => {
        if (notificationFilter === 'urgent') return n.severity === 'urgent' || n.severity === 'warning';
        if (notificationFilter === 'schedule') return n.category === 'schedule' || n.category === 'attendance';
        return true;
      });
  }, [notifications, dismissedIds, notificationFilter]);

  const urgentCount = notifications.filter(
    n => !dismissedIds.includes(n.id) && (n.severity === 'urgent' || n.severity === 'warning')
  ).length;

  const totalActiveNotifs = notifications.filter(n => !dismissedIds.includes(n.id)).length;

  const handleNotificationClick = (item: NotificationItem) => {
    if (item.onAction) {
      item.onAction();
    } else if (item.targetTab && onNavigateTab) {
      onNavigateTab(item.targetTab);
    }
    setIsNotificationOpen(false);
  };

  const handleDismissAll = () => {
    setDismissedIds(notifications.map(n => n.id));
  };

  return (
    <header className="fiori-shell sticky top-0 z-40 text-white shadow-md shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left Brand & App Title */}
          <div className="flex items-center space-x-3">
            {currentRole === 'trainer' && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 rounded-md hover:bg-slate-700/60 text-slate-200 hover:text-white transition-colors cursor-pointer mr-1"
                title="Toggle Navigation Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded bg-[#0a6ed1] flex items-center justify-center shadow-inner font-bold text-white text-lg tracking-wider border border-blue-400/40">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-base tracking-tight text-white flex items-center gap-1.5">
                  PPS Training <span className="text-xs font-normal text-blue-200 bg-blue-900/60 px-1.5 py-0.5 rounded border border-blue-400/30">Portal</span>
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline-block">|</span>
                <span className="text-xs text-slate-200 hidden sm:inline-block font-medium">Student & Attendance Management</span>
              </div>
              <div className="text-[10px] text-blue-200/80 -mt-0.5">PPS Software Solutions</div>
            </div>
          </div>

          {/* Center Cloud Sync Status (Trainer Only) */}
          {currentRole === 'trainer' && (
            <div className="hidden md:flex items-center space-x-2">
              <div className="flex items-center bg-[#13202e] text-slate-200 text-xs px-2.5 py-1 rounded-md border border-slate-700/60">
                <span className={`w-2 h-2 rounded-full mr-1.5 ${isSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="font-mono text-[11px]">{syncStatus}</span>
                <button
                  onClick={onRefreshData}
                  title="Refresh and sync data"
                  className="ml-2 p-0.5 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Right Role Indicator, Notifications & User Actions */}
          <div className="flex items-center space-x-3">
            {/* If Trainer Role: Badge */}
            {currentRole === 'trainer' && (
              <div className="bg-[#13202e] px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 text-xs text-blue-200 font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0a6ed1]" />
                <span className="hidden sm:inline">Trainer Cockpit</span>
              </div>
            )}

            {/* If Student Role: Badge */}
            {currentRole === 'student' && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs text-emerald-200 font-semibold">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Student Portal</span>
              </div>
            )}

            {/* INTERACTIVE NOTIFICATIONS BUTTON (Trainer Only) */}
            {currentRole === 'trainer' && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(prev => !prev)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    isNotificationOpen
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/30'
                      : totalActiveNotifs > 0
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-[#13202e] text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Click to view notifications and system alerts"
                >
                  <Bell className={`w-4 h-4 ${urgentCount > 0 ? 'animate-bounce text-amber-300' : ''}`} />
                  <span className="hidden sm:inline">Notifications</span>
                  {totalActiveNotifs > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                      {totalActiveNotifs}
                    </span>
                  )}
                </button>

                {/* NOTIFICATIONS DROPDOWN POPOVER */}
                {isNotificationOpen && (
                  <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-h-[85vh] sm:max-h-[580px] bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="bg-[#1d2d3e] text-white px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <div>
                          <h3 className="text-xs font-bold text-white leading-tight">
                            Trainer Notifications & Alerts
                          </h3>
                          <p className="text-[10px] text-slate-300">
                            {totalActiveNotifs} active notification{totalActiveNotifs !== 1 ? 's' : ''} requiring attention
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {totalActiveNotifs > 0 && (
                          <button
                            type="button"
                            onClick={handleDismissAll}
                            className="p-1 text-[11px] text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                            title="Clear all alerts"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsNotificationOpen(false)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] shrink-0">
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setNotificationFilter('all')}
                          className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            notificationFilter === 'all'
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          All ({notifications.filter(n => !dismissedIds.includes(n.id)).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationFilter('urgent')}
                          className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            notificationFilter === 'urgent'
                              ? 'bg-amber-600 text-white font-bold'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Action Required ({urgentCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationFilter('schedule')}
                          className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            notificationFilter === 'schedule'
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Schedule
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">Today: {todayStr}</span>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[380px]">
                      {visibleNotifications.length > 0 ? (
                        visibleNotifications.map((notif) => {
                          const isUrgent = notif.severity === 'urgent';
                          const isWarning = notif.severity === 'warning';

                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group flex items-start gap-3 ${
                                isUrgent
                                  ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-rose-500'
                                  : isWarning
                                  ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-amber-500'
                                  : 'border-l-4 border-transparent'
                              }`}
                            >
                              {/* Category Icon */}
                              <div className="mt-0.5 shrink-0">
                                {notif.category === 'attendance' && (
                                  <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                    <CalendarCheck2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                {notif.category === 'schedule' && (
                                  <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0a6ed1] flex items-center justify-center">
                                    <Clock className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                {notif.category === 'irregular' && (
                                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                {notif.category === 'link' && (
                                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                                    <Link2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                {notif.category === 'completion' && (
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                {notif.category === 'demo' && (
                                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>

                              {/* Notification Body */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs font-bold leading-tight ${
                                    isUrgent ? 'text-rose-900' : isWarning ? 'text-amber-900' : 'text-slate-900'
                                  }`}>
                                    {notif.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    {notif.timestamp}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                                  {notif.description}
                                </p>

                                {notif.actionLabel && (
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="inline-flex items-center text-[10px] font-bold text-[#0a6ed1] group-hover:underline">
                                      <span>{notif.actionLabel}</span>
                                      <ChevronRight className="w-3 h-3 ml-0.5" />
                                    </span>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDismissedIds(prev => [...prev, notif.id]);
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                          <h4 className="text-xs font-bold text-slate-800">All Caught Up!</h4>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                            No unread notifications matching this filter. Attendance checks and schedules are current.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Quick Links */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab?.('dashboard');
                          setIsNotificationOpen(false);
                        }}
                        className="text-[#0a6ed1] font-semibold hover:underline"
                      >
                        View Dashboard &rarr;
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab?.('attendance_tracking');
                          setIsNotificationOpen(false);
                        }}
                        className="text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Attendance Sheet &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Avatar & User Info */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-700/80">
              <div className="w-7 h-7 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center text-xs font-semibold text-white">
                {currentRole === 'trainer' ? 'PT' : selectedStudent?.name.slice(0, 2).toUpperCase() || 'ST'}
              </div>
              <div className="hidden sm:block text-left text-xs leading-none">
                <div className="font-semibold text-slate-100">
                  {currentRole === 'trainer' ? 'PPSTrainer' : selectedStudent?.name || 'Student'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {currentRole === 'trainer' ? 'Lead Trainer' : (selectedStudent?.phone || 'Enrolled Student')}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="ml-2 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border border-rose-500/30 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
