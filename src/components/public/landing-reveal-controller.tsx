'use client';

import { useEffect } from 'react';

export function LandingRevealController() {
  useEffect(() => {
    let observer: IntersectionObserver;
    
    const initObserver = () => {
      try {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

        if (!elements.length) {
          return false;
        }

        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia 
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
          : false;

        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
          elements.forEach((element) => {
            element.dataset.visible = 'true';
          });
          return true;
        }

        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return;
              }

              (entry.target as HTMLElement).dataset.visible = 'true';
              observer.unobserve(entry.target);
            });
          },
          {
            threshold: 0.12,
            rootMargin: '0px 0px -8% 0px'
          }
        );

        elements.forEach((element) => observer.observe(element));
        return true;
      } catch (err) {
        console.error("LandingRevealController Error:", err);
        // Fallback: If anything crashes, show all elements
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
        elements.forEach((element) => {
          element.dataset.visible = 'true';
        });
        return true;
      }
    };

    // Try to initialize immediately
    let initialized = initObserver();

    // If not initialized (elements not in DOM yet), retry with a MutationObserver or timeout
    let timeoutId: NodeJS.Timeout;
    if (!initialized) {
      // Retry after a short delay to account for React 18 hydration/streaming
      timeoutId = setTimeout(() => {
        if (!initialized) initialized = initObserver();
      }, 100);
      
      // Also setup a fallback timeout to just show everything if it fails
      setTimeout(() => {
        if (!initialized) {
           const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
           elements.forEach((element) => {
             element.dataset.visible = 'true';
           });
        }
      }, 2000);
    }

    return () => {
      if (observer) observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
