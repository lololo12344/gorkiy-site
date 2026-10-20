'use client';

import { useEffect, useRef } from 'react';

// Counter to support stacked modals (e.g. CartModal -> CheckoutModal)
let lockCount = 0;
let previousStyles = {
  overflow: '',
  position: '',
  top: '',
  left: '',
  width: '',
  paddingRight: '',
};
let scrollY = 0;

/**
 * Bulletproof body scroll lock for Next.js / React.
 * Prevents background scroll on desktop and mobile (including iOS Safari bounce & scroll chaining).
 * Preserves scroll position and prevents layout shift from disappearing scrollbars.
 */
export function useBodyScrollLock(isLocked: boolean) {
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (!isLocked) return;

    if (lockCount === 0) {
      scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

      previousStyles = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        width: document.body.style.width,
        paddingRight: document.body.style.paddingRight,
      };

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.width = '100%';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }

    lockCount++;
    isLockedRef.current = true;

    return () => {
      if (!isLockedRef.current) return;
      isLockedRef.current = false;
      lockCount--;

      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = previousStyles.overflow;
        document.body.style.position = previousStyles.position;
        document.body.style.top = previousStyles.top;
        document.body.style.left = previousStyles.left;
        document.body.style.width = previousStyles.width;
        document.body.style.paddingRight = previousStyles.paddingRight;

        window.scrollTo(0, scrollY);
      }
    };
  }, [isLocked]);
}
