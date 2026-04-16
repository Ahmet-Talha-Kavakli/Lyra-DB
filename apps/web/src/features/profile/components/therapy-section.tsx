'use client';

import { useState, useEffect } from 'react';
import { Brain, Save, Loader2, CheckCircle2, Phone } from 'lucide-react';

const GOALS = [
  'Manage anxiety',
  'Cope with depression',
  'Improve relationships',
  'Work through trauma',
  'Build self-confidence',
  'Stress management',
  'Personal growth',
  'Grief support',
  'Sleep improvement',
  'Anger management',
];

const COMM_STYLES = [
  { value: 'gentle',        label: 'Gentle',        desc: 'Soft, nurturing, and supportive' },
  { value: 'collaborative', label: 'Collaborative',  desc: 'Working together as partners' },
  { value: 'direct',        label: 'Direct',         desc: 'Honest and straightforward' },
];

const SESSION_LENGTHS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];

interface ProfileData {
  goals:              string[];
  communicationStyle: string;
  sessionLength:      number;
  emergencyContact:   { name: string; phone?: string } | null;
}

export function TherapySection() {
  const [data,    setData]    = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Local editable state
  const [goals,        setGoals]        = useState<string[]>([]);
  const [commStyle,    setCommStyle]    = useState('collaborative');
  const [sessLength,   setSessLength]   = useState(45);
  const [ecName,       setEcName]       = useState('');
  const [ecPhone,      setEcPhone]      = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() as Promise<{ goals: string[]; therapyPreferences: Record<string, unknown> }> : null)
      .then((d) => {
        if (!d) return;
        const prefs = d.therapyPreferences ?? {};
        const ec    = (prefs['emergencyContact'] as { name: string; phone?: string } | null) ?? null;
        setGoals(d.goals ?? []);
        setCommStyle((prefs['communicationStyle'] as string) ?? 'collaborative');
        setSessLength((prefs['sessionLength'] as number) ?? 45);
        setEcName(ec?.name ?? '');
        setEcPhone(ec?.phone ?? '');
        setData({ goals: d.goals ?? [], communicationStyle: (prefs['communicationStyle'] as string) ?? 'collaborative', sessionLength: (prefs['sessionLength'] as number) ?? 45, emergencyContact: ec });
      })
      .catch(() => setError('Could not load therapy profile.'))
      .finally(() => setLoading(false));
  }, []);

  function toggleGoal(g: string) {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 5 ? [...prev, g] : prev,
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals,
          communicationStyle: commStyle,
          sessionLength:      sessLength,
          emergencyContact:   ecName.trim() ? { name: ecName.trim(), phone: ecPhone.trim() || undefined } : null,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  const hasChanges = data && (
    JSON.stringify(goals) !== JSON.stringify(data.goals) ||
    commStyle  !== data.communicationStyle ||
    sessLength !== data.sessionLength      ||
    ecName     !== (data.emergencyContact?.name  ?? '') ||
    ecPhone    !== (data.emergencyContact?.phone ?? '')
  );

  return (
    <div className="space-y-6">

      {/* Goals */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Brain size={15} />
          Therapy Goals
        </div>
        <p className="mb-4 text-xs text-gray-600">Select up to 5 areas you'd like to focus on.</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => {
            const active = goals.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGoal(g)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
        {goals.length === 5 && (
          <p className="mt-2 text-xs text-amber-500/80">Maximum 5 goals selected.</p>
        )}
      </div>

      {/* Communication style */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <p className="mb-4 text-sm font-medium text-gray-300">Communication Style</p>
        <div className="grid grid-cols-3 gap-3">
          {COMM_STYLES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCommStyle(value)}
              className={`rounded-xl border p-3 text-left transition ${
                commStyle === value
                  ? 'border-violet-500 bg-violet-600/15 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
              }`}
            >
              <p className="text-xs font-semibold">{label}</p>
              <p className="mt-0.5 text-xs opacity-70">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Session length */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <p className="mb-4 text-sm font-medium text-gray-300">Preferred Session Length</p>
        <div className="flex gap-3">
          {SESSION_LENGTHS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSessLength(value)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                sessLength === value
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Phone size={15} />
          Emergency Contact
          <span className="ml-1 text-xs text-gray-600">(optional)</span>
        </div>
        <p className="mb-4 text-xs text-gray-600">Someone we can suggest you contact in a crisis moment.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Name</label>
            <input
              value={ecName}
              onChange={(e) => setEcName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Phone</label>
            <input
              value={ecPhone}
              onChange={(e) => setEcPhone(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              type="tel"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-40"
      >
        {saving ? (
          <><Loader2 size={15} className="animate-spin" /> Saving…</>
        ) : saved ? (
          <><CheckCircle2 size={15} /> Saved!</>
        ) : (
          <><Save size={15} /> Save therapy profile</>
        )}
      </button>

    </div>
  );
}
