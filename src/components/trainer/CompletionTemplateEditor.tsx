import React, { useState } from 'react';
import {
  Mail,
  Save,
  CheckCircle2,
  Sparkles,
  Info,
  Paperclip,
  FileText,
  Eye,
  Check
} from 'lucide-react';
import { CourseCompletionSettings, Student } from '../../types';

interface CompletionTemplateEditorProps {
  settings: CourseCompletionSettings;
  onSaveSettings: (settings: CourseCompletionSettings) => void;
  sampleStudent?: Student;
}

export const CompletionTemplateEditor: React.FC<CompletionTemplateEditorProps> = ({
  settings,
  onSaveSettings,
  sampleStudent
}) => {
  const [formData, setFormData] = useState<CourseCompletionSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Compute live preview with placeholder substitution (No fake details)
  const studentName = sampleStudent ? sampleStudent.name : '[Student Full Name]';
  const studentCourse = sampleStudent ? sampleStudent.course : '[Course Title]';
  const studentId = sampleStudent ? sampleStudent.id : '[Student ID]';
  const trainerName = sampleStudent ? sampleStudent.trainerName : 'PPSTrainer';
  const phone = sampleStudent ? sampleStudent.phone : '[Student Mobile No]';
  const email = sampleStudent ? sampleStudent.email : '[student@example.com]';
  const mode = sampleStudent ? sampleStudent.mode : 'Weekdays';
  const type = sampleStudent ? sampleStudent.type : 'Online';
  const doj = sampleStudent ? sampleStudent.doj : '[Date of Joining]';
  const doe = sampleStudent?.doe || '[Date of Completion]';

  const formattedSubject = formData.subjectTemplate
    .replace('{student_name}', studentName)
    .replace('{course}', studentCourse)
    .replace('{student_id}', studentId);

  const formattedBody = formData.bodyTemplate
    .replace(/{student_name}/g, studentName)
    .replace(/{student_id}/g, studentId)
    .replace(/{course}/g, studentCourse)
    .replace(/{trainer_name}/g, trainerName)
    .replace(/{phone}/g, phone)
    .replace(/{email}/g, email)
    .replace(/{mode}/g, mode)
    .replace(/{type}/g, type)
    .replace(/{doj}/g, doj)
    .replace(/{doe}/g, doe);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border-b border-[#d9e0e7] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0a6ed1]">Graduation Workflow</div>
            <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">Course Completion Mail Template</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure the official email template visible strictly to 100% completed students
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
              Audience: <strong className="text-emerald-700">Completed Students Only</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Template Configuration Form */}
        <div className="bg-white border border-[#d9e0e7] rounded-lg shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
              <Mail className="w-4 h-4 text-[#0a6ed1]" />
              <span>Configure Completion Email Template</span>
            </div>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  required
                  value={formData.institutionName}
                  onChange={e => setFormData({ ...formData, institutionName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Recipient Email (Evaluation Office)
                </label>
                <input
                  type="email"
                  required
                  value={formData.recipientEmail}
                  onChange={e => setFormData({ ...formData, recipientEmail: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">CC Email (Trainer)</label>
              <input
                type="text"
                value={formData.ccEmail || ''}
                onChange={e => setFormData({ ...formData, ccEmail: e.target.value })}
                placeholder="trainer@pps-sw.com"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email Subject Template
              </label>
              <input
                type="text"
                required
                value={formData.subjectTemplate}
                onChange={e => setFormData({ ...formData, subjectTemplate: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Available tags: {'{student_name}'}, {'{course}'}, {'{student_id}'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email Body Text Template
              </label>
              <textarea
                rows={10}
                required
                value={formData.bodyTemplate}
                onChange={e => setFormData({ ...formData, bodyTemplate: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0a6ed1]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Tags will be replaced automatically: {'{student_name}'}, {'{course}'}, {'{doj}'}, {'{doe}'}, {'{trainer_name}'}, {'{phone}'}, {'{email}'}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Mail Template</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Preview as seen by a Completed Student */}
        <div className="space-y-4">
          <div className="bg-white border border-[#d9e0e7] rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-[#0a6ed1]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Completed Student View Preview
                </h3>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                {sampleStudent ? `Preview: ${sampleStudent.name}` : 'Live Tag Preview'}
              </span>
            </div>

            <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <div className="text-[11px] text-slate-600 border-b border-slate-200 pb-2 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">To:</span>{' '}
                  <span className="font-mono text-blue-700">{formData.recipientEmail}</span>
                </div>
                {formData.ccEmail && (
                  <div>
                    <span className="font-semibold text-slate-700">CC:</span>{' '}
                    <span className="font-mono text-slate-600">{formData.ccEmail}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-700">Subject:</span>{' '}
                  <span className="font-semibold text-slate-800">{formattedSubject}</span>
                </div>
              </div>

              {/* Formatted body */}
              <div className="bg-white p-3.5 rounded border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {formattedBody}
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Required Student Checklist:
                </span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  {formData.guidelines.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Ongoing students with less than 100% completion will see a locked placeholder until their Date of Ending (DOE) is finalized.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
