import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck2,
  CalendarDays,
  AlertTriangle,
  Mail,
  Link2,
  Settings,
  ChevronLeft,
  ChevronRight,
  SunMedium,
  Coffee,
  CalendarOff
} from 'lucide-react';
import { TrainerTab } from '../types';

interface SidebarNavigationProps {
  activeTab: TrainerTab;
  onTabChange: (tab: TrainerTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  counts: {
    allStudents: number;
    ongoing: number;
    demos: number;
    attendanceToday: number;
    irregular: number;
    pendingAttendance: number;
  };
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  counts
}) => {
  const tabs = [
    {
      id: 'dashboard' as TrainerTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: counts.pendingAttendance > 0 ? `${counts.pendingAttendance}` : undefined,
      badgeVariant: 'warning',
      tooltip: 'Daily Progress & Real-Time Schedule'
    },
    {
      id: 'student_details' as TrainerTab,
      label: 'Student Details',
      icon: Users,
      badge: `${counts.allStudents}`,
      badgeVariant: 'neutral',
      tooltip: 'View All Enrolled & Completed Students'
    },
    {
      id: 'demo_management' as TrainerTab,
      label: 'Demo Management',
      icon: UserPlus,
      badge: `${counts.demos}`,
      badgeVariant: 'neutral',
      tooltip: 'Manage Demo Leads & Batch Conversions'
    },
    {
      id: 'attendance_tracking' as TrainerTab,
      label: 'Attendance Tracking',
      icon: CalendarCheck2,
      badge: `${counts.attendanceToday}`,
      badgeVariant: 'success',
      tooltip: 'Daily Register, Student-Wise & Monthly Attendance'
    },
    {
      id: 'class_schedule' as TrainerTab,
      label: 'Class Schedule',
      icon: CalendarDays,
      badge: `${counts.ongoing}`,
      badgeVariant: 'neutral',
      tooltip: 'Manage Ongoing Student Classes & Timing Overlaps'
    },
    {
      id: 'irregular_students' as TrainerTab,
      label: 'Irregular Students',
      icon: AlertTriangle,
      badge: counts.irregular > 0 ? `${counts.irregular}` : undefined,
      badgeVariant: 'danger',
      tooltip: 'Inactive & Long Leave Students Roster'
    },
    {
      id: 'class_links' as TrainerTab,
      label: 'Daily Class Link',
      icon: Link2,
      badge: 'Live',
      badgeVariant: 'info',
      tooltip: 'Publish Daily Meeting Links & Expiry'
    },
    {
      id: 'completion_template' as TrainerTab,
      label: 'Completion Mail Template',
      icon: Mail,
      badge: undefined,
      badgeVariant: 'neutral',
      tooltip: 'Configure Official Course Completion Mail'
    },
    {
      id: 'settings' as TrainerTab,
      label: 'Trainer Settings',
      icon: Settings,
      badge: undefined,
      badgeVariant: 'neutral',
      tooltip: 'Shift Timings, Lunch Break, Week-Off & System Settings'
    }
  ];

  return (
    <aside
      className={`bg-[#192636] border-r border-[#26374a] text-slate-200 transition-all duration-300 ease-in-out shrink-0 flex flex-col z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header inside Sidebar: Navigation Section Label */}
      <div className="h-12 px-4 border-b border-[#26374a] flex items-center justify-between text-xs">
        {!isCollapsed ? (
          <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
            Navigation Menu
          </span>
        ) : (
          <span className="font-bold text-[10px] text-slate-500 mx-auto">PPS</span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              title={isCollapsed ? `${tab.label} — ${tab.tooltip}` : undefined}
              className={`w-full flex items-center rounded-lg text-xs font-semibold transition-all group relative cursor-pointer ${
                isCollapsed
                  ? 'justify-center p-2.5'
                  : 'px-3 py-2.5 justify-between'
              } ${
                isActive
                  ? 'bg-[#0a6ed1] text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-[#223347] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate text-left leading-tight">{tab.label}</span>
                )}
              </div>

              {/* Badge */}
              {tab.badge && (
                <>
                  {!isCollapsed ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        tab.badgeVariant === 'warning'
                          ? 'bg-amber-400 text-slate-900 shadow-xs'
                          : tab.badgeVariant === 'danger'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : tab.badgeVariant === 'success'
                          ? 'bg-emerald-500 text-white'
                          : tab.badgeVariant === 'info'
                          ? 'bg-blue-400 text-slate-950 font-extrabold animate-pulse'
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-700/80 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  ) : (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        tab.badgeVariant === 'warning'
                          ? 'bg-amber-400'
                          : tab.badgeVariant === 'danger'
                          ? 'bg-rose-500'
                          : tab.badgeVariant === 'success'
                          ? 'bg-emerald-400'
                          : tab.badgeVariant === 'info'
                          ? 'bg-blue-400'
                          : 'bg-slate-400'
                      }`}
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Profile / Quick Info */}
      <div className="p-3 border-t border-[#26374a] bg-[#141e2b]/80">
        {!isCollapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300">Lead Trainer</span>
              <span className="text-[10px] text-emerald-400 font-mono">Active</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Shift: Weekdays</span>
              <span className="font-mono">09:00 - 06:00</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="PPSTrainer">
            <div className="w-6 h-6 rounded-full bg-blue-600/80 flex items-center justify-center text-[10px] font-bold text-white">
              PT
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
