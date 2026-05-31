'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker for offline shell + installability. */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal */
      });
    }
  }, []);
  return null;
}
