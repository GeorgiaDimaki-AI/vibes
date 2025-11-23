'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { User, History, Heart, LayoutDashboard } from 'lucide-react';
import { useUserUsage } from '@/lib/hooks/useUserUsage';

const tierBadges = {
  free: { label: 'Free', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  light: { label: 'Light', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  regular: { label: 'Regular', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
  unlimited: { label: 'Unlimited', className: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' },
};

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { usage } = useUserUsage();

  if (!isLoaded || !user) {
    return null;
  }

  const tier = usage?.tier || 'free';
  const tierBadge = tierBadges[tier as keyof typeof tierBadges] || tierBadges.free;

  return (
    <div className="flex items-center gap-4">
      {/* Quick Links */}
      <nav className="hidden md:flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Dashboard"
        >
          <LayoutDashboard size={16} />
          <span className="hidden lg:inline">Dashboard</span>
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="History"
        >
          <History size={16} />
          <span className="hidden lg:inline">History</span>
        </Link>
        <Link
          href="/favorites"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Favorites"
        >
          <Heart size={16} />
          <span className="hidden lg:inline">Favorites</span>
        </Link>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Profile"
        >
          <User size={16} />
          <span className="hidden lg:inline">Profile</span>
        </Link>
      </nav>

      {/* Tier Badge */}
      <div className={`px-3 py-1 text-xs font-semibold rounded-full ${tierBadge.className}`}>
        {tierBadge.label}
      </div>

      {/* User Button */}
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-10 h-10',
          },
        }}
      />
    </div>
  );
}
