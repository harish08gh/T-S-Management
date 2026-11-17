import React, { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Edit3,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Unlock,
  GraduationCap,
  Link2,
  Sliders,
  X,
  UserCheck,
  ArrowRightLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  TrainerAccount,
  Student,
  DemoStudent,
  AdminTab
} from '../../types';

interface AdminPortalProps {
  trainers: TrainerAccount[];
  students: Student[];
  demos: DemoStudent[];
  defaultTrainerPassword: string;
  onUpdateDefaultPassword: (newPw: string, syncPending: boolean) => Promise<void>;
  onSaveTrainer: (trainer: TrainerAccount) => Promise<void>;
  onDeleteTrainer: (trainerId: string) => Promise<void>;
  onResetTrainerPassword: (trainerId: string) => Promise<void>;
  onAssignStudentsToTrainer: (studentIds: string[], trainerId: string) => Promise<void>;
  onAssignDemosToTrainer: (demoIds: string[], trainerId: string) => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  trainers,
  students,
  demos,
  defaultTrainerPassword,
  onUpdateDefaultPassword,
  onSaveTrainer,
  onDeleteTrainer,
  onResetTrainerPassword,
  onAssignStudentsToTrainer,
  onAssignDemosToTrainer
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('trainers');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'default_pw'>('all');

  // Add / Edit Trainer Modal
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<TrainerAccount | null>(null);
  const [trainerForm, setTrainerForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    specialization: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Confirm Password Reset / Delete
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Student / Demo Assignment State
  const [assignmentEntity, setAssignmentEntity] = useState<'students' | 'demos'>('students');
  const [assignmentTrainerFilter, setAssignmentTrainerFilter] = useState<string>('ALL');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTargetTrainerId, setBulkTargetTrainerId] = useState<string>(
    trainers.length > 0 ? trainers[0].id : ''
  );

