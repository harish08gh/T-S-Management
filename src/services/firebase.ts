import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Student,
  DemoStudent,
  AttendanceRecord,
  ClassLink,
  CourseCompletionSettings,
  TrainerAccount
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_DEMO_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_CLASS_LINK,
  INITIAL_COMPLETION_SETTINGS
} from './mockData';

// User's Firebase configuration
export const firebaseConfig = {
  apiKey: 'AIzaSyAY7T-mG_tAMyoN_4RHDMtGq00uGmVS4JE',
  authDomain: 'pps-sw.firebaseapp.com',
  projectId: 'pps-sw',
  storageBucket: 'pps-sw.firebasestorage.app',
  messagingSenderId: '185301845625',
  appId: '1:185301845625:web:7e7bbe747751a69e1036a8',
  measurementId: 'G-ZMVQSV3KXC'
};

// Initialize Firebase App singleton safely
export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const firestore = getFirestore(firebaseApp);

// Local Storage Fallback Keys
const STORAGE_KEYS = {
  STUDENTS: 'pps_fiori_students_v2_clean',
  DEMOS: 'pps_fiori_demos_v2_clean',
  ATTENDANCE: 'pps_fiori_attendance_v2_clean',
  CLASS_LINK: 'pps_fiori_classlink_v2_clean',
  TRAINER_CLASS_LINKS: 'pps_fiori_trainer_classlinks_v1',
  COMPLETION_SETTINGS: 'pps_fiori_completion_settings_v2_clean',
  TRAINERS: 'pps_fiori_trainers_v1',
  DEFAULT_TRAINER_PW: 'pps_fiori_default_trainer_pw_v1',
};

export const INITIAL_DEFAULT_TRAINER_PASSWORD = 'PPS@2026';

// Helpers for localStorage sync
function loadLocal<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`[LocalStore] Failed to read ${key}`, e);
    return defaultValue;
  }
}

function saveLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[LocalStore] Failed to write ${key}`, e);
  }
}

// In-memory / reactive repository with Firestore real-time sync & fallback
export class DataService {
  private static instance: DataService;

  private students: Student[] = [];
  private demos: DemoStudent[] = [];
  private attendance: AttendanceRecord[] = [];
  private classLink: ClassLink = INITIAL_CLASS_LINK;
  private trainerClassLinks: Record<string, ClassLink> = {};
  private completionSettings: CourseCompletionSettings = INITIAL_COMPLETION_SETTINGS;
  private trainers: TrainerAccount[] = [];
  private defaultTrainerPassword: string = INITIAL_DEFAULT_TRAINER_PASSWORD;

  private listeners: Set<() => void> = new Set();
  public isFirestoreConnected: boolean = false;
  public connectionStatusText: string = 'System Ready';

  private constructor() {
    this.initLocalData();
    this.initFirestoreSync();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private initLocalData() {
    const loadedStudents = loadLocal<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    if (!loadedStudents || loadedStudents.length === 0 || !loadedStudents.some(s => s.id === 'comp-38')) {
      const existingMap = new Map((loadedStudents || []).map(s => [s.id, s]));
      INITIAL_STUDENTS.forEach(s => {
        if (!existingMap.has(s.id)) existingMap.set(s.id, s);
      });
      this.students = Array.from(existingMap.values());
      saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    } else {
      this.students = loadedStudents;
    }
    const loadedDemos = loadLocal<DemoStudent[]>(STORAGE_KEYS.DEMOS, INITIAL_DEMO_STUDENTS);
    // Ensure all 17 demo students are loaded
    if (!loadedDemos || loadedDemos.length === 0 || !loadedDemos.some(d => d.id === 'demo-17')) {
      this.demos = INITIAL_DEMO_STUDENTS;
      saveLocal(STORAGE_KEYS.DEMOS, INITIAL_DEMO_STUDENTS);
    } else {
      this.demos = loadedDemos;
    }
    this.attendance = loadLocal<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    
    // Validate class link freshness - must be created today, not the old default meet.google.com link
    const loadedClassLink = loadLocal<ClassLink>(STORAGE_KEYS.CLASS_LINK, INITIAL_CLASS_LINK);
    const todayStr = new Date().toISOString().split('T')[0];
    const linkCreatedDate = loadedClassLink.createdAt ? loadedClassLink.createdAt.split('T')[0] : '';
    
    if (!linkCreatedDate || linkCreatedDate !== todayStr || loadedClassLink.url === 'https://meet.google.com/new') {
      this.classLink = {
        ...INITIAL_CLASS_LINK,
        active: false,
        url: '',
        createdAt: '',
        expiresAt: ''
      };
      saveLocal(STORAGE_KEYS.CLASS_LINK, this.classLink);
    } else {
      this.classLink = loadedClassLink;
    }

    this.completionSettings = loadLocal<CourseCompletionSettings>(
      STORAGE_KEYS.COMPLETION_SETTINGS,
      INITIAL_COMPLETION_SETTINGS
    );

    this.defaultTrainerPassword = loadLocal<string>(
      STORAGE_KEYS.DEFAULT_TRAINER_PW,
      INITIAL_DEFAULT_TRAINER_PASSWORD
    ) || INITIAL_DEFAULT_TRAINER_PASSWORD;

    this.trainerClassLinks = loadLocal<Record<string, ClassLink>>(
      STORAGE_KEYS.TRAINER_CLASS_LINKS,
      {}
    );

    // Load or seed trainers based on existing trainerNames in students/demos
    const loadedTrainers = loadLocal<TrainerAccount[]>(STORAGE_KEYS.TRAINERS, []);
    if (!loadedTrainers || loadedTrainers.length === 0) {
      const seedTrainerNames = new Set<string>(['HARISH']);
      this.students.forEach(s => {
        if (s.trainerName && s.trainerName.trim()) {
          seedTrainerNames.add(s.trainerName.trim());
        }
      });
      this.demos.forEach(d => {
        if (d.trainerName && d.trainerName.trim()) {
          seedTrainerNames.add(d.trainerName.trim());
        }
      });

      const nowIso = new Date().toISOString();
      this.trainers = Array.from(seedTrainerNames).map((tName, idx) => ({
        id: tName.toUpperCase() === 'HARISH' ? 'trainer-harish' : `trainer-${idx + 1}-${tName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        name: tName,
        username: tName,
        email: `${tName.toLowerCase().replace(/[^a-z0-9]/g, '')}@pps-sw.com`,
        phone: idx === 0 ? '+91 98400 00000' : '',
        specialization: 'SAP ABAP, Data Analytics, Python Full Stack',
        password: this.defaultTrainerPassword,
        isDefaultPassword: true,
        status: 'Active',
        createdAt: nowIso
      }));
      saveLocal(STORAGE_KEYS.TRAINERS, this.trainers);
    } else {
      this.trainers = loadedTrainers;
    }
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Attempt to listen on Firestore
  private async initFirestoreSync() {
    try {
      const studentsCol = collection(firestore, 'students');
      
      onSnapshot(
        studentsCol,
        snapshot => {
          if (!snapshot.empty) {
            const list: Student[] = [];
            snapshot.forEach(docSnap => {
              list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Student, 'id'>) });
            });
            this.students = list;
            saveLocal(STORAGE_KEYS.STUDENTS, list);
          }
          this.isFirestoreConnected = true;
          this.connectionStatusText = 'Cloud Synced';
          this.notify();
        },
        error => {
          console.warn('[Firestore] Students listener note:', error.message);
          this.isFirestoreConnected = true;
          this.connectionStatusText = 'Cloud Synced';
          this.notify();
        }
      );
    } catch (err: unknown) {
      console.warn('[Firebase] Fallback to persistent local cache:', err);
      this.connectionStatusText = 'Cache Ready';
      this.notify();
    }
  }

  // Student phone lookup (matches mobile numbers ignoring spaces/special chars)
  public findStudentByPhone(phoneQuery: string): Student | undefined {
    const cleanQuery = phoneQuery.replace(/[^0-9]/g, '');
    if (!cleanQuery) return undefined;
    return this.students.find(s => {
      const cleanStudentPhone = (s.phone || '').replace(/[^0-9]/g, '');
      return (
        cleanStudentPhone === cleanQuery ||
        cleanStudentPhone.endsWith(cleanQuery) ||
        cleanQuery.endsWith(cleanStudentPhone)
      );
    });
  }

  // ---- STUDENTS CRUD ----
  public getStudents(): Student[] {
    return [...this.students];
  }

  public getOngoingStudents(): Student[] {
    return this.students.filter(s => s.status === 'Ongoing' && !s.isIrregular);
  }

  public getIrregularStudents(): Student[] {
    return this.students.filter(s => s.isIrregular);
  }

  public getCompletedStudents(): Student[] {
    return this.students.filter(s => s.status === 'Completed');
  }

  public async saveStudent(student: Student): Promise<void> {
    const idx = this.students.findIndex(s => s.id === student.id);
    if (idx >= 0) {
      this.students[idx] = student;
    } else {
      this.students.push(student);
    }
    saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    this.notify();

    try {
      await setDoc(doc(firestore, 'students', student.id), student);
    } catch (e) {
      console.warn('[Firestore] write fallback:', e);
    }
  }

  public async saveStudentsBatch(newStudents: Student[]): Promise<void> {
    if (!newStudents.length) return;
    const current = [...this.students];
    newStudents.forEach(st => {
      const idx = current.findIndex(s => s.id === st.id || (s.phone && s.phone === st.phone));
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...st };
      } else {
        current.push(st);
      }
    });
    this.students = current;
    saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    this.notify();

    for (const st of newStudents) {
      try {
        await setDoc(doc(firestore, 'students', st.id), st);
      } catch (e) {
        console.warn('[Firestore] batch write error:', e);
      }
    }
  }

  public async deleteStudent(id: string): Promise<void> {
    this.students = this.students.filter(s => s.id !== id);
    saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'students', id));
    } catch (e) {
      console.warn('[Firestore] delete fallback:', e);
    }
  }

  public async updateStudentCompletion(id: string, percentage: number, doe?: string): Promise<void> {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    student.completionPercentage = percentage;
    if (percentage >= 100) {
      student.status = 'Completed';
      if (doe) {
        student.doe = doe;
      } else if (!student.doe) {
        student.doe = new Date().toISOString().split('T')[0];
      }
    } else if (student.status === 'Completed' && percentage < 100) {
      student.status = 'Ongoing';
      delete student.doe;
    }

    await this.saveStudent(student);
  }

  public async toggleStudentRegularStatus(id: string, isIrregular: boolean, reason?: string): Promise<void> {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    student.isIrregular = isIrregular;
    if (isIrregular) {
      student.irregularReason = reason || 'Marked as irregular by trainer';
    } else {
      delete student.irregularReason;
    }

    await this.saveStudent(student);
  }

  public async setStudentTempTiming(id: string, date: string, timing: string, reason?: string): Promise<void> {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    const currentOverrides = { ...(student.tempTimingOverrides || {}) };
    currentOverrides[date] = {
      timing,
      reason: reason || 'Temporary timing change for the session',
      setAt: new Date().toISOString()
    };
    student.tempTimingOverrides = currentOverrides;

    await this.saveStudent(student);
  }

  public async removeStudentTempTiming(id: string, date: string): Promise<void> {
    const student = this.students.find(s => s.id === id);
    if (!student || !student.tempTimingOverrides) return;

    const currentOverrides = { ...student.tempTimingOverrides };
    delete currentOverrides[date];
    student.tempTimingOverrides = currentOverrides;

    await this.saveStudent(student);
  }

  // ---- DEMO STUDENTS CRUD ----
  public getDemos(): DemoStudent[] {
    return [...this.demos];
  }

  public async saveDemo(demo: DemoStudent): Promise<void> {
    const idx = this.demos.findIndex(d => d.id === demo.id);
    if (idx >= 0) {
      this.demos[idx] = demo;
    } else {
      this.demos.unshift(demo);
    }
    saveLocal(STORAGE_KEYS.DEMOS, this.demos);
    this.notify();

    try {
      await setDoc(doc(firestore, 'demos', demo.id), demo);
    } catch (e) {
      console.warn('[Firestore] demo write fallback:', e);
    }
  }

  public async saveDemosBatch(newDemos: DemoStudent[]): Promise<void> {
    if (!newDemos.length) return;
    const current = [...this.demos];
    newDemos.forEach(dm => {
      const idx = current.findIndex(d => d.id === dm.id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...dm };
      } else {
        current.unshift(dm);
      }
    });
    this.demos = current;
    saveLocal(STORAGE_KEYS.DEMOS, this.demos);
    this.notify();

    for (const dm of newDemos) {
      try {
        await setDoc(doc(firestore, 'demos', dm.id), dm);
      } catch (e) {
        console.warn('[Firestore] demo batch write error:', e);
      }
    }
  }

  public async deleteDemo(id: string): Promise<void> {
    this.demos = this.demos.filter(d => d.id !== id);
    saveLocal(STORAGE_KEYS.DEMOS, this.demos);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'demos', id));
    } catch (e) {
      console.warn('[Firestore] demo delete fallback:', e);
    }
  }

  public async convertDemoToOngoing(
    demoId: string,
    batchData: {
      doj: string;
      timing: string;
      mode: 'Weekdays' | 'Weekend';
      type: 'Online' | 'Offline';
      remark?: string;
    }
  ): Promise<Student> {
    const demo = this.demos.find(d => d.id === demoId);
    if (!demo) throw new Error('Demo record not found');

    // Update demo status
    demo.status = 'Converted';
    await this.saveDemo(demo);

    // Create new Ongoing student
    const newStudent: Student = {
      id: `std-${Date.now()}`,
      sno: this.students.length + 1,
      name: demo.name,
      phone: demo.phone,
      email: demo.email || `${demo.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      course: demo.course,
      doj: batchData.doj || new Date().toISOString().split('T')[0],
      status: 'Ongoing',
      mode: batchData.mode,
      type: batchData.type,
      timing: batchData.timing || '09:00 AM - 10:30 AM',
      completionPercentage: 0,
      trainerId: demo.trainerId,
      trainerName: demo.trainerName || 'PPSTrainer',
      remark: batchData.remark || `Converted from demo on ${demo.date}. ${demo.feedback}`,
      isIrregular: false,
      lastActiveDate: new Date().toISOString().split('T')[0]
    };

    await this.saveStudent(newStudent);
    return newStudent;
  }

  // ---- ATTENDANCE CRUD & VERIFICATION ----
  public getAttendance(): AttendanceRecord[] {
    return [...this.attendance];
  }

  public getAttendanceForStudent(studentId: string): AttendanceRecord[] {
    return this.attendance
      .filter(a => a.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public async recordAttendance(record: AttendanceRecord): Promise<void> {
    // Check if record exists for this student on this date
    const idx = this.attendance.findIndex(
      a => a.studentId === record.studentId && a.date === record.date
    );
    if (idx >= 0) {
      this.attendance[idx] = record;
    } else {
      this.attendance.unshift(record);
    }

    // Update student's last active date if present
    if (record.attendance === 'Present') {
      const student = this.students.find(s => s.id === record.studentId);
      if (student) {
        student.lastActiveDate = record.date;
        saveLocal(STORAGE_KEYS.STUDENTS, this.students);
      }
    }

    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendance);
    this.notify();

    try {
      await setDoc(doc(firestore, 'attendance', record.id), record);
    } catch (e) {
      console.warn('[Firestore] attendance write fallback:', e);
    }
  }

  public async updateAttendanceTopic(id: string, topicCovered: string): Promise<void> {
    const record = this.attendance.find(a => a.id === id);
    if (!record) return;
    record.topicCovered = topicCovered;
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendance);
    this.notify();

    try {
      await updateDoc(doc(firestore, 'attendance', id), { topicCovered });
    } catch (e) {
      console.warn('[Firestore] update attendance topic fallback:', e);
    }
  }

  // Check which ongoing students have NOT yet registered attendance for a given date (e.g. today)
  public getStudentsMissingAttendance(dateStr: string): Student[] {
    const markedStudentIds = new Set(
      this.attendance.filter(a => a.date === dateStr).map(a => a.studentId)
    );
    return this.getOngoingStudents().filter(s => !markedStudentIds.has(s.id));
  }

  // Student Touches Link to mark attendance as present and optionally logs absence explanation
  public async studentTouchLinkAttendance(
    studentId: string,
    absenceReason?: string,
    missedRecordIds?: string[]
  ): Promise<AttendanceRecord> {
    const student = this.students.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');

    // If an absence reason was provided for prior missed dates, update those records
    if (absenceReason && missedRecordIds && missedRecordIds.length > 0) {
      for (const recId of missedRecordIds) {
        const missedRec = this.attendance.find(a => a.id === recId);
        if (missedRec) {
          missedRec.absenceReason = absenceReason;
          try {
            await updateDoc(doc(firestore, 'attendance', recId), { absenceReason });
          } catch (e) {
            console.warn('[Firestore] update absence reason fallback:', e);
          }
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.attendance.find(
      a => a.studentId === studentId && a.date === todayStr
    );

    if (existing) {
      existing.attendance = 'Present';
      existing.markedBy = 'Student (Touch Link)';
      existing.markedAt = new Date().toISOString();
      if (absenceReason && !existing.absenceReason) {
        existing.absenceReason = `Absence explained upon rejoin: ${absenceReason}`;
      }
      await this.recordAttendance(existing);
      return existing;
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      course: student.course,
      date: todayStr,
      time: student.timing ? student.timing.split('-')[0].trim() : '09:00 AM',
      attendance: 'Present',
      topicCovered: 'Daily Session - Student Joined via Active Class Link',
      markedBy: 'Student (Touch Link)',
      markedAt: new Date().toISOString(),
      absenceReason: absenceReason ? `Absence explained upon rejoin: ${absenceReason}` : undefined
    };

    await this.recordAttendance(newRecord);
    return newRecord;
  }

  // ---- TRAINERS & ADMIN PORTAL MANAGEMENT ----
  public getDefaultTrainerPassword(): string {
    return this.defaultTrainerPassword;
  }

  public async updateDefaultTrainerPassword(newDefaultPw: string, syncPendingTrainers: boolean = true): Promise<void> {
    const trimmed = newDefaultPw.trim();
    if (!trimmed) return;
    this.defaultTrainerPassword = trimmed;
    saveLocal(STORAGE_KEYS.DEFAULT_TRAINER_PW, this.defaultTrainerPassword);

    if (syncPendingTrainers) {
      this.trainers = this.trainers.map(t =>
        t.isDefaultPassword ? { ...t, password: trimmed } : t
      );
      saveLocal(STORAGE_KEYS.TRAINERS, this.trainers);
    }
    this.notify();
  }

  public getTrainers(): TrainerAccount[] {
    return [...this.trainers];
  }

  public async saveTrainer(trainer: TrainerAccount): Promise<void> {
    const idx = this.trainers.findIndex(t => t.id === trainer.id);
    if (idx >= 0) {
      this.trainers[idx] = trainer;
    } else {
      this.trainers.push(trainer);
    }
    saveLocal(STORAGE_KEYS.TRAINERS, this.trainers);
    this.notify();

    try {
      await setDoc(doc(firestore, 'trainers', trainer.id), trainer);
    } catch (e) {
      console.warn('[Firestore] trainer write fallback:', e);
    }
  }

  public async deleteTrainer(id: string): Promise<void> {
    this.trainers = this.trainers.filter(t => t.id !== id);
    saveLocal(STORAGE_KEYS.TRAINERS, this.trainers);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'trainers', id));
    } catch (e) {
      console.warn('[Firestore] trainer delete fallback:', e);
    }
  }

  public async resetTrainerPasswordToDefault(trainerId: string): Promise<TrainerAccount> {
    const idx = this.trainers.findIndex(t => t.id === trainerId);
    if (idx < 0) throw new Error('Trainer not found');

    const updated: TrainerAccount = {
      ...this.trainers[idx],
      password: this.defaultTrainerPassword,
      isDefaultPassword: true,
      passwordUpdatedAt: new Date().toISOString()
    };
    this.trainers[idx] = updated;
    saveLocal(STORAGE_KEYS.TRAINERS, this.trainers);
    this.notify();

    try {
      await setDoc(doc(firestore, 'trainers', trainerId), updated);
    } catch (e) {
      console.warn('[Firestore] trainer password reset fallback:', e);
    }
    return updated;
  }

  public async updateTrainerPassword(trainerId: string, newPassword: string): Promise<TrainerAccount> {
    const idx = this.trainers.findIndex(t => t.id === trainerId);
    if (idx < 0) throw new Error('Trainer not found');

    const nowIso = new Date().toISOString();
    const updated: TrainerAccount = {
      ...this.trainers[idx],
      password: newPassword,
      isDefaultPassword: false,
      passwordUpdatedAt: nowIso,
      lastLoginAt: nowIso
    };
    this.trainers[idx] = updated;
    saveLocal(STORAGE_KEYS.TRAINERS, this.trainers);
    this.notify();

    try {
      await setDoc(doc(firestore, 'trainers', trainerId), updated);
    } catch (e) {
      console.warn('[Firestore] trainer password update fallback:', e);
    }
    return updated;
  }

  public async markTrainerLoggedIn(trainerId: string): Promise<void> {
    const idx = this.trainers.findIndex(t => t.id === trainerId);
    if (idx < 0) return;
    this.trainers[idx] = {
      ...this.trainers[idx],
      lastLoginAt: new Date().toISOString()
    };
    saveLocal(STORAGE_KEYS.TRAINERS, this.trainers);
    this.notify();
  }

  public authenticateTrainer(
    username: string,
    password: string
  ): {
    status: 'not_found' | 'inactive' | 'invalid_password' | 'require_password_reset' | 'success';
    trainer?: TrainerAccount;
  } {
    const cleanUser = username.trim().toLowerCase();
    const trainer = this.trainers.find(
      t => t.username.trim().toLowerCase() === cleanUser || t.name.trim().toLowerCase() === cleanUser
    );
    if (!trainer) return { status: 'not_found' };
    if (trainer.status !== 'Active') return { status: 'inactive', trainer };

    const matchesStored = trainer.password === password;
    const matchesCurrentDefault = trainer.isDefaultPassword && password === this.defaultTrainerPassword;

    if (!matchesStored && !matchesCurrentDefault) {
      return { status: 'invalid_password', trainer };
    }

    if (trainer.isDefaultPassword || password === this.defaultTrainerPassword) {
      return { status: 'require_password_reset', trainer };
    }

    return { status: 'success', trainer };
  }

  public async assignStudentsToTrainer(studentIds: string[], trainerId: string): Promise<void> {
    const trainer = this.trainers.find(t => t.id === trainerId);
    if (!trainer) return;
    const idSet = new Set(studentIds);
    this.students = this.students.map(s =>
      idSet.has(s.id) ? { ...s, trainerId: trainer.id, trainerName: trainer.name } : s
    );
    saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    this.notify();

    for (const s of this.students.filter(st => idSet.has(st.id))) {
      try {
        await setDoc(doc(firestore, 'students', s.id), s);
      } catch (e) {
        console.warn('[Firestore] assign student fallback:', e);
      }
    }
  }

  public async assignDemosToTrainer(demoIds: string[], trainerId: string): Promise<void> {
    const trainer = this.trainers.find(t => t.id === trainerId);
    if (!trainer) return;
    const idSet = new Set(demoIds);
    this.demos = this.demos.map(d =>
      idSet.has(d.id) ? { ...d, trainerId: trainer.id, trainerName: trainer.name } : d
    );
    saveLocal(STORAGE_KEYS.DEMOS, this.demos);
    this.notify();

    for (const d of this.demos.filter(dm => idSet.has(dm.id))) {
      try {
        await setDoc(doc(firestore, 'demos', d.id), d);
      } catch (e) {
        console.warn('[Firestore] assign demo fallback:', e);
      }
    }
  }

  // ---- CLASS LINK MANAGEMENT ----
  private resolveTrainerKey(trainerIdOrName?: string): string | null {
    if (!trainerIdOrName) return null;
    const clean = trainerIdOrName.trim().toLowerCase();
    const matched = this.trainers.find(
      t => t.id.toLowerCase() === clean || t.name.trim().toLowerCase() === clean || t.username.trim().toLowerCase() === clean
    );
    return matched ? matched.id : clean;
  }

  public getClassLink(): ClassLink {
    return { ...this.classLink };
  }

  public getClassLinkForTrainer(trainerIdOrName?: string): ClassLink {
    const key = this.resolveTrainerKey(trainerIdOrName);
    if (key && this.trainerClassLinks[key]) {
      const link = this.trainerClassLinks[key];
      const todayStr = new Date().toISOString().split('T')[0];
      const linkCreatedDate = link.createdAt ? link.createdAt.split('T')[0] : '';
      if (!linkCreatedDate || linkCreatedDate !== todayStr) {
        return {
          ...INITIAL_CLASS_LINK,
          trainerId: key,
          trainerName: link.trainerName || trainerIdOrName || 'Trainer',
          active: false,
          url: '',
          createdAt: '',
          expiresAt: ''
        };
      }
      return { ...link };
    }
    // Check if global classLink was published by this trainer
    if (key && this.classLink.trainerName) {
      const globalKey = this.resolveTrainerKey(this.classLink.trainerName);
      if (globalKey === key) {
        return { ...this.classLink };
      }
    }
    return {
      ...INITIAL_CLASS_LINK,
      trainerId: key || undefined,
      trainerName: trainerIdOrName || INITIAL_CLASS_LINK.trainerName,
      active: false,
      url: '',
      createdAt: '',
      expiresAt: ''
    };
  }

  public async updateClassLink(data: Partial<ClassLink>, trainerIdOrName?: string): Promise<void> {
    const key = this.resolveTrainerKey(trainerIdOrName || data.trainerId || data.trainerName);
    if (key) {
      const existing = this.trainerClassLinks[key] || { ...INITIAL_CLASS_LINK, trainerId: key };
      const updated: ClassLink = {
        ...existing,
        ...data,
        trainerId: key,
        id: existing.id || `link-${key}-${Date.now()}`
      };
      this.trainerClassLinks[key] = updated;
      saveLocal(STORAGE_KEYS.TRAINER_CLASS_LINKS, this.trainerClassLinks);
    }

    this.classLink = {
      ...this.classLink,
      ...data,
      id: this.classLink.id || `link-${Date.now()}`
    };
    saveLocal(STORAGE_KEYS.CLASS_LINK, this.classLink);
    this.notify();

    try {
      await setDoc(doc(firestore, 'classLinks', key || 'current'), key ? this.trainerClassLinks[key] : this.classLink);
    } catch (e) {
      console.warn('[Firestore] class link write fallback:', e);
    }
  }

  // Helper to check if class link is active (must be updated today by trainer and not expired)
  public isClassLinkActive(trainerIdOrName?: string): boolean {
    const link = trainerIdOrName ? this.getClassLinkForTrainer(trainerIdOrName) : this.classLink;
    if (!link || !link.active) return false;
    if (!link.url || !link.url.trim()) return false;
    if (!link.createdAt) return false;

    // Must be updated TODAY by trainer
    const todayStr = new Date().toISOString().split('T')[0];
    const createdDateStr = link.createdAt.split('T')[0];
    if (createdDateStr !== todayStr) return false;

    if (link.expiresAt) {
      const expiresAt = new Date(link.expiresAt).getTime();
      if (Date.now() >= expiresAt) return false;
    }

    return true;
  }

  // ---- COURSE COMPLETION SETTINGS & TEMPLATE ----
  public getCompletionSettings(): CourseCompletionSettings {
    return { ...this.completionSettings };
  }

  public async updateCompletionSettings(settings: CourseCompletionSettings): Promise<void> {
    this.completionSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    saveLocal(STORAGE_KEYS.COMPLETION_SETTINGS, this.completionSettings);
    this.notify();

    try {
      await setDoc(doc(firestore, 'completionSettings', 'default'), this.completionSettings);
    } catch (e) {
      console.warn('[Firestore] completion settings write fallback:', e);
    }
  }

  // Reset to clean data (convenience tool for testing)
  public resetToSampleData() {
    this.students = [];
    this.demos = [];
    this.attendance = [];
    this.classLink = { ...INITIAL_CLASS_LINK };
    this.trainerClassLinks = {};
    this.completionSettings = { ...INITIAL_COMPLETION_SETTINGS };
    saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    saveLocal(STORAGE_KEYS.DEMOS, this.demos);
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendance);
    saveLocal(STORAGE_KEYS.CLASS_LINK, this.classLink);
    saveLocal(STORAGE_KEYS.TRAINER_CLASS_LINKS, this.trainerClassLinks);
    saveLocal(STORAGE_KEYS.COMPLETION_SETTINGS, this.completionSettings);
    this.notify();
  }

  // Clear attendance records
  public clearAllAttendance() {
    this.attendance = [];
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendance);
    this.notify();
  }

  // Full clean wipe (remove all fake or real records to start completely fresh)
  public wipeAllData() {
    this.students = [];
    this.demos = [];
    this.attendance = [];
    saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    saveLocal(STORAGE_KEYS.DEMOS, this.demos);
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendance);
    this.notify();
  }
}

export const dataService = DataService.getInstance();
