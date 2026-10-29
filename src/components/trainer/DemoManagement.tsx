import React, { useState, useRef } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Plus,
  Phone,
  Mail,
  X,
  Sparkles,
  Calendar,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Check
} from 'lucide-react';
import { DemoStudent, DemoStatus, ClassType } from '../../types';
import { downloadCSV, parseCSVText } from '../../utils/csvHelper';

interface DemoManagementProps {
  demos: DemoStudent[];
  onSaveDemo: (demo: DemoStudent) => void;
  onBulkSaveDemos?: (demos: DemoStudent[]) => Promise<void> | void;
  onDeleteDemo: (id: string) => void;
  onConvertDemoToOngoing: (
    demoId: string,
    batchData: {
      doj: string;
      timing: string;
      mode: 'Weekdays' | 'Weekend';
      type: 'Online' | 'Offline';
      remark?: string;
    }
  ) => void;
}

export const DemoManagement: React.FC<DemoManagementProps> = ({
  demos,
  onSaveDemo,
  onBulkSaveDemos,
  onDeleteDemo,
  onConvertDemoToOngoing
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDemo, setEditingDemo] = useState<DemoStudent | null>(null);

  // Convert to Ongoing Batch Modal state
  const [convertTargetDemo, setConvertTargetDemo] = useState<DemoStudent | null>(null);
  const [convertBatchData, setConvertBatchData] = useState({
    doj: new Date().toISOString().split('T')[0],
    timing: '09:00 AM - 10:30 AM',
    mode: 'Weekdays' as 'Weekdays' | 'Weekend',
    type: 'Online' as 'Online' | 'Offline',
    remark: ''
  });

  // CSV Upload state
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<DemoStudent[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Add / Edit Demo
  const [formData, setFormData] = useState<Partial<DemoStudent>>({
    name: '',
    phone: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    course: '',
    exp: 'Fresher',
    mode: 'Online',
    feedback: '',
    status: 'Pending',
    trainerName: 'PPSTrainer'
  });

  const openAddModal = () => {
    setEditingDemo(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      course: '',
      exp: 'Fresher',
      mode: 'Online',
      feedback: '',
      status: 'Pending',
      trainerName: 'PPSTrainer'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (demo: DemoStudent) => {
    setEditingDemo(demo);
    setFormData({ ...demo });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.course) {
      alert('Please fill out student name, phone, and course.');
      return;
    }

    const demoToSave: DemoStudent = {
      id: editingDemo ? editingDemo.id : `demo-${Date.now()}`,
      sno: editingDemo ? editingDemo.sno : demos.length + 1,
      name: formData.name!,
      phone: formData.phone!,
      email: formData.email || '',
      date: formData.date || new Date().toISOString().split('T')[0],
      time: formData.time || '10:00 AM',
      course: formData.course!,
      exp: formData.exp || 'Fresher',
      mode: formData.mode || 'Online',
      feedback: formData.feedback || '',
      status: (formData.status as DemoStatus) || 'Pending',
      trainerName: formData.trainerName || 'PPSTrainer',
      createdAt: editingDemo ? editingDemo.createdAt : new Date().toISOString()
    };

    onSaveDemo(demoToSave);
    setIsModalOpen(false);
  };

  const openConvertModal = (demo: DemoStudent) => {
    setConvertTargetDemo(demo);
    setConvertBatchData({
      doj: new Date().toISOString().split('T')[0],
      timing: '09:00 AM - 10:30 AM',
      mode: 'Weekdays',
      type: demo.mode,
      remark: `Enrolled after demo on ${demo.date}. ${demo.feedback}`
    });
  };

  const handleConfirmConvert = () => {
    if (!convertTargetDemo) return;
    onConvertDemoToOngoing(convertTargetDemo.id, convertBatchData);
    setConvertTargetDemo(null);
  };

  // --- CSV TEMPLATE DOWNLOAD ---
  const handleDownloadTemplate = () => {
    const csvContent =
`Name,Phone,Email,Date,Time,Course,Experience,Mode,TrainerName,Feedback,Status
Rahul Verma,+91 91234 56789,rahul.v@example.com,2026-10-30,11:00 AM,Data Analytics with Python,Fresher,Online,PPSTrainer,Interested in weekend batch,Pending
Ananya Patel,+91 98761 23456,ananya.p@example.com,2026-10-31,04:00 PM,Cloud & DevOps,2 Years,Offline,PPSTrainer,Satisfied with syllabus,Converted
Suresh Kumar,+91 98450 99887,suresh@example.com,2026-11-02,06:00 PM,Full Stack Java,Fresher,Online,PPSTrainer,Needs evening timing,Pending`;

    downloadCSV('pps_demo_students_template.csv', csvContent);
  };

  // --- CSV UPLOAD & PARSE ---
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setCsvError('The selected CSV file is empty.');
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
        const dateIdx = getIdx(['date', 'demo date']);
        const timeIdx = getIdx(['time', 'slot']);
        const courseIdx = getIdx(['course', 'subject']);
        const expIdx = getIdx(['exp', 'experience']);
        const modeIdx = getIdx(['mode', 'type']);
        const trainerIdx = getIdx(['trainer']);
        const feedbackIdx = getIdx(['feedback', 'remark', 'comment']);
        const statusIdx = getIdx(['status']);

        if (nameIdx === -1 || phoneIdx === -1) {
          setCsvError('CSV headers must include at least "Name" and "Phone" (or Contact) columns.');
          return;
        }

        const parsed: DemoStudent[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[nameIdx]) continue;

          const name = row[nameIdx]?.trim();
          const phone = row[phoneIdx]?.trim() || '';
          if (!name || !phone) continue;

          const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
          const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].trim() : new Date().toISOString().split('T')[0];
          const time = timeIdx !== -1 && row[timeIdx] ? row[timeIdx].trim() : '10:00 AM';
          const course = courseIdx !== -1 && row[courseIdx] ? row[courseIdx].trim() : 'General Demo';
          const exp = expIdx !== -1 && row[expIdx] ? row[expIdx].trim() : 'Fresher';

          const rawMode = modeIdx !== -1 && row[modeIdx] ? row[modeIdx].trim().toLowerCase() : '';
          const mode: ClassType = rawMode.includes('offline') ? 'Offline' : 'Online';

          const trainerName = trainerIdx !== -1 && row[trainerIdx] ? row[trainerIdx].trim() : 'PPSTrainer';
          const feedback = feedbackIdx !== -1 && row[feedbackIdx] ? row[feedbackIdx].trim() : 'Imported via CSV';

          const rawStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim().toLowerCase() : '';
          let status: DemoStatus = 'Pending';
          if (rawStatus.includes('converted') && !rawStatus.includes('not')) {
            status = 'Converted';
          } else if (rawStatus.includes('not converted')) {
            status = 'Not Converted';
          }

          parsed.push({
            id: `demo-csv-${Date.now()}-${i}`,
            sno: demos.length + parsed.length + 1,
            name,
            phone,
            email,
            date,
            time,
            course,
            exp,
            mode,
            feedback,
            status,
            trainerName,
            createdAt: new Date().toISOString()
          });
        }

        if (parsed.length === 0) {
          setCsvError('No valid demo candidate rows could be parsed from the file.');
          return;
        }

        setCsvPreviewRows(parsed);
        setIsCSVModalOpen(true);
      } catch (err: any) {
        setCsvError(`Failed to parse CSV file: ${err?.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmCSVImport = async () => {
    if (csvPreviewRows.length === 0) return;
    if (onBulkSaveDemos) {
      await onBulkSaveDemos(csvPreviewRows);
    } else {
      for (const dm of csvPreviewRows) {
        onSaveDemo(dm);
      }
    }
    setIsCSVModalOpen(false);
    setCsvPreviewRows([]);
  };

  // Filtered Demo list
  const filteredDemos = demos.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.feedback.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || d.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesMode =
      modeFilter === 'ALL' || d.mode.toLowerCase() === modeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesMode;
  });

  const getDemoStatusBadge = (status: DemoStatus) => {
    switch (status) {
      case 'Converted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Converted
          </span>
        );
      case 'Not Converted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
            Not Converted
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            Pending Trial
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">
              Lead Pipeline & Admissions
            </div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Demo Management</h1>
            <p className="text-xs text-slate-500 mt-1">
              Log, schedule, review feedback, import CSV batches, and convert trial demo attendees into ongoing batches
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Template Button */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              title="Download Demo CSV Template"
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

            {/* Schedule New Demo */}
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Demo</span>
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

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Demos
          </div>
          <div className="text-2xl font-bold text-[#1d2d3e] mt-1">{demos.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Trial registrations</div>
        </div>
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Converted to Batch
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {demos.filter(d => d.status === 'Converted').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Enrolled in ongoing schedule</div>
        </div>
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Pending Trial / Decision
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {demos.filter(d => d.status === 'Pending').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Follow-up needed</div>
        </div>
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
            Not Converted
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">
            {demos.filter(d => d.status === 'Not Converted').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Did not enroll</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Search Demos
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, course, feedback..."
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending Trial</option>
              <option value="Converted">Converted</option>
              <option value="Not Converted">Not Converted</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mode</label>
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            >
              <option value="ALL">All Modes (Online & Offline)</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Demos Table */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#d9e0e7] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-xs text-slate-700">Demo Candidates List</span>
            <span className="text-xs bg-[#eaf3fc] text-[#0a6ed1] font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {filteredDemos.length} Records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f0f4f8] text-[#475569] font-semibold border-b border-[#d9e0e7]">
                <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                <th className="py-2.5 px-3 min-w-[140px]">Student Name</th>
                <th className="py-2.5 px-3 min-w-[120px]">Contact</th>
                <th className="py-2.5 px-3 min-w-[100px]">Demo Date</th>
                <th className="py-2.5 px-3 min-w-[90px]">Time</th>
                <th className="py-2.5 px-3 min-w-[150px]">Course</th>
                <th className="py-2.5 px-3 w-24">Experience</th>
                <th className="py-2.5 px-3 w-20">Mode</th>
                <th className="py-2.5 px-3 min-w-[150px]">Feedback / Notes</th>
                <th className="py-2.5 px-3 min-w-[110px]">Trainer</th>
                <th className="py-2.5 px-3 w-32">Status</th>
                <th className="py-2.5 px-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredDemos.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-500">
                    <UserPlus className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium">No demo candidates found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Schedule a new demo candidate or upload a CSV file with your leads.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDemos.map((demo, idx) => (
                  <tr key={demo.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="py-3 px-3 text-center text-slate-600 font-mono">
                      {demo.sno || idx + 1}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#1e293b]">
                      <div>{demo.name}</div>
                      {demo.email && (
                        <div className="text-[10px] text-slate-400 font-normal">{demo.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {demo.phone}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                      {demo.date}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                      {demo.time}
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-medium">{demo.course}</td>
                    <td className="py-3 px-3 text-slate-600">{demo.exp}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          demo.mode === 'Online'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {demo.mode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px] max-w-[160px] truncate" title={demo.feedback}>
                      {demo.feedback || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{demo.trainerName}</td>
                    <td className="py-3 px-3">{getDemoStatusBadge(demo.status)}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {demo.status !== 'Converted' && (
                          <button
                            onClick={() => openConvertModal(demo)}
                            title="Convert into Ongoing Batch"
                            className="p-1 hover:bg-emerald-50 rounded text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(demo)}
                          title="Edit Demo Details"
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-[#0a6ed1] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete demo record for ${demo.name}?`)) {
                              onDeleteDemo(demo.id);
                            }
                          }}
                          title="Delete Demo"
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT DEMO CANDIDATE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#d9e0e7] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-[#0a6ed1]" />
                <h3 className="text-base font-bold text-[#1d2d3e]">
                  {editingDemo ? 'Edit Demo Candidate' : 'Schedule New Demo Candidate'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98450 12345"
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
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="priya@example.com"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Course Desired *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.course}
                    onChange={e => setFormData({ ...formData, course: e.target.value })}
                    placeholder="e.g. SAP FICO / Python Full Stack"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Demo Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Demo Time
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    placeholder="10:00 AM"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Prior Experience
                  </label>
                  <select
                    value={formData.exp}
                    onChange={e => setFormData({ ...formData, exp: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="1-2 Years">1-2 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Mode
                  </label>
                  <select
                    value={formData.mode}
                    onChange={e => setFormData({ ...formData, mode: e.target.value as ClassType })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Pipeline Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as DemoStatus })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  >
                    <option value="Pending">Pending Trial</option>
                    <option value="Converted">Converted</option>
                    <option value="Not Converted">Not Converted</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Trainer Name
                  </label>
                  <input
                    type="text"
                    value={formData.trainerName}
                    onChange={e => setFormData({ ...formData, trainerName: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Feedback & Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.feedback}
                  onChange={e => setFormData({ ...formData, feedback: e.target.value })}
                  placeholder="Student interest, requirements, doubts, expected start..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingDemo ? 'Save Changes' : 'Create Demo'}</span>
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
                  <h3 className="text-base font-bold text-[#1d2d3e]">Confirm CSV Demo Import</h3>
                  <p className="text-xs text-slate-500">
                    Preview parsed demo candidates before committing to database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCSVModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">
                    Found {csvPreviewRows.length} valid demo candidate record{csvPreviewRows.length > 1 ? 's' : ''} in your file.
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700">Ready to save</span>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Demo Date</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Course</th>
                      <th className="p-2">Experience</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {csvPreviewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-2 font-semibold text-slate-900">{r.name}</td>
                        <td className="p-2 font-mono text-slate-600">{r.phone}</td>
                        <td className="p-2 font-mono text-slate-700">{r.date}</td>
                        <td className="p-2 font-mono text-slate-700">{r.time}</td>
                        <td className="p-2 text-slate-800">{r.course}</td>
                        <td className="p-2">{r.exp}</td>
                        <td className="p-2">{r.mode}</td>
                        <td className="p-2">{getDemoStatusBadge(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {csvPreviewRows.length} total demo candidates will be imported.
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
                  <span>Import {csvPreviewRows.length} Demo Records</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVERT DEMO TO ONGOING BATCH */}
      {convertTargetDemo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                Enroll Demo Attendee into Ongoing Batch
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enrolling <strong>{convertTargetDemo.name}</strong> into regular ongoing schedule for{' '}
              <strong>{convertTargetDemo.course}</strong>:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Date of Joining (DOJ) *
                </label>
                <input
                  type="date"
                  value={convertBatchData.doj}
                  onChange={e =>
                    setConvertBatchData({ ...convertBatchData, doj: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Class Timing Slot *
                </label>
                <input
                  type="text"
                  value={convertBatchData.timing}
                  onChange={e =>
                    setConvertBatchData({ ...convertBatchData, timing: e.target.value })
                  }
                  placeholder="09:00 AM - 10:30 AM"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Batch Mode
                  </label>
                  <select
                    value={convertBatchData.mode}
                    onChange={e =>
                      setConvertBatchData({
                        ...convertBatchData,
                        mode: e.target.value as 'Weekdays' | 'Weekend'
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs"
                  >
                    <option value="Weekdays">Weekdays</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Class Type
                  </label>
                  <select
                    value={convertBatchData.type}
                    onChange={e =>
                      setConvertBatchData({
                        ...convertBatchData,
                        type: e.target.value as 'Online' | 'Offline'
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Remark
                </label>
                <input
                  type="text"
                  value={convertBatchData.remark}
                  onChange={e =>
                    setConvertBatchData({ ...convertBatchData, remark: e.target.value })
                  }
                  placeholder="Notes on enrollment..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConvertTargetDemo(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Enrollment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
