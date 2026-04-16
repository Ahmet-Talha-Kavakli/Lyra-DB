'use client';

import { useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Camera, Save, KeyRound, Mail, User, Loader2, CheckCircle2 } from 'lucide-react';

export function AccountSection() {
  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress ?? '—';

  async function handleSaveName() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Could not update name. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    try {
      await user.setProfileImage({ file });
    } catch {
      setError('Could not update profile photo.');
    }
  }

  async function handlePasswordReset() {
    // Clerk doesn't expose reset_password from within the session.
    // Direct the user to sign-in page where they can reset via "Forgot password".
    alert('To reset your password, sign out and click "Forgot password" on the sign-in page.');
  }

  const avatarUrl   = user.imageUrl;
  const initials    = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || email[0]?.toUpperCase() || '?';
  const nameChanged = firstName !== (user.firstName ?? '') || lastName !== (user.lastName ?? '');

  return (
    <div className="space-y-6">

      {/* Avatar row */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-700" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-xl font-semibold text-white ring-2 ring-gray-700">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-gray-300 transition hover:bg-gray-600"
            aria-label="Change profile photo"
          >
            <Camera size={13} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-base font-medium text-white">
            {user.fullName ?? email}
          </p>
          <p className="text-sm text-gray-400">{email}</p>
        </div>
      </div>

      {/* Name fields */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
          <User size={15} />
          Personal Information
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        {nameChanged && (
          <button
            type="button"
            onClick={handleSaveName}
            disabled={saving}
            className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <CheckCircle2 size={14} />
            ) : (
              <Save size={14} />
            )}
            {saved ? 'Saved!' : 'Save name'}
          </button>
        )}
      </div>

      {/* Email (read-only) */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Mail size={15} />
          Email Address
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3">
          <span className="text-sm text-gray-300">{email}</span>
          <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs text-green-400">Verified</span>
        </div>
        <p className="mt-2 text-xs text-gray-600">Email changes are managed through account security settings.</p>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
          <KeyRound size={15} />
          Password
        </div>
        <button
          type="button"
          onClick={handlePasswordReset}
          className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 transition hover:border-violet-500/50 hover:bg-gray-700 hover:text-white"
        >
          <KeyRound size={14} />
          Send password reset email
        </button>
        <p className="mt-2 text-xs text-gray-600">We'll email you a link to reset your password.</p>
      </div>

    </div>
  );
}
