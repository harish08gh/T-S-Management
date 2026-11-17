import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Lock,
  Phone,
  ShieldCheck,
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { Student, TrainerAccount } from '../../types';

interface LoginPageProps {
  onAdminLoginSuccess: () => void;
  onTrainerLoginSuccess: (trainer: TrainerAccount) => void;
  onStudentLoginSuccess: (student: Student) => void;
  onFindStudentByPhone: (phone: string) => Student | undefined;
  onAuthenticateTrainer: (
    username: string,
    password: string
  ) => {
    status: 'not_found' | 'inactive' | 'invalid_password' | 'require_password_reset' | 'success';
    trainer?: TrainerAccount;
  };
  onCompleteTrainerPasswordReset: (trainerId: string, newPassword: string) => Promise<TrainerAccount>;
  defaultTrainerPassword: string;
  enrolledStudentsCount: number;
  expectedStudentPassword?: string;
}

function detectPortalModeFromLocation(): 'admin' | 'trainer' | 'student' {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (hash.includes('admin') || search.includes('portal=admin')) {
      return 'admin';
    }
    if (hash.includes('trainer') || search.includes('portal=trainer')) {
      return 'trainer';
    }
  }
  // Default to student login so students never see admin or trainer login
  return 'student';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onAdminLoginSuccess,
  onTrainerLoginSuccess,
  onStudentLoginSuccess,
  onFindStudentByPhone,
  onAuthenticateTrainer,
  onCompleteTrainerPasswordReset,
  defaultTrainerPassword,
  enrolledStudentsCount,
  expectedStudentPassword = 'Student@PPS26'
}) => {
  const [portalMode, setPortalMode] = useState<'admin' | 'trainer' | 'student'>(detectPortalModeFromLocation);

  // Listen to hash / URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      setPortalMode(detectPortalModeFromLocation());
      setErrorMessage(null);
      setPendingResetTrainer(null);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Admin Credentials - strictly blank on load
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Trainer Credentials - strictly blank on load
  const [trainerUsername, setTrainerUsername] = useState('');
  const [trainerPassword, setTrainerPassword] = useState('');
  const [showTrainerPass, setShowTrainerPass] = useState(false);

  // Mandatory Trainer Default Password Reset State
  const [pendingResetTrainer, setPendingResetTrainer] = useState<TrainerAccount | null>(null);
  const [newPersonalPassword, setNewPersonalPassword] = useState('');
  const [confirmPersonalPassword, setConfirmPersonalPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Student Credentials - strictly blank on load
  const [studentMobile, setStudentMobile] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);

  // Error & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyUrl = (key: string, routeHash: string) => {
    if (typeof window === 'undefined') return;
    const fullUrl = `${window.location.origin}${window.location.pathname}${routeHash}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = adminUsername.trim();
    const trimmedPass = adminPassword.trim();

    if (trimmedUser === 'PPSAdmin' && trimmedPass === 'PPSAdmin2026') {
      onAdminLoginSuccess();
    } else {
      setErrorMessage('Invalid Admin credentials. Please check your Administrator username and password.');
    }
  };

  const handleTrainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = trainerUsername.trim();
    const trimmedPass = trainerPassword.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('Please enter both your trainer username and password.');
      return;
    }

    const result = onAuthenticateTrainer(trimmedUser, trimmedPass);
    if (result.status === 'not_found') {
      setErrorMessage('No trainer account found for that username. Please contact the Administrator.');
      return;
    }
    if (result.status === 'inactive') {
      setErrorMessage('Your trainer account is currently inactive. Please contact the Administrator to reactivate access.');
      return;
    }
    if (result.status === 'invalid_password') {
      setErrorMessage('Invalid trainer password. Please verify your password or ask the Admin to reset it.');
      return;
    }
    if (result.status === 'require_password_reset' && result.trainer) {
      setPendingResetTrainer(result.trainer);
      setNewPersonalPassword('');
      setConfirmPersonalPassword('');
      setErrorMessage(null);
      return;
    }
    if (result.status === 'success' && result.trainer) {
      onTrainerLoginSuccess(result.trainer);
    }
  };

  const handleTrainerPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingResetTrainer) return;
    setErrorMessage(null);

    const cleanNew = newPersonalPassword.trim();
    const cleanConfirm = confirmPersonalPassword.trim();

    if (cleanNew.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (cleanNew === defaultTrainerPassword) {
      setErrorMessage('Your personal password cannot match the default temporary password. Choose a unique password.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setErrorMessage('Passwords do not match. Please re-enter the same password in both fields.');
      return;
    }

    try {
      setIsResettingPassword(true);
      const updatedTrainer = await onCompleteTrainerPasswordReset(pendingResetTrainer.id, cleanNew);
      setPendingResetTrainer(null);
      setTrainerPassword('');
      onTrainerLoginSuccess(updatedTrainer);
    } catch {
      setErrorMessage('Could not update password. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedMobile = studentMobile.trim();
    const trimmedPass = studentPassword.trim();

    if (trimmedPass !== expectedStudentPassword) {
      setErrorMessage('Invalid student password. Please verify and try again.');
      return;
    }

    if (!trimmedMobile) {
      setErrorMessage('Please enter your registered mobile number.');
      return;
    }

    const matchedStudent = onFindStudentByPhone(trimmedMobile);
    if (!matchedStudent) {
      if (enrolledStudentsCount === 0) {
        setErrorMessage(
          'No enrolled students found. Please ask the trainer to add your details to the batch schedule first.'
        );
      } else {
        setErrorMessage(
          `No student record found with mobile number "${trimmedMobile}". Please verify the number or contact your trainer.`
        );
      }
      return;
    }

    onStudentLoginSuccess(matchedStudent);
  };

  return (
    <div className="h-full min-h-screen overflow-y-auto bg-radial from-[#1e3048] via-[#121e2c] to-[#0a121c] flex flex-col justify-center items-center px-4 py-8 antialiased">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* =========================================================================
            VIEW A: STUDENT LOGIN PAGE (Strictly for students - NO access to trainer/admin login)
           ========================================================================= */}
        {portalMode === 'student' && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl border border-emerald-400/40 text-white mb-2">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  Student Portal
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-medium text-slate-300">Live Learning & Attendance</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Student Learning Portal
              </h1>
              <p className="text-xs text-slate-400">
                Access your scheduled classes, touch to mark attendance, and track syllabus progress
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Sign In to Your Classes</h2>
                  <p className="text-[11px] text-slate-500">Enter your registered mobile number and password</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <form
                onSubmit={handleStudentSubmit}
                className="space-y-4 text-xs"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              >
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={studentMobile}
                      onChange={e => setStudentMobile(e.target.value)}
                      placeholder="e.g. 9943943334"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-xs font-medium"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Enter the phone number registered with your batch.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Student Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showStudentPass ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={studentPassword}
                      onChange={e => setStudentPassword(e.target.value)}
                      placeholder="Enter student password"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentPass(!showStudentPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showStudentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer"
                >
                  <span>Sign In to Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 text-center leading-relaxed">
                Need help or didn&apos;t receive your credentials? Please contact your course trainer directly.
              </div>
            </div>

            <div className="text-center text-xs text-slate-500">
              PPS Training Management System • Student Academic Portal
            </div>
          </>
        )}

        {/* =========================================================================
            VIEW B: TRAINER COCKPIT LOGIN + MANDATORY DEFAULT PASSWORD RESET
           ========================================================================= */}
        {portalMode === 'trainer' && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-[#0a6ed1] to-[#258cf0] shadow-xl border border-blue-400/40 text-white mb-2">
                {pendingResetTrainer ? <KeyRound className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                  Trainer Cockpit
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-medium text-slate-300">
                  {pendingResetTrainer ? 'Security Password Setup' : 'Instructor Access'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {pendingResetTrainer ? 'Set Personal Password' : 'Trainer Portal Login'}
              </h1>
              <p className="text-xs text-slate-400">
                {pendingResetTrainer
                  ? `Signed in as ${pendingResetTrainer.name}. Create a personal password to unlock your student portal.`
                  : 'Manage your assigned students, attendance tracking, schedules & daily class links'}
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-5">
              {!pendingResetTrainer ? (
                <>
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Trainer Account Sign In</h2>
                      <p className="text-[11px] text-slate-500">Access restricted to your assigned batches</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0a6ed1] flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">{errorMessage}</div>
                    </div>
                  )}

                  <form
                    onSubmit={handleTrainerSubmit}
                    className="space-y-4 text-xs"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  >
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Trainer Username
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={trainerUsername}
                          onChange={e => setTrainerUsername(e.target.value)}
                          placeholder="e.g. HARISH"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a6ed1]/30 focus:border-[#0a6ed1] text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type={showTrainerPass ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={trainerPassword}
                          onChange={e => setTrainerPassword(e.target.value)}
                          placeholder="Enter password (or default password)"
                          className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a6ed1]/30 focus:border-[#0a6ed1] text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTrainerPass(!showTrainerPass)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showTrainerPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        First time signing in or password reset by Admin? Log in with the default password to create your own.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded-md text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer"
                    >
                      <span>Sign In as Trainer</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Shareable Student URL Generator for Trainer */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                      <span>Student Portal Direct Link:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl('student_from_trainer', '#/student')}
                        className="text-[10px] text-[#0a6ed1] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'student_from_trainer' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link for Students</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] font-mono text-slate-600 truncate flex items-center justify-between">
                      <span>/#/student</span>
                      <a
                        href="#/student"
                        onClick={() => {
                          if (typeof window !== 'undefined') window.location.hash = '/student';
                          setPortalMode('student');
                        }}
                        className="text-[#0a6ed1] hover:underline flex items-center gap-1 font-sans text-[10px] font-semibold ml-2 shrink-0 cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* MANDATORY PASSWORD RESET FORM */}
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Required Password Update</h2>
                      <p className="text-[11px] text-slate-500">
                        Account: <span className="font-bold text-slate-700">{pendingResetTrainer.username}</span>
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <KeyRound className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                    You signed in with the system default password. Set a new personal password (minimum 6 characters) before entering your Trainer Portal.
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">{errorMessage}</div>
                    </div>
                  )}

                  <form
                    onSubmit={handleTrainerPasswordResetSubmit}
                    className="space-y-4 text-xs"
                    autoComplete="off"
                  >
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        New Personal Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={newPersonalPassword}
                          onChange={e => setNewPersonalPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a6ed1]/30 focus:border-[#0a6ed1] text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPersonalPassword}
                          onChange={e => setConfirmPersonalPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a6ed1]/30 focus:border-[#0a6ed1] text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingResetTrainer(null);
                          setErrorMessage(null);
                          setTrainerPassword('');
                        }}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isResettingPassword}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-md text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isResettingPassword ? 'Saving Password...' : 'Save Password & Enter Portal'}</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            <div className="text-center text-xs text-slate-500">
              PPS Training Management System • Trainer Gateway
            </div>
          </>
        )}

        {/* =========================================================================
            VIEW C: ADMIN PORTAL LOGIN (Accessible via #/admin)
           ========================================================================= */}
        {portalMode === 'admin' && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-xl border border-indigo-400/40 text-white mb-2">
                <Shield className="w-8 h-8" />
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                  Admin Console
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-medium text-slate-300">Trainer & Access Control</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Admin Portal Sign In
              </h1>
              <p className="text-xs text-slate-400">
                Create trainer accounts, reset trainer passwords to default, and assign student batches
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Administrator Authentication</h2>
                  <p className="text-[11px] text-slate-500">Super-admin governance gateway</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <form
                onSubmit={handleAdminSubmit}
                className="space-y-4 text-xs"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              >
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Admin Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      placeholder="Enter admin username"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer"
                >
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Direct Portal Links for Admin */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-[11px] text-slate-600 font-semibold">Direct Portal Gateways:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[10px]">
                    <a
                      href="#/trainer"
                      onClick={() => {
                        if (typeof window !== 'undefined') window.location.hash = '/trainer';
                        setPortalMode('trainer');
                      }}
                      className="text-[#0a6ed1] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>#/trainer</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl('trainer_from_admin', '#/trainer')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copy Trainer Login URL"
                    >
                      {copiedKey === 'trainer_from_admin' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[10px]">
                    <a
                      href="#/student"
                      onClick={() => {
                        if (typeof window !== 'undefined') window.location.hash = '/student';
                        setPortalMode('student');
                      }}
                      className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>#/student</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl('student_from_admin', '#/student')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copy Student Login URL"
                    >
                      {copiedKey === 'student_from_admin' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500">
              PPS Training Management System • Super-Admin Gateway
            </div>
          </>
        )}
      </div>
    </div>
  );
};
