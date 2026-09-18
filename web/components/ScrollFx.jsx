'use client';

import { useEffect } from 'react';

// Один слушатель на всю страницу: он кладёт позицию скролла в CSS-переменную,
// а слои двигает уже CSS через calc(). Это дешевле, чем считать transform
// для каждого элемента в JS, и параллакс не дёргается на слабых телефонах.
export default function ScrollFx() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;

    const apply = () => {
      document.documentElement.style.setProperty('--scroll-y', String(window.scrollY));
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    if (!reduced) {
      apply();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Появление секций при прокрутке.
    const targets = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.dataset.shown = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return null;
}
