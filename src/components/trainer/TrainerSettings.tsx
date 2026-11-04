import React, { useState } from 'react';
import {
  Settings,
  Save,
  ShieldCheck,
  Building2,
  Lock,
  Sliders,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  FileJson,
  Mail,
  UserCheck,
  Coffee,
  CalendarOff,
  Calendar,
  CalendarDays,
  Clock,
  SunMedium,
  Plus,
  Eye,
  EyeOff,
  Search,
  GraduationCap
} from 'lucide-react';
import {
  TrainerSystemSettings,
  Student,
  DemoStudent,
  AttendanceRecord,
  TrainerLeave,
  GovernmentHoliday
} from '../../types';

interface TrainerSettingsProps {
  settings: TrainerSystemSettings;
  onSaveSettings: (settings: TrainerSystemSettings) => void;
  students: Student[];
  demos: DemoStudent[];
  attendance: AttendanceRecord[];
  onClearAttendance: () => void;
  onWipeDatabase: () => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TrainerSettings: React.FC<TrainerSettingsProps> = ({
  settings,
  onSaveSettings,
  students,
  demos,
  attendance,
  onClearAttendance,
  onWipeDatabase
}) => {
  const [formData, setFormData] = useState<TrainerSystemSettings>({
    ...settings,
    trainerUsername: settings.trainerUsername || 'PPSTrainer',
    weekOffDays: settings.weekOffDays || ['Sunday'],
    lunchBreak: settings.lunchBreak || { start: '01:00 PM', end: '02:00 PM' },
    leaves: settings.leaves || [],
    holidays: settings.holidays || [],
    shiftTimingWeekday: settings.shiftTimingWeekday || { start: '09:00 AM', end: '06:00 PM' },
    shiftTimingWeekend: settings.shiftTimingWeekend || { start: '10:00 AM', end: '04:00 PM' },
    allowedPercentageStudentIds: settings.allowedPercentageStudentIds || [],
    allowedAttendanceStudentIds: settings.allowedAttendanceStudentIds || []
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student Percentage Visibility Access controls
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentAccessFilter, setStudentAccessFilter] = useState<'all' | 'granted' | 'hidden'>('all');

  const handleToggleStudentPercentageAccess = (studentId: string) => {
    const current = formData.allowedPercentageStudentIds || [];
    let updated: string[];
    if (current.includes(studentId)) {
      updated = current.filter(id => id !== studentId);
    } else {
      updated = [...current, studentId];
    }
    setFormData({ ...formData, allowedPercentageStudentIds: updated });
  };

  const handleGrantAllPercentageAccess = () => {
    const allIds = students.map(s => s.id);
    setFormData({ ...formData, allowedPercentageStudentIds: allIds });
  };

  const handleRevokeAllPercentageAccess = () => {
    setFormData({ ...formData, allowedPercentageStudentIds: [] });
  };

  // New leave entry state
  const [newLeaveDate, setNewLeaveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newLeaveReason, setNewLeaveReason] = useState<string>('Personal Leave');

  const handleToggleWeekOffDay = (day: string) => {
    setErrorMessage(null);
    const current = formData.weekOffDays || [];
    let updated: string[];
    if (current.includes(day)) {
      if (current.length === 1) {
        setErrorMessage('At least one week off day should be designated.');
        return;
      }
      updated = current.filter(d => d !== day);
    } else {
      updated = [...current, day];
    }
    setFormData({ ...formData, weekOffDays: updated });
  };

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newLeaveDate) return;
    const exists = (formData.leaves || []).some(l => l.date === newLeaveDate);
    if (exists) {
      setErrorMessage(`A leave record already exists for ${newLeaveDate}.`);
      return;
    }
    const newLeave: TrainerLeave = {
      id: 'leave_' + Date.now(),
      date: newLeaveDate,
      reason: newLeaveReason.trim() || 'Trainer Leave',
      createdAt: new Date().toISOString()
    };
    const updatedLeaves = [...(formData.leaves || []), newLeave].sort((a, b) => a.date.localeCompare(b.date));
    setFormData({ ...formData, leaves: updatedLeaves });
  };

