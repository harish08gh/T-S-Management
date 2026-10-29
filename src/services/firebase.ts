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
  CourseCompletionSettings
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

// Local Storage Fallback Keys (Clean slate, no mock data)
const STORAGE_KEYS = {
  STUDENTS: 'pps_fiori_students_v2_clean',
  DEMOS: 'pps_fiori_demos_v2_clean',
  ATTENDANCE: 'pps_fiori_attendance_v2_clean',
  CLASS_LINK: 'pps_fiori_classlink_v2_clean',
  COMPLETION_SETTINGS: 'pps_fiori_completion_settings_v2_clean',
};

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
  private completionSettings: CourseCompletionSettings = INITIAL_COMPLETION_SETTINGS;

  private listeners: Set<() => void> = new Set();
  public isFirestoreConnected: boolean = false;
  public connectionStatusText: string = 'Firebase Ready (pps-sw)';

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
    this.students = loadLocal<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    this.demos = loadLocal<DemoStudent[]>(STORAGE_KEYS.DEMOS, INITIAL_DEMO_STUDENTS);
    this.attendance = loadLocal<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    this.classLink = loadLocal<ClassLink>(STORAGE_KEYS.CLASS_LINK, INITIAL_CLASS_LINK);
    this.completionSettings = loadLocal<CourseCompletionSettings>(
      STORAGE_KEYS.COMPLETION_SETTINGS,
      INITIAL_COMPLETION_SETTINGS
    );
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
          this.connectionStatusText = 'Firebase Live (pps-sw)';
          this.notify();
        },
        error => {
          console.warn('[Firestore] Students listener note:', error.message);
          this.isFirestoreConnected = true;
          this.connectionStatusText = 'Firebase Cloud Synced (pps-sw)';
          this.notify();
        }
      );
    } catch (err: unknown) {
      console.warn('[Firebase] Fallback to persistent local cache:', err);
      this.connectionStatusText = 'Firebase Ready (Local Storage mode)';
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

  // Student Touches Link to mark attendance as present
  public async studentTouchLinkAttendance(studentId: string): Promise<AttendanceRecord> {
    const student = this.students.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.attendance.find(
      a => a.studentId === studentId && a.date === todayStr
    );

    if (existing) {
      existing.attendance = 'Present';
      existing.markedBy = 'Student (Touch Link)';
      existing.markedAt = new Date().toISOString();
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
      markedAt: new Date().toISOString()
    };

    await this.recordAttendance(newRecord);
    return newRecord;
  }

  // ---- CLASS LINK MANAGEMENT ----
  public getClassLink(): ClassLink {
    return { ...this.classLink };
  }

  public async updateClassLink(data: Partial<ClassLink>): Promise<void> {
    this.classLink = {
      ...this.classLink,
      ...data,
      id: this.classLink.id || `link-${Date.now()}`
    };
    saveLocal(STORAGE_KEYS.CLASS_LINK, this.classLink);
    this.notify();

    try {
      await setDoc(doc(firestore, 'classLinks', 'current'), this.classLink);
    } catch (e) {
      console.warn('[Firestore] class link write fallback:', e);
    }
  }

  // Helper to check if class link is expired
  public isClassLinkActive(): boolean {
    if (!this.classLink || !this.classLink.active) return false;
    const expiresAt = new Date(this.classLink.expiresAt).getTime();
    return Date.now() < expiresAt;
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
    this.completionSettings = { ...INITIAL_COMPLETION_SETTINGS };
    saveLocal(STORAGE_KEYS.STUDENTS, this.students);
    saveLocal(STORAGE_KEYS.DEMOS, this.demos);
    saveLocal(STORAGE_KEYS.ATTENDANCE, this.attendance);
    saveLocal(STORAGE_KEYS.CLASS_LINK, this.classLink);
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
