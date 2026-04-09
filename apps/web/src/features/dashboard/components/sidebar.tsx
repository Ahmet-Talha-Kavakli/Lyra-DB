'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Brain,
  BookOpen,
  SmilePlus,
  ClipboardList,
  Wind,
  Target,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home,          label: 'Ana Sayfa' },
  { href: '/session',   icon: Brain,         label: 'Seans' },
  { href: '/journal',   icon: BookOpen,      label: 'Günlük' },
  { href: '/mood',      icon: SmilePlus,     label: 'Duygu Takibi' },
  { href: '/history',   icon: ClipboardList, label: 'Geçmiş' },
  { href: '/breathe',   icon: Wind,          label: 'Nefes' },
  { href: '/goals',     icon: Target,        label: 'Hedefler' },
  { href: '/profile',   icon: User,          label: 'Profil' },
];

export function Sidebar({ locale }: { locale: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const prefix = locale === 'tr' ? '/tr' : '';

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-[#0d0c1a] border-r border-white/5 flex-shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex-shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="font-bold text-white text-lg whitespace-nowrap"
            >
              Lyra
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const fullHref = `${prefix}${href}`;
          const isActive =
            href === '/dashboard'
              ? pathname === fullHref || pathname === `${prefix}/`
              : pathname.startsWith(fullHref);

          return (
            <Link
              key={href}
              href={fullHref}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-violet-500/10 border-l-2 border-violet-500 text-violet-300'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User + collapse toggle */}
      <div className="px-2 pb-4 pt-3 border-t border-white/5 flex flex-col gap-2">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 overflow-hidden">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.firstName ?? ''}
                className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-violet-500/30 flex-shrink-0 flex items-center justify-center text-violet-300 text-sm font-semibold">
                {user.firstName?.[0] ?? 'U'}
              </div>
            )}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-gray-400 truncate"
                >
                  {user.firstName}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors mx-auto"
          aria-label={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
}
