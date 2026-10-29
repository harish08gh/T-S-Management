import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarDays,
  Search,
  CheckCircle,
  AlertTriangle,
  Percent,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  UserPlus,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Check,
  Download,
  Upload,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Student, ClassMode, ClassType, ClassLink } from '../../types';
import { downloadCSV, parseCSVText } from '../../utils/csvHelper';

interface ClassScheduleProps {
  ongoingStudents: Student[];
  onSaveStudent: (student: Student) => void;
  onBulkSaveStudents?: (students: Student[]) => Promise<void> | void;
  onDeleteStudent: (id: string) => void;
  onUpdateCompletion: (id: string, percentage: number, doe?: string) => void;
  onToggleRegular: (id: string, isIrregular: boolean, reason?: string) => void;
  onNavigateToIrregular: () => void;
  classLink?: ClassLink;
  onOpenClassLinkModal?: () => void;
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

export const ClassSchedule: React.FC<ClassScheduleProps> = ({
  ongoingStudents,
  onSaveStudent,
  onBulkSaveStudents,
  onDeleteStudent,
  onUpdateCompletion,
  onToggleRegular,
  onNavigateToIrregular,
  classLink,
  onOpenClassLinkModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Real-time clock for upcoming class reminder
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  // Modal: Add New Student
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState<Partial<Student>>({
    name: '',
    phone: '',
    email: '',
    course: '',
    doj: new Date().toISOString().split('T')[0],
    mode: 'Weekdays',
    type: 'Online',
    timing: '09:00 AM - 10:30 AM',
    completionPercentage: 0,
    trainerName: 'PPSTrainer',
    remark: '',
    isIrregular: false
  });

  // Modal: Edit Student (All Fields)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Modal: 100% Completion -> Date of Ending (DOE)
  const [completionPromptStudent, setCompletionPromptStudent] = useState<Student | null>(null);
  const [inputDOE, setInputDOE] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal: Irregular Reason
  const [irregularPromptStudent, setIrregularPromptStudent] = useState<Student | null>(null);
  const [irregularReasonInput, setIrregularReasonInput] = useState<string>(
    'Absent for multiple sessions without prior approval'
  );

  // Inline Quick Edit state
  const [inlineEditRowId, setInlineEditRowId] = useState<string | null>(null);
  const [inlineFormData, setInlineFormData] = useState<Partial<Student>>({});

  // CSV Upload Modal state
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Student[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start inline editing
  const startInlineEdit = (student: Student) => {
    setInlineEditRowId(student.id);
    setInlineFormData({ ...student });
  };

  const cancelInlineEdit = () => {
    setInlineEditRowId(null);
    setInlineFormData({});
  };

  const saveInlineEdit = (id: string) => {
    const student = ongoingStudents.find(s => s.id === id);
    if (!student) return;

    const updated: Student = {
      ...student,
      ...inlineFormData
    };

    if (updated.completionPercentage === 100 && student.completionPercentage !== 100) {
      setCompletionPromptStudent(updated);
      setInputDOE(new Date().toISOString().split('T')[0]);
    } else {
      onSaveStudent(updated);
    }

    setInlineEditRowId(null);
    setInlineFormData({});
  };

  // Add New Student Submit
  const handleAddNewStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name || !newStudentForm.phone || !newStudentForm.course) {
      alert('Please enter Student Name, Phone/Contact, and Course Title.');
      return;
    }

    const studentToSave: Student = {
      id: `std-${Date.now()}`,
      sno: ongoingStudents.length + 1,
      name: newStudentForm.name,
      phone: newStudentForm.phone,
      email: newStudentForm.email || `${newStudentForm.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      course: newStudentForm.course,
      doj: newStudentForm.doj || new Date().toISOString().split('T')[0],
      status: 'Ongoing',
      mode: newStudentForm.mode || 'Weekdays',
      type: newStudentForm.type || 'Online',
      timing: newStudentForm.timing || '09:00 AM - 10:30 AM',
      completionPercentage: Number(newStudentForm.completionPercentage || 0),
      trainerName: newStudentForm.trainerName || 'PPSTrainer',
      remark: newStudentForm.remark || 'Regular ongoing batch',
      isIrregular: false,
      lastActiveDate: new Date().toISOString().split('T')[0]
    };

    onSaveStudent(studentToSave);
    setIsAddModalOpen(false);

    // Reset Form
    setNewStudentForm({
      name: '',
      phone: '',
      email: '',
      course: '',
      doj: new Date().toISOString().split('T')[0],
      mode: 'Weekdays',
      type: 'Online',
      timing: '09:00 AM - 10:30 AM',
      completionPercentage: 0,
      trainerName: 'PPSTrainer',
      remark: '',
      isIrregular: false
    });
  };

  // 100% Completion DOE Confirm
  const handleConfirmCompletionWithDOE = () => {
    if (!completionPromptStudent) return;
    onUpdateCompletion(completionPromptStudent.id, 100, inputDOE);
    setCompletionPromptStudent(null);
  };

  // Regular/Irregular change
  const handleRegularityDropdown = (student: Student, value: string) => {
    if (value === 'Irregular') {
      setIrregularPromptStudent(student);
      setIrregularReasonInput('Irregular attendance, moved out of daily schedule.');
    } else {
      onToggleRegular(student.id, false);
    }
  };

  const handleConfirmIrregularMove = () => {
    if (!irregularPromptStudent) return;
    onToggleRegular(irregularPromptStudent.id, true, irregularReasonInput);
    setIrregularPromptStudent(null);
  };

  // --- CSV TEMPLATE DOWNLOAD ---
  const handleDownloadTemplate = () => {
    const csvContent =
`Name,Phone,Email,Timing,Course,DOJ,Mode,Type,CompletionPercentage,TrainerName,Remark,IsIrregular
Harish Kumar,+91 98450 12345,harish@example.com,09:00 AM - 10:30 AM,Full Stack Web Development,2026-10-01,Weekdays,Online,35,PPSTrainer,Regular batch,No
Priya Sharma,+91 98450 67890,priya.s@example.com,07:00 PM - 08:30 PM,SAP FICO & S/4HANA,2026-10-15,Weekend,Offline,15,PPSTrainer,Fast learner,No
Karthik Raj,+91 91234 56780,karthik@example.com,11:00 AM - 12:30 PM,Data Analytics & AI,2026-10-10,Weekdays,Online,50,PPSTrainer,Active participant,No`;

    downloadCSV('pps_class_schedule_template.csv', csvContent);
  };

  // --- CSV FILE UPLOAD & PARSER ---
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setCsvError('The selected file is empty.');
          return;
        }

        const rows = parseCSVText(text);
        if (rows.length < 2) {
          setCsvError('CSV file must have a header row and at least one data row.');
          return;
        }

        const header = rows[0].map(h => h.toLowerCase().trim());
        const getIdx = (keys: string[]) => header.findIndex(h => keys.some(k => h.includes(k)));

        const nameIdx = getIdx(['name', 'student']);
        const phoneIdx = getIdx(['phone', 'contact', 'mobile']);
        const emailIdx = getIdx(['email', 'mail']);
        const timingIdx = getIdx(['timing', 'time', 'slot']);
        const courseIdx = getIdx(['course', 'subject']);
        const dojIdx = getIdx(['doj', 'joining', 'date']);
        const modeIdx = getIdx(['mode']);
        const typeIdx = getIdx(['type']);
        const pctIdx = getIdx(['completion', 'percentage', 'percent', '%']);
        const trainerIdx = getIdx(['trainer']);
        const remarkIdx = getIdx(['remark', 'note']);
        const irregIdx = getIdx(['irregular']);

        if (nameIdx === -1 || phoneIdx === -1) {
          setCsvError('CSV headers must include at least "Name" and "Phone" (or Contact) columns.');
          return;
        }

        const parsed: Student[] = [];
        const existingPhones = new Set(ongoingStudents.map(s => s.phone));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[nameIdx]) continue;

          const name = row[nameIdx]?.trim();
          const phone = row[phoneIdx]?.trim() || '';
          if (!name || !phone) continue;

          const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
          const timing = timingIdx !== -1 && row[timingIdx] ? row[timingIdx].trim() : '09:00 AM - 10:30 AM';
          const course = courseIdx !== -1 && row[courseIdx] ? row[courseIdx].trim() : 'Software Development';
          const doj = dojIdx !== -1 && row[dojIdx] ? row[dojIdx].trim() : new Date().toISOString().split('T')[0];
          
          const rawMode = modeIdx !== -1 && row[modeIdx] ? row[modeIdx].trim().toLowerCase() : '';
          const mode: ClassMode = rawMode.includes('weekend') ? 'Weekend' : 'Weekdays';

          const rawType = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].trim().toLowerCase() : '';
          const type: ClassType = rawType.includes('offline') ? 'Offline' : 'Online';

          const rawPct = pctIdx !== -1 && row[pctIdx] ? parseInt(row[pctIdx].replace('%', '').trim(), 10) : 0;
          const completionPercentage = isNaN(rawPct) ? 0 : Math.min(100, Math.max(0, rawPct));

          const trainerName = trainerIdx !== -1 && row[trainerIdx] ? row[trainerIdx].trim() : 'PPSTrainer';
          const remark = remarkIdx !== -1 && row[remarkIdx] ? row[remarkIdx].trim() : 'Imported via CSV';

          const rawIrreg = irregIdx !== -1 && row[irregIdx] ? row[irregIdx].trim().toLowerCase() : '';
          const isIrregular = rawIrreg === 'yes' || rawIrreg === 'true' || rawIrreg === 'irregular';

          parsed.push({
            id: `std-csv-${Date.now()}-${i}`,
            sno: ongoingStudents.length + parsed.length + 1,
            name,
            phone,
            email,
            timing,
            course,
            doj,
            mode,
            type,
            completionPercentage,
            status: completionPercentage >= 100 ? 'Completed' : 'Ongoing',
            trainerName,
            remark,
            isIrregular,
            lastActiveDate: new Date().toISOString().split('T')[0]
          });
        }

        if (parsed.length === 0) {
          setCsvError('No valid student rows could be parsed. Please check the CSV format.');
          return;
        }

        setCsvPreviewRows(parsed);
        setIsCSVModalOpen(true);
      } catch (err: any) {
        setCsvError(`Failed to parse CSV file: ${err?.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can pick the same file again if needed
    e.target.value = '';
  };

  const handleConfirmCSVImport = async () => {
    if (csvPreviewRows.length === 0) return;
    if (onBulkSaveStudents) {
      await onBulkSaveStudents(csvPreviewRows);
    } else {
      for (const st of csvPreviewRows) {
        onSaveStudent(st);
      }
    }
    setIsCSVModalOpen(false);
    setCsvPreviewRows([]);
  };

  // --- UPCOMING CLASSES CALCULATION ---
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const timedClasses = useMemo(() => {
    return ongoingStudents.map(student => {
      const range = parseClassRange(student.timing);
      if (!range) {
        return {
          student,
          startMin: 540, // default 9:00 AM
          endMin: 630,
          status: 'upcoming' as const,
          label: 'Today',
          diff: 999
        };
      }

      const { startMin, endMin } = range;
      if (currentMinutes >= startMin && currentMinutes <= endMin) {
        return {
          student,
          startMin,
          endMin,
          status: 'in_progress' as const,
          label: 'In Progress Now',
          diff: 0
        };
      } else if (startMin > currentMinutes) {
        const diff = startMin - currentMinutes;
        const label = diff <= 60 ? `Starts in ${diff}m` : `Starts at ${student.timing.split(/[-–]/)[0]?.trim() || student.timing}`;
        return {
          student,
          startMin,
          endMin,
          status: (diff <= 60 ? 'starting_soon' : 'upcoming') as 'starting_soon' | 'upcoming',
          label,
          diff
        };
      } else {
        return {
          student,
          startMin,
          endMin,
          status: 'completed_today' as const,
          label: 'Ended earlier today',
          diff: 9999 + (currentMinutes - endMin)
        };
      }
    }).sort((a, b) => {
      // Prioritize in_progress, then starting_soon, then upcoming, then completed_today
      const priority = { in_progress: 1, starting_soon: 2, upcoming: 3, completed_today: 4 };
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return a.startMin - b.startMin;
    });
  }, [ongoingStudents, currentMinutes]);

  const nextUpcoming = timedClasses.find(c => c.status === 'in_progress' || c.status === 'starting_soon' || c.status === 'upcoming');

  // Filter table
  const filteredStudents = ongoingStudents.filter(std => {
    const matchesSearch =
      std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      std.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      std.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      std.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      std.timing.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode = modeFilter === 'ALL' || std.mode === modeFilter;
    const matchesType = typeFilter === 'ALL' || std.type === typeFilter;

    return matchesSearch && matchesMode && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">
              Batch Operations & Schedule
            </div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">
              Class Schedule & Ongoing Batches
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Maintain and directly edit student details, timings, progress, import CSV batches, and track upcoming sessions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Template Button */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              title="Download CSV Template with sample format"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download Template</span>
            </button>

            {/* Upload CSV Button */}
            <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVFileChange}
                className="hidden"
              />
            </label>

            {/* Add New Student */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Student</span>
            </button>

            {/* Irregular Students Link */}
            <button
              onClick={onNavigateToIrregular}
              className="px-3.5 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Irregular Students &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV Parsing Error Banner */}
      {csvError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{csvError}</span>
          </div>
          <button
            onClick={() => setCsvError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold ml-3"
          >
            &times;
          </button>
        </div>
      )}

      {/* ⏰ UPCOMING CLASS BASED ON TIME REMINDER CARD */}
      <div className="bg-gradient-to-r from-[#17253b] via-[#1e344f] to-[#122033] rounded-xl text-white p-5 shadow-lg border border-slate-700/60 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Clock className="w-3.5 h-3.5" />
                Live Schedule Reminder
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Current Time:{' '}
                <strong className="text-white">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </span>
            </div>

            {nextUpcoming ? (
              <div>
                <div className="text-lg sm:text-xl font-bold flex items-center gap-2 flex-wrap text-white">
                  <span>{nextUpcoming.student.name}</span>
                  <span className="text-blue-300 text-sm font-normal">({nextUpcoming.student.course})</span>
                  {nextUpcoming.status === 'in_progress' && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      CLASS IN PROGRESS NOW
                    </span>
                  )}
                  {nextUpcoming.status === 'starting_soon' && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-900 font-bold">
                      <Clock className="w-3 h-3" />
                      {nextUpcoming.label}
                    </span>
                  )}
                  {nextUpcoming.status === 'upcoming' && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-400/40 font-semibold">
                      {nextUpcoming.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <strong>Timing:</strong> {nextUpcoming.student.timing}
                  </span>
                  <span>•</span>
                  <span><strong>Mode:</strong> {nextUpcoming.student.mode} ({nextUpcoming.student.type})</span>
                  <span>•</span>
                  <span><strong>Phone:</strong> {nextUpcoming.student.phone}</span>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-semibold text-white">No upcoming sessions right now</h3>
                <p className="text-xs text-slate-400">
                  {ongoingStudents.length === 0
                    ? 'No students enrolled yet. Add students or upload your CSV schedule to activate time tracking.'
                    : 'All scheduled classes for today have been completed or timing has passed.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {classLink?.url && (
              <a
                href={classLink.url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch Active Class Link</span>
              </a>
            )}
            {onOpenClassLinkModal && (
              <button
                type="button"
                onClick={onOpenClassLinkModal}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Update Meeting Link</span>
              </button>
            )}
          </div>
        </div>

        {/* Chronological Mini Cards Carousel of all ongoing classes */}
        {timedClasses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>All Ongoing Classes Ordered by Time ({timedClasses.length})</span>
              <span className="text-[10px] text-slate-500">Sorted chronologically</span>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-600">
              {timedClasses.map(({ student, status, label }) => (
                <div
                  key={student.id}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs border min-w-[210px] transition-all ${
                    status === 'in_progress'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md'
                      : status === 'starting_soon'
                      ? 'bg-amber-950/70 border-amber-500/80 text-amber-100'
                      : status === 'upcoming'
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate max-w-[120px]">{student.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        status === 'in_progress'
                          ? 'bg-emerald-500 text-white'
                          : status === 'starting_soon'
                          ? 'bg-amber-500 text-slate-900'
                          : status === 'upcoming'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {status === 'in_progress' ? 'LIVE NOW' : label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>{student.timing}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {student.course} • {student.mode}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Search Schedule
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search name, course, contact, timing..."
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Batch Mode</label>
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            >
              <option value="ALL">All Modes (Weekdays & Weekend)</option>
              <option value="Weekdays">Weekdays</option>
              <option value="Weekend">Weekend</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Class Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            >
              <option value="ALL">All Types (Online & Offline)</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table: Fully Editable Ongoing Student Schedule */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#d9e0e7] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-xs text-slate-700">Ongoing Students Schedule</span>
            <span className="text-xs bg-[#eaf3fc] text-[#0a6ed1] font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {filteredStudents.length} Students
            </span>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            Click 'Edit Row' to modify any column directly inline, or use the Edit dialog
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f0f4f8] text-[#475569] font-semibold border-b border-[#d9e0e7]">
                <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                <th className="py-2.5 px-3 min-w-[140px]">Student Name</th>
                <th className="py-2.5 px-3 min-w-[120px]">Contact No</th>
                <th className="py-2.5 px-3 min-w-[150px]">Class Timing</th>
                <th className="py-2.5 px-3 min-w-[150px]">Course</th>
                <th className="py-2.5 px-3 min-w-[100px]">DOJ</th>
                <th className="py-2.5 px-3 w-28">Mode</th>
                <th className="py-2.5 px-3 w-24">Type</th>
                <th className="py-2.5 px-3 min-w-[140px]">Completion %</th>
                <th className="py-2.5 px-3 min-w-[110px]">Trainer Name</th>
                <th className="py-2.5 px-3 min-w-[130px]">Remark</th>
                <th className="py-2.5 px-3 w-28">Status</th>
                <th className="py-2.5 px-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-slate-500">
                    <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium">No students found matching current filters</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Add a new student or upload a CSV file with your student details to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const isEditingInline = inlineEditRowId === student.id;

                  if (isEditingInline) {
                    return (
                      <tr key={student.id} className="bg-amber-50/70 border-2 border-amber-300">
                        {/* S.No */}
                        <td className="py-2 px-3 text-center font-bold text-slate-700">
                          {student.sno || idx + 1}
                        </td>
                        {/* Name */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.name ?? ''}
                            onChange={e =>
                              setInlineFormData({ ...inlineFormData, name: e.target.value })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-semibold"
                          />
                        </td>
                        {/* Contact */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.phone ?? ''}
                            onChange={e =>
                              setInlineFormData({ ...inlineFormData, phone: e.target.value })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                          />
                        </td>
                        {/* Timing */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.timing ?? ''}
                            onChange={e =>
                              setInlineFormData({ ...inlineFormData, timing: e.target.value })
                            }
                            placeholder="e.g. 09:00 AM - 10:30 AM"
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-mono"
                          />
                        </td>
                        {/* Course */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.course ?? ''}
                            onChange={e =>
                              setInlineFormData({ ...inlineFormData, course: e.target.value })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                          />
                        </td>
                        {/* DOJ */}
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={inlineFormData.doj ?? ''}
                            onChange={e =>
                              setInlineFormData({ ...inlineFormData, doj: e.target.value })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                          />
                        </td>
                        {/* Mode */}
                        <td className="py-2 px-2">
                          <select
                            value={inlineFormData.mode ?? 'Weekdays'}
                            onChange={e =>
                              setInlineFormData({
                                ...inlineFormData,
                                mode: e.target.value as ClassMode
                              })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                          >
                            <option value="Weekdays">Weekdays</option>
                            <option value="Weekend">Weekend</option>
                          </select>
                        </td>
                        {/* Type */}
                        <td className="py-2 px-2">
                          <select
                            value={inlineFormData.type ?? 'Online'}
                            onChange={e =>
                              setInlineFormData({
                                ...inlineFormData,
                                type: e.target.value as ClassType
                              })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                          >
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                          </select>
                        </td>
                        {/* Completion % */}
                        <td className="py-2 px-2">
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={inlineFormData.completionPercentage ?? 0}
                              onChange={e =>
                                setInlineFormData({
                                  ...inlineFormData,
                                  completionPercentage: parseInt(e.target.value, 10) || 0
                                })
                              }
                              className="w-16 text-xs p-1.5 bg-white border border-slate-300 rounded font-bold"
                            />
                            <span className="text-slate-500 text-[11px]">%</span>
                          </div>
                        </td>
                        {/* Trainer Name */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.trainerName ?? ''}
                            onChange={e =>
                              setInlineFormData({
                                ...inlineFormData,
                                trainerName: e.target.value
                              })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                          />
                        </td>
                        {/* Remark */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.remark ?? ''}
                            onChange={e =>
                              setInlineFormData({ ...inlineFormData, remark: e.target.value })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                          />
                        </td>
                        {/* Status (Regular/Irregular) */}
                        <td className="py-2 px-2">
                          <select
                            value={inlineFormData.isIrregular ? 'Irregular' : 'Regular'}
                            onChange={e =>
                              setInlineFormData({
                                ...inlineFormData,
                                isIrregular: e.target.value === 'Irregular'
                              })
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-medium"
                          >
                            <option value="Regular">Regular</option>
                            <option value="Irregular">Irregular</option>
                          </select>
                        </td>
                        {/* Actions: Save / Cancel */}
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => saveInlineEdit(student.id)}
                              title="Save inline changes"
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer shadow-xs"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              title="Cancel"
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#f8fafc] transition-colors group"
                    >
                      {/* S.No */}
                      <td className="py-3 px-3 text-center text-slate-600 font-mono">
                        {student.sno || idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3 font-semibold text-[#1e293b]">
                        <div>{student.name}</div>
                        {student.email && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {student.email}
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3 text-slate-700 font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {student.phone}
                        </span>
                      </td>

                      {/* Timing */}
                      <td className="py-3 px-3 text-slate-800 font-medium">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-mono border border-slate-200">
                          <Clock className="w-3 h-3 mr-1 text-[#0a6ed1]" />
                          {student.timing || '09:00 AM - 10:30 AM'}
                        </span>
                      </td>

                      {/* Course */}
                      <td className="py-3 px-3 text-slate-800 font-medium">
                        {student.course}
                      </td>

                      {/* DOJ */}
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {student.doj}
                      </td>

                      {/* Mode */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            student.mode === 'Weekdays'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {student.mode}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            student.type === 'Online'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {student.type}
                        </span>
                      </td>

                      {/* Completion % with Quick delta and Progress Bar */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800">
                              {student.completionPercentage}%
                            </span>
                            {student.completionPercentage === 100 && (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                                <CheckCircle className="w-3 h-3 mr-0.5" />
                                Done
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                student.completionPercentage === 100
                                  ? 'bg-emerald-500'
                                  : student.completionPercentage >= 75
                                  ? 'bg-blue-600'
                                  : student.completionPercentage >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${student.completionPercentage}%` }}
                            />
                          </div>
                          {student.doe && (
                            <div className="text-[10px] text-emerald-700 font-mono">
                              DOE: {student.doe}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Trainer Name */}
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {student.trainerName}
                      </td>

                      {/* Remark */}
                      <td className="py-3 px-3 text-slate-600 text-[11px] max-w-[150px] truncate" title={student.remark}>
                        {student.remark || '—'}
                      </td>

                      {/* Regular / Irregular Dropdown */}
                      <td className="py-3 px-3">
                        <select
                          value={student.isIrregular ? 'Irregular' : 'Regular'}
                          onChange={e => handleRegularityDropdown(student, e.target.value)}
                          className={`text-xs px-2 py-1 rounded font-semibold border transition-all cursor-pointer ${
                            student.isIrregular
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          <option value="Regular">Regular</option>
                          <option value="Irregular">Irregular</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => startInlineEdit(student)}
                            title="Quick Inline Edit"
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-[#0a6ed1] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${student.name}?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            title="Delete Student"
                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD NEW STUDENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#d9e0e7] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-[#0a6ed1]" />
                <h3 className="text-base font-bold text-[#1d2d3e]">Add New Student to Schedule</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewStudentSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.name}
                    onChange={e => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    placeholder="e.g. Anand Kumar"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Contact / Mobile No *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newStudentForm.phone}
                    onChange={e => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                    placeholder="e.g. +91 98450 12345"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newStudentForm.email}
                    onChange={e => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    placeholder="anand@example.com"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.course}
                    onChange={e => setNewStudentForm({ ...newStudentForm, course: e.target.value })}
                    placeholder="e.g. Full Stack Web Development"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Class Timing *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.timing}
                    onChange={e => setNewStudentForm({ ...newStudentForm, timing: e.target.value })}
                    placeholder="09:00 AM - 10:30 AM"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Batch Mode
                  </label>
                  <select
                    value={newStudentForm.mode}
                    onChange={e =>
                      setNewStudentForm({
                        ...newStudentForm,
                        mode: e.target.value as ClassMode
                      })
                    }
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  >
                    <option value="Weekdays">Weekdays</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Class Type
                  </label>
                  <select
                    value={newStudentForm.type}
                    onChange={e =>
                      setNewStudentForm({
                        ...newStudentForm,
                        type: e.target.value as ClassType
                      })
                    }
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Date of Joining (DOJ)
                  </label>
                  <input
                    type="date"
                    value={newStudentForm.doj}
                    onChange={e => setNewStudentForm({ ...newStudentForm, doj: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Completion %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newStudentForm.completionPercentage}
                    onChange={e =>
                      setNewStudentForm({
                        ...newStudentForm,
                        completionPercentage: parseInt(e.target.value, 10) || 0
                      })
                    }
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Trainer Name
                  </label>
                  <input
                    type="text"
                    value={newStudentForm.trainerName}
                    onChange={e =>
                      setNewStudentForm({ ...newStudentForm, trainerName: e.target.value })
                    }
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Trainer Remark
                </label>
                <textarea
                  rows={2}
                  value={newStudentForm.remark}
                  onChange={e => setNewStudentForm({ ...newStudentForm, remark: e.target.value })}
                  placeholder="Additional student notes..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CSV IMPORT PREVIEW */}
      {isCSVModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#d9e0e7] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1d2d3e]">Confirm CSV Student Import</h3>
                  <p className="text-xs text-slate-500">
                    Preview parsed student rows before committing to database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCSVModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">
                    Found {csvPreviewRows.length} valid student record{csvPreviewRows.length > 1 ? 's' : ''} in your file.
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700">All columns mapped successfully</span>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Timing</th>
                      <th className="p-2">Course</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Progress</th>
                      <th className="p-2">Trainer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {csvPreviewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-2 font-semibold text-slate-900">{r.name}</td>
                        <td className="p-2 font-mono text-slate-600">{r.phone}</td>
                        <td className="p-2 font-mono text-slate-700">{r.timing}</td>
                        <td className="p-2 text-slate-800">{r.course}</td>
                        <td className="p-2">{r.mode}</td>
                        <td className="p-2">{r.type}</td>
                        <td className="p-2 font-bold text-slate-800">{r.completionPercentage}%</td>
                        <td className="p-2 text-slate-600">{r.trainerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {csvPreviewRows.length} total students will be added to the schedule.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCSVModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCSVImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Import {csvPreviewRows.length} Students Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 100% COMPLETION -> PROMPT DATE OF ENDING (DOE) */}
      {completionPromptStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-600">
              <CheckCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">100% Course Completion Achieved!</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>{completionPromptStudent.name}</strong> has reached 100% completion in{' '}
              <strong>{completionPromptStudent.course}</strong>. Please confirm the{' '}
              <strong>Date of Ending (DOE)</strong> to finalize their completion transcript:
            </p>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Date of Ending (DOE) *
              </label>
              <input
                type="date"
                required
                value={inputDOE}
                onChange={e => setInputDOE(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCompletionPromptStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletionWithDOE}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Mark Completed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IRREGULAR REASON PROMPT */}
      {irregularPromptStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Move to Irregular Students Page</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Moving <strong>{irregularPromptStudent.name}</strong> will take them off the daily
              ongoing schedule and place them in the <strong>Irregular Students Directory</strong>.
            </p>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Reason for Irregular Status *
              </label>
              <textarea
                rows={3}
                required
                value={irregularReasonInput}
                onChange={e => setIrregularReasonInput(e.target.value)}
                placeholder="e.g. Absent for 4 consecutive sessions, awaiting response..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIrregularPromptStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmIrregularMove}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Move</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
