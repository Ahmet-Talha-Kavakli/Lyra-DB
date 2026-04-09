import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/features/dashboard/components/sidebar';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { locale } = await params;

  return (
    <div className="flex h-screen bg-[#080810] overflow-hidden">
      <Sidebar locale={locale} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
