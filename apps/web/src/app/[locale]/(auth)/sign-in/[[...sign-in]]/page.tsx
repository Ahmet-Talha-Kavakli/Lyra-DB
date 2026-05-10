import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: '#0f0f1a',
          colorInputBackground: '#1a1a2e',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#9ca3af',
          colorNeutral: '#374151',
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
        elements: {
          rootBox: 'w-full',
          card: 'bg-white/[0.03] border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl',
          headerTitle: 'text-white text-xl font-semibold',
          headerSubtitle: 'text-gray-400 text-sm',
          socialButtonsBlockButton:
            'border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07] transition-colors',
          socialButtonsBlockButtonText: 'text-white font-normal',
          dividerLine: 'bg-white/10',
          dividerText: 'text-gray-500 text-xs',
          formFieldLabel: 'text-gray-300 text-sm',
          formFieldInput:
            'bg-white/[0.06] border-white/10 text-white placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50',
          formButtonPrimary:
            'bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors shadow-lg shadow-violet-900/30',
          footerActionLink: 'text-violet-400 hover:text-violet-300',
          identityPreviewText: 'text-white',
          identityPreviewEditButton: 'text-violet-400',
          alertText: 'text-red-400',
          formFieldErrorText: 'text-red-400 text-xs',
        },
      }}
    />
  );
}
