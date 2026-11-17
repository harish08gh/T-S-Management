import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from './services/firebase';
import {
  Student,
  DemoStudent,
  AttendanceRecord,
  ClassLink,
  CourseCompletionSettings,
  TrainerSystemSettings,
  TrainerAccount,
  UserRole,
  TrainerTab
} from './types';
import { ShellBar } from './components/ShellBar';
import { SidebarNavigation } from './components/SidebarNavigation';
import { Dashboard } from './components/trainer/Dashboard';
import { StudentDetails } from './components/trainer/StudentDetails';
import { DemoManagement } from './components/trainer/DemoManagement';
import { AttendanceTracking } from './components/trainer/AttendanceTracking';
import { ClassSchedule } from './components/trainer/ClassSchedule';
import { IrregularStudents } from './components/trainer/IrregularStudents';
import { DailyClassLink } from './components/trainer/DailyClassLink';
import { CompletionTemplateEditor } from './components/trainer/CompletionTemplateEditor';
import { TrainerSettings } from './components/trainer/TrainerSettings';
import { ClassLinkModal } from './components/trainer/ClassLinkModal';
import { StudentPortal } from './components/student/StudentPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { LoginPage } from './components/auth/LoginPage';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const PORTAL_AUTH_KEYS: Record<UserRole, string> = {
  admin: 'pps_auth_admin_v3',
  trainer: 'pps_auth_trainer_v3',
  student: 'pps_auth_student_v3'
};
const SETTINGS_STORAGE_KEY = 'pps_trainer_system_settings_v3';
const TRAINER_SETTINGS_MAP_KEY = 'pps_trainer_settings_by_id_v1';

const DEFAULT_TRAINER_SETTINGS: TrainerSystemSettings = {
  trainerUsername: 'HARISH',
  trainerName: 'HARISH',
  trainerEmail: 'harish@pps-sw.com',
  trainerPhone: '+91 98400 00000',
  trainerPassword: 'PPS@2026',
  studentPassword: 'Student@PPS26',
  institutionName: 'PPS Software Solutions & Academy',
  institutionEmail: 'completions@pps-sw.com',
  institutionPhone: '+91 44 2800 1234',
  institutionWebsite: 'https://pps-sw.com',
  defaultLinkDuration: 'entire_day',
  minAttendancePercentForCompletion: 80,
  irregularThresholdDays: 3,
  weekOffDays: ['Sunday'],
  lunchBreak: {
    start: '01:00 PM',
    end: '02:00 PM'
  },
  leaves: [],
  shiftTimingWeekday: {
    start: '09:00 AM',
    end: '06:00 PM'
  },
  shiftTimingWeekend: {
    start: '10:00 AM',
    end: '04:00 PM'
  },
  allowedPercentageStudentIds: [],
  allowedAttendanceStudentIds: [],
  holidays: [
    { id: 'hol-1', date: '2026-01-14', name: 'Pongal / Makar Sankranti' },
    { id: 'hol-2', date: '2026-01-26', name: 'Republic Day' },
    { id: 'hol-3', date: '2026-04-14', name: 'Tamil New Year / Dr. Ambedkar Jayanti' },
    { id: 'hol-4', date: '2026-05-01', name: 'May Day (Labour Day)' },
    { id: 'hol-5', date: '2026-08-15', name: 'Independence Day' },
    { id: 'hol-6', date: '2026-10-02', name: 'Gandhi Jayanti' },
    { id: 'hol-7', date: '2026-10-20', name: 'Deepavali' },
    { id: 'hol-8', date: '2026-12-25', name: 'Christmas Day' }
  ]
};

interface AuthSession {
  role: UserRole;
  studentId?: string;
  trainerId?: string;
}

function detectPortalRoute(): UserRole {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (hash.includes('admin') || search.includes('portal=admin')) return 'admin';
    if (hash.includes('trainer') || search.includes('portal=trainer')) return 'trainer';
  }
  return 'student';
}

