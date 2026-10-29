import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Search,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Student } from '../../types';

interface IrregularStudentsProps {
  irregularStudents: Student[];
  onReactivateStudent: (id: string) => void;
  onNavigateToSchedule: () => void;
}

export const IrregularStudents: React.FC<IrregularStudentsProps> = ({
  irregularStudents,
  onReactivateStudent,
  onNavigateToSchedule
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = irregularStudents.filter(std => {
    return (
      std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      std.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      std.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (std.irregularReason && std.irregularReason.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Retention & Attrition Watch</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Irregular Students Directory</h1>
            <p className="text-xs text-slate-500 mt-1">
              Roster of students moved out of daily schedule due to irregular attendance, missed modules, or inactive periods
            </p>
          </div>

          <button
            onClick={onNavigateToSchedule}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Active Class Schedule</span>
          </button>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900">
        <div>
          <span className="font-bold">Total Irregular Students: {irregularStudents.length}</span>
          <p className="text-rose-700 text-[11px] mt-0.5">
            Students listed here are excluded from today's active attendance verification prompt on the trainer dashboard until re-activated.
          </p>
        </div>
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search irregular students..."
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-rose-300 rounded focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Irregular Cards & Table */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="fiori-table-header">
                <th className="py-3 px-3 w-12 text-center">S.No</th>
                <th className="py-3 px-3 min-w-[150px]">Student Name</th>
                <th className="py-3 px-3 min-w-[120px]">Contact Info</th>
                <th className="py-3 px-3 min-w-[180px]">Course</th>
                <th className="py-3 px-3 min-w-[110px]">Batch Timing</th>
                <th className="py-3 px-3 min-w-[100px]">Progress</th>
                <th className="py-3 px-3 min-w-[110px]">Last Attended</th>
                <th className="py-3 px-3 min-w-[240px]">Reason for Irregularity</th>
                <th className="py-3 px-3 min-w-[140px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f6]">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((std, index) => (
                  <tr key={std.id} className="fiori-table-row bg-rose-50/20">
                    <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div>{std.name}</div>
                      <span className="text-[10px] text-rose-700 bg-rose-100 font-semibold px-1.5 py-0.2 rounded border border-rose-200">
                        Irregular
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      <div>{std.phone}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{std.email}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {std.course}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {std.timing}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-700">{std.completionPercentage}%</span>
                      <div className="w-16 bg-slate-200 rounded-full h-1 mt-1">
                        <div
                          className="bg-amber-500 h-1 rounded-full"
                          style={{ width: `${std.completionPercentage}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {std.lastActiveDate || 'Unknown'}
                    </td>
                    <td className="py-3 px-3 text-rose-900 bg-rose-50/50 rounded p-2 text-xs">
                      {std.irregularReason || 'Marked as irregular by trainer'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onReactivateStudent(std.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                          title="Restore student to active Class Schedule"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Make Regular</span>
                        </button>
                        <a
                          href={`tel:${std.phone}`}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                          title="Call Student"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No irregular students found. All students are attending regularly!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
