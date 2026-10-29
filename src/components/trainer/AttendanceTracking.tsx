import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  Download,
  Filter,
  Sparkles,
  Link2,
  User,
  Layers,
  ChevronRight,
  TrendingUp,
  BarChart3,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { AttendanceRecord, Student, AttendanceStatus } from '../../types';

interface AttendanceTrackingProps {
  ongoingStudents: Student[];
  attendance: AttendanceRecord[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onUpdateTopic: (id: string, topic: string) => void;
  todayStr: string;
}

type AttendanceViewMode = 'daily' | 'student_wise' | 'month_wise';

export const AttendanceTracking: React.FC<AttendanceTrackingProps> = ({
  ongoingStudents,
  attendance,
  onRecordAttendance,
  onUpdateTopic,
  todayStr
}) => {
  const [viewMode, setViewMode] = useState<AttendanceViewMode>('daily');

  // Date filters
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [fromDate, setFromDate] = useState<string>(() => {
    // Default 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(todayStr);
  const [useDateRange, setUseDateRange] = useState<boolean>(false);

  // Month-wise filter
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return todayStr.slice(0, 7); // YYYY-MM
  });

  // Student-wise filter
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    ongoingStudents.length > 0 ? ongoingStudents[0].id : ''
  );

  // Search & Status filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicText, setEditingTopicText] = useState<string>('');

  // Batch topic state
  const [batchTopicInput, setBatchTopicInput] = useState<string>('');
  const [showBatchTopic, setShowBatchTopic] = useState<boolean>(false);

  // Auto-select first student if none selected
  React.useEffect(() => {
    if (!selectedStudentId && ongoingStudents.length > 0) {
      setSelectedStudentId(ongoingStudents[0].id);
    }
  }, [ongoingStudents, selectedStudentId]);

  // Filter attendance records by Date Range (From Date -> To Date)
  const rangeFilteredAttendance = useMemo(() => {
    if (!useDateRange) return attendance;
    return attendance.filter(a => {
      const d = a.date;
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    });
  }, [attendance, fromDate, toDate, useDateRange]);

  // DAILY VIEW: Map of studentId -> AttendanceRecord for the selected single date
  const dateRecords = useMemo(() => {
    return attendance.filter(a => a.date === singleDate);
  }, [attendance, singleDate]);

