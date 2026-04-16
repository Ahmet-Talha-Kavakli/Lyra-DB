'use client';

import { useState } from 'react';
import { Shield, Trash2, Download, AlertTriangle, Loader2 } from 'lucide-react';

export function DangerSection() {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    // TODO: call DELETE /api/profile → wipe data → Clerk deleteUser
    // For MVP, show support contact message
    await new Promise((r) => setTimeout(r, 1000));
    setDeleting(false);
    setConfirming(false);
    alert('Please contact support@lyra.app to delete your account. We will process your request within 30 days per GDPR Article 17.');
  }

  return (
    <div className="space-y-6">

      {/* Consents overview */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Shield size={15} />
          Your Consents
        </div>
        <div className="space-y-3">
          {[
            { label: 'Camera & facial analysis',    desc: 'Used for real-time emotion mirroring during sessions.' },
            { label: 'Voice transcription',          desc: 'Transcribed for Lyra to understand what you say.' },
            { label: 'Psychological data storage',   desc: 'Session summaries stored to personalise future sessions.' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-300">{label}</p>
                <p className="text-xs text-gray-600">{desc}</p>
              </div>
              <span className="mt-0.5 flex-shrink-0 rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs text-green-400">Active</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-600">
          To withdraw consent, contact support@lyra.app. Withdrawal does not affect the lawfulness of prior processing.
        </p>
      </div>

      {/* Data export */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Download size={15} />
          Export Your Data
        </div>
        <p className="mb-4 text-xs text-gray-600">
          Under GDPR Article 20, you have the right to receive your personal data in a portable format.
        </p>
        <button
          type="button"
          onClick={() => alert('Data export will be emailed to you within 72 hours.')}
          className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 transition hover:border-gray-600 hover:bg-gray-700 hover:text-white"
        >
          <Download size={14} />
          Request data export
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-5">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-red-400">
          <AlertTriangle size={15} />
          Danger Zone
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Deleting your account permanently removes all your data — sessions, memories, journal entries.
          This action cannot be undone.
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 rounded-xl border border-red-800/60 bg-red-900/20 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-900/40"
          >
            <Trash2 size={14} />
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-300">
              Are you absolutely sure? All your data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl border border-gray-700 py-2 text-sm text-gray-400 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Yes, delete everything
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
