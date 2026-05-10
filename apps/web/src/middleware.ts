import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Auth routes — public (redirect to dashboard if already signed in)
const isAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/tr/sign-in(.*)',
  '/tr/sign-up(.*)',
]);

// Protected routes — require auth
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)', '/tr/dashboard(.*)',
  '/session(.*)',   '/tr/session(.*)',
  '/history(.*)',   '/tr/history(.*)',
  '/profile(.*)',   '/tr/profile(.*)',
  '/onboarding(.*)','\/tr/onboarding(.*)',
  '/journal(.*)',   '/tr/journal(.*)',
  '/mood(.*)',      '/tr/mood(.*)',
  '/goals(.*)',     '/tr/goals(.*)',
  '/breathe(.*)',   '/tr/breathe(.*)',
  '/meditation(.*)','\/tr/meditation(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // Skip intl middleware for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Signed-in user hitting auth pages → redirect to dashboard
  if (isAuthRoute(req) && userId) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith('/tr') ? '/tr/dashboard' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Unauthenticated user hitting protected route → redirect to sign-in
  if (isProtectedRoute(req) && !userId) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith('/tr') ? '/tr/sign-in' : '/sign-in';
    return NextResponse.redirect(url);
  }

  // Signed-in user hitting root → redirect to dashboard
  if (userId && (pathname === '/' || pathname === '/tr' || pathname === '/tr/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith('/tr') ? '/tr/dashboard' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Let next-intl handle locale routing for everything else
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|glb|gltf|bin)).*)',
    '/(api|trpc)(.*)',
  ],
};
