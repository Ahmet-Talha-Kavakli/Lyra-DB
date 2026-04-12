import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { TherapistModalTrigger } from '@/features/landing/components/therapist-modal-trigger';

export default async function SessionPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="px-8 py-10 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Seans Başlat</h1>
      <p className="text-gray-500 mb-8">Terapistini seç ve yeni bir seans başlat.</p>
      <TherapistModalTrigger />
    </div>
  );
}
