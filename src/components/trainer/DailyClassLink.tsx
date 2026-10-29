import React, { useState, useEffect } from 'react';
import {
  Link2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  Save,
  Radio,
  Timer
} from 'lucide-react';
import { ClassLink } from '../../types';

interface DailyClassLinkProps {
  currentLink: ClassLink;
  onUpdateClassLink: (data: Partial<ClassLink>) => void;
  isLinkActive: boolean;
}

export const DailyClassLink: React.FC<DailyClassLinkProps> = ({
  currentLink,
  onUpdateClassLink,
  isLinkActive
}) => {
  const [title, setTitle] = useState(currentLink.title);
  const [url, setUrl] = useState(currentLink.url);
  const [course, setCourse] = useState(currentLink.course);
  const [durationOption, setDurationOption] = useState<ClassLink['durationOption']>(
    currentLink.durationOption || 'entire_day'
  );
  const [customExpiresAt, setCustomExpiresAt] = useState<string>(
    currentLink.expiresAt ? new Date(currentLink.expiresAt).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = useState(currentLink.notes || '');
  const [copied, setCopied] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  // Live countdown timer calculation
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!currentLink.expiresAt) return 'No expiry set';
      const expiry = new Date(currentLink.expiresAt).getTime();
      const now = Date.now();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeftStr('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s remaining`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [currentLink.expiresAt]);

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('Please enter a valid class URL.');
      return;
    }

    const now = new Date();
    let calculatedExpiry: string;

    if (durationOption === '1_hour') {
      calculatedExpiry = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    } else if (durationOption === '2_hours') {
      calculatedExpiry = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    } else if (durationOption === '4_hours') {
      calculatedExpiry = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
    } else if (durationOption === 'entire_day') {
      // Midnight today 23:59:59
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      calculatedExpiry = endOfDay.toISOString();
    } else {
      calculatedExpiry = customExpiresAt ? new Date(customExpiresAt).toISOString() : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    onUpdateClassLink({
      title,
      url,
      course,
      durationOption,
      expiresAt: calculatedExpiry,
      createdAt: new Date().toISOString(),
      active: true,
      notes
    });

    alert('Daily Class Link updated successfully and broadcasted to students!');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">Broadcast Channel</div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Daily Class Link & Expiry</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure today's meeting URL, duration (Entire Day, 1 Hour, etc.), and expiration rules
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              isLinkActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLinkActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
              <span>{isLinkActive ? 'Link is Active & Visible' : 'Link Expired'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Configure Link */}
        <div className="lg:col-span-2 bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
              <Link2 className="w-4 h-4 text-[#0a6ed1]" />
              <span>Update Class Meeting Link</span>
            </div>
            <span className="text-[11px] text-slate-400">Pushed to all student dashboards</span>
          </div>

          <form onSubmit={handleSaveLink} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Session Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Daily Live Classroom Session - Morning Batch"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Class Meeting URL (Google Meet / Zoom / MS Teams) <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1] font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Batch</label>
                <input
                  type="text"
                  value={course}
                  onChange={e => setCourse(e.target.value)}
                  placeholder="All Ongoing or specific course title"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trainer in Charge</label>
                <input
                  type="text"
                  disabled
                  value={currentLink.trainerName}
                  className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded text-slate-600"
                />
              </div>
            </div>

            {/* EXPIRY DURATION SELECTION (Prompted requirement) */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-800 mb-2">
                Link Expiration Rule (Duration) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'entire_day', label: 'Entire Day', sub: 'Until 23:59 Today' },
                  { id: '1_hour', label: '1 Hour', sub: '60 minutes validity' },
                  { id: '2_hours', label: '2 Hours', sub: '120 minutes validity' },
                  { id: '4_hours', label: '4 Hours', sub: 'Half-day workshop' }
                ].map(opt => (
                  <label
                    key={opt.id}
                    className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${
                      durationOption === opt.id
                        ? 'bg-blue-50/80 border-[#0a6ed1] text-[#0a6ed1] shadow-2xs font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={opt.id}
                      checked={durationOption === opt.id}
                      onChange={() => setDurationOption(opt.id as any)}
                      className="sr-only"
                    />
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Session Preparation Instructions for Students
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Please clone today's repository branch before the call begins."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save & Broadcast Class Link</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Preview Card: What Students See */}
        <div className="space-y-4">
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#0a6ed1] tracking-wider block mb-1">
              Live Preview
            </span>
            <h3 className="text-sm font-bold text-slate-800">Student Portal View</h3>
            <p className="text-[11px] text-slate-500 mb-4">
              This card is shown to enrolled students when they log into their dashboard.
            </p>

            <div className="bg-[#f0f6fc] border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-100 font-semibold">
                  {currentLink.course}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isLinkActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isLinkActive ? 'Active' : 'Expired'}
                </span>
              </div>

              <div className="font-semibold text-xs text-slate-900">{currentLink.title}</div>

              <div className="bg-white rounded p-2 text-xs font-mono text-blue-700 break-all border border-slate-200">
                {currentLink.url}
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                <Timer className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-mono font-semibold">{timeLeftStr}</span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={currentLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-[#0a6ed1] text-white py-1.5 px-3 rounded text-xs font-semibold text-center flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Join Session</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <span className="text-[10px] text-emerald-600 block text-center font-medium">Link copied to clipboard!</span>}
            </div>

            <div className="mt-4 text-[11px] text-slate-500 bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-700 block">Attendance Automatic Trigger:</span>
              <p>
                When any student taps "Touch Link & Join", their attendance is registered as <strong>Present</strong> with <em>Student (Touch Link)</em>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