  // Portal Access & Default Password Edit
  const [newDefaultPwInput, setNewDefaultPwInput] = useState(defaultTrainerPassword);
  const [syncPendingWithNewDefault, setSyncPendingWithNewDefault] = useState(true);
  const [showDefaultPw, setShowDefaultPw] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const originBase = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const handleCopyText = (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Compute student/demo stats per trainer
  const getTrainerOwnershipCounts = (trainer: TrainerAccount) => {
    const matchName = (item: { trainerId?: string; trainerName?: string }) =>
      item.trainerId === trainer.id ||
      item.trainerName?.trim().toLowerCase() === trainer.name.trim().toLowerCase() ||
      item.trainerName?.trim().toLowerCase() === trainer.username.trim().toLowerCase();

    const ownedStudents = students.filter(matchName);
    const ownedDemos = demos.filter(matchName);
    return {
      totalStudents: ownedStudents.length,
      ongoing: ownedStudents.filter(s => s.status === 'Ongoing' && !s.isIrregular).length,
      irregular: ownedStudents.filter(s => s.isIrregular).length,
      completed: ownedStudents.filter(s => s.status === 'Completed').length,
      demos: ownedDemos.length
    };
  };

  const filteredTrainers = useMemo(() => {
    return trainers.filter(t => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        t.name.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.specialization || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === 'active') return t.status === 'Active';
      if (statusFilter === 'inactive') return t.status === 'Inactive';
      if (statusFilter === 'default_pw') return t.isDefaultPassword;
      return true;
    });
  }, [trainers, searchTerm, statusFilter]);

  const activeTrainersCount = trainers.filter(t => t.status === 'Active').length;
  const defaultPwPendingCount = trainers.filter(t => t.isDefaultPassword).length;

  const handleOpenAddTrainer = () => {
    setEditingTrainer(null);
    setTrainerForm({
      name: '',
      username: '',
      email: '',
      phone: '',
      specialization: '',
      status: 'Active'
    });
    setFormError(null);
    setIsTrainerModalOpen(true);
  };

  const handleOpenEditTrainer = (t: TrainerAccount) => {
    setEditingTrainer(t);
    setTrainerForm({
      name: t.name,
      username: t.username,
      email: t.email || '',
      phone: t.phone || '',
      specialization: t.specialization || '',
      status: t.status
    });
    setFormError(null);
    setIsTrainerModalOpen(true);
  };

  const handleSubmitTrainerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = trainerForm.name.trim();
    const cleanUsername = trainerForm.username.trim();
    if (!cleanName || !cleanUsername) {
      setFormError('Trainer name and username are required.');
      return;
    }

    // Check username uniqueness
    const duplicate = trainers.find(
      t => t.id !== editingTrainer?.id && t.username.trim().toLowerCase() === cleanUsername.toLowerCase()
    );
    if (duplicate) {
      setFormError(`Username "${cleanUsername}" is already assigned to ${duplicate.name}.`);
      return;
    }

    if (editingTrainer) {
      const updated: TrainerAccount = {
        ...editingTrainer,
        name: cleanName,
        username: cleanUsername,
        email: trainerForm.email.trim(),
        phone: trainerForm.phone.trim(),
        specialization: trainerForm.specialization.trim(),
        status: trainerForm.status
      };
      await onSaveTrainer(updated);
      // If trainer display name changed, sync students & demos linked by id or old name
      if (editingTrainer.name.trim() !== cleanName) {
        const matchedStudentIds = students
          .filter(
            s =>
              s.trainerId === editingTrainer.id ||
              s.trainerName.trim().toLowerCase() === editingTrainer.name.trim().toLowerCase()
          )
          .map(s => s.id);
        if (matchedStudentIds.length > 0) {
          await onAssignStudentsToTrainer(matchedStudentIds, editingTrainer.id);
        }
        const matchedDemoIds = demos
          .filter(
            d =>
              d.trainerId === editingTrainer.id ||
              d.trainerName.trim().toLowerCase() === editingTrainer.name.trim().toLowerCase()
          )
          .map(d => d.id);
        if (matchedDemoIds.length > 0) {
          await onAssignDemosToTrainer(matchedDemoIds, editingTrainer.id);
        }
      }
    } else {
      const newTrainer: TrainerAccount = {
        id: `trainer-${Date.now()}`,
        name: cleanName,
        username: cleanUsername,
        email: trainerForm.email.trim(),
        phone: trainerForm.phone.trim(),
        specialization: trainerForm.specialization.trim(),
        password: defaultTrainerPassword,
        isDefaultPassword: true,
        status: trainerForm.status,
        createdAt: new Date().toISOString()
      };
      await onSaveTrainer(newTrainer);
    }

    setIsTrainerModalOpen(false);
  };

  const handleToggleTrainerStatus = async (trainer: TrainerAccount) => {
    await onSaveTrainer({
      ...trainer,
      status: trainer.status === 'Active' ? 'Inactive' : 'Active'
    });
  };

  // Helper to resolve which trainer owns a record
  const resolveRecordTrainer = (item: { trainerId?: string; trainerName?: string }) => {
    return trainers.find(
      t =>
        (item.trainerId && t.id === item.trainerId) ||
        t.name.trim().toLowerCase() === (item.trainerName || '').trim().toLowerCase() ||
        t.username.trim().toLowerCase() === (item.trainerName || '').trim().toLowerCase()
    );
  };

  const filteredAssignmentRows = useMemo(() => {
    const q = assignmentSearch.toLowerCase();
    if (assignmentEntity === 'students') {
      return students.filter(s => {
        const owner = resolveRecordTrainer(s);
        const matchesTrainer =
          assignmentTrainerFilter === 'ALL'
            ? true
            : assignmentTrainerFilter === 'UNASSIGNED'
            ? !owner
            : owner?.id === assignmentTrainerFilter;
        const matchesQuery =
          s.name.toLowerCase().includes(q) ||
          s.course.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          (s.trainerName || '').toLowerCase().includes(q);
        return matchesTrainer && matchesQuery;
      });
    } else {
      return demos.filter(d => {
        const owner = resolveRecordTrainer(d);
        const matchesTrainer =
          assignmentTrainerFilter === 'ALL'
            ? true
            : assignmentTrainerFilter === 'UNASSIGNED'
            ? !owner
            : owner?.id === assignmentTrainerFilter;
        const matchesQuery =
          d.name.toLowerCase().includes(q) ||
          d.course.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q) ||
          (d.trainerName || '').toLowerCase().includes(q);
        return matchesTrainer && matchesQuery;
      });
    }
  }, [assignmentEntity, assignmentTrainerFilter, assignmentSearch, students, demos, trainers]);

  const handleBulkAssign = async () => {
    if (!bulkTargetTrainerId || selectedIds.length === 0) return;
    if (assignmentEntity === 'students') {
      await onAssignStudentsToTrainer(selectedIds, bulkTargetTrainerId);
    } else {
      await onAssignDemosToTrainer(selectedIds, bulkTargetTrainerId);
    }
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-700 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1d2d3e]">PPS Academy Admin Console</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Create and manage trainer accounts, reset trainer passwords to default, and assign students to each trainer's portal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-slate-500">Default Trainer Password:</span>
              <code className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {defaultTrainerPassword}
              </code>
              <button
                type="button"
                onClick={() => handleCopyText('header-default-pw', defaultTrainerPassword)}
                className="text-slate-400 hover:text-[#0a6ed1] cursor-pointer"
                title="Copy default trainer password"
              >
                {copiedKey === 'header-default-pw' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenAddTrainer}
              className="px-4 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Trainer</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('trainers')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'trainers'
                ? 'bg-[#1d2d3e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Trainer Directory & Passwords ({trainers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedIds([]);
              setActiveTab('student_assignments');
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'student_assignments'
                ? 'bg-[#1d2d3e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Student & Demo Assignments ({students.length + demos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portal_access')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'portal_access'
                ? 'bg-[#1d2d3e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Portal Login Links & Security</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Registered Trainers</span>
            <Users className="w-4 h-4 text-[#0a6ed1]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{trainers.length}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            {activeTrainersCount} Active • {trainers.length - activeTrainersCount} Inactive
          </div>
        </div>

        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Pending Password Reset</span>
            <KeyRound className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{defaultPwPendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Using default password (forced change on login)
          </div>
        </div>

        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Enrolled Students</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{students.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Isolated per assigned trainer
          </div>
        </div>

        <div className="bg-white border border-[#d9e0e7] rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Demo Pipeline Leads</span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{demos.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Managed by respective trainers
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: TRAINER DIRECTORY & PASSWORD MANAGEMENT
         ===================================================================== */}
      {activeTab === 'trainers' && (
        <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search trainer name, username, specialization..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                {[
                  { id: 'all', label: `All (${trainers.length})` },
                  { id: 'active', label: `Active (${activeTrainersCount})` },
                  { id: 'inactive', label: `Inactive (${trainers.length - activeTrainersCount})` },
                  { id: 'default_pw', label: `Default PW (${defaultPwPendingCount})` }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStatusFilter(item.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      statusFilter === item.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info Callout */}
          <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 text-[11px] text-blue-900 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#0a6ed1] shrink-0" />
            <span>
              <strong>Security Flow:</strong> New trainers and admin-reset accounts receive the default password (<code>{defaultTrainerPassword}</code>). When logging in with the default password, the trainer is required to set a new personal password before accessing their own student portal.
            </span>
          </div>

          {/* Trainers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="fiori-table-header">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[200px]">Trainer Profile</th>
                  <th className="py-3 px-4 min-w-[140px]">Login Username</th>
                  <th className="py-3 px-4 min-w-[200px]">Owned Roster</th>
                  <th className="py-3 px-4 min-w-[190px]">Password Status</th>
                  <th className="py-3 px-4 min-w-[110px]">Status</th>
                  <th className="py-3 px-4 text-right min-w-[240px]">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {filteredTrainers.length > 0 ? (
                  filteredTrainers.map((t, idx) => {
                    const stats = getTrainerOwnershipCounts(t);
                    return (
                      <tr key={t.id} className="fiori-table-row">
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0a6ed1] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{t.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {t.specialization || 'General Software Training'}
                              </div>
                              {(t.email || t.phone) && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {[t.phone, t.email].filter(Boolean).join(' • ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {t.username}
                          </code>
                          {t.lastLoginAt && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Last login: {t.lastLoginAt.split('T')[0]}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded">
                              {stats.ongoing} Ongoing
                            </span>
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                              {stats.irregular} Irregular
                            </span>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                              {stats.completed} Done
                            </span>
                            <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded">
                              {stats.demos} Demos
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignmentTrainerFilter(t.id);
                              setBulkTargetTrainerId(t.id);
                              setSelectedIds([]);
                              setActiveTab('student_assignments');
                            }}
                            className="text-[10px] text-[#0a6ed1] hover:underline font-semibold mt-1 cursor-pointer"
                          >
                            Manage assigned students &rarr;
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {t.isDefaultPassword ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                Default Password
                              </span>
                              <div className="text-[10px] text-amber-700">
                                Must reset on next login
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Custom Password Set
                              </span>
                              {t.passwordUpdatedAt && (
                                <div className="text-[10px] text-slate-400">
                                  Updated: {t.passwordUpdatedAt.split('T')[0]}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleTrainerStatus(t)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                              t.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Click to toggle Active / Inactive"
                          >
                            {t.status === 'Active' ? (
                              <Unlock className="w-3 h-3" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                            <span>{t.status}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {resetConfirmId === t.id ? (
                              <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded px-2 py-1">
                                <span className="text-[10px] font-bold text-amber-900">Reset to default?</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onResetTrainerPassword(t.id);
                                    setResetConfirmId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-amber-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-amber-700"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setResetConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-300 rounded text-[10px] cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setResetConfirmId(t.id)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Reset trainer password back to default password"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset PW</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditTrainer(t)}
                              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded cursor-pointer transition-colors"
                              title="Edit trainer details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {deleteConfirmId === t.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded px-2 py-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteTrainer(t.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-300 rounded text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(t.id)}
                                className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded cursor-pointer transition-colors"
                                title="Remove trainer account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No trainer accounts match your filter. Click "Add Trainer" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: STUDENT & DEMO OWNERSHIP ASSIGNMENTS
         ===================================================================== */}
      {activeTab === 'student_assignments' && (
        <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentEntity('students');
                      setSelectedIds([]);
                    }}
                    className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                      assignmentEntity === 'students' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Enrolled Students ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentEntity('demos');
                      setSelectedIds([]);
                    }}
                    className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                      assignmentEntity === 'demos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Demo Candidates ({demos.length})
                  </button>
                </div>

                <select
                  value={assignmentTrainerFilter}
                  onChange={e => setAssignmentTrainerFilter(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700"
                >
                  <option value="ALL">Filter: All Trainers</option>
                  <option value="UNASSIGNED">Unassigned / Other</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>
                      Trainer: {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={e => setAssignmentSearch(e.target.value)}
                  placeholder="Search student, course, phone..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            {/* Bulk Assign Bar */}
            {selectedIds.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-blue-900">
                  {selectedIds.length} {assignmentEntity === 'students' ? 'student(s)' : 'demo lead(s)'} selected for reassignment
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkTargetTrainerId}
                    onChange={e => setBulkTargetTrainerId(e.target.value)}
                    className="p-1.5 bg-white border border-blue-300 rounded text-xs font-semibold"
                  >
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>
                        Assign to: {t.name} ({t.username})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkAssign}
                    className="px-3 py-1.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold cursor-pointer"
                  >
                    Transfer Ownership
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="fiori-table-header">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredAssignmentRows.length > 0 &&
                        filteredAssignmentRows.every(r => selectedIds.includes(r.id))
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(filteredAssignmentRows.map(r => r.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Course</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Trainer</th>
                  <th className="py-3 px-3 text-right">Reassign Trainer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {filteredAssignmentRows.map((item: any) => {
                  const owner = resolveRecordTrainer(item);
                  return (
                    <tr key={item.id} className="fiori-table-row">
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, item.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.course}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{item.phone}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {item.isIrregular ? 'Irregular' : item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {owner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[11px]">
                            {owner.name}
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                            {item.trainerName || 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <select
                          value={owner?.id || ''}
                          onChange={async e => {
                            const targetId = e.target.value;
                            if (!targetId) return;
                            if (assignmentEntity === 'students') {
                              await onAssignStudentsToTrainer([item.id], targetId);
                            } else {
                              await onAssignDemosToTrainer([item.id], targetId);
                            }
                          }}
                          className="text-xs p-1 bg-white border border-slate-300 rounded font-medium text-slate-700 cursor-pointer"
                        >
                          <option value="">-- Select Trainer --</option>
                          {trainers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.username})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {filteredAssignmentRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: PORTAL ACCESS LINKS & GLOBAL PASSWORD POLICY
         ===================================================================== */}
      {activeTab === 'portal_access' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Separate Login Links Card */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Link2 className="w-4 h-4 text-[#0a6ed1]" />
              <h2 className="text-sm font-bold text-slate-800">Dedicated Portal Login URLs</h2>
            </div>

            <div className="space-y-3 text-xs">
              {[
                {
                  key: 'admin',
                  title: 'Admin Login Page',
                  desc: 'Exclusive gateway for PPSAdmin (Username: PPSAdmin)',
                  url: `${originBase}#/admin`,
                  badge: 'Admin Only',
                  badgeColor: 'bg-amber-100 text-amber-900 border-amber-200'
                },
                {
                  key: 'trainer',
                  title: 'Trainer Login Page',
                  desc: 'Dedicated sign-in for trainers; enforces password reset if logging in with default password',
                  url: `${originBase}#/trainer`,
                  badge: 'Trainers Only',
                  badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
                },
                {
                  key: 'student',
                  title: 'Student Learning Portal Login',
                  desc: 'Shareable student login page (no access to Trainer or Admin portals)',
                  url: `${originBase}#/student`,
                  badge: 'Students Only',
                  badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }
              ].map(item => (
                <div key={item.key} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{item.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700 truncate">
                      {item.url}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyText(`url-${item.key}`, item.url)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === `url-${item.key}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global Default Trainer Password Configuration */}
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-800">Default Trainer Password Policy</h2>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                This default password is automatically assigned whenever the Admin creates a new trainer or clicks <strong>Reset PW</strong> for an existing trainer. Any trainer signing in with this default password is automatically prompted to create their own new password before entering their dashboard.
              </p>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">
                  System Default Trainer Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showDefaultPw ? 'text' : 'password'}
                    value={newDefaultPwInput}
                    onChange={e => setNewDefaultPwInput(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDefaultPw(!showDefaultPw)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showDefaultPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncPendingWithNewDefault}
                  onChange={e => setSyncPendingWithNewDefault(e.target.checked)}
                />
                <span>Also update trainers currently pending default password reset</span>
              </label>

              <button
                type="button"
                onClick={() => onUpdateDefaultPassword(newDefaultPwInput, syncPendingWithNewDefault)}
                disabled={!newDefaultPwInput.trim()}
                className="px-4 py-2 bg-[#1d2d3e] hover:bg-slate-800 text-white rounded text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Save Default Password Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD / EDIT TRAINER
         ===================================================================== */}
      {isTrainerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1d2d3e] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-300" />
                <h3 className="text-sm font-bold">
                  {editingTrainer ? `Edit Trainer: ${editingTrainer.name}` : 'Create New Trainer Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTrainerModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTrainerForm} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Trainer Full Name (Matches Student Assignment Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={trainerForm.name}
                  onChange={e => {
                    const val = e.target.value;
                    setTrainerForm(prev => ({
                      ...prev,
                      name: val,
                      username: !editingTrainer && (!prev.username || prev.username === prev.name.replace(/\s+/g, ''))
                        ? val.replace(/\s+/g, '')
                        : prev.username
                    }));
                  }}
                  placeholder="e.g. HARISH, VIGNESH, MALAR"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Login Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={trainerForm.username}
                  onChange={e => setTrainerForm({ ...trainerForm, username: e.target.value })}
                  placeholder="e.g. HARISH"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={trainerForm.email}
                    onChange={e => setTrainerForm({ ...trainerForm, email: e.target.value })}
                    placeholder="trainer@pps-sw.com"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={trainerForm.phone}
                    onChange={e => setTrainerForm({ ...trainerForm, phone: e.target.value })}
                    placeholder="+91 98400 00000"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialization / Courses</label>
                  <input
                    type="text"
                    value={trainerForm.specialization}
                    onChange={e => setTrainerForm({ ...trainerForm, specialization: e.target.value })}
                    placeholder="SAP ABAP, Python"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={trainerForm.status}
                    onChange={e => setTrainerForm({ ...trainerForm, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {!editingTrainer && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
                  <strong>Default Password Provisioning:</strong> This trainer's initial password will be{' '}
                  <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">
                    {defaultTrainerPassword}
                  </code>
                  . On their first login, they will be forced to set a new password.
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTrainerModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold shadow-xs cursor-pointer"
                >
                  {editingTrainer ? 'Save Changes' : 'Create Trainer Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
