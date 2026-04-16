'use client';

import { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { User, Brain, LogOut, Shield } from 'lucide-react';
import { AccountSection }  from '@/features/profile/components/account-section';
import { TherapySection }  from '@/features/profile/components/therapy-section';
import { DangerSection }   from '@/features/profile/components/danger-section';

const TABS = [
  { id: 'account',  label: 'Account',         icon: User  },
  { id: 'therapy',  label: 'Therapy Profile',  icon: Brain },
  { id: 'privacy',  label: 'Privacy & Safety', icon: Shield },
] as const;

type Tab = typeof TABS[number]['id'];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const { user }   = useUser();
  const { signOut } = useClerk();

  const email    = user?.primaryEmailAddress?.emailAddress ?? '';
  const name     = user?.fullName ?? user?.username ?? email.split('@')[0] ?? 'Profile';
  const initials = (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '');
  const avatar   = user?.imageUrl;

  return (
    <div className="flex min-h-full flex-col px-8 py-10">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and therapy preferences.</p>
      </div>

      <div className="flex gap-8">

        {/* Left sidebar */}
        <aside className="w-56 flex-shrink-0">

          {/* Mini profile card */}
          <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
            <div className="flex flex-col items-center text-center">
              {avatar ? (
                <img src={avatar} alt={name} className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-700" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-lg font-semibold text-white ring-2 ring-gray-700">
                  {initials || name[0]?.toUpperCase() || '?'}
                </div>
              )}
              <p className="mt-3 text-sm font-medium text-white leading-tight">{name}</p>
              <p className="mt-0.5 max-w-full truncate text-xs text-gray-500">{email}</p>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  activeTab === id
                    ? 'bg-violet-600/20 text-violet-300'
                    : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <button
            type="button"
            onClick={() => void signOut({ redirectUrl: '/sign-in' })}
            className="mt-6 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-red-900/20 hover:text-red-400"
          >
            <LogOut size={16} className="flex-shrink-0" />
            Sign out
          </button>
        </aside>

        {/* Content area */}
        <main className="min-w-0 flex-1 max-w-xl">
          {activeTab === 'account' && <AccountSection />}
          {activeTab === 'therapy' && <TherapySection />}
          {activeTab === 'privacy' && <DangerSection />}
        </main>

      </div>
    </div>
  );
}
