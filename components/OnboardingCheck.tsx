'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';

export function OnboardingCheck() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;

    // Skip check if already on onboarding page or sign-in pages
    if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/sign-')) {
      return;
    }

    // Check if user needs onboarding
    if (user) {
      const onboardingCompleted = user.publicMetadata?.onboardingCompleted;

      if (!onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, isLoaded, router, pathname]);

  return null;
}