  const dailyRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    dateRecords.forEach(r => map.set(r.studentId, r));
    return map;
  }, [dateRecords]);

  // Daily student rows
  const dailyRows = useMemo(() => {
    return ongoingStudents.map(student => {
      const existing = dailyRecordsMap.get(student.id);
      return {
        student,
        record: existing || null,
        attendanceStatus: existing ? existing.attendance : ('Absent' as AttendanceStatus),
        topicCovered: existing ? existing.topicCovered : '',
        time: existing ? existing.time : (student.timing ? student.timing.split('-')[0].trim() : '09:00 AM'),
        markedBy: existing ? existing.markedBy : 'Trainer (Attendance Page)',
        hasRecord: !!existing
      };
    });
  }, [ongoingStudents, dailyRecordsMap]);

  const filteredDailyRows = useMemo(() => {
    return dailyRows.filter(row => {
      const matchesSearch =
        row.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.student.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.topicCovered.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Present' && row.hasRecord && row.attendanceStatus === 'Present') ||
        (statusFilter === 'Absent' && (!row.hasRecord || row.attendanceStatus === 'Absent')) ||
        (statusFilter === 'TouchLink' && row.hasRecord && row.markedBy.includes('Touch Link'));

      return matchesSearch && matchesStatus;
    });
  }, [dailyRows, searchTerm, statusFilter]);

  // STUDENT-WISE VIEW: records for selected student within date range
  const studentRecords = useMemo(() => {
    if (!selectedStudentId) return [];
    return rangeFilteredAttendance
      .filter(a => a.studentId === selectedStudentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rangeFilteredAttendance, selectedStudentId]);

  const currentSelectedStudent = ongoingStudents.find(s => s.id === selectedStudentId);

  const studentWisePresentCount = studentRecords.filter(r => r.attendance === 'Present').length;
  const studentWiseTotalCount = studentRecords.length;
  const studentWisePct = studentWiseTotalCount > 0 ? Math.round((studentWisePresentCount / studentWiseTotalCount) * 100) : 0;

  // MONTH-WISE VIEW: breakdown for all students in selected month
  const monthWiseRecords = useMemo(() => {
    return attendance.filter(a => a.date.startsWith(selectedMonth));
  }, [attendance, selectedMonth]);

  const monthStudentSummaries = useMemo(() => {
    // Unique session dates in this month
    const sessionDates = Array.from(new Set(monthWiseRecords.map(r => r.date))).sort();

    return ongoingStudents.map(student => {
      const studentMonthRecords = monthWiseRecords.filter(r => r.studentId === student.id);
      const presentDays = studentMonthRecords.filter(r => r.attendance === 'Present').length;
      const absentDays = studentMonthRecords.filter(r => r.attendance === 'Absent').length;
      const totalRecorded = studentMonthRecords.length;
      const rate = totalRecorded > 0 ? Math.round((presentDays / totalRecorded) * 100) : 0;

      return {
        student,
        presentDays,
        absentDays,
        totalRecorded,
        rate,
        records: studentMonthRecords
      };
    });
  }, [ongoingStudents, monthWiseRecords]);

  // Handlers
  const handleToggleDailyAttendance = (
    student: Student,
    currentStatus: AttendanceStatus,
    targetStatus: AttendanceStatus
  ) => {
    const existing = dailyRecordsMap.get(student.id);
    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `att-${Date.now()}-${student.id}`,
      studentId: student.id,
      studentName: student.name,
      course: student.course,
      date: singleDate,
      time: existing ? existing.time : (student.timing ? student.timing.split('-')[0].trim() : '09:00 AM'),
      attendance: targetStatus,
      topicCovered: existing ? existing.topicCovered : (batchTopicInput || 'Curriculum Session'),
      markedBy: 'Trainer (Attendance Page)',
      markedAt: new Date().toISOString()
    };
    onRecordAttendance(newRecord);
  };

  const handleSaveTopic = (student: Student) => {
    const existing = dailyRecordsMap.get(student.id);
    if (existing) {
      onUpdateTopic(existing.id, editingTopicText);
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${student.id}`,
        studentId: student.id,
        studentName: student.name,
        course: student.course,
        date: singleDate,
        time: student.timing ? student.timing.split('-')[0].trim() : '09:00 AM',
        attendance: 'Present',
        topicCovered: editingTopicText,
        markedBy: 'Trainer (Attendance Page)',
        markedAt: new Date().toISOString()
      };
      onRecordAttendance(newRecord);
    }
    setEditingTopicId(null);
  };

  const handleApplyBatchTopic = () => {
    if (!batchTopicInput.trim()) return;
    ongoingStudents.forEach(std => {
      const existing = dailyRecordsMap.get(std.id);
      const newRecord: AttendanceRecord = {
        id: existing ? existing.id : `att-${Date.now()}-${std.id}`,
        studentId: std.id,
        studentName: std.name,
        course: std.course,
        date: singleDate,
        time: existing ? existing.time : (std.timing ? std.timing.split('-')[0].trim() : '09:00 AM'),
        attendance: existing ? existing.attendance : 'Present',
        topicCovered: batchTopicInput,
        markedBy: 'Trainer (Attendance Page)',
        markedAt: new Date().toISOString()
      };
      onRecordAttendance(newRecord);
    });
    setShowBatchTopic(false);
  };

  const handleMarkAllPresentDaily = () => {
    ongoingStudents.forEach(std => {
      handleToggleDailyAttendance(std, 'Absent', 'Present');
    });
  };

  // CSV Export for current view
  const handleExportCSV = () => {
    let csvHeaders: string[] = [];
    let csvRows: (string | number)[][] = [];
    let fileName = `Attendance_Export_${todayStr}.csv`;

    if (viewMode === 'daily') {
      csvHeaders = ['S.No', 'Student Name', 'Course', 'Date', 'Time', 'Attendance', 'Topic Covered', 'Marked By'];
      csvRows = filteredDailyRows.map((r, i) => [
        i + 1,
        `"${r.student.name}"`,
        `"${r.student.course}"`,
        singleDate,
        `"${r.time}"`,
        r.attendanceStatus,
        `"${r.topicCovered}"`,
        `"${r.markedBy}"`
      ]);
      fileName = `Daily_Attendance_${singleDate}.csv`;
    } else if (viewMode === 'student_wise') {
      csvHeaders = ['S.No', 'Student Name', 'Date', 'Time', 'Attendance', 'Topic Covered', 'Marked By'];
      csvRows = studentRecords.map((r, i) => [
        i + 1,
        `"${r.studentName}"`,
        r.date,
        `"${r.time}"`,
        r.attendance,
        `"${r.topicCovered}"`,
        `"${r.markedBy}"`
      ]);
      fileName = `Student_Attendance_${currentSelectedStudent?.name || 'Report'}_${fromDate}_to_${toDate}.csv`;
    } else {
      csvHeaders = ['S.No', 'Student Name', 'Course', 'Month', 'Present Days', 'Absent Days', 'Total Sessions', 'Attendance %'];
      csvRows = monthStudentSummaries.map((m, i) => [
        i + 1,
        `"${m.student.name}"`,
        `"${m.student.course}"`,
        selectedMonth,
        m.presentDays,
        m.absentDays,
        m.totalRecorded,
        `${m.rate}%`
      ]);
      fileName = `Monthly_Attendance_Summary_${selectedMonth}.csv`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Dynamic Page Header */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">
              Attendance Center
            </div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">
              Attendance Tracking & Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Multi-dimensional reporting: Daily register, Student-wise history, and Monthly aggregates with Date Range filter
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'daily' && (
              <>
                <button
                  onClick={() => setShowBatchTopic(!showBatchTopic)}
                  className="px-3 py-1.5 bg-blue-50 text-[#0a6ed1] hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fill Topic for All</span>
                </button>
                <button
                  onClick={handleMarkAllPresentDaily}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark All Present</span>
                </button>
              </>
            )}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 3 View Mode Tabs */}
        <div className="max-w-7xl mx-auto mt-4 pt-2 border-t border-slate-100 flex space-x-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'daily'
                ? 'bg-[#0a6ed1] text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Daily Attendance Register</span>
          </button>
          <button
            onClick={() => setViewMode('student_wise')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'student_wise'
                ? 'bg-[#0a6ed1] text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Student-Wise Attendance</span>
          </button>
          <button
            onClick={() => setViewMode('month_wise')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'month_wise'
                ? 'bg-[#0a6ed1] text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Month-Wise Attendance</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR WITH "FROM DATE TO DATE FILTER" */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Specific View Controls */}
          {viewMode === 'daily' && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Selected Session Date
                </label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Search Student / Topic
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search name, course..."
                    className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                >
                  <option value="ALL">All Status</option>
                  <option value="Present">Present Only</option>
                  <option value="Absent">Absent Only</option>
                  <option value="TouchLink">Student Touch Link Only</option>
                </select>
              </div>
            </div>
          )}

          {viewMode === 'student_wise' && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1] min-w-[200px]"
                >
                  {ongoingStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.course})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {viewMode === 'month_wise' && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>
            </div>
          )}

          {/* REQUIREMENT: FROM DATE TO DATE FILTER */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#0a6ed1]" />
              <span>Date Range Filter:</span>
            </div>
            <div>
              <input
                type="date"
                value={fromDate}
                onChange={e => {
                  setFromDate(e.target.value);
                  setUseDateRange(true);
                }}
                className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                title="From Date"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div>
              <input
                type="date"
                value={toDate}
                onChange={e => {
                  setToDate(e.target.value);
                  setUseDateRange(true);
                }}
                className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                title="To Date"
              />
            </div>
            {useDateRange && (
              <button
                onClick={() => setUseDateRange(false)}
                className="text-[11px] text-[#0a6ed1] hover:underline font-semibold ml-1"
              >
                Reset Range
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Batch Topic Applicator Banner */}
      {showBatchTopic && viewMode === 'daily' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-blue-900 mb-1">
                Batch Topic Applicator for Date: {singleDate}
              </label>
              <input
                type="text"
                value={batchTopicInput}
                onChange={e => setBatchTopicInput(e.target.value)}
                placeholder="e.g. Microservices Architecture, REST APIs, Database Design..."
                className="w-full text-xs p-2 bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2 sm:pt-0">
              <button
                onClick={handleApplyBatchTopic}
                className="px-4 py-2 bg-[#0a6ed1] text-white rounded text-xs font-semibold shadow-xs hover:bg-[#0854a0]"
              >
                Apply to All Students
              </button>
              <button
                onClick={() => setShowBatchTopic(false)}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded text-xs font-medium hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: DAILY ATTENDANCE REGISTER */}
      {viewMode === 'daily' && (
        <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="fiori-table-header">
                  <th className="py-3 px-3 w-12 text-center">S.No</th>
                  <th className="py-3 px-3 min-w-[150px]">Student Name</th>
                  <th className="py-3 px-3 min-w-[100px]">Date</th>
                  <th className="py-3 px-3 min-w-[90px]">Time</th>
                  <th className="py-3 px-3 min-w-[150px]">Attendance Status</th>
                  <th className="py-3 px-3 min-w-[280px]">Topic Covered (Trainer Fillable)</th>
                  <th className="py-3 px-3 min-w-[150px]">Logged Via</th>
                  <th className="py-3 px-3 w-28 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {filteredDailyRows.length > 0 ? (
                  filteredDailyRows.map((row, index) => {
                    const isPresent = row.hasRecord && row.attendanceStatus === 'Present';
                    const isEditingTopic = editingTopicId === row.student.id;

                    return (
                      <tr key={row.student.id} className="fiori-table-row">
                        <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <div>{row.student.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal truncate max-w-[160px]">
                            {row.student.course}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {singleDate}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.time}
                        </td>

                        {/* Attendance Toggle Buttons */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="inline-flex rounded-md shadow-2xs border border-slate-300 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleToggleDailyAttendance(row.student, row.attendanceStatus, 'Present')}
                              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-all ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-inner'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDailyAttendance(row.student, row.attendanceStatus, 'Absent')}
                              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-all ${
                                !isPresent
                                  ? 'bg-rose-600 text-white shadow-inner'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Absent</span>
                            </button>
                          </div>
                        </td>

                        {/* Topic Covered */}
                        <td className="py-3 px-3">
                          {isEditingTopic ? (
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                value={editingTopicText}
                                onChange={e => setEditingTopicText(e.target.value)}
                                placeholder="Enter syllabus topic covered..."
                                autoFocus
                                className="w-full text-xs p-1.5 bg-white border border-[#0a6ed1] rounded focus:outline-none"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveTopic(row.student);
                                  if (e.key === 'Escape') setEditingTopicId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveTopic(row.student)}
                                className="p-1.5 bg-[#0a6ed1] text-white rounded hover:bg-[#0854a0]"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingTopicId(row.student.id);
                                setEditingTopicText(row.topicCovered || '');
                              }}
                              className="group cursor-pointer flex items-center justify-between p-1.5 rounded hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-colors"
                            >
                              <span className={row.topicCovered ? 'text-slate-800' : 'text-slate-400 italic'}>
                                {row.topicCovered || 'Click to enter topic...'}
                              </span>
                              <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-[#0a6ed1] opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
                            </div>
                          )}
                        </td>

                        {/* Logged Via */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {row.hasRecord ? (
                            row.markedBy.includes('Touch Link') ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Link2 className="w-3 h-3 mr-1" />
                                Student (Touch Link)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {row.markedBy}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not marked yet</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingTopicId(row.student.id);
                              setEditingTopicText(row.topicCovered || '');
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-[#0a6ed1] hover:underline"
                          >
                            Edit Topic
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {ongoingStudents.length === 0
                        ? 'No ongoing students enrolled yet. Go to Class Schedule to add students.'
                        : 'No student matches found for this date.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: STUDENT-WISE ATTENDANCE */}
      {viewMode === 'student_wise' && (
        <div className="space-y-4">
          {currentSelectedStudent ? (
            <>
              {/* Student KPI Card */}
              <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-[#0a6ed1] text-white flex items-center justify-center font-bold text-lg">
                    {currentSelectedStudent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">{currentSelectedStudent.name}</h2>
                    <p className="text-xs text-slate-500">
                      {currentSelectedStudent.course} • Timing: {currentSelectedStudent.timing} • Mode: {currentSelectedStudent.mode}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Sessions</span>
                    <span className="text-base font-bold text-slate-800">{studentWiseTotalCount}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Present</span>
                    <span className="text-base font-bold text-emerald-600">{studentWisePresentCount}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Absent</span>
                    <span className="text-base font-bold text-rose-600">{studentWiseTotalCount - studentWisePresentCount}</span>
                  </div>
                  <div className="text-center border-l border-slate-200 pl-4">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Attendance Rate</span>
                    <span className="text-base font-bold text-[#0a6ed1]">{studentWisePct}%</span>
                  </div>
                </div>
              </div>

              {/* Student Attendance History Table */}
              <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">
                    Attendance Log ({useDateRange ? `${fromDate} to ${toDate}` : 'All Recorded Dates'})
                  </h3>
                  <span className="text-xs text-slate-500">{studentRecords.length} sessions logged</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="fiori-table-header">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 min-w-[120px]">Date</th>
                        <th className="py-3 px-4 min-w-[100px]">Class Time</th>
                        <th className="py-3 px-4 min-w-[140px]">Attendance</th>
                        <th className="py-3 px-4 min-w-[280px]">Topic Covered</th>
                        <th className="py-3 px-4 min-w-[160px]">Logged Via</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2f6]">
                      {studentRecords.length > 0 ? (
                        studentRecords.map((r, idx) => (
                          <tr key={r.id} className="fiori-table-row">
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-slate-800">{r.date}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{r.time}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                                r.attendance === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {r.attendance === 'Present' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                                )}
                                {r.attendance}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{r.topicCovered || '—'}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{r.markedBy}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No attendance records logged for {currentSelectedStudent.name} in this date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-400">
              No students enrolled yet.
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: MONTH-WISE ATTENDANCE */}
      {viewMode === 'month_wise' && (
        <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Monthly Aggregate Roster: {selectedMonth}
              </h3>
              <p className="text-[11px] text-slate-500">
                Calculates total sessions, present days, absent days, and monthly attendance percentage per student.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="fiori-table-header">
                  <th className="py-3 px-3 w-12 text-center">S.No</th>
                  <th className="py-3 px-3 min-w-[160px]">Student Name</th>
                  <th className="py-3 px-3 min-w-[180px]">Course</th>
                  <th className="py-3 px-3 min-w-[100px] text-center">Sessions Held</th>
                  <th className="py-3 px-3 min-w-[100px] text-center text-emerald-700">Present</th>
                  <th className="py-3 px-3 min-w-[100px] text-center text-rose-700">Absent</th>
                  <th className="py-3 px-3 min-w-[160px]">Monthly Attendance %</th>
                  <th className="py-3 px-3 min-w-[100px] text-center">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {monthStudentSummaries.length > 0 ? (
                  monthStudentSummaries.map((m, idx) => (
                    <tr key={m.student.id} className="fiori-table-row">
                      <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{m.student.name}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{m.student.course}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-800">{m.totalRecorded}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">{m.presentDays}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-600">{m.absentDays}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs w-9 text-slate-800">{m.rate}%</span>
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                m.rate >= 80 ? 'bg-emerald-500' : m.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${m.rate}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {m.totalRecorded === 0 ? (
                          <span className="text-slate-400 text-[11px] italic">No records</span>
                        ) : m.rate >= 80 ? (
                          <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                            Good Standing
                          </span>
                        ) : m.rate >= 60 ? (
                          <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                            Needs Follow-up
                          </span>
                        ) : (
                          <span className="text-[11px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded">
                            Critical Attrition
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No student records for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
