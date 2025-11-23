'use client';

import { SignInButton as ClerkSignInButton } from '@clerk/nextjs';
import { LogIn } from 'lucide-react';

export function SignInButton() {
  return (
    <ClerkSignInButton mode="modal">
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
        <LogIn size={18} />
        Sign In
      </button>
    </ClerkSignInButton>
  );
}
