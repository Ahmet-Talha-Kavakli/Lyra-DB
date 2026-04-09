import { BreathingExercise } from '@/features/breathe/components/breathing-exercise';

export default function BreathePage() {
  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">Nefes Egzersizleri</h1>
      <BreathingExercise />
    </div>
  );
}
