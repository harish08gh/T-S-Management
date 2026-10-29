import {
  GraduationCap,
  Bell,
  Search,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  Clock,
  Sparkles,
  LogOut
} from 'lucide-react';
import { UserRole, Student } from '../types';

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
  onLogout
}) => {
  return (
    <header className="fiori-shell sticky top-0 z-40 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left Brand & App Title */}
          <div className="flex items-center space-x-3">
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

          {/* Center Cloud Sync Status (Trainer Only - hidden for students) */}
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

          {/* Right Role Indicator & Actions */}
          <div className="flex items-center space-x-3">
            {/* If Trainer Role: Allow viewing Trainer Portal view */}
            {currentRole === 'trainer' && (
              <div className="bg-[#13202e] px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 text-xs text-blue-200 font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0a6ed1]" />
                <span>Trainer Cockpit</span>
              </div>
            )}

            {/* If Student Role: Badge indicating Student Portal */}
            {currentRole === 'student' && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs text-emerald-200 font-semibold">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Student Portal</span>
              </div>
            )}

            {/* Notifications Indicator (Trainer only) */}
            {currentRole === 'trainer' && (pendingAttendanceCount > 0 || irregularCount > 0) && (
              <div
                title={`${pendingAttendanceCount} pending attendance checks, ${irregularCount} irregular students`}
                className="flex items-center text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-md"
              >
                <Bell className="w-3.5 h-3.5 mr-1" />
                <span className="font-semibold">{pendingAttendanceCount + irregularCount}</span>
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
