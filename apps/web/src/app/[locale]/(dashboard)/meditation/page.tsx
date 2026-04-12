import { MeditationPlayer } from '@/features/meditation/components/meditation-player';

export default function MeditationPage() {
  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Meditasyon</h1>
        <p className="text-gray-500 mt-1">Kendine bir mola ver. Sesi aç, gözlerini kapat.</p>
      </div>
      <MeditationPlayer />
    </div>
  );
}
