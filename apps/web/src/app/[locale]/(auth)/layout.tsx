export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080810]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute left-1/4 top-2/3 h-[300px] w-[300px] rounded-full bg-indigo-600/8 blur-[100px]" />
      </div>

      {/* Logo */}
      <a href="/" className="relative mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 3a2 2 0 110 4 2 2 0 010-4zm0 9.5c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.18 7.18 0 0110 14.5z"
              fill="white"
            />
          </svg>
        </div>
        <span className="text-xl font-semibold tracking-tight text-white">Lyra</span>
      </a>

      {/* Card */}
      <div className="relative w-full max-w-md px-4">
        {children}
      </div>

      {/* Footer */}
      <p className="relative mt-8 text-center text-xs text-gray-600">
        By continuing, you agree to Lyra&apos;s{' '}
        <a href="#" className="text-gray-500 underline-offset-2 hover:underline">Terms</a>
        {' '}and{' '}
        <a href="#" className="text-gray-500 underline-offset-2 hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