function loadPortalSession(route: UserRole): AuthSession | null {
  try {
    const stored = localStorage.getItem(PORTAL_AUTH_KEYS[route]);
    if (!stored) return null;
    const parsed: AuthSession = JSON.parse(stored);
    if (parsed.role !== route) return null;
    if (route === 'trainer' && !parsed.trainerId) {
      localStorage.removeItem(PORTAL_AUTH_KEYS.trainer);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeSettings(raw?: Partial<TrainerSystemSettings>): TrainerSystemSettings {
  return {
    ...DEFAULT_TRAINER_SETTINGS,
    ...(raw || {}),
    weekOffDays: raw?.weekOffDays || DEFAULT_TRAINER_SETTINGS.weekOffDays,
    lunchBreak: raw?.lunchBreak || DEFAULT_TRAINER_SETTINGS.lunchBreak,
    leaves: raw?.leaves || DEFAULT_TRAINER_SETTINGS.leaves,
    shiftTimingWeekday: raw?.shiftTimingWeekday || DEFAULT_TRAINER_SETTINGS.shiftTimingWeekday,
    shiftTimingWeekend: raw?.shiftTimingWeekend || DEFAULT_TRAINER_SETTINGS.shiftTimingWeekend,
    allowedPercentageStudentIds:
      raw?.allowedPercentageStudentIds || DEFAULT_TRAINER_SETTINGS.allowedPercentageStudentIds || [],
    allowedAttendanceStudentIds:
      raw?.allowedAttendanceStudentIds || DEFAULT_TRAINER_SETTINGS.allowedAttendanceStudentIds || [],
    holidays: raw?.holidays || DEFAULT_TRAINER_SETTINGS.holidays || []
  };
}

function doesRecordBelongToTrainer(
  record: { trainerId?: string; trainerName?: string },
  trainer: TrainerAccount | null
): boolean {
  if (!trainer) return false;
  if (record.trainerId && record.trainerId === trainer.id) return true;
  const rName = (record.trainerName || '').trim().toLowerCase();
  if (!rName) return false;
  return (
    rName === trainer.name.trim().toLowerCase() ||
    rName === trainer.username.trim().toLowerCase()
  );
}

export default function App() {
  // Active portal determined by URL (#/admin, #/trainer, #/student)
  const [portalRoute, setPortalRoute] = useState<UserRole>(detectPortalRoute);

  // Authentication session scoped to the active portal
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    loadPortalSession(detectPortalRoute())
  );

  // Sync portal & session when URL hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      const nextRoute = detectPortalRoute();
      setPortalRoute(nextRoute);
      setAuthSession(loadPortalSession(nextRoute));
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Base system settings
  const [systemSettings, setSystemSettings] = useState<TrainerSystemSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return DEFAULT_TRAINER_SETTINGS;
      return normalizeSettings(JSON.parse(stored));
    } catch {
      return DEFAULT_TRAINER_SETTINGS;
    }
  });

  // Per-trainer isolated settings map
  const [trainerSettingsMap, setTrainerSettingsMap] = useState<Record<string, TrainerSystemSettings>>(() => {
    try {
      const stored = localStorage.getItem(TRAINER_SETTINGS_MAP_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const role: UserRole = authSession?.role || portalRoute;
  const [trainerTab, setTrainerTab] = useState<TrainerTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pps_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('pps_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Data state synced from DataService
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
  const [demos, setDemos] = useState<DemoStudent[]>(dataService.getDemos());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(dataService.getAttendance());
  const [classLink, setClassLink] = useState<ClassLink>(dataService.getClassLink());
  const [trainers, setTrainers] = useState<TrainerAccount[]>(dataService.getTrainers());
  const [defaultTrainerPassword, setDefaultTrainerPassword] = useState<string>(
    dataService.getDefaultTrainerPassword()
  );
  const [completionSettings, setCompletionSettings] = useState<CourseCompletionSettings>(
    dataService.getCompletionSettings()
  );
  const [syncStatus, setSyncStatus] = useState<string>(dataService.connectionStatusText);
  const [isSynced, setIsSynced] = useState<boolean>(dataService.isFirestoreConnected);

  // Selected student for student portal view (strictly the logged in student)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modal for quick class link editing from anywhere
  const [isClassLinkModalOpen, setIsClassLinkModalOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Today's date string in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Subscribe to reactive data service updates
  useEffect(() => {
    const syncState = () => {
      setStudents(dataService.getStudents());
      setDemos(dataService.getDemos());
      setAttendance(dataService.getAttendance());
      setClassLink(dataService.getClassLink());
      setTrainers(dataService.getTrainers());
      setDefaultTrainerPassword(dataService.getDefaultTrainerPassword());
      setCompletionSettings(dataService.getCompletionSettings());
      setSyncStatus(dataService.connectionStatusText);
      setIsSynced(dataService.isFirestoreConnected);
    };

    syncState();
    const unsubscribe = dataService.subscribe(syncState);
    return () => unsubscribe();
  }, []);

  // Active logged-in trainer (when role === 'trainer')
  const activeTrainer = useMemo(() => {
    if (!authSession || authSession.role !== 'trainer' || !authSession.trainerId) return null;
    return trainers.find(t => t.id === authSession.trainerId) || null;
  }, [authSession, trainers]);

  // Enforce active trainer session validity (invalidate if deleted, deactivated, or password reset to default by Admin)
  useEffect(() => {
    if (authSession?.role === 'trainer') {
      if (!activeTrainer || activeTrainer.status !== 'Active' || activeTrainer.isDefaultPassword) {
        localStorage.removeItem(PORTAL_AUTH_KEYS.trainer);
        setAuthSession(null);
      }
    }
  }, [authSession, activeTrainer]);

  // When logged in as student, bind ONLY to that student's identity
  useEffect(() => {
    if (authSession?.role === 'student' && authSession.studentId) {
      const found = students.find(s => s.id === authSession.studentId);
      if (found) {
        setSelectedStudent(found);
      }
    } else if (authSession?.role !== 'student') {
      setSelectedStudent(null);
    }
  }, [students, authSession]);

  // Trainer-isolated datasets (strict ownership per trainer)
  const trainerStudents = useMemo(() => {
    if (role === 'trainer') {
      if (!activeTrainer) return [];
      return students.filter(s => doesRecordBelongToTrainer(s, activeTrainer));
    }
    return students;
  }, [role, activeTrainer, students]);

  const trainerStudentIdSet = useMemo(
    () => new Set(trainerStudents.map(s => s.id)),
    [trainerStudents]
  );

  const trainerDemos = useMemo(() => {
    if (role === 'trainer') {
      if (!activeTrainer) return [];
      return demos.filter(d => doesRecordBelongToTrainer(d, activeTrainer));
    }
    return demos;
  }, [role, activeTrainer, demos]);

  const trainerAttendance = useMemo(() => {
    if (role === 'trainer') {
      return attendance.filter(a => trainerStudentIdSet.has(a.studentId));
    }
    return attendance;
  }, [role, attendance, trainerStudentIdSet]);

  // Derived trainer datasets
  const ongoingStudents = useMemo(
    () => trainerStudents.filter(s => s.status === 'Ongoing' && !s.isIrregular),
    [trainerStudents]
  );
  const irregularStudents = useMemo(
    () => trainerStudents.filter(s => s.isIrregular),
    [trainerStudents]
  );
  const todayAttendance = useMemo(
    () => trainerAttendance.filter(a => a.date === todayStr),
    [trainerAttendance, todayStr]
  );
  const markedStudentIds = useMemo(
    () => new Set(todayAttendance.map(a => a.studentId)),
    [todayAttendance]
  );
  const pendingAttendanceCount = useMemo(
    () => ongoingStudents.filter(s => !markedStudentIds.has(s.id)).length,
    [ongoingStudents, markedStudentIds]
  );

  // Scoped Class Link for current Trainer
  const trainerClassLink = useMemo(() => {
    return activeTrainer ? dataService.getClassLinkForTrainer(activeTrainer.id) : classLink;
  }, [activeTrainer, classLink, trainers]);

  const isTrainerLinkActive = activeTrainer
    ? dataService.isClassLinkActive(activeTrainer.id)
    : dataService.isClassLinkActive();

  // Scoped Class Link & Settings for logged-in Student (matches their assigned trainer)
  const studentAssignedTrainer = useMemo(() => {
    if (!selectedStudent) return null;
    return (
      trainers.find(
        t =>
          (selectedStudent.trainerId && t.id === selectedStudent.trainerId) ||
          t.name.trim().toLowerCase() === (selectedStudent.trainerName || '').trim().toLowerCase() ||
          t.username.trim().toLowerCase() === (selectedStudent.trainerName || '').trim().toLowerCase()
      ) || null
    );
  }, [selectedStudent, trainers]);

  const studentTrainerKey = selectedStudent?.trainerId || selectedStudent?.trainerName;
  const studentClassLink = useMemo(() => {
    return studentTrainerKey ? dataService.getClassLinkForTrainer(studentTrainerKey) : classLink;
  }, [studentTrainerKey, classLink, trainers]);

  const isStudentLinkActive = studentTrainerKey
    ? dataService.isClassLinkActive(studentTrainerKey)
    : dataService.isClassLinkActive();

  const studentTrainerSettings = useMemo(() => {
    if (studentAssignedTrainer && trainerSettingsMap[studentAssignedTrainer.id]) {
      return normalizeSettings(trainerSettingsMap[studentAssignedTrainer.id]);
    }
    return systemSettings;
  }, [studentAssignedTrainer, trainerSettingsMap, systemSettings]);

  // Attendance records for currently selected student (strictly isolated)
  const currentStudentAttendance = selectedStudent
    ? attendance.filter(a => a.studentId === selectedStudent.id)
    : [];

  // Effective settings merged with active trainer profile & per-trainer isolated settings
  const effectiveTrainerSettings: TrainerSystemSettings = useMemo(() => {
    if (!activeTrainer) return systemSettings;
    const savedForTrainer = trainerSettingsMap[activeTrainer.id]
      ? normalizeSettings(trainerSettingsMap[activeTrainer.id])
      : normalizeSettings({
          ...systemSettings,
          // New trainers start with clean leave/permission lists unless they were Harish inheriting legacy global settings
          leaves: activeTrainer.id === 'trainer-harish' ? systemSettings.leaves : [],
          allowedPercentageStudentIds:
            activeTrainer.id === 'trainer-harish' ? systemSettings.allowedPercentageStudentIds : [],
          allowedAttendanceStudentIds:
            activeTrainer.id === 'trainer-harish' ? systemSettings.allowedAttendanceStudentIds : []
        });

    return {
      ...savedForTrainer,
      trainerUsername: activeTrainer.username,
      trainerName: activeTrainer.name,
      trainerEmail: activeTrainer.email || savedForTrainer.trainerEmail,
      trainerPhone: activeTrainer.phone || savedForTrainer.trainerPhone,
      trainerPassword: activeTrainer.password
    };
  }, [systemSettings, trainerSettingsMap, activeTrainer]);

  // Authentication Handlers
  const handleAdminLoginSuccess = () => {
    const session: AuthSession = { role: 'admin' };
    localStorage.setItem(PORTAL_AUTH_KEYS.admin, JSON.stringify(session));
    setPortalRoute('admin');
    setAuthSession(session);
    showToast('Signed in to Admin Portal as PPSAdmin', 'success');
  };

  const handleTrainerLoginSuccess = async (trainer: TrainerAccount) => {
    await dataService.markTrainerLoggedIn(trainer.id);
    const session: AuthSession = { role: 'trainer', trainerId: trainer.id };
    localStorage.setItem(PORTAL_AUTH_KEYS.trainer, JSON.stringify(session));
    setPortalRoute('trainer');
    setAuthSession(session);
    setTrainerTab('dashboard');
    showToast(`Signed in successfully as ${trainer.name}`, 'success');
  };

  const handleCompleteTrainerPasswordReset = async (
    trainerId: string,
    newPassword: string
  ): Promise<TrainerAccount> => {
    const updated = await dataService.updateTrainerPassword(trainerId, newPassword);
    showToast('Personal password updated! Signing you in...', 'success');
    return updated;
  };

  const handleStudentLoginSuccess = (student: Student) => {
    const session: AuthSession = { role: 'student', studentId: student.id };
    localStorage.setItem(PORTAL_AUTH_KEYS.student, JSON.stringify(session));
    setPortalRoute('student');
    setAuthSession(session);
    setSelectedStudent(student);
    showToast(`Welcome back, ${student.name}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem(PORTAL_AUTH_KEYS[portalRoute]);
    setAuthSession(null);
    setSelectedStudent(null);
    showToast('Logged out successfully', 'info');
  };

  // Trainer Settings Save (isolated per trainer + syncs password/profile back to activeTrainer)
  const handleSaveTrainerSettings = async (newSettings: TrainerSystemSettings) => {
    const normalized = normalizeSettings(newSettings);
    if (activeTrainer) {
      const updatedMap = {
        ...trainerSettingsMap,
        [activeTrainer.id]: normalized
      };
      setTrainerSettingsMap(updatedMap);
      localStorage.setItem(TRAINER_SETTINGS_MAP_KEY, JSON.stringify(updatedMap));

      // Keep student default password synced globally if updated
      if (normalized.studentPassword !== systemSettings.studentPassword) {
        const updatedGlobal = { ...systemSettings, studentPassword: normalized.studentPassword };
        setSystemSettings(updatedGlobal);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedGlobal));
      }

      const updatedPassword = normalized.trainerPassword?.trim();
      const updatedUsername = normalized.trainerUsername?.trim() || activeTrainer.username;
      const updatedName = normalized.trainerName?.trim() || activeTrainer.name;

      await dataService.saveTrainer({
        ...activeTrainer,
        name: updatedName,
        username: updatedUsername,
        email: normalized.trainerEmail?.trim() || activeTrainer.email,
        phone: normalized.trainerPhone?.trim() || activeTrainer.phone,
        password: updatedPassword || activeTrainer.password,
        isDefaultPassword: updatedPassword
          ? updatedPassword === defaultTrainerPassword
          : activeTrainer.isDefaultPassword,
        passwordUpdatedAt:
          updatedPassword && updatedPassword !== activeTrainer.password
            ? new Date().toISOString()
            : activeTrainer.passwordUpdatedAt
      });
    } else {
      setSystemSettings(normalized);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    }

    showToast('Trainer settings and security policies updated', 'success');
  };

  // Maintenance: Clear Attendance
  const handleClearAttendance = () => {
    dataService.clearAllAttendance();
    showToast('All attendance session logs cleared', 'info');
  };

  // Maintenance: Full Database Wipe
  const handleWipeDatabase = () => {
    dataService.wipeAllData();
    showToast('Database wiped clean. You can now add fresh batches.', 'warning');
  };

  // Handler: Save Student (Add / Edit) - enforces trainer ownership
  const handleSaveStudent = async (student: Student) => {
    const ownedStudent: Student = activeTrainer
      ? {
          ...student,
          trainerId: student.trainerId || activeTrainer.id,
          trainerName:
            !student.trainerName || student.trainerName === 'PPSTrainer'
              ? activeTrainer.name
              : student.trainerName
        }
      : student;
    await dataService.saveStudent(ownedStudent);
    showToast(`Student record saved for ${ownedStudent.name}`, 'success');
  };

  const handleBulkSaveStudents = async (newStudents: Student[]) => {
    const ownedStudents = activeTrainer
      ? newStudents.map(st => ({
          ...st,
          trainerId: activeTrainer.id,
          trainerName: activeTrainer.name
        }))
      : newStudents;
    await dataService.saveStudentsBatch(ownedStudents);
    showToast(`Successfully imported ${ownedStudents.length} students into your roster!`, 'success');
  };

  // Handler: Delete Student
  const handleDeleteStudent = async (id: string) => {
    await dataService.deleteStudent(id);
    showToast('Student record deleted', 'info');
  };

  // Handler: Quick Mark Attendance from Dashboard
  const handleQuickMarkAttendance = async (studentId: string, status: 'Present' | 'Absent') => {
    const student = trainerStudents.find(s => s.id === studentId);
    if (!student) return;

    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${studentId}`,
      studentId,
      studentName: student.name,
      course: student.course,
      date: todayStr,
      time: student.timing ? student.timing.split('-')[0].trim() : '09:00 AM',
      attendance: status,
      topicCovered: status === 'Present' ? 'Curriculum Session Verified' : 'Unexcused Absence',
      markedBy: 'Trainer (Dashboard)',
      markedAt: new Date().toISOString()
    };

    await dataService.recordAttendance(record);
    showToast(
      `Marked ${student.name} as ${status} for today (${todayStr})`,
      status === 'Present' ? 'success' : 'warning'
    );
  };

  // Handler: Quick Completion % delta
  const handleQuickUpdateCompletion = async (studentId: string, delta: number) => {
    const student = trainerStudents.find(s => s.id === studentId);
    if (!student) return;
    const newPct = Math.min(100, Math.max(0, student.completionPercentage + delta));
    await dataService.updateStudentCompletion(studentId, newPct);
    showToast(`Updated progress for ${student.name}: ${newPct}%`, 'info');
  };

  // Handler: Full Completion % Update (with optional DOE)
  const handleUpdateCompletion = async (studentId: string, percentage: number, doe?: string) => {
    await dataService.updateStudentCompletion(studentId, percentage, doe);
    const student = trainerStudents.find(s => s.id === studentId);
    if (percentage >= 100) {
      showToast(`${student?.name || 'Student'} completed 100%! Date of Ending logged as ${doe}.`, 'success');
    } else {
      showToast(`Updated completion percentage to ${percentage}%`, 'info');
    }
  };

  // Handler: Move to Irregular / Regular
  const handleToggleRegular = async (studentId: string, isIrregular: boolean, reason?: string) => {
    await dataService.toggleStudentRegularStatus(studentId, isIrregular, reason);
    const student = trainerStudents.find(s => s.id === studentId);
    if (isIrregular) {
      showToast(`Moved ${student?.name} to Irregular Student Page`, 'warning');
    } else {
      showToast(`Re-activated ${student?.name} to Regular Class Schedule`, 'success');
    }
  };

  // Handler: Demo actions (enforces trainer ownership)
  const handleSaveDemo = async (demo: DemoStudent) => {
    const ownedDemo: DemoStudent = activeTrainer
      ? {
          ...demo,
          trainerId: demo.trainerId || activeTrainer.id,
          trainerName:
            !demo.trainerName || demo.trainerName === 'PPSTrainer'
              ? activeTrainer.name
              : demo.trainerName
        }
      : demo;
    await dataService.saveDemo(ownedDemo);
    showToast(`Demo record saved for ${ownedDemo.name}`, 'success');
  };

  const handleBulkSaveDemos = async (newDemos: DemoStudent[]) => {
    const ownedDemos = activeTrainer
      ? newDemos.map(dm => ({
          ...dm,
          trainerId: activeTrainer.id,
          trainerName: activeTrainer.name
        }))
      : newDemos;
    await dataService.saveDemosBatch(ownedDemos);
    showToast(`Successfully imported ${ownedDemos.length} demo candidates into your pipeline!`, 'success');
  };

  const handleDeleteDemo = async (id: string) => {
    await dataService.deleteDemo(id);
    showToast('Demo student deleted', 'info');
  };

  const handleConvertDemoToOngoing = async (
    demoId: string,
    batchData: {
      doj: string;
      timing: string;
      mode: 'Weekdays' | 'Weekend';
      type: 'Online' | 'Offline';
      remark?: string;
    }
  ) => {
    const newStd = await dataService.convertDemoToOngoing(demoId, batchData);
    if (activeTrainer && (!newStd.trainerId || newStd.trainerName === 'PPSTrainer')) {
      await dataService.saveStudent({
        ...newStd,
        trainerId: activeTrainer.id,
        trainerName: activeTrainer.name
      });
    }
    showToast(`Demo converted! ${newStd.name} enrolled in Ongoing Schedule`, 'success');
    setTrainerTab('class_schedule');
  };

  // Handler: Attendance recording & topic update
  const handleRecordAttendance = async (record: AttendanceRecord) => {
    await dataService.recordAttendance(record);
    showToast(`Attendance updated for ${record.studentName} (${record.attendance})`, 'success');
  };

  const handleUpdateTopic = async (id: string, topic: string) => {
    await dataService.updateAttendanceTopic(id, topic);
    showToast('Session topic updated', 'info');
  };

  // Handler: Student touches link
  const handleStudentTouchLink = async (
    studentId: string,
    absenceReason?: string,
    missedRecordIds?: string[]
  ) => {
    await dataService.studentTouchLinkAttendance(studentId, absenceReason, missedRecordIds);
    showToast(
      absenceReason
        ? 'Absence reason submitted & attendance logged as PRESENT via Class Link!'
        : 'Attendance logged as PRESENT via Class Link Touch!',
      'success'
    );
  };

  // Handler: Class Link update (scoped to activeTrainer)
  const handleUpdateClassLink = async (data: Partial<ClassLink>) => {
    await dataService.updateClassLink(
      {
        ...data,
        trainerId: activeTrainer?.id || data.trainerId,
        trainerName: activeTrainer?.name || data.trainerName || 'Trainer'
      },
      activeTrainer?.id
    );
    showToast('Class link updated & broadcasted to your students', 'success');
  };

  // Handler: Completion Settings
  const handleSaveCompletionSettings = async (settings: CourseCompletionSettings) => {
    await dataService.updateCompletionSettings(settings);
    showToast('Course completion mail template saved', 'success');
  };

  // IF NOT AUTHENTICATED ON THIS PORTAL ROUTE: Show Dedicated Login Page
  if (!authSession) {
    return (
      <LoginPage
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onTrainerLoginSuccess={handleTrainerLoginSuccess}
        onStudentLoginSuccess={handleStudentLoginSuccess}
        onFindStudentByPhone={(phone) => dataService.findStudentByPhone(phone)}
        onAuthenticateTrainer={(username, password) =>
          dataService.authenticateTrainer(username, password)
        }
        onCompleteTrainerPasswordReset={handleCompleteTrainerPasswordReset}
        defaultTrainerPassword={defaultTrainerPassword}
        enrolledStudentsCount={students.length}
        expectedStudentPassword={systemSettings.studentPassword}
      />
    );
  }

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-[#f5f6f8] flex flex-col text-[#2b3036]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 text-xs font-semibold text-white ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600'
                : toastMessage.type === 'warning'
                ? 'bg-amber-600'
                : 'bg-[#0a6ed1]'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : toastMessage.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-200" />
            ) : (
              <Info className="w-4 h-4 text-blue-200" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Shell Bar */}
      <ShellBar
        currentRole={role}
        onRoleChange={() => {}}
        selectedStudent={selectedStudent}
        allStudents={role === 'trainer' ? trainerStudents : students}
        onSelectStudent={setSelectedStudent}
        syncStatus={syncStatus}
        isSynced={isSynced}
        onRefreshData={() => {
          setStudents(dataService.getStudents());
          setTrainers(dataService.getTrainers());
          showToast('Data refreshed and synchronized', 'info');
        }}
        pendingAttendanceCount={pendingAttendanceCount}
        irregularCount={irregularStudents.length}
        onLogout={handleLogout}
        onToggleSidebar={toggleSidebarCollapse}
        onNavigateTab={(tab) => setTrainerTab(tab)}
        demos={role === 'trainer' ? trainerDemos : demos}
        attendance={role === 'trainer' ? trainerAttendance : attendance}
        classLink={role === 'trainer' ? trainerClassLink : classLink}
        todayStr={todayStr}
        onOpenClassLinkModal={() => setIsClassLinkModalOpen(true)}
        activeTrainer={activeTrainer}
        adminUsername="PPSAdmin"
      />

      {/* Role: ADMIN PORTAL */}
      {role === 'admin' && (
        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 h-full bg-[#f5f6f8]" id="admin-screen-scroll">
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <AdminPortal
              trainers={trainers}
              students={students}
              demos={demos}
              defaultTrainerPassword={defaultTrainerPassword}
              onUpdateDefaultPassword={async (newPw, syncPending) => {
                await dataService.updateDefaultTrainerPassword(newPw, syncPending);
                showToast(`Default trainer password updated to "${newPw}"`, 'success');
              }}
              onSaveTrainer={async (trainer) => {
                await dataService.saveTrainer(trainer);
                showToast(`Trainer account saved for ${trainer.name}`, 'success');
              }}
              onDeleteTrainer={async (trainerId) => {
                await dataService.deleteTrainer(trainerId);
                showToast('Trainer account removed', 'info');
              }}
              onResetTrainerPassword={async (trainerId) => {
                const updated = await dataService.resetTrainerPasswordToDefault(trainerId);
                showToast(
                  `Password reset to default (${defaultTrainerPassword}) for ${updated.name}. They must set a new password on next login.`,
                  'warning'
                );
              }}
              onAssignStudentsToTrainer={async (studentIds, trainerId) => {
                await dataService.assignStudentsToTrainer(studentIds, trainerId);
                const tr = trainers.find(t => t.id === trainerId);
                showToast(
                  `Assigned ${studentIds.length} student(s) to ${tr?.name || 'selected trainer'}`,
                  'success'
                );
              }}
              onAssignDemosToTrainer={async (demoIds, trainerId) => {
                await dataService.assignDemosToTrainer(demoIds, trainerId);
                const tr = trainers.find(t => t.id === trainerId);
                showToast(
                  `Assigned ${demoIds.length} demo candidate(s) to ${tr?.name || 'selected trainer'}`,
                  'success'
                );
              }}
            />
          </main>

          <footer className="bg-white border-t border-[#d9e0e7] py-3 text-xs text-slate-500 mt-auto shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">PPS Academy Admin Console</span>
                <span>•</span>
                <span>{systemSettings.institutionName}</span>
              </div>
              <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                <button
                  onClick={handleLogout}
                  className="text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* Role: TRAINER PORTAL (Isolated to activeTrainer's students & demos) */}
      {role === 'trainer' && (
        <div className="flex-1 flex overflow-hidden min-h-0 w-full">
          {/* Side Navigation Bar - FIXED ON LEFT */}
          <SidebarNavigation
            activeTab={trainerTab}
            onTabChange={setTrainerTab}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            activeTrainerName={activeTrainer?.name || 'Trainer'}
            activeTrainerShift={`${effectiveTrainerSettings.shiftTimingWeekday.start} - ${effectiveTrainerSettings.shiftTimingWeekday.end}`}
            counts={{
              allStudents: trainerStudents.length,
              ongoing: ongoingStudents.length,
              demos: trainerDemos.length,
              attendanceToday: todayAttendance.filter(a => a.attendance === 'Present').length,
              irregular: irregularStudents.length,
              pendingAttendance: pendingAttendanceCount
            }}
          />

          {/* Main Content Area - ONLY THIS SCREEN AREA SCROLLS */}
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 h-full bg-[#f5f6f8]" id="trainer-screen-scroll">
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
              {trainerTab === 'dashboard' && (
                <Dashboard
                  students={trainerStudents}
                  demos={trainerDemos}
                  attendance={trainerAttendance}
                  classLink={trainerClassLink}
                  isClassLinkActive={isTrainerLinkActive}
                  onNavigateTab={setTrainerTab}
                  onQuickMarkAttendance={handleQuickMarkAttendance}
                  onQuickUpdateCompletion={handleQuickUpdateCompletion}
                  onOpenClassLinkModal={() => setIsClassLinkModalOpen(true)}
                  onSaveStudent={handleSaveStudent}
                  todayStr={todayStr}
                  settings={effectiveTrainerSettings}
                />
              )}

              {trainerTab === 'student_details' && (
                <StudentDetails students={trainerStudents} />
              )}

              {trainerTab === 'demo_management' && (
                <DemoManagement
                  demos={trainerDemos}
                  onSaveDemo={handleSaveDemo}
                  onBulkSaveDemos={handleBulkSaveDemos}
                  onDeleteDemo={handleDeleteDemo}
                  onConvertDemoToOngoing={handleConvertDemoToOngoing}
                  activeTrainerName={activeTrainer?.name || 'PPSTrainer'}
                />
              )}

              {trainerTab === 'attendance_tracking' && (
                <AttendanceTracking
                  ongoingStudents={ongoingStudents}
                  attendance={trainerAttendance}
                  onRecordAttendance={handleRecordAttendance}
                  onUpdateTopic={handleUpdateTopic}
                  todayStr={todayStr}
                  settings={effectiveTrainerSettings}
                />
              )}

              {trainerTab === 'class_schedule' && (
                <ClassSchedule
                  ongoingStudents={ongoingStudents}
                  attendance={trainerAttendance}
                  todayStr={todayStr}
                  onSaveStudent={handleSaveStudent}
                  onBulkSaveStudents={handleBulkSaveStudents}
                  onDeleteStudent={handleDeleteStudent}
                  onUpdateCompletion={handleUpdateCompletion}
                  onToggleRegular={handleToggleRegular}
                  onNavigateToIrregular={() => setTrainerTab('irregular_students')}
                  classLink={trainerClassLink}
                  onOpenClassLinkModal={() => setIsClassLinkModalOpen(true)}
                  activeTrainerName={activeTrainer?.name || 'PPSTrainer'}
                />
              )}

              {trainerTab === 'irregular_students' && (
                <IrregularStudents
                  irregularStudents={irregularStudents}
                  onReactivateStudent={(id) => handleToggleRegular(id, false)}
                  onNavigateToSchedule={() => setTrainerTab('class_schedule')}
                />
              )}

              {trainerTab === 'class_links' && (
                <DailyClassLink
                  currentLink={trainerClassLink}
                  onUpdateClassLink={handleUpdateClassLink}
                  isLinkActive={isTrainerLinkActive}
                />
              )}

              {trainerTab === 'completion_template' && (
                <CompletionTemplateEditor
                  settings={completionSettings}
                  onSaveSettings={handleSaveCompletionSettings}
                  sampleStudent={selectedStudent || trainerStudents[0] || undefined}
                />
              )}

              {trainerTab === 'settings' && (
                <TrainerSettings
                  settings={effectiveTrainerSettings}
                  onSaveSettings={handleSaveTrainerSettings}
                  students={trainerStudents}
                  demos={trainerDemos}
                  attendance={trainerAttendance}
                  onClearAttendance={handleClearAttendance}
                  onWipeDatabase={handleWipeDatabase}
                />
              )}
            </main>

            {/* Enterprise Footer inside scrollable screen area */}
            <footer className="bg-white border-t border-[#d9e0e7] py-3 text-xs text-slate-500 mt-auto shrink-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">PPS Software Training & Student Management</span>
                  <span>•</span>
                  <span>{effectiveTrainerSettings.institutionName}</span>
                </div>
                <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                  <button
                    onClick={handleLogout}
                    className="text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Role: STUDENT PORTAL (Strictly for the authenticated student only) */}
      {role === 'student' && (
        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 h-full bg-[#f5f6f8]" id="student-screen-scroll">
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {selectedStudent ? (
              <StudentPortal
                currentStudent={selectedStudent}
                classLink={studentClassLink}
                isClassLinkActive={isStudentLinkActive}
                attendanceRecords={currentStudentAttendance}
                completionSettings={completionSettings}
                onStudentTouchLink={handleStudentTouchLink}
                todayStr={todayStr}
                allowedPercentageStudentIds={studentTrainerSettings.allowedPercentageStudentIds || []}
                allowedAttendanceStudentIds={studentTrainerSettings.allowedAttendanceStudentIds || []}
                holidays={studentTrainerSettings.holidays || []}
              />
            ) : (
              <div className="bg-white rounded-lg p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-slate-800">No Student Profile Loaded</h2>
                <p className="text-xs text-slate-500">
                  Please log out and sign in with your registered mobile number.
                </p>
                <div className="pt-2 flex justify-center space-x-2">
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Enterprise Footer inside student scrollable area */}
          <footer className="bg-white border-t border-[#d9e0e7] py-3 text-xs text-slate-500 mt-auto shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">PPS Software Training & Student Management</span>
                <span>•</span>
                <span>{studentTrainerSettings.institutionName}</span>
              </div>
              <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                <button
                  onClick={handleLogout}
                  className="text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* Quick Modal for Trainer Class Link Broadcast */}
      <ClassLinkModal
        isOpen={isClassLinkModalOpen}
        onClose={() => setIsClassLinkModalOpen(false)}
        currentLink={trainerClassLink}
        onSave={handleUpdateClassLink}
      />
    </div>
  );
}
