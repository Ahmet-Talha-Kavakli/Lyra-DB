import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Brain, BookOpen, SmilePlus, Wind, Target } from 'lucide-react';
import { TherapistModalTrigger } from '@/features/landing/components/therapist-modal-trigger';
import { HomeGreeting } from '@/features/dashboard/components/home-greeting';
import { DashboardStats } from '@/features/dashboard/components/dashboard-stats';

async function checkOnboarding(userId: string): Promise<boolean> {
  try {
    const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/user/profile`, {
      headers: { 'x-clerk-user-id': userId },
      cache:   'no-store',
    });
    return res.ok;
  } catch {
    return true;
  }
}

const QUICK_LINKS = [
  {
    href:   '/journal',
    icon:   BookOpen,
    label:  'Journal',
    sub:    'Write today\'s thoughts',
    color:  'from-amber-500/15 to-orange-500/5',
    border: 'border-amber-500/20',
    text:   'text-amber-300',
  },
  {
    href:   '/mood',
    icon:   SmilePlus,
    label:  'Mood Check',
    sub:    'How are you feeling?',
    color:  'from-emerald-500/15 to-teal-500/5',
    border: 'border-emerald-500/20',
    text:   'text-emerald-300',
  },
  {
    href:   '/breathe',
    icon:   Wind,
    label:  'Breathe',
    sub:    'Calm your nervous system',
    color:  'from-sky-500/15 to-blue-500/5',
    border: 'border-sky-500/20',
    text:   'text-sky-300',
  },
  {
    href:   '/goals',
    icon:   Target,
    label:  'Goals',
    sub:    'Track your progress',
    color:  'from-violet-500/15 to-purple-500/5',
    border: 'border-violet-500/20',
    text:   'text-violet-300',
  },
];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { locale } = await params;
  const prefix      = locale === 'tr' ? '/tr' : '';

  const hasProfile = await checkOnboarding(userId);
  if (!hasProfile) redirect(`${prefix}/onboarding`);

  const user      = await currentUser();
  const firstName = user?.firstName
    ?? user?.username
    ?? user?.emailAddresses[0]?.emailAddress?.split('@')[0]
    ?? 'there';

  return (
    <div className="px-8 py-10 max-w-2xl">
      {/* Greeting */}
      <HomeGreeting name={firstName} />

      {/* Streak + mood chart (client component, fetches own data) */}
      <DashboardStats />

      {/* Start session — hero CTA */}
      <div className="mt-8 rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Start a Session</h2>
            <p className="text-sm text-gray-400">Lyra is ready whenever you are</p>
          </div>
        </div>
        <TherapistModalTrigger />
      </div>

      {/* Quick access */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {QUICK_LINKS.map(({ href, icon: Icon, label, sub, color, border, text }) => (
          <Link
            key={href}
            href={`${prefix}${href}`}
            className={`group flex items-center gap-3 rounded-2xl border ${border} bg-gradient-to-br ${color} p-4 transition-all hover:scale-[1.02]`}
          >
            <Icon size={20} className={`flex-shrink-0 ${text}`} />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${text}`}>{label}</p>
              <p className="truncate text-xs text-gray-500">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
