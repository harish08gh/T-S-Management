import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  Mail,
  User,
  Calendar,
  Layers,
  X
} from 'lucide-react';
import { Student, StudentStatus, ClassMode, ClassType } from '../../types';
import {
  isWeekend as checkIsWeekend,
  getDayMode,
  isStudentScheduledOnDate,
  getStudentEffectiveTiming
} from '../../utils/scheduleUtils';

interface StudentDetailsProps {
  students: Student[];
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({ students }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [selectedStudentForView, setSelectedStudentForView] = useState<Student | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayBatchMode = useMemo(() => getDayMode(todayStr), [todayStr]);

  // Extract unique courses for filter
  const uniqueCourses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.course)));
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(std => {
      const matchesSearch =
        std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.remark.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || std.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesMode =
        modeFilter === 'ALL' ||
        (modeFilter === 'TODAY' && isStudentScheduledOnDate(std, todayStr)) ||
        std.mode.toLowerCase() === modeFilter.toLowerCase();

      const matchesType =
        typeFilter === 'ALL' || std.type.toLowerCase() === typeFilter.toLowerCase();

      const matchesCourse =
        courseFilter === 'ALL' || std.course === courseFilter;

      return matchesSearch && matchesStatus && matchesMode && matchesType && matchesCourse;
    });
  }, [students, searchTerm, statusFilter, modeFilter, typeFilter, courseFilter, todayStr]);

  // Export to CSV functionality
  const handleExportCSV = () => {
    const headers = [
      'S.No',
      'Student Name',
      'Phone',
      'Course',
      'DOJ',
      'DOE (Date of Ending)',
      'Status',
      'Mode',
      'Type',
      'Completion %',
      'Remark',
      'Trainer Name'
    ];

    const rows = filteredStudents.map((s, index) => [
      index + 1,
      `"${s.name}"`,
      `"${s.phone}"`,
      `"${s.course}"`,
      s.doj || '',
      s.doe || (s.status === 'Completed' ? 'Completed' : 'N/A'),
      s.status,
      s.mode,
      s.type,
      `${s.completionPercentage}%`,
      `"${s.remark || ''}"`,
      `"${s.trainerName}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PPS_Student_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setModeFilter('ALL');
    setTypeFilter('ALL');
    setCourseFilter('ALL');
  };

  const getStatusBadge = (status: StudentStatus, isIrregular: boolean) => {
    if (isIrregular) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          Irregular
        </span>
      );
    }
    switch (status) {
      case 'Ongoing':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Ongoing
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Completed
          </span>
        );
      case 'Demo':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Demo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header (SAP Fiori Dynamic Page Title) */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">Student Directory</div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Student Details & Records</h1>
            <p className="text-xs text-slate-500 mt-1">
              Read-only master student repository ({filteredStudents.length} of {students.length} students displayed)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* SAP Fiori FilterBar */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#0a6ed1]" />
            <span>Filter Bar</span>
          </div>
          {(searchTerm || statusFilter !== 'ALL' || modeFilter !== 'ALL' || typeFilter !== 'ALL' || courseFilter !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#0a6ed1] hover:underline font-medium"
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Global Search */}
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Search Keyword</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Name, phone, trainer..."
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Demo">Demo</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Mode Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mode</label>
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            >
              <option value="ALL">All Modes</option>
              <option value="TODAY">🎯 Today's Batches ({todayBatchMode})</option>
              <option value="Weekdays">Weekdays (Mon-Fri)</option>
              <option value="Weekend">Weekend (Sat-Sun)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            >
              <option value="ALL">All Types</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Course</label>
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1] truncate"
            >
              <option value="ALL">All Courses</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SAP Fiori Table with precise columns required */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="fiori-table-header">
                <th className="py-3 px-3 w-12 text-center">S.No</th>
                <th className="py-3 px-3 min-w-[140px]">Student Name</th>
                <th className="py-3 px-3 min-w-[120px]">Phone</th>
                <th className="py-3 px-3 min-w-[180px]">Course</th>
                <th className="py-3 px-3 min-w-[95px]">DOJ</th>
                <th className="py-3 px-3 min-w-[100px]">DOE (If completed)</th>
                <th className="py-3 px-3 min-w-[90px]">Status</th>
                <th className="py-3 px-3 min-w-[85px]">Mode</th>
                <th className="py-3 px-3 min-w-[80px]">Type</th>
                <th className="py-3 px-3 min-w-[180px]">Remark</th>
                <th className="py-3 px-3 min-w-[120px]">Trainer Name</th>
                <th className="py-3 px-2 w-16 text-center">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f6]">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((std, index) => (
                  <tr key={std.id} className="fiori-table-row">
                    <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{std.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      <a href={`tel:${std.phone}`} className="hover:text-[#0a6ed1] hover:underline">
                        {std.phone}
                      </a>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {std.course}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {std.doj}
                    </td>
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      {std.doe ? (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {std.doe}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Ongoing</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(std.status, std.isIrregular)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {std.mode}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        std.type === 'Online'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {std.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[220px] truncate" title={std.remark}>
                      {std.remark || '—'}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {std.trainerName}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => setSelectedStudentForView(std)}
                        className="p-1 hover:bg-slate-100 text-[#0a6ed1] rounded transition-colors"
                        title="View Full Student Object Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
                    No student records match the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#d9e0e7] flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredStudents.length} entries (Read Mode Enforced)</span>
          <span className="text-[11px] text-slate-400 italic">
            To edit ongoing batches, visit Class Schedule or Demo Management.
          </span>
        </div>
      </div>

      {/* Read-Only Student Details Modal / Fiori Object Page Preview */}
      {selectedStudentForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#1d2d3e] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">Student Profile Record</span>
                <h2 className="text-base font-bold">{selectedStudentForView.name}</h2>
              </div>
              <button
                onClick={() => setSelectedStudentForView(null)}
                className="text-slate-300 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Course</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedStudentForView.course}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
                  {getStatusBadge(selectedStudentForView.status, selectedStudentForView.isIrregular)}
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Completion Progress</span>
                  <span className="font-bold text-[#0a6ed1] text-sm">{selectedStudentForView.completionPercentage}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold">Contact Phone</span>
                    <span className="text-slate-800 font-mono text-sm">{selectedStudentForView.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold">Email Address</span>
                    <span className="text-slate-800">{selectedStudentForView.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold">Batch Timing</span>
                    <span className="text-slate-800 font-mono">{selectedStudentForView.timing}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold">Date of Joining (DOJ)</span>
                    <span className="text-slate-800 font-mono">{selectedStudentForView.doj}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold">Date of Ending (DOE)</span>
                    <span className="text-slate-800 font-mono">
                      {selectedStudentForView.doe || (selectedStudentForView.status === 'Completed' ? 'Completed' : 'Course in Progress')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold">Trainer in Charge</span>
                    <span className="text-slate-800">{selectedStudentForView.trainerName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <span className="text-slate-400 block text-[11px] font-semibold mb-1">Trainer Remark</span>
                <p className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-700 italic">
                  "{selectedStudentForView.remark || 'No specific remarks recorded.'}"
                </p>
              </div>

              {selectedStudentForView.isIrregular && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800">
                  <span className="font-semibold block text-[11px]">Irregular Flag Reason:</span>
                  <span>{selectedStudentForView.irregularReason}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStudentForView(null)}
                className="px-4 py-1.5 bg-[#0a6ed1] text-white rounded text-xs font-semibold hover:bg-[#0854a0] transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
