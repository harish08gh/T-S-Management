import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Lock,
  Phone,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { Student } from '../../types';

interface LoginPageProps {
  onTrainerLoginSuccess: () => void;
  onStudentLoginSuccess: (student: Student) => void;
  onFindStudentByPhone: (phone: string) => Student | undefined;
  enrolledStudentsCount: number;
  expectedTrainerPassword?: string;
  expectedStudentPassword?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onTrainerLoginSuccess,
  onStudentLoginSuccess,
  onFindStudentByPhone,
  enrolledStudentsCount,
  expectedTrainerPassword = 'PPS@2026',
  expectedStudentPassword = 'Student@PPS26'
}) => {
  // Determine if on Trainer Portal or Student Portal from URL
  const [portalMode, setPortalMode] = useState<'trainer' | 'student'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('trainer') || search.includes('portal=trainer') || hash.includes('admin')) {
        return 'trainer';
      }
    }
    // Default to student login so students never see trainer login
    return 'student';
  });

  // Listen to hash / URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('trainer') || search.includes('portal=trainer') || hash.includes('admin')) {
        setPortalMode('trainer');
      } else {
        setPortalMode('student');
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Trainer Credentials - strictly blank on load, no autofill
  const [trainerUsername, setTrainerUsername] = useState('');
  const [trainerPassword, setTrainerPassword] = useState('');
  const [showTrainerPass, setShowTrainerPass] = useState(false);

  // Student Credentials - strictly blank on load, no autofill
  const [studentMobile, setStudentMobile] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);

  // Error & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleTrainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = trainerUsername.trim();
    const trimmedPass = trainerPassword.trim();

    if (trimmedUser === 'PPSTrainer' && trimmedPass === expectedTrainerPassword) {
      onTrainerLoginSuccess();
    } else {
      setErrorMessage('Invalid trainer credentials. Please verify your administrative username and password.');
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

  const handleCopyStudentUrl = () => {
    if (typeof window === 'undefined') return;
    const studentUrl = `${window.location.origin}${window.location.pathname}#/student`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(studentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-radial from-[#1e3048] via-[#121e2c] to-[#0a121c] flex flex-col justify-center items-center px-4 py-8 antialiased">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* =========================================================================
            VIEW A: STUDENT LOGIN PAGE (Strictly for students - NO access to trainer login)
           ========================================================================= */}
        {portalMode === 'student' && (
          <>
            {/* Student Brand Header */}
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

            {/* Student Login Card */}
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

              {/* Error Banner */}
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
                Need help or didn't receive your credentials? Please contact your course trainer directly.
              </div>
            </div>

            {/* Student Portal Footer */}
            <div className="text-center text-xs text-slate-500">
              PPS Training Management System • Student Academic Portal
            </div>
          </>
        )}

        {/* =========================================================================
            VIEW B: TRAINER COCKPIT LOGIN (Strictly for trainers - accessible via #/trainer)
           ========================================================================= */}
        {portalMode === 'trainer' && (
          <>
            {/* Trainer Brand Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-[#0a6ed1] to-[#258cf0] shadow-xl border border-blue-400/40 text-white mb-2">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                  Trainer Cockpit
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-medium text-slate-300">Staff Administration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Trainer Administration
              </h1>
              <p className="text-xs text-slate-400">
                Attendance tracking, batch scheduling, demo pipeline & system configuration
              </p>
            </div>

            {/* Trainer Login Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Trainer Administrative Log In</h2>
                  <p className="text-[11px] text-slate-500">Staff and instructors only</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0a6ed1] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Error Banner */}
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
                      placeholder="Enter trainer username"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0a6ed1]/30 focus:border-[#0a6ed1] text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Trainer Password
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
                      placeholder="Enter trainer password"
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
                    onClick={handleCopyStudentUrl}
                    className="text-[10px] text-[#0a6ed1] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? (
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
            </div>

            {/* Trainer Portal Footer */}
            <div className="text-center text-xs text-slate-500">
              PPS Training Management System • Administration Gateway
            </div>
          </>
        )}
      </div>
    </div>
  );
};
