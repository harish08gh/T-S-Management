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
  Clock,
  SunMedium,
  Plus
} from 'lucide-react';
import { TrainerSystemSettings, Student, DemoStudent, AttendanceRecord, TrainerLeave } from '../../types';

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
    weekOffDays: settings.weekOffDays || ['Sunday'],
    lunchBreak: settings.lunchBreak || { start: '01:00 PM', end: '02:00 PM' },
    leaves: settings.leaves || [],
    shiftTimingWeekday: settings.shiftTimingWeekday || { start: '09:00 AM', end: '06:00 PM' },
    shiftTimingWeekend: settings.shiftTimingWeekend || { start: '10:00 AM', end: '04:00 PM' }
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // New leave entry state
  const [newLeaveDate, setNewLeaveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newLeaveReason, setNewLeaveReason] = useState<string>('Personal Leave');

  const handleToggleWeekOffDay = (day: string) => {
    const current = formData.weekOffDays || [];
    let updated: string[];
    if (current.includes(day)) {
      if (current.length === 1) {
        alert('At least one week off day should be designated.');
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
    if (!newLeaveDate) return;
    const exists = (formData.leaves || []).some(l => l.date === newLeaveDate);
    if (exists) {
      alert(`A leave record already exists for ${newLeaveDate}.`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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

          {saveSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-md text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings Saved Successfully!</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  Trainer Login Username (Fixed)
                </label>
                <input
                  type="text"
                  disabled
                  value="PPSTrainer"
                  className="w-full p-2 bg-slate-100 border border-slate-300 rounded font-mono text-slate-700 font-bold"
                />
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

        {/* Save Bar */}
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Changes to credentials and policies will take effect immediately.
          </span>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
