import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  User,
  Phone,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff
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
  const [loginType, setLoginType] = useState<'trainer' | 'student'>('trainer');

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

  const handleTrainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = trainerUsername.trim();
    const trimmedPass = trainerPassword.trim();

    if (trimmedUser === 'PPSTrainer' && trimmedPass === expectedTrainerPassword) {
      onTrainerLoginSuccess();
    } else {
      setErrorMessage(`Invalid trainer credentials. Please enter the valid trainer username and password.`);
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
          `No student record found with mobile number "${trimmedMobile}". Please check the number or contact your trainer.`
        );
      }
      return;
    }

    onStudentLoginSuccess(matchedStudent);
  };

  return (
    <div className="min-h-screen bg-radial from-[#1e3048] via-[#121e2c] to-[#0a121c] flex flex-col justify-center items-center px-4 py-8 antialiased">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-[#0a6ed1] to-[#258cf0] shadow-xl border border-blue-400/40 text-white mb-2">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              PPS Training Portal
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-medium text-slate-300">Enterprise Solutions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            PPS Software Academy
          </h1>
          <p className="text-xs text-slate-400">
            Attendance tracking, class schedule, demo management & completion portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
          {/* Persona Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setLoginType('trainer');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginType === 'trainer'
                  ? 'bg-white text-[#0a6ed1] shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#0a6ed1]" />
              <span>Trainer Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('student');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginType === 'student'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-emerald-600" />
              <span>Student Portal</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* TRAINER LOGIN FORM - No autofill */}
          {loginType === 'trainer' && (
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
          )}

          {/* STUDENT LOGIN FORM - No autofill */}
          {loginType === 'student' && (
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
                    placeholder="Enter registered mobile number"
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
          )}

          {/* Enrolled Students Counter */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Enrolled Students in Database:</span>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {enrolledStudentsCount}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          PPS Training Management System • Cloud Database (pps-sw)
        </div>
      </div>
    </div>
  );
};
