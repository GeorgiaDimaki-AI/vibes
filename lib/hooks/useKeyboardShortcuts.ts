'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'k',
        ctrlKey: true,
        metaKey: true,
        action: () => {
          // Focus on search/scenario input if exists
          const input = document.querySelector('textarea[placeholder*="Describe"]') as HTMLTextAreaElement;
          if (input) {
            input.focus();
          }
        },
        description: 'Focus on search/input',
      },
      {
        key: 'h',
        ctrlKey: true,
        metaKey: true,
        action: () => router.push('/history'),
        description: 'Go to History',
      },
      {
        key: 'f',
        ctrlKey: true,
        metaKey: true,
        action: () => router.push('/favorites'),
        description: 'Go to Favorites',
      },
      {
        key: 'p',
        ctrlKey: true,
        metaKey: true,
        action: () => router.push('/profile'),
        description: 'Go to Profile',
      },
      {
        key: 'd',
        ctrlKey: true,
        metaKey: true,
        action: () => router.push('/dashboard'),
        description: 'Go to Dashboard',
      },
      {
        key: '/',
        action: () => router.push('/'),
        description: 'Go to Home',
      },
    ];

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea (except for our custom shortcuts)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      for (const shortcut of shortcuts) {
        const modifierMatch =
          (shortcut.ctrlKey ? event.ctrlKey || event.metaKey : true) &&
          (shortcut.metaKey ? event.metaKey || event.ctrlKey : true);

        if (event.key === shortcut.key && modifierMatch) {
          // For Ctrl/Cmd shortcuts, always trigger
          // For single key shortcuts (like /), only trigger if not in input
          if (shortcut.ctrlKey || shortcut.metaKey || !isInput) {
            event.preventDefault();
            shortcut.action();
            break;
          }
        }
      }

      // ESC to close modals (can be extended)
      if (event.key === 'Escape') {
        // Close any open modals or dialogs
        const closeButtons = document.querySelectorAll('[aria-label*="Close"]');
        if (closeButtons.length > 0) {
          (closeButtons[0] as HTMLButtonElement).click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);
}

export function getKeyboardShortcuts() {
  return [
    { key: 'Cmd/Ctrl + K', description: 'Focus on search/input' },
    { key: 'Cmd/Ctrl + H', description: 'Go to History' },
    { key: 'Cmd/Ctrl + F', description: 'Go to Favorites' },
    { key: 'Cmd/Ctrl + P', description: 'Go to Profile' },
    { key: 'Cmd/Ctrl + D', description: 'Go to Dashboard' },
    { key: '/', description: 'Go to Home' },
    { key: 'Esc', description: 'Close modals' },
  ];
}
