import React, { useState } from 'react';
import { X, Link2, Clock, Save, ExternalLink } from 'lucide-react';
import { ClassLink } from '../../types';

interface ClassLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLink: ClassLink;
  onSave: (data: Partial<ClassLink>) => void;
}

export const ClassLinkModal: React.FC<ClassLinkModalProps> = ({
  isOpen,
  onClose,
  currentLink,
  onSave
}) => {
  const [url, setUrl] = useState(currentLink.url);
  const [title, setTitle] = useState(currentLink.title);
  const [durationOption, setDurationOption] = useState<ClassLink['durationOption']>(
    currentLink.durationOption || 'entire_day'
  );
  const [notes, setNotes] = useState(currentLink.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const now = new Date();
    let calculatedExpiry: string;

    if (durationOption === '1_hour') {
      calculatedExpiry = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    } else if (durationOption === '2_hours') {
      calculatedExpiry = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    } else if (durationOption === '4_hours') {
      calculatedExpiry = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
    } else {
      // Entire day until midnight
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      calculatedExpiry = endOfDay.toISOString();
    }

    onSave({
      url,
      title,
      durationOption,
      expiresAt: calculatedExpiry,
      active: true,
      notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#1d2d3e] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold">Broadcast Daily Class Link</h2>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Class Session Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Class Link URL (Meet / Zoom / Teams)
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1] font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              How long should this link remain active?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'entire_day', label: 'Entire Day (Until 23:59)' },
                { id: '1_hour', label: '1 Hour' },
                { id: '2_hours', label: '2 Hours' },
                { id: '4_hours', label: '4 Hours' }
              ].map(opt => (
                <label
                  key={opt.id}
                  className={`border rounded p-2 text-center cursor-pointer text-xs ${
                    durationOption === opt.id
                      ? 'bg-blue-50 border-[#0a6ed1] text-[#0a6ed1] font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="modal_duration"
                    value={opt.id}
                    checked={durationOption === opt.id}
                    onChange={() => setDurationOption(opt.id as any)}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Session Instructions / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Keep IDE ready, attendance logged upon clicking link."
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Broadcast Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