  const handleDeleteLeave = (id: string) => {
    const updatedLeaves = (formData.leaves || []).filter(l => l.id !== id);
    setFormData({ ...formData, leaves: updatedLeaves });
  };

  // Government & Public Holidays Management
  const [newHolidayDate, setNewHolidayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newHolidayName, setNewHolidayName] = useState<string>('');

  const handleAddHoliday = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    if (!newHolidayDate || !newHolidayName.trim()) {
      setErrorMessage('Please provide both holiday date and holiday name.');
      return;
    }
    const exists = (formData.holidays || []).some(h => h.date === newHolidayDate);
    if (exists) {
      setErrorMessage(`A holiday is already recorded for ${newHolidayDate}.`);
      return;
    }
    const newHol: GovernmentHoliday = {
      id: 'hol_' + Date.now(),
      date: newHolidayDate,
      name: newHolidayName.trim()
    };
    const updatedHolidays = [...(formData.holidays || []), newHol].sort((a, b) => a.date.localeCompare(b.date));
    setFormData({ ...formData, holidays: updatedHolidays });
    setNewHolidayName('');
  };

  const handleDeleteHoliday = (id: string) => {
    const updatedHolidays = (formData.holidays || []).filter(h => h.id !== id);
    setFormData({ ...formData, holidays: updatedHolidays });
  };

  // Student Attendance History Visibility Permissions
  const [studentAttendanceSearchTerm, setStudentAttendanceSearchTerm] = useState('');
  const [studentAttendanceFilter, setStudentAttendanceFilter] = useState<'all' | 'granted' | 'hidden'>('all');

  const handleToggleStudentAttendanceAccess = (studentId: string) => {
    const current = formData.allowedAttendanceStudentIds || [];
    let updated: string[];
    if (current.includes(studentId)) {
      updated = current.filter(id => id !== studentId);
    } else {
      updated = [...current, studentId];
    }
    setFormData({ ...formData, allowedAttendanceStudentIds: updated });
  };

  const handleGrantAllAttendanceAccess = () => {
    const allIds = students.map(s => s.id);
    setFormData({ ...formData, allowedAttendanceStudentIds: allIds });
  };

  const handleRevokeAllAttendanceAccess = () => {
    setFormData({ ...formData, allowedAttendanceStudentIds: [] });
  };

  // Sync formData whenever settings prop updates
  React.useEffect(() => {
    setFormData({
      ...settings,
      trainerUsername: settings.trainerUsername || 'PPSTrainer',
      weekOffDays: settings.weekOffDays || ['Sunday'],
      lunchBreak: settings.lunchBreak || { start: '01:00 PM', end: '02:00 PM' },
      leaves: settings.leaves || [],
      holidays: settings.holidays || [],
      shiftTimingWeekday: settings.shiftTimingWeekday || { start: '09:00 AM', end: '06:00 PM' },
      shiftTimingWeekend: settings.shiftTimingWeekend || { start: '10:00 AM', end: '04:00 PM' },
      allowedPercentageStudentIds: settings.allowedPercentageStudentIds || [],
      allowedAttendanceStudentIds: settings.allowedAttendanceStudentIds || []
    });
  }, [settings]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    if (!formData.trainerPassword?.trim()) {
      setErrorMessage('Trainer password cannot be empty.');
      return;
    }
    if (!formData.studentPassword?.trim()) {
      setErrorMessage('Student default password cannot be empty.');
      return;
    }
    if (!formData.institutionName?.trim()) {
      setErrorMessage('Institution name cannot be empty.');
      return;
    }
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Full Database JSON Backup
  const handleExportFullBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      institution: formData.institutionName,
      trainer: formData.trainerName,
      stats: {
        totalStudents: students.length,
        totalDemos: demos.length,
        totalAttendanceRecords: attendance.length
      },
      students,
      demos,
      attendance,
      settings: formData
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PPS_Institution_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">
              Administration & Preferences
            </div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Trainer Settings</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure system credentials, institution profile, attendance policies, and backup data
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-md text-xs font-semibold animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Settings Saved Successfully!</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-5 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Trainer Profile & Credentials */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">Trainer Profile & Security Credentials</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Trainer Login Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.trainerUsername || 'PPSTrainer'}
                  onChange={e => setFormData({ ...formData, trainerUsername: e.target.value })}
                  placeholder="PPSTrainer"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono text-slate-700 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
                <span className="text-[10px] text-slate-400">Used to log in to the trainer portal.</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Trainer Login Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.trainerPassword}
                    onChange={e => setFormData({ ...formData, trainerPassword: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-[11px] text-[#0a6ed1] font-semibold hover:underline"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">Default: PPS@2026</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Student Login Default Password
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentPassword}
                  onChange={e => setFormData({ ...formData, studentPassword: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
                <span className="text-[10px] text-slate-400">Default: Student@PPS26</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trainer Name</label>
                  <input
                    type="text"
                    value={formData.trainerName}
                    onChange={e => setFormData({ ...formData, trainerName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trainer Phone</label>
                  <input
                    type="text"
                    value={formData.trainerPhone}
                    onChange={e => setFormData({ ...formData, trainerPhone: e.target.value })}
                    placeholder="+91 98400 00000"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trainer Email</label>
                <input
                  type="email"
                  value={formData.trainerEmail}
                  onChange={e => setFormData({ ...formData, trainerEmail: e.target.value })}
                  placeholder="trainer@pps-sw.com"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Institution Profile */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">Institution & Evaluation Contact</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.institutionName}
                  onChange={e => setFormData({ ...formData, institutionName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Evaluation / Course Completion Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.institutionEmail}
                  onChange={e => setFormData({ ...formData, institutionEmail: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
                <span className="text-[10px] text-slate-400">
                  Students will send their completion verification email directly to this address.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Helpdesk Phone
                  </label>
                  <input
                    type="text"
                    value={formData.institutionPhone || ''}
                    onChange={e => setFormData({ ...formData, institutionPhone: e.target.value })}
                    placeholder="+91 44 2800 1234"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={formData.institutionWebsite || ''}
                    onChange={e => setFormData({ ...formData, institutionWebsite: e.target.value })}
                    placeholder="https://pps-sw.com"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Trainer Working Hours, Shifts & Week-Offs */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <SunMedium className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">Trainer Shifts, Lunch Break & Week-Offs</h2>
            </div>

            <div className="space-y-4 text-xs">
              {/* Week-off Days Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Trainer Week-Off Days (Recurring)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Select non-working days</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map(day => {
                    const isOff = (formData.weekOffDays || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleWeekOffDay(day)}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                          isOff
                            ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-2xs font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day.slice(0, 3)} {isOff ? '✓ (Off)' : ''}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[10px] text-slate-500">
                  Current Week-Offs: <span className="font-semibold text-purple-700">{(formData.weekOffDays || []).join(', ') || 'None'}</span>
                </div>
              </div>

              {/* Lunch Break Timing */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                  <span>Trainer Lunch Break Timing</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] text-slate-500 mb-1">Start Time</span>
                    <input
                      type="text"
                      value={formData.lunchBreak?.start || '01:00 PM'}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          lunchBreak: { ...(formData.lunchBreak || { end: '02:00 PM' }), start: e.target.value }
                        })
                      }
                      placeholder="01:00 PM"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 mb-1">End Time</span>
                    <input
                      type="text"
                      value={formData.lunchBreak?.end || '02:00 PM'}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          lunchBreak: { ...(formData.lunchBreak || { start: '01:00 PM' }), end: e.target.value }
                        })
                      }
                      placeholder="02:00 PM"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  e.g., 01:00 PM - 02:00 PM
                </span>
              </div>

              {/* Shift Timings */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Trainer Shift Timings</span>
                </label>

                {/* Weekday Shift */}
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Weekday Shift (Monday – Friday)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-500">Shift Start</span>
                      <input
                        type="text"
                        value={formData.shiftTimingWeekday?.start || '09:00 AM'}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            shiftTimingWeekday: {
                              ...(formData.shiftTimingWeekday || { end: '06:00 PM' }),
                              start: e.target.value
                            }
                          })
                        }
                        placeholder="09:00 AM"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Shift End</span>
                      <input
                        type="text"
                        value={formData.shiftTimingWeekday?.end || '06:00 PM'}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            shiftTimingWeekday: {
                              ...(formData.shiftTimingWeekday || { start: '09:00 AM' }),
                              end: e.target.value
                            }
                          })
                        }
                        placeholder="06:00 PM"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                      />
                    </div>
                  </div>
                </div>

                {/* Weekend Shift */}
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Weekend Shift (Saturday – Sunday)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-500">Shift Start</span>
                      <input
                        type="text"
                        value={formData.shiftTimingWeekend?.start || '10:00 AM'}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            shiftTimingWeekend: {
                              ...(formData.shiftTimingWeekend || { end: '04:00 PM' }),
                              start: e.target.value
                            }
                          })
                        }
                        placeholder="10:00 AM"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Shift End</span>
                      <input
                        type="text"
                        value={formData.shiftTimingWeekend?.end || '04:00 PM'}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            shiftTimingWeekend: {
                              ...(formData.shiftTimingWeekend || { start: '10:00 AM' }),
                              end: e.target.value
                            }
                          })
                        }
                        placeholder="04:00 PM"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Trainer Leave & Holidays Tracker */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <CalendarOff className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-800">Trainer Leave & Holiday Schedule</h2>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-500 text-[11px]">
                Add specific dates when the trainer is on planned leave. The attendance register and dashboard will automatically mark the day as Leave.
              </p>

              {/* Add New Leave Form */}
              <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200/80 space-y-2.5">
                <span className="font-semibold text-rose-900 block text-[11px] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-rose-600" />
                  <span>Log New Trainer Leave Date</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Leave Date</label>
                    <input
                      type="date"
                      value={newLeaveDate}
                      onChange={e => setNewLeaveDate(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Reason / Note</label>
                    <input
                      type="text"
                      value={newLeaveReason}
                      onChange={e => setNewLeaveReason(e.target.value)}
                      placeholder="e.g. Personal Leave, Medical, Conference"
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddLeave}
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Leave Date</span>
                </button>
              </div>

              {/* Leaves List */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block text-[11px] flex items-center justify-between">
                  <span>Scheduled Leaves:</span>
                  <span className="text-slate-400 font-normal">{(formData.leaves || []).length} dates registered</span>
                </span>

                {(formData.leaves || []).length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-slate-400 text-[11px]">
                    No trainer leaves scheduled yet.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                    {(formData.leaves || []).map(leave => (
                      <div key={leave.id} className="p-2.5 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <span>{leave.date}</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({new Date(leave.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })})
                            </span>
                          </div>
                          <div className="text-[11px] text-rose-700 font-medium">{leave.reason}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLeave(leave.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove leave"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Government & Public Holidays Management */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-800">Government & Public Holidays</h2>
              </div>
              <span className="text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                {(formData.holidays || []).length} Official Holidays
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-500 text-[11px]">
                On declared government and public holidays, the academy is closed. Attendance registers, schedules, and student portals automatically mark the date as a Holiday (just like scheduled week-offs). For weekend batches, holiday deductions apply accordingly.
              </p>

              {/* Add New Holiday Form */}
              <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200/80 space-y-2.5">
                <span className="font-semibold text-rose-900 block text-[11px] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-rose-600" />
                  <span>Declare New Government / Public Holiday</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Holiday Date</label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={e => setNewHolidayDate(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Holiday Name / Occasion</label>
                    <input
                      type="text"
                      value={newHolidayName}
                      onChange={e => setNewHolidayName(e.target.value)}
                      placeholder="e.g. Independence Day, Pongal, Gandhi Jayanti"
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Public Holiday</span>
                </button>
              </div>

              {/* Holidays List */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block text-[11px] flex items-center justify-between">
                  <span>Registered Official Holidays:</span>
                  <span className="text-slate-400 font-normal">{(formData.holidays || []).length} days declared</span>
                </span>

                {(formData.holidays || []).length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-slate-400 text-[11px]">
                    No official holidays declared yet.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                    {(formData.holidays || []).map(hol => {
                      const dayName = new Date(hol.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
                      const isWeekendDay = dayName === 'Saturday' || dayName === 'Sunday';
                      return (
                        <div key={hol.id} className="p-2.5 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>{hol.date}</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({dayName})
                              </span>
                              {isWeekendDay && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                  Weekend Holiday
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-rose-800 font-semibold">{hol.name}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(hol.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Attendance & Batch Policies */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">Attendance & Batch Policies</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Default Class Link Expiration
                </label>
                <select
                  value={formData.defaultLinkDuration}
                  onChange={e => setFormData({ ...formData, defaultLinkDuration: e.target.value as any })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                >
                  <option value="entire_day">Entire Day (Until 23:59:59)</option>
                  <option value="1_hour">1 Hour</option>
                  <option value="2_hours">2 Hours</option>
                  <option value="4_hours">4 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Minimum Attendance % for Course Completion
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={formData.minAttendancePercentForCompletion}
                    onChange={e => setFormData({ ...formData, minAttendancePercentForCompletion: Number(e.target.value) })}
                    className="w-24 p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                  <span className="text-slate-600 font-semibold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Irregular Status Flag Threshold (Consecutive Absences)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={formData.irregularThresholdDays}
                    onChange={e => setFormData({ ...formData, irregularThresholdDays: Number(e.target.value) })}
                    className="w-24 p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                  <span className="text-slate-600">days of unexcused absence</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Database Backup & Maintenance */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <FileJson className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">Database Backup & Maintenance</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-1">Export Complete System Backup</span>
                <p className="text-[11px] text-slate-500 mb-2">
                  Download a JSON file containing all students, demo leads, attendance registers, and templates.
                </p>
                <button
                  type="button"
                  onClick={handleExportFullBackup}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download JSON Backup</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Clear Attendance Records Only</span>
                  <span className="text-[11px] text-slate-500">Purges past session attendance logs without deleting students</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all attendance records? This cannot be undone.')) {
                      onClearAttendance();
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold"
                >
                  Clear Attendance
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-rose-800 block">Wipe & Reset Database</span>
                  <span className="text-[11px] text-slate-500">Deletes all students, demos, and attendance to start clean</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('DANGER: This will delete all enrolled students and attendance records. Continue?')) {
                      onWipeDatabase();
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded text-xs font-semibold"
                >
                  Reset Database
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Student Course Completion Percentage Visibility Permissions */}
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">
                Student Course Completion Percentage Visibility Access
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {(formData.allowedPercentageStudentIds || []).length} of {students.length} students granted access
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600">
            <p className="text-[11px] leading-relaxed">
              <strong>Institution Policy:</strong> By default, students <em>do not</em> see their syllabus completion percentage or progress bar in their portal. If you grant access to a particular student below, their completion percentage will become visible on their portal.
            </p>
          </div>

          {/* Search & Bulk Grant Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={studentSearchTerm}
                onChange={e => setStudentSearchTerm(e.target.value)}
                placeholder="Search by student name, course, or timing..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStudentAccessFilter('all')}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    studentAccessFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentAccessFilter('granted')}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    studentAccessFilter === 'granted' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Granted Access ({(formData.allowedPercentageStudentIds || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentAccessFilter('hidden')}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    studentAccessFilter === 'hidden' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Hidden ({Math.max(0, students.length - (formData.allowedPercentageStudentIds || []).length)})
                </button>
              </div>

              <button
                type="button"
                onClick={handleGrantAllPercentageAccess}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={handleRevokeAllPercentageAccess}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Hide for All
              </button>
            </div>
          </div>

          {/* Student List with Individual Toggles */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Timing & Batch</th>
                  <th className="py-2.5 px-3 text-center">Progress %</th>
                  <th className="py-2.5 px-3 text-right">Percentage Visibility to Student</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students
                  .filter(std => {
                    const matchesSearch =
                      std.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                      std.course.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                      std.timing.toLowerCase().includes(studentSearchTerm.toLowerCase());
                    const isGranted = (formData.allowedPercentageStudentIds || []).includes(std.id);
                    if (studentAccessFilter === 'granted') return matchesSearch && isGranted;
                    if (studentAccessFilter === 'hidden') return matchesSearch && !isGranted;
                    return matchesSearch;
                  })
                  .map(std => {
                    const isGranted = (formData.allowedPercentageStudentIds || []).includes(std.id);
                    return (
                      <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {std.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{std.course}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {std.timing} ({std.mode})
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-bold text-slate-800">{std.completionPercentage}%</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleStudentPercentageAccess(std.id)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                              isGranted
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300'
                            }`}
                          >
                            {isGranted ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Visible</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Hidden</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card: Student Attendance History Visibility Permissions */}
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">
                Student Attendance History Transcript Permissions
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {(formData.allowedAttendanceStudentIds || []).length} of {students.length} students authorized
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600">
            <p className="text-[11px] leading-relaxed">
              <strong>Institution Policy:</strong> By default, detailed attendance history logs and session transcripts are locked for students. Only students you explicitly authorize below will be able to open and inspect their "My Attendance Register" page in their portal.
            </p>
          </div>

          {/* Search & Bulk Grant Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={studentAttendanceSearchTerm}
                onChange={e => setStudentAttendanceSearchTerm(e.target.value)}
                placeholder="Search by student name, course, or timing..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStudentAttendanceFilter('all')}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    studentAttendanceFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentAttendanceFilter('granted')}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    studentAttendanceFilter === 'granted' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Authorized ({(formData.allowedAttendanceStudentIds || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentAttendanceFilter('hidden')}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    studentAttendanceFilter === 'hidden' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Locked ({Math.max(0, students.length - (formData.allowedAttendanceStudentIds || []).length)})
                </button>
              </div>

              <button
                type="button"
                onClick={handleGrantAllAttendanceAccess}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Authorize All
              </button>
              <button
                type="button"
                onClick={handleRevokeAllAttendanceAccess}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Lock for All
              </button>
            </div>
          </div>

          {/* Student List with Individual Toggles */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Timing & Batch</th>
                  <th className="py-2.5 px-3 text-center">Logged Sessions</th>
                  <th className="py-2.5 px-3 text-right">Attendance Register Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students
                  .filter(std => {
                    const matchesSearch =
                      std.name.toLowerCase().includes(studentAttendanceSearchTerm.toLowerCase()) ||
                      std.course.toLowerCase().includes(studentAttendanceSearchTerm.toLowerCase()) ||
                      std.timing.toLowerCase().includes(studentAttendanceSearchTerm.toLowerCase());
                    const isAuthorized = (formData.allowedAttendanceStudentIds || []).includes(std.id);
                    if (studentAttendanceFilter === 'granted') return matchesSearch && isAuthorized;
                    if (studentAttendanceFilter === 'hidden') return matchesSearch && !isAuthorized;
                    return matchesSearch;
                  })
                  .map(std => {
                    const isAuthorized = (formData.allowedAttendanceStudentIds || []).includes(std.id);
                    const stdAttendanceCount = attendance.filter(a => a.studentId === std.id).length;
                    return (
                      <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {std.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{std.course}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {std.timing} ({std.mode})
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono text-slate-600 text-xs">{stdAttendanceCount} sessions</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleStudentAttendanceAccess(std.id)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                              isAuthorized
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300'
                            }`}
                          >
                            {isAuthorized ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Authorized (Unlocked)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Locked</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Bar */}
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Changes to credentials and policies will take effect immediately.
          </span>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Saved!</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-6 py-2.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save All Settings</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
