import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Brain, BookOpen, SmilePlus, Wind } from 'lucide-react';
import { TherapistModalTrigger } from '@/features/landing/components/therapist-modal-trigger';
import { HomeGreeting } from '@/features/dashboard/components/home-greeting';

async function checkOnboarding(userId: string): Promise<boolean> {
  try {
    const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/user/profile`, {
      headers: { 'x-clerk-user-id': userId },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return true;
  }
}

const QUICK_LINKS = [
  { href: '/journal',  icon: BookOpen,  label: 'Günlük Yaz',      color: 'from-amber-500/20 to-orange-500/10',  border: 'border-amber-500/20',  text: 'text-amber-300' },
  { href: '/mood',     icon: SmilePlus, label: 'Duygu Takibi',    color: 'from-emerald-500/20 to-teal-500/10',  border: 'border-emerald-500/20', text: 'text-emerald-300' },
  { href: '/breathe',  icon: Wind,      label: 'Nefes Egzersizi', color: 'from-sky-500/20 to-blue-500/10',      border: 'border-sky-500/20',     text: 'text-sky-300' },
];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { locale } = await params;
  const prefix = locale === 'tr' ? '/tr' : '';

  const hasProfile = await checkOnboarding(userId);
  if (!hasProfile) redirect(`${prefix}/onboarding`);

  const user = await currentUser();
  const firstName = user?.firstName ?? 'orada';

  return (
    <div className="px-8 py-10 max-w-4xl">
      {/* Greeting */}
      <HomeGreeting name={firstName} />

      {/* Start session — hero CTA */}
      <div className="mt-8 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Seans Başlat</h2>
            <p className="text-gray-400 text-sm">Terapistinle konuşmaya hazır misin?</p>
          </div>
        </div>
        <TherapistModalTrigger />
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map(({ href, icon: Icon, label, color, border, text }) => (
          <Link
            key={href}
            href={`${prefix}${href}`}
            className={`group flex items-center gap-3 rounded-2xl border ${border} bg-gradient-to-br ${color} p-5 transition-all hover:scale-[1.02] hover:border-opacity-40`}
          >
            <Icon size={22} className={text} />
            <span className={`font-medium text-sm ${text}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
