'use client';

import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsProvider() {
  useKeyboardShortcuts();
  return null;
}
