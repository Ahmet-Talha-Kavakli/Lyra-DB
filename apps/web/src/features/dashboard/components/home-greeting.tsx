'use client';

export function HomeGreeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 6  ? 'İyi geceler' :
    hour < 12 ? 'Günaydın' :
    hour < 17 ? 'İyi günler' :
    hour < 21 ? 'İyi akşamlar' : 'İyi geceler';

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">
        {greeting},{' '}
        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          {name}
        </span>
      </h1>
      <p className="mt-2 text-gray-500">Bugün nasıl hissediyorsun?</p>
    </div>
  );
}
