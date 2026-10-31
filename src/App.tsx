import React, { useState, useEffect } from 'react';
import { dataService } from './services/firebase';
import {
  Student,
  DemoStudent,
  AttendanceRecord,
  ClassLink,
  CourseCompletionSettings,
  TrainerSystemSettings,
  UserRole,
  TrainerTab
} from './types';
import { ShellBar } from './components/ShellBar';
import { NavigationTabBar } from './components/NavigationTabBar';
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
import { LoginPage } from './components/auth/LoginPage';
import { CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';

const AUTH_STORAGE_KEY = 'pps_auth_session_clean_v3';
const SETTINGS_STORAGE_KEY = 'pps_trainer_system_settings_v3';

const DEFAULT_TRAINER_SETTINGS: TrainerSystemSettings = {
  trainerName: 'PPSTrainer',
  trainerEmail: 'trainer@pps-sw.com',
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
  }
};

interface AuthSession {
  role: UserRole;
  studentId?: string;
}

export default function App() {
  // Authentication session
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // System settings
  const [systemSettings, setSystemSettings] = useState<TrainerSystemSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return DEFAULT_TRAINER_SETTINGS;
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_TRAINER_SETTINGS,
        ...parsed,
        weekOffDays: parsed.weekOffDays || DEFAULT_TRAINER_SETTINGS.weekOffDays,
        lunchBreak: parsed.lunchBreak || DEFAULT_TRAINER_SETTINGS.lunchBreak,
        leaves: parsed.leaves || DEFAULT_TRAINER_SETTINGS.leaves,
        shiftTimingWeekday: parsed.shiftTimingWeekday || DEFAULT_TRAINER_SETTINGS.shiftTimingWeekday,
        shiftTimingWeekend: parsed.shiftTimingWeekend || DEFAULT_TRAINER_SETTINGS.shiftTimingWeekend,
      };
    } catch {
      return DEFAULT_TRAINER_SETTINGS;
    }
  });

  const [role, setRole] = useState<UserRole>(authSession?.role || 'trainer');
  const [trainerTab, setTrainerTab] = useState<TrainerTab>('dashboard');

  // Data state synced from DataService
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
  const [demos, setDemos] = useState<DemoStudent[]>(dataService.getDemos());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(dataService.getAttendance());
  const [classLink, setClassLink] = useState<ClassLink>(dataService.getClassLink());
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
      setCompletionSettings(dataService.getCompletionSettings());
      setSyncStatus(dataService.connectionStatusText);
      setIsSynced(dataService.isFirestoreConnected);
    };

    syncState();
    const unsubscribe = dataService.subscribe(syncState);
    return () => unsubscribe();
  }, []);

  // When logged in as student, bind ONLY to that student's identity
  useEffect(() => {
    if (authSession?.role === 'student' && authSession.studentId) {
      const found = students.find(s => s.id === authSession.studentId);
      if (found) {
        setSelectedStudent(found);
      }
    }
  }, [students, authSession]);

  // Derived datasets
  const ongoingStudents = students.filter(s => s.status === 'Ongoing' && !s.isIrregular);
  const irregularStudents = students.filter(s => s.isIrregular);
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const markedStudentIds = new Set(todayAttendance.map(a => a.studentId));
  const pendingAttendanceCount = ongoingStudents.filter(s => !markedStudentIds.has(s.id)).length;
  const isLinkActive = dataService.isClassLinkActive();

  // Attendance records for currently selected student (strictly isolated)
  const currentStudentAttendance = selectedStudent
    ? attendance.filter(a => a.studentId === selectedStudent.id)
    : [];

  // Authentication Handlers
  const handleTrainerLoginSuccess = () => {
    const session: AuthSession = { role: 'trainer' };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setAuthSession(session);
    setRole('trainer');
    showToast('Signed in successfully as PPSTrainer', 'success');
  };

  const handleStudentLoginSuccess = (student: Student) => {
    const session: AuthSession = { role: 'student', studentId: student.id };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setAuthSession(session);
    setRole('student');
    setSelectedStudent(student);
    showToast(`Welcome back, ${student.name}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
    setSelectedStudent(null);
    showToast('Logged out successfully', 'info');
  };

  // Trainer Settings Save
  const handleSaveTrainerSettings = (newSettings: TrainerSystemSettings) => {
    setSystemSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
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

  // Handler: Save Student (Add / Edit)
  const handleSaveStudent = async (student: Student) => {
    await dataService.saveStudent(student);
    showToast(`Student record saved for ${student.name}`, 'success');
  };

  const handleBulkSaveStudents = async (newStudents: Student[]) => {
    await dataService.saveStudentsBatch(newStudents);
    showToast(`Successfully imported ${newStudents.length} students from CSV!`, 'success');
  };

  // Handler: Delete Student
  const handleDeleteStudent = async (id: string) => {
    await dataService.deleteStudent(id);
    showToast('Student record deleted', 'info');
  };

  // Handler: Quick Mark Attendance from Dashboard
  const handleQuickMarkAttendance = async (studentId: string, status: 'Present' | 'Absent') => {
    const student = students.find(s => s.id === studentId);
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
    showToast(`Marked ${student.name} as ${status} for today (${todayStr})`, status === 'Present' ? 'success' : 'warning');
  };

  // Handler: Quick Completion % delta
  const handleQuickUpdateCompletion = async (studentId: string, delta: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const newPct = Math.min(100, Math.max(0, student.completionPercentage + delta));
    await dataService.updateStudentCompletion(studentId, newPct);
    showToast(`Updated progress for ${student.name}: ${newPct}%`, 'info');
  };

  // Handler: Full Completion % Update (with optional DOE)
  const handleUpdateCompletion = async (studentId: string, percentage: number, doe?: string) => {
    await dataService.updateStudentCompletion(studentId, percentage, doe);
    const student = students.find(s => s.id === studentId);
    if (percentage >= 100) {
      showToast(`${student?.name || 'Student'} completed 100%! Date of Ending logged as ${doe}.`, 'success');
    } else {
      showToast(`Updated completion percentage to ${percentage}%`, 'info');
    }
  };

  // Handler: Move to Irregular / Regular
  const handleToggleRegular = async (studentId: string, isIrregular: boolean, reason?: string) => {
    await dataService.toggleStudentRegularStatus(studentId, isIrregular, reason);
    const student = students.find(s => s.id === studentId);
    if (isIrregular) {
      showToast(`Moved ${student?.name} to Irregular Student Page`, 'warning');
    } else {
      showToast(`Re-activated ${student?.name} to Regular Class Schedule`, 'success');
    }
  };

  // Handler: Demo actions
  const handleSaveDemo = async (demo: DemoStudent) => {
    await dataService.saveDemo(demo);
    showToast(`Demo record saved for ${demo.name}`, 'success');
  };

  const handleBulkSaveDemos = async (newDemos: DemoStudent[]) => {
    await dataService.saveDemosBatch(newDemos);
    showToast(`Successfully imported ${newDemos.length} demo candidates from CSV!`, 'success');
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
  const handleStudentTouchLink = async (studentId: string) => {
    await dataService.studentTouchLinkAttendance(studentId);
    showToast('Attendance logged as PRESENT via Class Link Touch!', 'success');
  };

  // Handler: Class Link update
  const handleUpdateClassLink = async (data: Partial<ClassLink>) => {
    await dataService.updateClassLink(data);
    showToast('Class link updated & broadcasted', 'success');
  };

  // Handler: Completion Settings
  const handleSaveCompletionSettings = async (settings: CourseCompletionSettings) => {
    await dataService.updateCompletionSettings(settings);
    showToast('Course completion mail template saved', 'success');
  };

  // IF NOT AUTHENTICATED: Show Dedicated Login Page
  if (!authSession) {
    return (
      <LoginPage
        onTrainerLoginSuccess={handleTrainerLoginSuccess}
        onStudentLoginSuccess={handleStudentLoginSuccess}
        onFindStudentByPhone={(phone) => dataService.findStudentByPhone(phone)}
        enrolledStudentsCount={students.length}
        expectedTrainerPassword={systemSettings.trainerPassword}
        expectedStudentPassword={systemSettings.studentPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col text-[#2b3036]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 text-xs font-semibold text-white ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600'
              : 'bg-[#0a6ed1]'
          }`}>
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
        onRoleChange={setRole}
        selectedStudent={selectedStudent}
        allStudents={students}
        onSelectStudent={setSelectedStudent}
        syncStatus={syncStatus}
        isSynced={isSynced}
        onRefreshData={() => {
          setStudents(dataService.getStudents());
          showToast('Data refreshed and synchronized', 'info');
        }}
        pendingAttendanceCount={pendingAttendanceCount}
        irregularCount={irregularStudents.length}
        onLogout={handleLogout}
      />

      {/* Role: TRAINER PORTAL */}
      {role === 'trainer' && (
        <>
          {/* Sub Navigation Tab Bar */}
          <NavigationTabBar
            activeTab={trainerTab}
            onTabChange={setTrainerTab}
            counts={{
              allStudents: students.length,
              ongoing: ongoingStudents.length,
              demos: demos.length,
              attendanceToday: todayAttendance.filter(a => a.attendance === 'Present').length,
              irregular: irregularStudents.length,
              pendingAttendance: pendingAttendanceCount
            }}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {trainerTab === 'dashboard' && (
              <Dashboard
                students={students}
                demos={demos}
                attendance={attendance}
                classLink={classLink}
                isClassLinkActive={isLinkActive}
                onNavigateTab={setTrainerTab}
                onQuickMarkAttendance={handleQuickMarkAttendance}
                onQuickUpdateCompletion={handleQuickUpdateCompletion}
                onOpenClassLinkModal={() => setIsClassLinkModalOpen(true)}
                onSaveStudent={handleSaveStudent}
                todayStr={todayStr}
                settings={systemSettings}
              />
            )}

            {trainerTab === 'student_details' && (
              <StudentDetails students={students} />
            )}

            {trainerTab === 'demo_management' && (
              <DemoManagement
                demos={demos}
                onSaveDemo={handleSaveDemo}
                onBulkSaveDemos={handleBulkSaveDemos}
                onDeleteDemo={handleDeleteDemo}
                onConvertDemoToOngoing={handleConvertDemoToOngoing}
              />
            )}

            {trainerTab === 'attendance_tracking' && (
              <AttendanceTracking
                ongoingStudents={ongoingStudents}
                attendance={attendance}
                onRecordAttendance={handleRecordAttendance}
                onUpdateTopic={handleUpdateTopic}
                todayStr={todayStr}
                settings={systemSettings}
              />
            )}

            {trainerTab === 'class_schedule' && (
              <ClassSchedule
                ongoingStudents={ongoingStudents}
                onSaveStudent={handleSaveStudent}
                onBulkSaveStudents={handleBulkSaveStudents}
                onDeleteStudent={handleDeleteStudent}
                onUpdateCompletion={handleUpdateCompletion}
                onToggleRegular={handleToggleRegular}
                onNavigateToIrregular={() => setTrainerTab('irregular_students')}
                classLink={classLink}
                onOpenClassLinkModal={() => setIsClassLinkModalOpen(true)}
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
                currentLink={classLink}
                onUpdateClassLink={handleUpdateClassLink}
                isLinkActive={isLinkActive}
              />
            )}

            {trainerTab === 'completion_template' && (
              <CompletionTemplateEditor
                settings={completionSettings}
                onSaveSettings={handleSaveCompletionSettings}
                sampleStudent={selectedStudent || undefined}
              />
            )}

            {trainerTab === 'settings' && (
              <TrainerSettings
                settings={systemSettings}
                onSaveSettings={handleSaveTrainerSettings}
                students={students}
                demos={demos}
                attendance={attendance}
                onClearAttendance={handleClearAttendance}
                onWipeDatabase={handleWipeDatabase}
              />
            )}
          </main>
        </>
      )}

      {/* Role: STUDENT PORTAL (Strictly for the authenticated student only) */}
      {role === 'student' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {selectedStudent ? (
            <StudentPortal
              currentStudent={selectedStudent}
              classLink={classLink}
              isClassLinkActive={isLinkActive}
              attendanceRecords={currentStudentAttendance}
              completionSettings={completionSettings}
              onStudentTouchLink={handleStudentTouchLink}
              todayStr={todayStr}
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
      )}

      {/* Quick Modal for Trainer Class Link Broadcast */}
      <ClassLinkModal
        isOpen={isClassLinkModalOpen}
        onClose={() => setIsClassLinkModalOpen(false)}
        currentLink={classLink}
        onSave={handleUpdateClassLink}
      />

      {/* Enterprise Footer */}
      <footer className="bg-white border-t border-[#d9e0e7] py-3 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">PPS Software Training & Student Management</span>
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
  );
}
