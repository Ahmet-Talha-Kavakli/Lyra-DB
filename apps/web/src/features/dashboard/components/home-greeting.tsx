'use client';

export function HomeGreeting({ name }: { name: string }) {
  const hour     = new Date().getHours();
  const greeting =
    hour < 5  ? 'Good night' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' : 'Good night';

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">
        {greeting},{' '}
        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          {name}
        </span>
      </h1>
      <p className="mt-2 text-sm text-gray-500">How are you feeling today?</p>
    </div>
  );
}
